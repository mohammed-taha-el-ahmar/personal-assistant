// Toastmasters Tools – app logic. Text and language content live in i18n.js.

// ---------- language ----------
function detectLang(){
  try{const q=new URLSearchParams(location.search).get('lang');if(LANGS.includes(q))return q;
    const s=localStorage.getItem('gt-lang');if(LANGS.includes(s))return s}catch(e){}
  return (navigator.language||'').toLowerCase().startsWith('fr')?'fr':'en';
}
let LANG=detectLang();
function t(k,v){
  let s=I18N[LANG]&&I18N[LANG][k];if(s==null)s=I18N.en[k];if(s==null)return k;
  return v?s.replace(/\{(\w+)\}/g,(_,x)=>v[x]??''):s;
}
const tn=(k,n,v)=>t(k+(n===1?'.one':'.many'),{n,...v});
const locale=()=>LANG==='fr'?'fr-FR':'en-GB';

// ---------- constants ----------
const KEY='gavel-timer-v2';
const PRESETS=[
  {id:'tt',g:60,a:90,r:120},{id:'eval',g:120,a:150,r:180},{id:'ice',g:240,a:300,r:360},
  {id:'std',g:300,a:360,r:420},{id:'long',g:480,a:540,r:600},{id:'ge',g:300,a:360,r:420},{id:'custom'}
];
const ROLE_KEYS=['toastmaster','ge','timer','ah','gram','ttm','s1','s2','s3','e1','e2','e3','saa','pres'];
const CRIT=['open','struct','voice','body','eye','obj'];
const AGENDA_KEYS=[['doors','saa',10],['welcome','pres',3],['intro','toastmaster',4],['roles','ge',5],['speech1','s1',7],['speech2','s2',7],['speech3','s3',7],
  ['tt','ttm',20],['break','',10],['evals','ge',12],['reports','timer',6],['ge','ge',6],['close','toastmaster',4]];
const roleLabel=k=>t('role.'+k);
// Filler words: built-in per language, plus the club's own words. Kept on this device, apart from meeting data,
// so "Clear and start fresh" and switching language never lose them.
const WKEY='gt-words';
let WORDS=(()=>{try{const w=JSON.parse(localStorage.getItem(WKEY));if(w&&Array.isArray(w.custom))return {custom:w.custom,hidden:w.hidden||{}}}catch(e){}return {custom:[],hidden:{}}})();
function saveWords(){try{localStorage.setItem(WKEY,JSON.stringify(WORDS))}catch(e){}}
const builtinWords=()=>AH_WORDS[LANG]||AH_WORDS.en;
const ahWords=()=>{const h=WORDS.hidden[LANG]||[];return [...builtinWords().filter(w=>!h.includes(w[0])),...WORDS.custom.map(c=>[c.id,c.label])]};
function ahLabel(id){const c=WORDS.custom.find(c=>c.id===id);if(c)return c.label;for(const l of [LANG,...LANGS]){const f=(AH_WORDS[l]||[]).find(w=>w[0]===id);if(f)return f[1]}return id}
function addWord(label){
  label=label.trim().replace(/\s+/g,' ').slice(0,30);if(!label)return;
  const key=label.toLocaleLowerCase(locale());
  const hiddenBuiltin=builtinWords().find(w=>w[1].toLocaleLowerCase(locale())===key);
  if(hiddenBuiltin&&(WORDS.hidden[LANG]||[]).includes(hiddenBuiltin[0])){WORDS.hidden[LANG]=WORDS.hidden[LANG].filter(x=>x!==hiddenBuiltin[0]);saveWords();toast(t('ah.added',{w:label}));return true}
  if(ahWords().some(w=>w[1].toLocaleLowerCase(locale())===key)){toast(t('ah.dup',{w:label}));return false}
  if(WORDS.custom.length>=30){toast(t('ah.tooMany'));return false}
  WORDS.custom.push({id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),label});saveWords();toast(t('ah.added',{w:label}));return true;
}
function removeWord(id){
  if(WORDS.custom.some(c=>c.id===id))WORDS.custom=WORDS.custom.filter(c=>c.id!==id);
  else{const h=WORDS.hidden[LANG]||[];if(!h.includes(id))WORDS.hidden[LANG]=[...h,id]}
  saveWords();
}
let editWords=false;
const catName=c=>c.key?t('cat.'+c.key):c.name;
const itemTitle=it=>it.title!=null&&it.title!==''?it.title:(it.k?t('agi.'+it.k):'');

// ---------- state ----------
function defaultAgenda(){return {club:'',date:'',theme:'',start:'19:00',venue:'',online:{format:'inperson',url:'',id:'',pass:''},items:AGENDA_KEYS.map(([k,role,dur])=>({k,role,dur}))}}
const defaultCats=()=>[{key:'speaker',cands:[],round:0},{key:'evaluator',cands:[],round:0},{key:'topic',cands:[],round:0}];
function sample(){
  const X=SAMPLE[LANG]||SAMPLE.en, N=X.names;
  const ag=defaultAgenda();ag.items=ag.items.filter(i=>i.k!=='speech3');
  ag.items.find(i=>i.k==='speech1').title=X.agenda.speech1;
  const s2=ag.items.find(i=>i.k==='speech2');s2.title=X.agenda.speech2;s2.dur=6;
  Object.assign(ag,{club:X.agenda.club,theme:X.agenda.theme,venue:X.agenda.venue,date:'2026-10-22'});
  return {
    sample:true,lang:LANG,
    timer:{preset:'std',name:N[0],cg:5,ca:6,cr:7,log:[
      {name:N[0],pid:'std',secs:392,q:true},{name:N[1],pid:'ice',secs:226,q:true},{name:N[2],pid:'tt',secs:141,q:true}]},
    ah:{cur:0,last:null,speakers:N.slice(0,3).map((n,i)=>({name:n,c:{...X.ah[i]}}))},
    gram:{...X.gram,speakers:[{name:N[0],n:2},{name:N[1],n:0},{name:N[2],n:1}]},
    topics:{theme:'all',used:[],custom:[],cur:null},
    vote:{cat:0,reveal:false,cats:[
      {key:'speaker',cands:[N[0],N[1]],votes:{[N[0]]:3,[N[1]]:2}},
      {key:'evaluator',cands:[N[3],N[4]],votes:{}},
      {key:'topic',cands:[N[2],N[5],N[6]],votes:{}}]},
    agenda:ag,
    roles:{toastmaster:N[6],ge:N[4],timer:N[5],ah:'',gram:N[3],ttm:N[2],s1:N[0],s2:N[1],s3:'',e1:N[3],e2:'',e3:'',saa:N[5],pres:N[6]},
    eval:{speaker:N[0],evaluator:N[3],project:X.eval.project,goals:X.eval.goals,r:{open:4,struct:4,voice:5,body:3,eye:4,obj:4},
      commend:X.eval.commend,recommend:X.eval.recommend,encourage:X.eval.encourage}
  };
}
function blank(){
  return {sample:false,timer:{preset:'std',name:'',cg:5,ca:6,cr:7,log:[]},ah:{cur:0,last:null,speakers:[]},
    gram:{word:'',type:'',def:'',ex:'',speakers:[],good:'',improve:''},topics:{theme:'all',used:[],custom:[],cur:null},
    vote:{cat:0,reveal:false,cats:defaultCats().map(c=>({...c,votes:{}}))},
    agenda:defaultAgenda(),roles:Object.fromEntries(ROLE_KEYS.map(k=>[k,''])),
    eval:{speaker:'',evaluator:'',project:'',goals:'',r:{},commend:'',recommend:'',encourage:''}};
}
let S;
try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!S||!S.timer) S=sample();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

