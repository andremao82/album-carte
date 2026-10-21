# 18/10/2026: "Riprova" su una carta con la coda ferma per quota la fa ripartire (prima non succedeva niente).
p='/home/claude/kit/album-carte-kit/ios/CartePokemon/CartePokemon/ScanQueue.swift'
s=open(p,encoding='utf-8').read()
old='''        set(id) { $0.state = .waiting; $0.message = ""; $0.cands = [] }
        kick()'''
new='''        set(id) { $0.state = .waiting; $0.message = ""; $0.cands = [] }
        if stopReason != nil { resumeQueue() } else { kick() }'''
assert s.count(old)==1; s=s.replace(old,new); open(p,'w',encoding='utf-8').write(s); print('ok')
