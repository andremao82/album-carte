#!/usr/bin/env python3
"""Tabella delle carte → Product ID di TCGplayer, per l'esportazione verso Collectr.

Collectr importa solo file nel formato di TCGplayer, abbinati col Product ID. Il browser non può
chiederlo a TCGplayer né a tcgcsv.com (niente CORS), quindi la tabella si prepara qui e va nel sito
come app/tcgplayer-ids.json. Da rilanciare quando escono set nuovi (poi pacchetto.sh e rilascio).

Fonti: tcgcsv.com (prodotti TCGplayer per set, categoria 3 = Pokémon), archivio pokemon-tcg-data su GitHub
(set e carte di pokemontcg.io: l'API va a singhiozzo), prices.pokemontcg.io (link al prodotto TCGplayer, che serve
a capire quale gruppo TCGplayer corrisponde a quale set),
api.tcgdex.net (set con id TCGdex, usati dalle carte italiane del catalogo).

Formato:
  {"updated": "AAAA-MM-GG",
   "sets": {"<set pokemontcg>": {"n": "<nome set TCGplayer>", "p": {"<numero normalizzato>": productId}}},
   "td": {"<set TCGdex>": ["<set pokemontcg>", ...]}}
Numero normalizzato: maiuscolo, senza "/totale", senza zeri iniziali ("006/165" → "6", "TG01" → "TG1").

Uso: python3 strumenti/tcgplayer_ids.py   (impiega qualche minuto)
"""
import http.client, json, os, re, sys, time, unicodedata, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(R, 'app', 'tcgplayer-ids.json')
UA = {'User-Agent': 'album-carte (uso personale)'}


CACHE = os.path.join(R, '.work', 'tcgplayer_cache')  # risposte già scaricate oggi: rilanciando si riparte da lì


def get(url, tries=7):
    import hashlib
    os.makedirs(CACHE, exist_ok=True)
    cf = os.path.join(CACHE, time.strftime('%Y%m%d-') + hashlib.sha1(url.encode()).hexdigest() + '.json')
    if os.path.exists(cf):
        with open(cf, encoding='utf-8') as f: return json.load(f)
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                d = json.load(r)
            with open(cf, 'w', encoding='utf-8') as f: json.dump(d, f)
            return d
        except (OSError, http.client.HTTPException, json.JSONDecodeError) as e:
            if i == tries - 1 or getattr(e, 'code', 0) == 404: raise
            time.sleep(2 + 2 * i)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None


_opener = urllib.request.build_opener(NoRedirect)


def product_of(ptcg_id):
    """Product ID dal link di pokemontcg.io (redirect verso tcgplayer.com/product/NNN), o None.
    Gli errori del server (5xx) si ritentano; le risposte valide restano nella cache del giorno."""
    cf = os.path.join(CACHE, time.strftime('%Y%m%d-') + 'redir-' + re.sub(r'[^A-Za-z0-9.-]', '_', ptcg_id) + '.txt')
    if os.path.exists(cf):
        v = open(cf).read().strip(); return int(v) if v else None
    for i in range(6):
        try:
            _opener.open(urllib.request.Request('https://prices.pokemontcg.io/tcgplayer/' + ptcg_id, headers=UA), timeout=30)
            return None
        except urllib.error.HTTPError as e:
            if e.code >= 500: time.sleep(2 + 2 * i); continue
            m = re.search(r'/product/(\d+)', e.headers.get('Location') or '') if 300 <= e.code < 400 else None
            os.makedirs(CACHE, exist_ok=True)
            with open(cf, 'w') as f: f.write(m.group(1) if m else '')
            return int(m.group(1)) if m else None
        except (OSError, http.client.HTTPException):
            time.sleep(2 + 2 * i)
    return None


def norm_num(s):
    s = str(s or '').upper().split('/')[0].strip()
    return re.sub(r'(?<![0-9])0+(?=[0-9])', '', s)