// ---------- helpers ----------
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mmss=s=>{s=Math.max(0,Math.floor(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const clone=o=>JSON.parse(JSON.stringify(o));
function toast(msg){const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),1800)}
function copyText(text){
  const fallback=()=>{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
    let ok=false;try{ok=document.execCommand('copy')}catch(e){}ta.remove();toast(ok?t('common.copied'):t('common.copyFail'))};
  try{navigator.clipboard.writeText(text).then(()=>toast(t('common.copied')),fallback)}catch(e){fallback()}
}
function sampleNotice(){
  return S.sample?`<div class="notice"><span>${t('sample.text')}</span><button class="small" data-act="clear-all">${t('sample.clear')}</button></div>`:'';
}
const filledChip=on=>on?`<span class="chip ok">${t('roles.filled')}</span>`:`<span class="chip warn">${t('roles.open')}</span>`;

// ---------- shared club data (roles, agenda, voting) ----------
// Shared live through Firebase Firestore when firebase-config.js is filled in and the URL carries ?club=<code>.
const SH={on:false,fs:null,ref:null,uid:null,club:'',writable:true,error:'',roles:{},ballots:[],agendaTimer:0,agendaDirty:false,
  user:null,officer:undefined,clubExists:undefined,officers:[],history:[],reports:{}};
const cleanClub=v=>String(v||'').toLowerCase().trim().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').slice(0,40);
function clubFromUrl(){try{return cleanClub(new URLSearchParams(location.search).get('club'))}catch(e){return ''}}
function myName(){try{return localStorage.getItem('gt-name')||''}catch(e){return ''}}
function setMyName(n){try{localStorage.setItem('gt-name',n)}catch(e){}}
function configured(){const c=window.FIREBASE_CONFIG;return !!(window.firebase&&c&&c.apiKey&&c.projectId&&!/PASTE/i.test(c.apiKey))}
function setQuery(params){
  const u=new URL(location.href);
  Object.entries(params).forEach(([k,v])=>v?u.searchParams.set(k,v):u.searchParams.delete(k));
  try{history.replaceState(null,'',u.pathname+u.search+'#'+tab)}catch(e){}
}
function shareLink(){const u=new URL(location.href);u.hash='';u.search='';u.searchParams.set('club',SH.club);if(LANG!=='en')u.searchParams.set('lang',LANG);return u.toString()}
let pendingRender=false;
function softRender(){
  if(!['roles','agenda','vote','office','feedback','club','draw'].includes(tab))return;
  const a=document.activeElement;
  if(a&&a.matches&&a.matches('input,textarea,select')){pendingRender=true;return}
  render();
}
document.addEventListener('focusout',()=>{if(!pendingRender)return;setTimeout(()=>{const a=document.activeElement;if(a&&a.matches&&a.matches('input,textarea,select'))return;pendingRender=false;render()},0)});
function writeFail(e){
  if(e&&e.code==='permission-denied'){SH.writable=false;toast(t('live.denied'));render()}
  else toast(t('live.saveFail'));
}
async function initShared(){
  SH.club=clubFromUrl();SH.error='';
  if(!SH.club||!configured()){updateStatus();return}
  try{
    if(!firebase.apps.length)firebase.initializeApp(window.FIREBASE_CONFIG);
    SH.fs=firebase.firestore();
    if(typeof completeEmailLink==='function')completeEmailLink();
    // Members are signed in anonymously; club officers sign in with Google (see office.js).
    await new Promise((resolve,reject)=>{let first=true;
      firebase.auth().onAuthStateChanged(async u=>{
        if(!u){try{await firebase.auth().signInAnonymously()}catch(e){if(first){first=false;reject(e)}}return}
        SH.uid=u.uid;SH.user={email:(u.email||'').toLowerCase(),anon:u.isAnonymous,verified:!!u.emailVerified};
        if(first){first=false;resolve()}
        if(typeof officeAuthChanged==='function')officeAuthChanged();
        if(SH.on)render();
      });
    });
  }catch(e){SH.error='connect';updateStatus();render();return}
  const base='clubs/'+SH.club;
  SH.ref={roles:SH.fs.doc(base+'/meeting/roles'),agenda:SH.fs.doc(base+'/meeting/agenda'),vote:SH.fs.doc(base+'/meeting/vote'),
    reports:SH.fs.doc(base+'/meeting/reports'),ballots:SH.fs.collection(base+'/ballots')};
  SH.on=true;S.vote.cats=defaultCats();S.vote.reveal=false;S.vote.cat=0;S.agenda=defaultAgenda();
  const onErr=e=>{SH.error='stopped:'+(e&&e.code||'error');updateStatus()};
  SH.ref.roles.onSnapshot(s=>{SH.roles=s.exists?clone(s.data().roles||{}):{};softRender()},onErr);
  SH.ref.agenda.onSnapshot(s=>{if(SH.agendaDirty)return;S.agenda=s.exists?clone(s.data()):defaultAgenda();if(!Array.isArray(S.agenda.items))S.agenda.items=[];softRender()},onErr);
  SH.ref.vote.onSnapshot(s=>{const d=s.exists?s.data():null;S.vote.cats=d&&Array.isArray(d.cats)?clone(d.cats):defaultCats();S.vote.reveal=!!(d&&d.reveal);
    if(S.vote.cat>=S.vote.cats.length)S.vote.cat=0;softRender()},onErr);
  SH.ref.reports.onSnapshot(s=>{SH.reports=s.exists?clone(s.data()):{};softRender()},onErr);
  SH.ref.ballots.onSnapshot(q=>{SH.ballots=q.docs.map(d=>({id:d.id,...d.data()}));softRender()},onErr);
  if(typeof clubLive==='function')clubLive();
  if(typeof templatesLive==='function')templatesLive();
  if(typeof drawLive==='function')drawLive();
  if(typeof deletionLive==='function')deletionLive();
  updateStatus();render();
}
function errorText(){if(!SH.error)return '';if(SH.error==='connect')return t('live.connectFail');return t('live.stopped',{code:SH.error.split(':')[1]})}
function updateStatus(){const el=$('#sync');if(!el)return;
  el.innerHTML=SH.error?`<span class="chip bad">${t('status.error')}</span>`:SH.on?`<span class="chip ok">${t('status.live',{club:esc(SH.club)})}</span>`:`<span class="chip warn">${t('status.local')}</span>`;}
function liveBox(){
  if(SH.error)return `<div class="notice"><span>${esc(errorText())}</span></div>`;
  if(SH.on)return `<div class="notice"><span>${t('live.on',{club:esc(SH.club)})}</span><div class="btns"><button class="small" data-act="qr-club">${t('qr.show')}</button><button class="small" data-act="copy-link">${t('live.copyLink')}</button></div></div>`;
  if(!configured())return `<div class="notice"><span>${t('live.notConfigured')}</span></div>`;
  return `<form class="notice" data-form="join"><label for="club-code">${t('live.join')}</label><input id="club-code" placeholder="paris-orators" style="max-width:220px" autocomplete="off"><button type="submit" class="small primary">${t('live.go')}</button></form>`;
}
function roleName(k){if(!SH.on)return S.roles[k]||'';const e=SH.roles[k];return e&&e.n?e.n:''}
async function writeRole(k,val){SH.roles[k]=val;try{await SH.ref.roles.set({roles:{[k]:val}},{merge:true})}catch(e){writeFail(e)}}
const roleTimers={};
function queueRoleText(k,v){clearTimeout(roleTimers[k]);roleTimers[k]=setTimeout(()=>writeRole(k,v.trim()?{n:v.trim().slice(0,60)}:null),600)}
function pushAgenda(){
  if(!SH.on)return;
  SH.agendaDirty=true;clearTimeout(SH.agendaTimer);
  SH.agendaTimer=setTimeout(async()=>{try{await SH.ref.agenda.set(clone(S.agenda))}catch(e){writeFail(e)}SH.agendaDirty=false},700);
}
async function pushVote(){
  if(!SH.on)return;
  const cats=S.vote.cats.map(c=>{const o={cands:c.cands,round:c.round||0};if(c.key)o.key=c.key;else o.name=c.name||'';return o});
  try{await SH.ref.vote.set({cats,reveal:!!S.vote.reveal})}catch(e){writeFail(e)}
}
function tally(i){
  const c=S.vote.cats[i];
  if(!SH.on)return {votes:c.votes||{},total:Object.values(c.votes||{}).reduce((a,b)=>a+b,0)};
  const votes={};let total=0;const r=c.round||0;
  SH.ballots.forEach(b=>{const v=b['c'+i];if(v&&v.r===r&&c.cands.includes(v.p)){votes[v.p]=(votes[v.p]||0)+1;total++}});
  return {votes,total};
}
function myPick(i){const b=SH.ballots.find(b=>b.id===SH.uid);const v=b&&b['c'+i];const c=S.vote.cats[i];return v&&v.r===(c.round||0)?v.p:null}
async function castShared(i,name){
  const mine=SH.ballots.find(b=>b.id===SH.uid);const body=mine?clone(mine):{};delete body.id;
  body['c'+i]={r:S.vote.cats[i].round||0,p:name};
  if(mine)Object.assign(mine,body);else SH.ballots.push({id:SH.uid,...body});render();
  try{await SH.ref.ballots.doc(SH.uid).set(body)}catch(e){writeFail(e)}
}

// ---------- tabs and language ----------
const TABS=['club','timer','ah','gram','topics','vote','agenda','roles','draw','guides','eval','feedback','office'];
let tab=TABS.includes(location.hash.slice(1))?location.hash.slice(1):(clubFromUrl()?'club':'timer');
function setTab(x){tab=x;try{history.replaceState(null,'',location.pathname+location.search+'#'+x)}catch(e){}render()}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
function setLang(l){
  if(!LANGS.includes(l)||l===LANG)return;
  LANG=l;try{localStorage.setItem('gt-lang',l)}catch(e){}
  if(S.sample){const custom=S.topics.custom,ag=S.agenda,vo=S.vote;S=sample();S.topics.custom=custom;if(SH.on){S.agenda=ag;S.vote=vo}save()}
  setQuery({lang:l==='en'?'':l});
  updateStatus();render();
}
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.lang)));
function applyChrome(){
  document.documentElement.lang=LANG;
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAria)));
  document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lang===LANG));
  const d=document.querySelector('meta[name=description]');if(d)d.content=t('tagline');
}
function render(){
  applyChrome();
  document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===tab));
  // A club whose deletion delay has passed shows only the deletion notice.
  if(SH.on&&(DEL.done||deletionPassed())){$('#main').innerHTML=deletedView();return}
  $('#main').innerHTML=deletionBanner()+VIEWS[tab]();
  if(tab==='timer') paintTimer();
}

