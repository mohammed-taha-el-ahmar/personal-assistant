import json,os,re
Q=json.load(open('sourah-app/public/quran.json'))
T='dl/tafsir_api/tafsir/'
fr={(s['id'],v['id']):v['translation'] for s in json.load(open('dl/quran-json-3.1.2/package/dist/quran_fr.json')) for v in s['verses']}
en={(s['id'],v['id']):v['translation'] for s in json.load(open('dl/quran-json-3.1.2/package/dist/quran_en.json')) for v in s['verses']}
def taf(ed,s,a):
    p=f'{T}{ed}/{s}/{a}.json'
    if not os.path.exists(p): return ''
    try: return json.load(open(p)).get('text','').strip()
    except Exception: return ''
# grouped ayahs: some tafsirs explain several ayahs at once and leave the others empty
order=[(s_,a_) for p in Q['pages'] for s_,a_,_ in p]
TF={}
for ed in ['french-mokhtasar','en-tafsir-al-mukhtasar','ar-tafsir-muyassar']:
    last={}
    for s_,a_ in order:
        x=taf(ed,s_,a_)
        if x: last[s_]=(x,a_); TF[(ed,s_,a_)]=(x,None)
        elif s_ in last: TF[(ed,s_,a_)]=(last[s_][0],last[s_][1])
        else: TF[(ed,s_,a_)]=('',None)
wbw={}
for pg in json.load(open('dl/wbw/package/data.json')):
    for ay in pg['ayahs']:
        for w in ay['words']:
            if w['char_type_name']!='word': continue
            k=w['parentAyahVerseKey']; wbw.setdefault(k,[]).append((w['position'],(w['translation'] or {}).get('text') or '',(w['transliteration'] or {}).get('text') or ''))
isw=lambda w: re.search('[ء-يٱ]',w)
mis=0; tot=0
os.makedirs('sourah-app/public/meaning',exist_ok=True)
size=0
for i,page in enumerate(Q['pages']):
    out={}
    for s,a,txt in page:
        k=f'{s}:{a}'
        words=[w for w in txt.split(' ') if isw(w)]
        ww=[x[1:] for x in sorted(wbw.get(k,[]))]
        tot+=1
        if len(ww)!=len(words): mis+=1; ww=ww if abs(len(ww)-len(words))<=1 else []
        out[k]={'fr':fr.get((s,a),''),'en':en.get((s,a),''),
                'tf':{l:TF[(ed,s,a)][0] for l,ed in (('fr','french-mokhtasar'),('en','en-tafsir-al-mukhtasar'),('ar','ar-tafsir-muyassar'))},
                'tfFrom':{l:TF[(ed,s,a)][1] for l,ed in (('fr','french-mokhtasar'),('en','en-tafsir-al-mukhtasar'),('ar','ar-tafsir-muyassar')) if TF[(ed,s,a)][1]},
                'gh':taf('al-muyassar-fi-al-gharib',s,a),'w':ww}
    js=json.dumps(out,ensure_ascii=False,separators=(',',':'))
    open(f'sourah-app/public/meaning/{i+1}.json','w').write(js); size+=len(js.encode())
print('ayahs',tot,'word-count mismatches',mis,'total MB',round(size/1e6,1))
print(json.dumps(json.load(open('sourah-app/public/meaning/604.json'))['112:1'],ensure_ascii=False)[:800])