def norm_name(s):
    s = unicodedata.normalize('NFKD', str(s or '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]', '', s)


def main():
    # 1. prodotti TCGplayer (solo carte: hanno il numero)
    groups = get('https://tcgcsv.com/tcgplayer/3/groups')['results']
    gname = {g['groupId']: g['name'] for g in groups}
    gpub = {g['groupId']: g.get('publishedOn') or '' for g in groups}

    def products(g):
        return g['groupId'], get('https://tcgcsv.com/tcgplayer/3/%d/products' % g['groupId'])['results']
    prod_group, by_group = {}, {}
    with ThreadPoolExecutor(8) as ex:
        for gid, ps in ex.map(products, groups):
            idx = by_group.setdefault(gid, {})
            for p in ps:
                prod_group[p['productId']] = gid
                num = next((x['value'] for x in p.get('extendedData', []) if x.get('name') == 'Number'), None)
                if num: idx.setdefault(norm_num(num), []).append(p)
    print('gruppi TCGplayer:', len(groups), 'prodotti:', len(prod_group))

    # 2. set e carte di pokemontcg.io
    PT = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/'
    psets = get(PT + 'sets/en.json')
    assert all('-' not in s['id'] for s in psets), 'id di set con trattino: la ricerca nell’app va rivista'

    def cards(s):
        try: return s, get(PT + 'cards/en/%s.json' % s['id'])
        except urllib.error.HTTPError as e:
            if e.code == 404: return s, []
            raise
    with ThreadPoolExecutor(6) as ex:
        set_cards = list(ex.map(cards, psets))

    # 3. per ogni set: gruppi TCGplayer dai link di alcune carte, poi abbinamento per numero (e nome se serve)
    def match_set(item):
        s, cs = item
        cs = sorted(cs, key=lambda c: c['id'])
        sample = [cs[i] for i in sorted({len(cs) * k // 6 for k in range(6)} | {len(cs) - 1})] if cs else []
        gids = []
        for c in sample:
            pid = product_of(c['id'])
            if pid in prod_group and prod_group[pid] not in gids: gids.append(prod_group[pid])
        out, miss = {}, []
        for c in cs:
            n = norm_num(c['number'])
            cand = [p for g in gids for p in by_group[g].get(n, [])]
            if len(cand) > 1:
                same = [p for p in cand if norm_name(p['cleanName']) == norm_name(c['name'])]
                cand = same if len(same) == 1 else cand
            if len(cand) == 1: out[n] = cand[0]['productId']
            else: miss.append(c)
        for c in miss:  # nessun abbinamento sicuro: si chiede il link della singola carta
            pid = product_of(c['id'])
            if pid: out[norm_num(c['number'])] = pid
        return s['id'], {'n': gname.get(gids[0], s['name']) if gids else s['name'], 'p': out}, len(cs)
    sets, tot, found = {}, 0, 0
    with ThreadPoolExecutor(6) as ex:
        for sid, rec, n in ex.map(match_set, set_cards):
            tot += n; found += len(rec['p'])
            if rec['p']: sets[sid] = rec
            if n and len(rec['p']) < n: print('  %s: %d/%d abbinate' % (sid, len(rec['p']), n))
    print('carte pokemontcg abbinate: %d su %d' % (found, tot))

    # 4. set TCGdex → set pokemontcg (stessa data di uscita e nome uguale o che comincia allo stesso modo:
    #    TCGdex mette Trainer Gallery, Shiny Vault ecc. nel set principale, pokemontcg in set a parte)
    tlist = get('https://api.tcgdex.net/v2/en/sets')
    with ThreadPoolExecutor(8) as ex:
        tsets = list(ex.map(lambda t: get('https://api.tcgdex.net/v2/en/sets/' + t['id']), tlist))
    pkeys = {s['id']: {(norm_num(c['number']), norm_name(c['name'])) for c in cs} for s, cs in set_cards if s['id'] in sets}
    gkeys = {g: set(idx) for g, idx in by_group.items()}
    td, unmapped = {}, []
    for t in tsets:
        tn, tdate = norm_name(t.get('name')), (t.get('releaseDate') or '')[:10]
        same_day = [s for s in psets if s['releaseDate'].replace('/', '-') == tdate]
        hit = [s['id'] for s in same_day if norm_name(s['name']) == tn]
        if not hit: hit = [s['id'] for s in psets if norm_name(s['name']) == tn]
        hit += [s['id'] for s in same_day if s['id'] not in hit and tn and norm_name(s['name']).startswith(tn)]
        hit = [h for h in hit if h in sets]
        if not hit:  # nomi diversi ("Base Set"/"Base", "Unleashed"/"HS—Unleashed"): set con le stesse carte (numero e nome)
            keys = {(norm_num(c.get('localId')), norm_name(c.get('name'))) for c in t.get('cards') or []}
            best = max(((len(keys & pkeys[sid]), sid) for sid in pkeys), default=(0, None))
            if keys and best[0] >= max(3, len(keys) // 2): hit = [best[1]]
        if not hit:  # set che pokemontcg non ha (es. promo MEP): gruppo TCGplayer con le stesse carte, preso direttamente
            tc = t.get('cards') or []
            # i nomi TCGplayer delle promo hanno numero e finitura in coda ("Drifloon 005 Cosmos Holo"): basta che comincino col nome
            def like(x, c): return norm_name(x['cleanName']).startswith(norm_name(c.get('name')))
            def overlap(g): return sum(1 for c in tc if any(like(x, c) for x in by_group[g].get(norm_num(c.get('localId')), [])))
            # solo gruppi usciti entro un anno dal set (evita omonimie fra energie e promo di epoche diverse)
            cands = [g for g, gk in gkeys.items() if gk & {norm_num(c.get('localId')) for c in tc}
                     and tdate and abs(int(gpub.get(g, '0')[:4] or 0) - int(tdate[:4])) <= 1]
            best = max(((overlap(g), g) for g in cands), default=(0, None))
            if tc and best[0] >= max(3, len(tc) // 2):
                g, p = best[1], {}
                for c in tc:
                    ps = by_group[g].get(norm_num(c.get('localId')), [])
                    same = [x for x in ps if norm_name(x['cleanName']) == norm_name(c.get('name'))] or [x for x in ps if like(x, c)]
                    ps = same
                    if len(ps) == 1: p[norm_num(c.get('localId'))] = ps[0]['productId']
                sid = 'tcgp%d' % g
                sets[sid] = {'n': gname[g], 'p': p}; hit = [sid]
        if hit: td[t['id']] = hit
        else: unmapped.append(t['id'] + ' ' + t.get('name', ''))
    print('set TCGdex abbinati: %d, senza corrispondenza: %d' % (len(td), len(unmapped)))
    if unmapped: print('  ' + ', '.join(unmapped))

    data = {'updated': time.strftime('%Y-%m-%d'), 'sets': sets, 'td': td}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    print('scritto %s (%d KB)' % (OUT, os.path.getsize(OUT) // 1024))


if __name__ == '__main__':
    sys.exit(main())