// ---------- TIMER ----------
const T={running:false,start:0,elapsed:0,raf:0,lock:null};
function preset(){const p=PRESETS.find(p=>p.id===S.timer.preset)||PRESETS[3];if(p.id!=='custom')return p;
  return {id:'custom',g:S.timer.cg*60,a:S.timer.ca*60,r:S.timer.cr*60}}
const presetLabel=p=>p.id==='custom'&&p.g!=null?t('preset.customN',{a:p.g/60,b:p.r/60}):t('preset.'+p.id);
const logType=l=>l.pid?(l.pid==='custom'?t('preset.customN',{a:l.cg,b:l.cr}):t('preset.'+l.pid)):(l.type||'');
const elapsed=()=>T.elapsed+(T.running?(performance.now()-T.start)/1000:0);
function signal(s,p){if(s>=p.r+30)return 'over';if(s>=p.r)return 'red';if(s>=p.a)return 'amber';if(s>=p.g)return 'green';return ''}
const qualified=(s,p)=>s>=p.g-30&&s<=p.r+30;
function paintTimer(){
  const st=$('#stage');if(!st)return;const p=preset(),s=elapsed(),sig=signal(s,p);
  st.className='stage '+sig;$('#clock').textContent=mmss(s);
  $('#sig').textContent={'':T.running?t('timer.speaking'):t('timer.ready'),green:t('timer.sigGreen'),amber:t('timer.sigAmber'),red:t('timer.sigRed'),over:t('timer.sigOver')}[sig];
  $('#tbtn').textContent=T.running?t('timer.pause'):(T.elapsed?t('timer.resume'):t('timer.start'));
}
function tick(){paintTimer();if(T.running)T.raf=requestAnimationFrame(tick)}
const marksHtml=p=>`<span class="g">${mmss(p.g)}</span><span class="a">${mmss(p.a)}</span><span class="r">${mmss(p.r)}</span>`;
const VIEWS={office:()=>officeView(),feedback:()=>feedbackView(),eval:()=>evalView(),club:()=>clubView(),draw:()=>drawView()};
VIEWS.timer=()=>{const p=preset();const tm=S.timer;
  return `<section class="panel">
  <div class="phead"><div><h2>${t('timer.title')}</h2><p class="muted">${t('timer.intro')}</p></div></div>
  ${sampleNotice()}
  <div class="box"><div class="fields">
    <div class="field"><label class="label" for="t-name">${t('common.speaker')}</label><input id="t-name" data-bind="timer.name" value="${esc(tm.name)}" placeholder="${t('timer.speakerPh')}"></div>
    <div class="field"><label class="label" for="t-preset">${t('timer.type')}</label><select id="t-preset" data-act="preset">${PRESETS.map(x=>`<option value="${x.id}" ${x.id===tm.preset?'selected':''}>${t('preset.'+x.id)}</option>`).join('')}</select></div>
    ${tm.preset==='custom'?['cg','ca','cr'].map((k,i)=>`<div class="field"><label class="label" for="t-${k}">${t(['timer.green','timer.amber','timer.red'][i])} (${t('timer.min')})</label><input id="t-${k}" type="number" min="0" step="0.5" data-bind="timer.${k}" data-num="1" value="${tm[k]}"></div>`).join(''):''}
  </div></div>
  <div class="stage" id="stage">
    <div class="who">${esc(tm.name||t('timer.next'))}</div>
    <div class="clock" id="clock" aria-live="off">0:00</div>
    <div class="sig" id="sig">${t('timer.ready')}</div>
    <div class="marks">${marksHtml(p)}</div>
    <div class="btns"><button class="primary" id="tbtn" data-act="t-toggle">${t('timer.start')}</button><button data-act="t-log">${esc(t('timer.stop'))}</button><button data-act="t-reset">${t('timer.reset')}</button><button data-act="t-full">${t('timer.full')}</button></div>
  </div>
  <div class="box"><div class="phead"><h3>${t('timer.report')}</h3><div class="btns"><button class="small" data-act="t-copy">${t('common.copyReport')}</button>${sendBtn('timer')}<button class="small ghost" data-act="t-clear">${t('timer.clearLog')}</button></div></div>
    ${tm.log.length?`<div class="tablewrap"><table><thead><tr><th>${t('common.speaker')}</th><th>${t('timer.colType')}</th><th class="num">${t('timer.colTime')}</th><th>${t('timer.colResult')}</th><th></th></tr></thead><tbody>
    ${tm.log.map((l,i)=>`<tr><td>${esc(l.name)}</td><td>${esc(logType(l))}</td><td class="num">${mmss(l.secs)}</td><td>${l.q===false?`<span class="chip bad">${t('timer.outside')}</span>`:`<span class="chip ok">${t('timer.qualified')}</span>`}</td><td><button class="ghost small" data-act="t-del" data-i="${i}" aria-label="${t('common.remove')}">×</button></td></tr>`).join('')}
    </tbody></table></div>`:`<p class="empty">${t('timer.empty')}</p>`}
  </div></section>`};

