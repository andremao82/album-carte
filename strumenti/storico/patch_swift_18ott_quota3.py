# 18/10/2026: intervallo del conto alla rovescia sempre valido (Date.now...until va in crash se until è già passato).
p='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/AddView.swift'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)==count,(old[:80],s.count(old)); s=s.replace(old,new)
rep('Text(timerInterval: Date.now...until, countsDown: true)','Text(timerInterval: countdownRange(until), countsDown: true)',2)
rep('''// MARK: - Coda: carte da controllare
''','''// MARK: - Coda: carte da controllare

/// Intervallo per il conto alla rovescia: mai rovesciato (un ClosedRange con fine prima dell'inizio manda in crash).
func countdownRange(_ until: Date) -> ClosedRange<Date> {
    let now = Date()
    return now...max(now, until)
}
''')
open(p,'w',encoding='utf-8').write(s); print('ok')
