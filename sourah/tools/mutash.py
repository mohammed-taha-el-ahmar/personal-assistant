import json,re,collections,sys
d=json.load(open('sourah-app/public/quran.json'))
DIAC=re.compile('[ً-ٰٟۖ-ࣰۭ-ࣲـ]')
MAP=str.maketrans({'ٱ':'ا','أ':'ا','إ':'ا','آ':'ا','ى':'ي','ة':'ه','ؤ':'و','ئ':'ي'})
def norm(t):
    t=DIAC.sub('',t).translate(MAP)
    return [w for w in t.split() if re.search('[ء-ي]',w)]
ay={}; order=[]
for p in d['pages']:
    for s,a,t in p:
        ay[(s,a)]=norm(t); order.append((s,a))
N=4
idx=collections.defaultdict(set)
for k,w in ay.items():
    for i in range(len(w)-N+1): idx[tuple(w[i:i+N])].add(k)
cand=collections.defaultdict(set)
for g,ks in idx.items():
    if 2<=len(ks)<=40:
        ks=list(ks)
        for i in range(len(ks)):
            for j in range(i+1,len(ks)): cand[ks[i]].add(ks[j]); cand[ks[j]].add(ks[i])
def lcrun(a,b):
    best=0; prev=[0]*(len(b)+1)
    for i in range(1,len(a)+1):
        cur=[0]*(len(b)+1)
        for j in range(1,len(b)+1):
            if a[i-1]==b[j-1]:
                cur[j]=prev[j-1]+1; best=max(best,cur[j])
        prev=cur
    return best
out={}; pairs=0
for k,cs in cand.items():
    a=ay[k]; sc=[]
    for c in cs:
        if abs(order.index(k)-order.index(c))<=1 and k[0]==c[0]: pass
        b=ay[c]; r=lcrun(a,b)
        score=r/min(len(a),len(b))
        if (r>=4 and score>=0.6) or r>=6:
            sc.append((round(score,2),r,c))
    sc.sort(reverse=True)
    if sc:
        out[f"{k[0]}:{k[1]}"]=[[f"{c[0]}:{c[1]}",s] for s,r,c in sc[:6]]
        pairs+=len(sc[:6])
json.dump(out,open('sourah-app/public/mutashabihat.json','w'),separators=(',',':'))
print('ayahs with mutashabih:',len(out),'links:',pairs)
for key in ['2:2','2:5','55:13','7:54','2:48','2:123','37:80']:
    print(key,out.get(key))