// ---------- AH-COUNTER ----------
const ahTotal=s=>Object.values(s.c).reduce((a,b)=>a+b,0);
VIEWS.ah=()=>{const a=S.ah;const sp=a.speakers[a.cur];const W=ahWords();
  // Report columns: the words on screen, plus any word that was counted earlier and has since been removed.
  const extra=[...new Set(a.speakers.flatMap(s=>Object.keys(s.c).filter(id=>s.c[id])))].filter(id=>!W.some(w=>w[0]===id)).map(id=>[id,ahLabel(id)]);
  const cols=[...W,...extra];
  const hiddenN=(WORDS.hidden[LANG]||[]).length;
  return `<section class="panel">
  <div class="phead"><div><h2>${t('ah.title')}</h2><p class="muted">${t('ah.intro')}</p></div></div>
  ${sampleNotice()}
  <div class="box">
    <div class="speakers">${a.speakers.map((s,i)=>`<button class="spk" aria-pressed="${i===a.cur}" data-act="ah-pick" data-i="${i}">${esc(s.name)}</button>`).join('')}</div>
    <form class="btns" data-form="ah-add" style="flex-wrap:nowrap"><input id="ah-new" placeholder="${t('common.addSpeaker')}" autocomplete="off"><button type="submit">${t('common.add')}</button></form>
  </div>
  ${editWords?`<div class="box"><div class="phead"><div><h3>${t('ah.wordsTitle')}</h3><p class="muted">${t('ah.wordsIntro')}</p></div><button class="small primary" data-act="ah-edit">${t('ah.done')}</button></div>
    <div class="wchips">${W.map(([id,lab])=>`<span class="wchip">${esc(lab)}<button class="ghost small" data-act="ah-rmword" data-w="${id}" aria-label="${esc(t('ah.removeWord',{w:lab}))}">×</button></span>`).join('')||`<span class="muted">${t('ah.noWords')}</span>`}</div>
    <form class="btns" data-form="ah-word" style="flex-wrap:nowrap"><input id="ah-word" placeholder="${t('ah.addWordPh')}" autocomplete="off" maxlength="30"><button type="submit">${t('common.add')}</button></form>
    ${hiddenN?`<div><button class="small ghost" data-act="ah-restore">${t('ah.restore')}</button></div>`:''}
  </div>`:''}
  ${sp?`<div class="box"><div class="phead"><h3>${t('ah.counting',{name:esc(sp.name)})}</h3><div class="btns"><button class="small" data-act="ah-undo" ${a.last?'':'disabled'}>${t('ah.undo')}</button>${editWords?'':`<button class="small ghost" data-act="ah-edit">${t('ah.edit')}</button>`}</div></div>
    ${W.length?`<div class="taps">${W.map(([id,lab])=>`<button class="tap" data-act="ah-tap" data-w="${id}"><b>${sp.c[id]||0}</b><span>${esc(lab)}</span></button>`).join('')}</div>`:`<p class="empty">${t('ah.noWords')}</p>`}</div>`
    :`<div class="box"><p class="empty">${t('ah.addFirst')}</p>${editWords?'':`<div><button class="small ghost" data-act="ah-edit">${t('ah.edit')}</button></div>`}</div>`}
  <div class="box"><div class="phead"><h3>${t('ah.report')}</h3><div class="btns"><button class="small" data-act="ah-copy">${t('common.copyReport')}</button>${sendBtn('ah')}<button class="small ghost" data-act="ah-zero">${t('ah.reset')}</button></div></div>
  ${a.speakers.length?`<div class="tablewrap"><table><thead><tr><th>${t('common.speaker')}</th>${cols.map(([,lab])=>`<th class="num">${esc(lab)}</th>`).join('')}<th class="num">${t('ah.total')}</th><th></th></tr></thead><tbody>
  ${a.speakers.map((s,i)=>`<tr><td>${esc(s.name)}</td>${cols.map(([id])=>`<td class="num">${s.c[id]||''}</td>`).join('')}<td class="num"><b>${ahTotal(s)}</b></td><td><button class="ghost small" data-act="ah-del" data-i="${i}" aria-label="${t('common.remove')} ${esc(s.name)}">×</button></td></tr>`).join('')}
  </tbody></table></div>`:`<p class="empty">${t('ah.none')}</p>`}</div></section>`};

// ---------- GRAMMARIAN ----------
VIEWS.gram=()=>{const g=S.gram;
  return `<section class="panel">
  <div class="phead"><div><h2>${t('gram.title')}</h2><p class="muted">${t('gram.intro')}</p></div></div>
  ${sampleNotice()}
  <div class="grid2">
    <div class="box"><h3>${t('gram.wod')}</h3>
      <div class="fields"><div class="field"><label class="label" for="g-word">${t('gram.word')}</label><input id="g-word" data-bind="gram.word" value="${esc(g.word)}"></div>
      <div class="field"><label class="label" for="g-type">${t('gram.pos')}</label><input id="g-type" data-bind="gram.type" value="${esc(g.type)}"></div></div>
      <div class="field"><label class="label" for="g-def">${t('gram.def')}</label><input id="g-def" data-bind="gram.def" value="${esc(g.def)}"></div>
      <div class="field"><label class="label" for="g-ex">${t('gram.ex')}</label><input id="g-ex" data-bind="gram.ex" value="${esc(g.ex)}"></div>
    </div>
    <div class="box"><h3>${t('gram.who',{w:esc(g.word||t('gram.theWord'))})}</h3>
      ${g.speakers.length?g.speakers.map((s,i)=>`<div class="rate"><span>${esc(s.name)}</span><div class="btns"><button class="small" data-act="g-dec" data-i="${i}" aria-label="${t('gram.less')}">−</button><b style="font-family:var(--mono);min-width:2ch;text-align:center;align-self:center">${s.n}</b><button class="small" data-act="g-inc" data-i="${i}" aria-label="${t('gram.more')}">+</button></div></div>`).join(''):`<p class="empty">${t('gram.addSpeakers')}</p>`}
      <form class="btns" data-form="g-add" style="flex-wrap:nowrap"><input id="g-new" placeholder="${t('common.addSpeaker')}" autocomplete="off"><button type="submit">${t('common.add')}</button></form>
    </div>
  </div>
  <div class="grid2">
    <div class="box"><div class="field"><label class="label" for="g-good">${t('gram.good')}</label><textarea id="g-good" data-bind="gram.good">${esc(g.good)}</textarea></div></div>
    <div class="box"><div class="field"><label class="label" for="g-imp">${t('gram.improve')}</label><textarea id="g-imp" data-bind="gram.improve">${esc(g.improve)}</textarea></div></div>
  </div>
  <div class="btns"><button class="primary" data-act="g-copy">${t('gram.copy')}</button>${sendBtn('gram')}</div></section>`};

// ---------- TABLE TOPICS ----------
const TP=()=>TOPICS[LANG]||TOPICS.en;
const themeName=k=>TP().themes[k]||k;
function pool(){const tp=S.topics;const B=TP().bank;
  const all=[...Object.entries(B).flatMap(([k,qs])=>qs.map(q=>({q,k}))),...tp.custom.map(q=>({q,k:'mine'}))];
  return all.filter(x=>tp.theme==='all'||x.k===tp.theme)}
VIEWS.topics=()=>{const tp=S.topics;if(!TP().themes[tp.theme])tp.theme='all';const p=pool();const left=p.filter(x=>!tp.used.includes(x.q));
  const themes=['all',...Object.keys(TP().bank),...(tp.custom.length?['mine']:[])];
  return `<section class="panel">
  <div class="phead"><div><h2>${t('tt.title')}</h2><p class="muted">${t('tt.intro')}</p></div></div>
  <div class="box"><div class="fields"><div class="field"><label class="label" for="tt-theme">${t('tt.theme')}</label><select id="tt-theme" data-act="tt-theme">${themes.map(x=>`<option value="${x}" ${x===tp.theme?'selected':''}>${esc(themeName(x))}</option>`).join('')}</select></div></div>
  <div class="qcard"><span class="label">${tp.cur?esc(themeName(tp.cur.k)):t('tt.ready')}</span><q>${tp.cur?esc(tp.cur.q):t('tt.press')}</q></div>
  <div class="btns"><button class="primary" data-act="tt-draw" ${left.length?'':'disabled'}>${t('tt.draw')}</button><button data-act="tt-time">${t('tt.time')}</button><button class="ghost" data-act="tt-reset">${t('tt.reset')}</button><span class="muted" style="align-self:center">${t('tt.left',{n:left.length,total:p.length})}</span></div></div>
  <div class="box"><h3>${t('tt.addTitle')}</h3><p class="muted">${t('tt.addIntro')}</p>
    <textarea id="tt-new" placeholder="${t('tt.addPh')}"></textarea>
    <div class="btns"><button data-act="tt-add">${t('tt.add')}</button>${tp.custom.length?`<span class="muted" style="align-self:center">${t('tt.saved',{n:tp.custom.length})}</span><button class="ghost small" data-act="tt-clearcustom">${t('tt.removeMine')}</button>`:''}</div></div>
  </section>`};

// ---------- VOTING ----------
let ballotDone=false, confirmReveal=false;
const catTabs=v=>`<div class="speakers">${v.cats.map((x,i)=>`<button class="spk" aria-pressed="${i===v.cat}" data-act="v-cat" data-i="${i}">${esc(catName(x))}</button>`).join('')}</div>`;
const candField=(c,ro)=>`<div class="field"><label class="label" for="v-cands">${t('vote.nominees',{cat:esc(catName(c))})}</label><input id="v-cands" data-act="v-cands" value="${esc(c.cands.join(', '))}" placeholder="Camille, Thomas, Inès" ${ro?'disabled':''}></div>`;
VIEWS.vote=()=>SH.on?voteShared():voteLocal();
function voteShared(){const v=S.vote;const c=v.cats[v.cat];const {votes,total}=tally(v.cat);const pick=myPick(v.cat);const ro=!SH.writable;
  return `<section class="panel">
  <div class="phead"><div><h2>${t('vote.title')}</h2><p class="muted">${t('vote.introShared')}</p></div></div>
  ${liveBox()}
  <div class="box">${catTabs(v)}${candField(c,ro)}</div>
  <div class="box" aria-live="polite">
    ${c.cands.length?`<h3>${t('vote.yourBallot',{cat:esc(catName(c))})}</h3><div class="ballot">${c.cands.map(n=>`<button aria-pressed="${pick===n}" data-act="v-cast" data-n="${esc(n)}" ${v.reveal||ro?'disabled':''}>${esc(n)}</button>`).join('')}</div>
    <p class="muted">${pick?t('vote.youVoted',{name:esc(pick)})+(v.reveal?'':' '+t('vote.change')):t('vote.notYet')}</p>`:`<p class="empty">${t('vote.noNomineesShared')}</p>`}
    <p class="muted">${tn('vote.members',total)}</p>
  </div>
  ${resultsBox(c,votes,total,ro)}</section>`}
function resultsBox(c,votes,total,ro){const v=S.vote;
  return `<div class="box"><div class="phead"><h3>${t('vote.results')}</h3><div class="btns">
    ${ro?'':v.reveal?`<button class="small" data-act="v-hide">${t('vote.hide')}</button>`:confirmReveal?`<span class="muted" style="align-self:center">${t(SH.on?'vote.askAll':'vote.askHere')}</span><button class="small primary" data-act="v-reveal">${t('vote.yesReveal')}</button><button class="small" data-act="v-cancel">${t('common.cancel')}</button>`:`<button class="small" data-act="v-ask">${t('vote.reveal')}</button>`}
    ${ro?'':`<button class="small ghost" data-act="v-resetc">${t(SH.on?'vote.newVote':'vote.resetLocal')}</button>`}</div></div>
    ${v.reveal?(c.cands.length?c.cands.map(n=>{const k=votes[n]||0;const pct=total?k/total*100:0;return `<div class="result"><span>${esc(n)}</span><div class="bartrack"><div class="bar" style="width:${pct}%"></div></div><b style="font-family:var(--mono);text-align:right">${k}</b></div>`}).join(''):`<p class="empty">${t('vote.noCands')}</p>`):`<p class="empty">${t('vote.hidden')}</p>`}
  </div>`}
function voteLocal(){const v=S.vote;const c=v.cats[v.cat];const {votes,total}=tally(v.cat);
  return `<section class="panel">
  <div class="phead"><div><h2>${t('vote.title')}</h2><p class="muted">${t('vote.introLocal')}</p></div></div>
  ${liveBox()}${sampleNotice()}
  <div class="box">${catTabs(v)}${candField(c,false)}</div>
  <div class="box" aria-live="polite">
    ${ballotDone?`<div style="text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center;padding:20px 0"><h3>${t('vote.recorded')}</h3><p class="muted">${t('vote.handOn')}</p><button class="primary" data-act="v-next">${t('vote.next')}</button></div>`
    :c.cands.length?`<h3>${t('vote.ballot',{cat:esc(catName(c))})}</h3><div class="ballot">${c.cands.map(n=>`<button data-act="v-cast" data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div>`:`<p class="empty">${t('vote.noNominees')}</p>`}
    <p class="muted">${tn('vote.ballots',total)}</p>
  </div>
  ${resultsBox(c,votes,total,false)}</section>`}

// ---------- AGENDA ----------
const hhmm=m=>`${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
function agendaTimes(){const a=S.agenda;let [h,m]=(a.start||'19:00').split(':').map(Number);let x=(h||0)*60+(m||0);
  return a.items.map(it=>{const s=x;x+=Number(it.dur)||0;return hhmm(s)}).concat([hhmm(x)])}
function itemPerson(it){return it.role?(roleName(it.role)||t('ag.open')):''}
const fmtDate=d=>d?new Date(d+'T12:00').toLocaleDateString(locale(),{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'';
VIEWS.agenda=()=>{const a=S.agenda;if(!a.online)a.online=online(a);const o=online(a);const times=agendaTimes();const dateStr=fmtDate(a.date);const link=safeUrl(o.url);
  return `<section class="panel">
  <div class="phead"><div><h2>${t('ag.title')}</h2><p class="muted">${t('ag.intro')}${SH.on?' '+t('ag.introShared'):''}</p></div></div>
  ${liveBox()}${SH.on?'':sampleNotice()}
  ${templatesBox()}
  <div class="box"><div class="fields">
    <div class="field"><label class="label" for="a-club">${t('ag.club')}</label><input id="a-club" data-bind="agenda.club" data-live="1" value="${esc(a.club)}"></div>
    <div class="field"><label class="label" for="a-date">${t('ag.date')}</label><input id="a-date" type="date" data-bind="agenda.date" data-live="1" value="${esc(a.date)}"></div>
    <div class="field"><label class="label" for="a-start">${t('ag.start')}</label><input id="a-start" type="time" data-bind="agenda.start" data-live="1" value="${esc(a.start)}"></div>
    <div class="field"><label class="label" for="a-theme">${t('ag.theme')}</label><input id="a-theme" data-bind="agenda.theme" data-live="1" value="${esc(a.theme)}"></div>
    <div class="field"><label class="label" for="a-format">${t('fmt.label')}</label><select id="a-format" data-act="a-format">${['inperson','hybrid','online'].map(f=>`<option value="${f}" ${f===o.format?'selected':''}>${t('fmt.'+f)}</option>`).join('')}</select></div>
    ${o.format!=='online'?`<div class="field"><label class="label" for="a-venue">${t('ag.venue')}</label><input id="a-venue" data-bind="agenda.venue" data-live="1" value="${esc(a.venue)}"></div>`:''}
  </div>
  ${o.format!=='inperson'?`<div class="fields">
    <div class="field" style="grid-column:1/-1"><label class="label" for="a-url">${t('on.url')}</label><input id="a-url" type="url" inputmode="url" data-bind="agenda.online.url" data-live="1" value="${esc(o.url)}" placeholder="https://us02web.zoom.us/j/…">
      ${o.url&&!safeUrl(o.url)?`<span class="chip bad" style="align-self:flex-start">${t('on.badUrl')}</span>`:''}</div>
    <div class="field"><label class="label" for="a-mid">${t('on.id')}</label><input id="a-mid" data-bind="agenda.online.id" data-live="1" value="${esc(o.id)}"></div>
    <div class="field"><label class="label" for="a-pass">${t('on.pass')}</label><input id="a-pass" data-bind="agenda.online.pass" data-live="1" value="${esc(o.pass)}"></div>
  </div>`:''}</div>
  <div class="grid2">
  <div class="box"><h3>${t('ag.order')}</h3>
    ${a.items.map((it,i)=>`<div class="arow"><span class="t">${times[i]}</span>
      <input id="ai-t${i}" aria-label="${t('ag.item')}" data-item="${i}" data-k="title" value="${esc(itemTitle(it))}">
      <select class="rolesel" id="ai-r${i}" aria-label="${t('ag.role')}" data-item="${i}" data-k="role"><option value="">${t('ag.noRole')}</option>${ROLE_KEYS.map(k=>`<option value="${k}" ${k===it.role?'selected':''}>${roleLabel(k)}</option>`).join('')}</select>
      <input id="ai-d${i}" aria-label="${t('ag.minutes')}" type="number" min="0" data-item="${i}" data-k="dur" value="${it.dur}">
      <div class="ctrls"><button class="ghost small" data-act="a-up" data-i="${i}" aria-label="${t('ag.up')}">↑</button><button class="ghost small" data-act="a-down" data-i="${i}" aria-label="${t('ag.down')}">↓</button><button class="ghost small" data-act="a-del" data-i="${i}" aria-label="${t('common.remove')}">×</button></div></div>`).join('')}
    <div class="btns"><button data-act="a-add">${t('ag.add')}</button><span class="muted" style="align-self:center">${t('ag.endsAt',{t:times[times.length-1]})}</span></div>
  </div>
  <div class="box agenda-doc">
    <div class="ah"><span class="label">${t('ag.doc')}</span><h3>${esc(a.club||t('ag.yourClub'))}</h3><p class="muted">${esc(dateStr)}${a.venue&&o.format!=='online'?' · '+esc(a.venue):''}</p>${a.theme?`<p>${t('ag.themeIs')} <b>${esc(a.theme)}</b></p>`:''}
      ${o.format!=='inperson'?`<div class="join"><span class="chip ok">${t('fmt.'+o.format)}</span>${link?`<a class="btn primary" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${t('on.join')}</a>`:`<span class="muted">${t('on.noLink')}</span>`}
        ${o.id||o.pass?`<span class="muted">${esc([o.id?t('on.idIs',{v:o.id}):'',o.pass?t('on.passIs',{v:o.pass}):''].filter(Boolean).join(' · '))}</span>`:''}</div>`:''}</div>
    ${a.items.map((it,i)=>`<div class="li"><span class="t">${times[i]}</span><span>${esc(itemTitle(it))}</span><span class="p">${esc(itemPerson(it))}</span></div>`).join('')}
    <div class="li"><span class="t">${times[times.length-1]}</span><span>${t('ag.ends')}</span><span></span></div>
    <div class="btns"><button class="primary" data-act="a-pdf">${t('ag.pdf')}</button><button data-act="a-copy">${t('ag.copy')}</button></div>
  </div></div></section>`};

// ---------- ROLES ----------
let confirmClear=false;
function roleCell(k){
  if(!SH.on) return `<input id="r-${k}" data-role="${k}" value="${esc(S.roles[k])}" placeholder="${t('roles.unassigned')}">`;
  const e=SH.roles[k];
  if(e&&e.u){const mine=e.u===SH.uid;return `<div class="btns" style="align-items:center"><span class="${mine?'mine':''}">${esc(e.n)}${mine?' '+t('roles.you'):''}</span><button class="small ghost" data-act="${mine?'r-release':'r-unassign'}" data-k="${k}">${t(mine?'roles.giveUp':'roles.clear')}</button></div>`}
  return `<div class="btns" style="flex-wrap:nowrap"><input id="r-${k}" data-srole="${k}" value="${esc(e&&e.n||'')}" placeholder="${t('roles.typeName')}">${!(e&&e.n)?`<button class="small" data-act="r-take" data-k="${k}">${t('roles.take')}</button>`:''}</div>`;
}
VIEWS.roles=()=>{const open=ROLE_KEYS.filter(k=>!roleName(k));
  return `<section class="panel">
  <div class="phead"><div><h2>${t('roles.title')}</h2><p class="muted">${t(SH.on?'roles.introShared':'roles.introLocal')}</p></div>
  <span class="chip ${open.length?'warn':'ok'}">${open.length?t('roles.openN',{n:open.length}):t('roles.allFilled')}</span></div>
  ${liveBox()}${SH.on?`<div class="box"><div class="field"><label class="label" for="my-name">${t('roles.myName')}</label><input id="my-name" data-act="my-name" value="${esc(myName())}" placeholder="${t('roles.myNamePh')}" autocomplete="name"></div></div>`:sampleNotice()}
  <div class="box"><div class="tablewrap"><table><thead><tr><th>${t('roles.colRole')}</th><th>${t('roles.colMember')}</th><th>${t('roles.colStatus')}</th></tr></thead><tbody>
  ${ROLE_KEYS.map(k=>`<tr><td>${roleLabel(k)}</td><td>${roleCell(k)}</td><td id="rs-${k}">${filledChip(roleName(k))}</td></tr>`).join('')}
  </tbody></table></div>
  <div class="btns"><button class="primary" data-act="r-copy">${t('roles.copyOpen')}</button>
  ${confirmClear?`<span class="muted" style="align-self:center">${t(SH.on?'roles.askAll':'roles.askHere')}</span><button class="small primary" data-act="r-clear">${t('roles.yesClear')}</button><button class="small" data-act="r-cancel">${t('common.cancel')}</button>`:`<button class="ghost" data-act="r-ask">${t('roles.clearAll')}</button>`}</div></div></section>`};

// ---------- GUIDES ----------
function guideName(k){return (GUIDE_NAMES[LANG]||GUIDE_NAMES.en)[k]||roleLabel(k)}
VIEWS.guides=()=>`<section class="panel">
  <div class="phead"><div><h2>${t('guides.title')}</h2><p class="muted">${t('guides.intro')}</p></div></div>
  ${(GUIDES[LANG]||GUIDES.en).map(([k,p,b,d,a],i)=>`<details class="guide" ${i===0?'open':''}><summary><h3>${esc(guideName(k))}</h3><span class="muted">${esc(p)}</span></summary>
  <div class="gbody">${[[t('guides.before'),b],[t('guides.during'),d],[t('guides.after'),a]].map(([h,l])=>`<div><span class="label">${h}</span><ul>${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div></details>`).join('')}
</section>`;

// ---------- events ----------
function setPath(path,val){const ks=path.split('.');let o=S;while(ks.length>1)o=o[ks.shift()];o[ks[0]]=val}
document.addEventListener('input',ev=>{const el=ev.target;
  if(el.dataset.bind){setPath(el.dataset.bind,el.dataset.num?Number(el.value)||0:el.value);save();if(el.dataset.bind.startsWith('agenda.'))pushAgenda();
    if(el.dataset.bind==='timer.name'){const w=$('.stage .who');if(w)w.textContent=el.value||t('timer.next')}
    if(el.dataset.bind.startsWith('timer.c')){const m=$('.marks');if(m)m.innerHTML=marksHtml(preset());paintTimer()}
    if(el.dataset.live) liveRefresh();
  }
  if(el.dataset.item!==undefined){const it=S.agenda.items[+el.dataset.item];const k=el.dataset.k;
    it[k]=k==='dur'?Math.max(0,Number(el.value)||0):el.value;save();pushAgenda();if(k!=='role')liveRefresh()}
  if(el.dataset.act==='my-name'){setMyName(el.value)}
  if(el.dataset.srole){const k=el.dataset.srole;queueRoleText(k,el.value);const c=$('#rs-'+k);if(c)c.innerHTML=filledChip(el.value.trim())}
  if(el.dataset.role){S.roles[el.dataset.role]=el.value.trim();save();const c=$('#rs-'+el.dataset.role);if(c)c.innerHTML=filledChip(el.value.trim())}
});
document.addEventListener('change',ev=>{const el=ev.target;const a=el.dataset.act;
  if(a==='a-format'){S.agenda.online=online(S.agenda);S.agenda.online.format=el.value;save();pushAgenda();render()}
  if(a==='preset'){S.timer.preset=el.value;save();render()}
  if(a==='tt-theme'){S.topics.theme=el.value;S.topics.cur=null;save();render()}
  if(a==='v-cands'){const c=S.vote.cats[S.vote.cat];c.cands=[...new Set(el.value.split(',').map(s=>s.trim()).filter(Boolean))].slice(0,20);save();pushVote();render()}
  if(el.dataset.item!==undefined&&el.dataset.k==='role'){render()}
  if(el.dataset.role){render()}
});
// Re-render panels whose preview depends on typing, but keep focus and caret.
function liveRefresh(){const f=document.activeElement;const id=f&&f.id;const s=f&&f.selectionStart,e=f&&f.selectionEnd;
  if(tab==='eval'){const o=$('#e-out');if(o)o.textContent=evalText();return}
  render();if(id){const n=document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(s,e)}catch(_){}}}}
document.addEventListener('submit',ev=>{ev.preventDefault();const f=ev.target.dataset.form;
  if(f==='join'){const c=cleanClub($('#club-code').value);if(c.length<3){toast(t('live.tooShort'));return}
    setQuery({club:c});initShared().then(()=>{if(SH.on)openQr('club')});return}
  if(f==='ah-word'){const inp=$('#ah-word');if(addWord(inp.value)){render();$('#ah-word').focus()}return}
  if(f==='ah-add'){const v=$('#ah-new').value.trim();if(!v)return;S.ah.speakers.push({name:v,c:{}});S.ah.cur=S.ah.speakers.length-1;save();render();$('#ah-new').focus()}
  if(f==='g-add'){const v=$('#g-new').value.trim();if(!v)return;S.gram.speakers.push({name:v,n:0});save();render();$('#g-new').focus()}
});
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-act]');if(!b||b.tagName==='SELECT'||b.tagName==='INPUT')return;const a=b.dataset.act,i=+b.dataset.i;
  switch(a){
  case 'clear-all':{const ag=S.agenda,vo=S.vote,custom=S.topics.custom;S=blank();S.topics.custom=custom;if(SH.on){S.agenda=ag;S.vote=vo}resetTimer();save();render();toast(t('sample.cleared'));break}
  // timer
  case 't-toggle':
    if(T.running){T.elapsed=elapsed();T.running=false;cancelAnimationFrame(T.raf);releaseLock()}
    else{T.start=performance.now();T.running=true;tick();getLock()}
    paintTimer();break;
  case 't-reset':resetTimer();paintTimer();break;
  case 't-log':{const s=elapsed();if(s<1){toast(t('timer.startFirst'));break}const p=preset();
    const entry={name:S.timer.name||t('timer.speakerN',{n:S.timer.log.length+1}),pid:p.id,secs:Math.round(s),q:qualified(s,p)};
    if(p.id==='custom'){entry.cg=S.timer.cg;entry.cr=S.timer.cr}
    S.timer.log.push(entry);resetTimer();S.timer.name='';save();render();toast(t('timer.recorded',{t:mmss(s)}));break}
  case 't-del':S.timer.log.splice(i,1);save();render();break;
  case 't-clear':S.timer.log=[];save();render();break;
  case 't-full':{const st=$('#stage');try{(document.fullscreenElement?document.exitFullscreen():st.requestFullscreen()).catch(()=>toast(t('timer.noFull')))}catch(e){toast(t('timer.noFull'))}break}
  case 't-copy':copyText(t('timer.reportHead')+'\n'+S.timer.log.map(l=>`${l.name} – ${logType(l)} – ${mmss(l.secs)} – ${l.q===false?t('timer.repOut'):t('timer.repQ')}`).join('\n'));break;
  // ah
  case 'ah-pick':S.ah.cur=i;save();render();break;
  case 'ah-tap':{const sp=S.ah.speakers[S.ah.cur];const w=b.dataset.w;sp.c[w]=(sp.c[w]||0)+1;S.ah.last={s:S.ah.cur,w};save();render();break}
  case 'ah-undo':{const l=S.ah.last;if(l){const sp=S.ah.speakers[l.s];if(sp&&sp.c[l.w])sp.c[l.w]--;S.ah.last=null;save();render()}break}
  case 'ah-del':S.ah.speakers.splice(i,1);S.ah.cur=Math.min(S.ah.cur,Math.max(0,S.ah.speakers.length-1));S.ah.last=null;save();render();break;
  case 'ah-edit':editWords=!editWords;render();if(editWords){const f=$('#ah-word');if(f)f.focus()}break;
  case 'ah-rmword':removeWord(b.dataset.w);render();break;
  case 'ah-restore':WORDS.hidden[LANG]=[];saveWords();render();break;
  case 'ah-zero':S.ah.speakers.forEach(s=>s.c={});S.ah.last=null;save();render();break;
  case 'ah-copy':copyText(t('ah.reportHead')+'\n'+S.ah.speakers.map(s=>{const n=ahTotal(s);const parts=Object.keys(s.c).filter(w=>s.c[w]).map(w=>`${ahLabel(w)} ×${s.c[w]}`);return `${s.name}: ${n?parts.join(', ')+` (${t('ah.totalN',{n})})`:t('ah.clean')}`}).join('\n'));break;
  // grammarian
  case 'g-inc':S.gram.speakers[i].n++;save();render();break;
  case 'g-dec':S.gram.speakers[i].n=Math.max(0,S.gram.speakers[i].n-1);save();render();break;
  case 'g-copy':{const g=S.gram;copyText(`${t('gram.reportHead')}\n${t('gram.repWord')}: ${g.word}${g.type?' ('+g.type+')':''}\n${g.def}\n${t('gram.repEx')}: ${g.ex}\n\n${t('gram.repUsed')}: ${g.speakers.filter(s=>s.n).map(s=>`${s.name} ×${s.n}`).join(', ')||t('gram.repNobody')}\n\n${t('gram.repGood')}: ${g.good}\n${t('gram.repImprove')}: ${g.improve}`);break}
  // topics
  case 'tt-draw':{const left=pool().filter(x=>!S.topics.used.includes(x.q));if(!left.length)break;const pick=left[Math.floor(Math.random()*left.length)];S.topics.cur=pick;S.topics.used.push(pick.q);save();render();break}
  case 'tt-reset':S.topics.used=[];S.topics.cur=null;save();render();break;
  case 'tt-time':S.timer.preset='tt';S.timer.name='';save();resetTimer();setTab('timer');break;
  case 'tt-add':{const v=$('#tt-new').value.split('\n').map(s=>s.trim()).filter(Boolean);if(!v.length)break;S.topics.custom.push(...v);save();render();toast(tn('tt.added',v.length));break}
  case 'tt-clearcustom':S.topics.custom=[];if(S.topics.theme==='mine')S.topics.theme='all';save();render();break;
  // vote
  case 'v-cat':S.vote.cat=i;ballotDone=false;confirmReveal=false;save();render();break;
  case 'v-cast':{if(SH.on){castShared(S.vote.cat,b.dataset.n);break}const c=S.vote.cats[S.vote.cat];c.votes=c.votes||{};c.votes[b.dataset.n]=(c.votes[b.dataset.n]||0)+1;ballotDone=true;save();render();break}
  case 'v-next':ballotDone=false;render();break;
  case 'v-ask':confirmReveal=true;render();break;
  case 'v-cancel':confirmReveal=false;render();break;
  case 'v-reveal':S.vote.reveal=true;confirmReveal=false;save();pushVote();render();break;
  case 'v-hide':S.vote.reveal=false;save();pushVote();render();break;
  case 'v-resetc':{const c=S.vote.cats[S.vote.cat];if(SH.on){c.round=(c.round||0)+1;S.vote.reveal=false;pushVote();render();toast(t('vote.started',{cat:catName(c)}));break}
    c.votes={};ballotDone=false;save();render();toast(t('vote.cleared'));break}
  // agenda
  case 'a-add':S.agenda.items.push({title:t('ag.newItem'),role:'',dur:5});save();pushAgenda();render();break;
  case 'a-del':S.agenda.items.splice(i,1);save();pushAgenda();render();break;
  case 'a-up':if(i>0){const x=S.agenda.items;[x[i-1],x[i]]=[x[i],x[i-1]];save();pushAgenda();render()}break;
  case 'a-down':{const x=S.agenda.items;if(i<x.length-1){[x[i+1],x[i]]=[x[i],x[i+1]];save();pushAgenda();render()}break}
  case 'a-copy':{const ag=S.agenda,tm=agendaTimes();const ol=onlineLines(ag);copyText(`${ag.club}\n${fmtDate(ag.date)}${ag.venue&&online(ag).format!=='online'?' · '+ag.venue:''}${ag.theme?'\n'+t('ag.themeIs')+' '+ag.theme:''}${ol.length?'\n'+ol.join('\n'):''}\n\n`+ag.items.map((it,k)=>`${tm[k]}  ${itemTitle(it)}${it.role?' – '+roleLabel(it.role)+': '+itemPerson(it):''}`).join('\n')+`\n${tm[tm.length-1]}  ${t('ag.ends')}`);break}
  // roles
  case 'r-copy':{const open=ROLE_KEYS.filter(k=>!roleName(k)).map(k=>'• '+roleLabel(k));const ag=S.agenda;
    copyText(open.length?t('roles.msgOpen',{date:ag.date?t('roles.msgDate',{d:fmtDate(ag.date)}):'',theme:ag.theme?t('roles.msgTheme',{t:ag.theme}):'',list:open.join('\n')}):t('roles.msgFull'));break}
  case 'r-ask':confirmClear=true;render();break;
  case 'r-cancel':confirmClear=false;render();break;
  case 'r-clear':confirmClear=false;
    if(SH.on){SH.roles={};render();SH.ref.roles.set({roles:{}}).catch(writeFail);break}
    Object.keys(S.roles).forEach(k=>S.roles[k]='');save();render();break;
  case 'r-take':{const n=myName().trim();if(!n){toast(t('roles.nameFirst'));const f=$('#my-name');if(f)f.focus();break}writeRole(b.dataset.k,{n:n.slice(0,60),u:SH.uid});render();break}
  case 'r-release':case 'r-unassign':writeRole(b.dataset.k,null);render();break;
  case 'copy-link':copyText(shareLink());break;
  case 'a-pdf':currentAgendaPdf();break;
  default:if(typeof officeAct==='function')officeAct(a,b);
  // eval
  }
});
function resetTimer(){T.running=false;T.elapsed=0;cancelAnimationFrame(T.raf);releaseLock()}
async function getLock(){try{T.lock=await navigator.wakeLock.request('screen')}catch(e){}}
function releaseLock(){try{T.lock&&T.lock.release()}catch(e){}T.lock=null}
document.addEventListener('keydown',e=>{if(tab==='timer'&&e.code==='Space'&&!/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName)){e.preventDefault();$('#tbtn').click()}});

// If the example meeting was built in another language than the one now in use, rebuild it.
if(S.sample&&S.lang!==LANG){const custom=S.topics.custom;S=sample();S.topics.custom=custom;save()}
render();
updateStatus();
initShared();
