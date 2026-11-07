// Oratia – attendance: members and guests say whether they come to the next meeting (on site, online when the meeting
// is online or hybrid, not coming, not sure yet). Officers and members see who comes; when a role holder looks for a
// replacement, the people who come and have no role get an alert in the site and a ready message lists them.
// Closing a meeting (office.js) keeps who came in the history, for the statistics.
//
// clubs/{club}/rsvp/{date}_{uid} {date,uid,name,status:'onsite'|'online'|'no'|'maybe',kind:'member'|'guest',at}
// Anyone with the club link answers for themselves; members and officers read the answers.

const RS={list:[],mine:null,unsub:null,unsubMine:null,date:'',busy:false,kind:null,seen:{}};
const RSVP_ST=['onsite','online','maybe','no'];
const rsvpDate=()=>S.agenda&&S.agenda.date||'';
const rsvpFormat=()=>typeof online==='function'?online(S.agenda||{}).format:'inperson';

function rsvpLive(){
  const d=rsvpDate();if(!SH.on||!SH.fs||!SH.uid||d===RS.date&&RS.unsubMine)return;
  rsvpStop();RS.date=d;if(!d)return;
  RS.unsubMine=SH.fs.doc(`clubs/${SH.club}/rsvp/${d}_${SH.uid}`).onSnapshot(s=>{RS.mine=s.exists?s.data():null;softRender()},()=>{RS.mine=null});
  RS.unsub=SH.fs.collection(`clubs/${SH.club}/rsvp`).where('date','==',d).onSnapshot(q=>{RS.list=q.docs.map(x=>({id:x.id,...x.data()}));softRender()},()=>{RS.list=[]});
}
function rsvpStop(){if(RS.unsub)RS.unsub();if(RS.unsubMine)RS.unsubMine();RS.unsub=RS.unsubMine=null;RS.list=[];RS.mine=null;RS.date=''}
// The meeting date or the signed-in person can change: follow them.
function rsvpRefresh(){if(SH.on&&(rsvpDate()!==RS.date||!RS.unsubMine))rsvpLive()}

const RST={
en:{title:'Are you coming?',forDate:'Meeting on {d}',noDate:'The date of the next meeting is not set yet.',
  st:{onsite:'On site',online:'Online',maybe:'Not sure yet',no:'Not coming'},me:'I am',kind:{member:'a member',guest:'a guest'},
  name:'Your name',needName:'Type your name first',saved:'Thank you, your answer is saved.',change:'You can change your answer at any time.',
  counts:'{a} on site · {b} online · {c} not sure · {d} not coming',guests:'{n} guest(s) expected',noRole:'no role',
  hiddenNames:'Members see who is coming.',
  alert:'{who} is looking for a replacement as {role} ({d}).',alertTake:'I’ll replace',alertLater:'Later',
  copyPresent:'Copy a message for those coming without a role',msgPresent:'{who} is looking for a replacement as {role} on {d}. Coming and without a role so far: {names}. Take the role here: {link}',nobody:'nobody yet',
  attendance:'Attendance'},
fr:{title:'Venez-vous ?',forDate:'Réunion du {d}',noDate:'La date de la prochaine réunion n’est pas encore fixée.',
  st:{onsite:'Sur place',online:'En ligne',maybe:'Je ne sais pas encore',no:'Je ne viens pas'},me:'Je suis',kind:{member:'membre',guest:'invité'},
  name:'Votre nom',needName:'Saisissez d’abord votre nom',saved:'Merci, votre réponse est enregistrée.',change:'Vous pouvez changer votre réponse à tout moment.',
  counts:'{a} sur place · {b} en ligne · {c} incertain(s) · {d} absent(s)',guests:'{n} invité(s) attendu(s)',noRole:'sans rôle',
  hiddenNames:'Les membres voient qui vient.',
  alert:'{who} cherche un remplaçant comme {role} ({d}).',alertTake:'Je remplace',alertLater:'Plus tard',
  copyPresent:'Copier un message pour les présents sans rôle',msgPresent:'{who} cherche un remplaçant comme {role} le {d}. Présents sans rôle pour l’instant : {names}. Prenez le rôle ici : {link}',nobody:'personne pour l’instant',
  attendance:'Présence'},
nl:{title:'Kom je?',forDate:'Bijeenkomst van {d}',noDate:'De datum van de volgende bijeenkomst ligt nog niet vast.',
  st:{onsite:'Ter plaatse',online:'Online',maybe:'Weet ik nog niet',no:'Ik kom niet'},me:'Ik ben',kind:{member:'lid',guest:'gast'},
  name:'Je naam',needName:'Vul eerst je naam in',saved:'Bedankt, je antwoord is opgeslagen.',change:'Je kunt je antwoord altijd wijzigen.',
  counts:'{a} ter plaatse · {b} online · {c} onzeker · {d} komen niet',guests:'{n} gast(en) verwacht',noRole:'geen rol',
  hiddenNames:'Leden zien wie er komt.',
  alert:'{who} zoekt een vervanger als {role} ({d}).',alertTake:'Ik vervang',alertLater:'Later',
  copyPresent:'Bericht kopiëren voor aanwezigen zonder rol',msgPresent:'{who} zoekt een vervanger als {role} op {d}. Aanwezig en nog zonder rol: {names}. Neem de rol hier: {link}',nobody:'nog niemand',
  attendance:'Aanwezigheid'},
ar:{title:'هل ستحضر؟',forDate:'اجتماع {d}',noDate:'لم يُحدَّد تاريخ الاجتماع القادم بعد.',
  st:{onsite:'حضورياً',online:'عن بُعد',maybe:'لا أعرف بعد',no:'لن أحضر'},me:'أنا',kind:{member:'عضو',guest:'ضيف'},
  name:'اسمك',needName:'أدخل اسمك أولاً',saved:'شكراً، تم حفظ إجابتك.',change:'يمكنك تغيير إجابتك في أي وقت.',
  counts:'{a} حضورياً · {b} عن بُعد · {c} غير متأكد · {d} لن يحضر',guests:'{n} ضيف متوقَّع',noRole:'بلا دور',
  hiddenNames:'يرى الأعضاء من سيحضر.',
  alert:'{who} يبحث عن بديل في دور {role} ({d}).',alertTake:'سأحلّ محلّه',alertLater:'لاحقاً',
  copyPresent:'نسخ رسالة للحاضرين بلا دور',msgPresent:'{who} يبحث عن بديل في دور {role} يوم {d}. الحاضرون بلا دور حتى الآن: {names}. احجز الدور من هنا: {link}',nobody:'لا أحد بعد',
  attendance:'الحضور'}};
const RSL=()=>RST[LANG]||RST.en;

const myRoleKeys=()=>(typeof activeRoleKeys==='function'?activeRoleKeys():ROLE_KEYS).filter(k=>{const e=SH.roles&&SH.roles[k];return e&&e.u===SH.uid});
const holdsRoleName=n=>{const key=String(n||'').trim().toLowerCase();return !!key&&(typeof activeRoleKeys==='function'?activeRoleKeys():ROLE_KEYS).some(k=>String(roleName(k)).trim().toLowerCase()===key)};
const comingNoRole=()=>RS.list.filter(r=>['onsite','online'].includes(r.status)&&!holdsRoleName(r.name)&&r.uid!==SH.uid).map(r=>r.name);
function myKind(){if(RS.mine&&RS.mine.kind)return RS.mine.kind;if(RS.kind)return RS.kind;
  return SH.officer===true||(typeof profileMember==='function'&&profileMember())||(typeof deviceOk==='function'&&deviceOk())?'member':'member'}

function rsvpBox(noName){
  if(!SH.on)return '';
  const L=RSL();const d=rsvpDate();
  if(!d)return `<div class="box rsvp"><h3>${esc(L.title)}</h3><p class="muted" style="margin:0">${esc(L.noDate)}</p></div>`;
  const fmt=rsvpFormat();const opts=RSVP_ST.filter(s=>s!=='online'||fmt!=='inperson').filter(s=>s!=='onsite'||fmt!=='online');
  const mine=RS.mine&&RS.mine.status;const n=s=>RS.list.filter(r=>r.status===s).length;
  const known=typeof myDisplayName==='function'?myDisplayName():myName();
  const canSee=RS.list.length>0;
  const group=s=>{const ppl=RS.list.filter(r=>r.status===s);return ppl.length?`<div><span class="label">${esc(L.st[s])} (${ppl.length})</span><p style="margin:2px 0">${ppl.map(r=>`<bdi>${esc(r.name)}</bdi>${r.kind==='guest'?` <span class="chip">${esc(L.kind.guest)}</span>`:''}${['onsite','online'].includes(s)&&!holdsRoleName(r.name)?` <span class="muted">(${esc(L.noRole)})</span>`:''}`).join(', ')}</p></div>`:''};
  const guests=RS.list.filter(r=>r.kind==='guest'&&['onsite','online'].includes(r.status)).length;
  return `<div class="box rsvp"><div class="phead"><div><h3>${esc(L.title)}</h3><p class="muted" style="margin:0">${esc(L.forDate.replace('{d}',fmtDate(d)))}</p></div>
      ${RS.list.length?`<span class="chip">${esc(L.counts.replace('{a}',n('onsite')).replace('{b}',n('online')).replace('{c}',n('maybe')).replace('{d}',n('no')))}</span>`:''}</div>
    ${known||noName?'':`<div class="field"><label class="label" for="rs-name">${esc(L.name)}</label><input id="rs-name" maxlength="60" autocomplete="name"></div>`}
    ${!RS.mine&&!(SH.officer===true||(typeof profileMember==='function'&&profileMember()))?`<div class="speakers" role="group" aria-label="${esc(L.me)}"><span class="muted" style="align-self:center">${esc(L.me)}</span>${['member','guest'].map(k=>chip('rs-kind',k,myKind()===k,esc(L.kind[k]))).join('')}</div>`:''}
    <div class="speakers" role="group" aria-label="${esc(L.title)}">${opts.map(s=>`<button type="button" class="spk ${s}" data-act="rs-set" data-v="${s}" aria-pressed="${mine===s}" ${RS.busy?'disabled':''}>${esc(L.st[s])}</button>`).join('')}</div>
    ${mine?`<p class="muted" style="margin:0;font-size:.85rem">✓ ${esc(L.saved)} ${esc(L.change)}</p>`:''}
    ${guests?`<p style="margin:0"><span class="chip ok">${esc(L.guests.replace('{n}',guests))}</span></p>`:''}
    ${canSee?`<div class="rsvplist">${['onsite','online','maybe','no'].map(group).join('')}</div>`:RS.mine?'':`<p class="muted" style="margin:0;font-size:.85rem">${esc(L.hiddenNames)}</p>`}
  </div>`;
}
// The alert shown at the top of every page to people who come and have no role, when someone needs a replacement.
function swapAlerts(){
  if(!SH.on||!RS.mine||!['onsite','online'].includes(RS.mine.status)||myRoleKeys().length||!canAct())return '';
  const L=RSL();const d=rsvpDate();
  const keys=(typeof activeRoleKeys==='function'?activeRoleKeys():ROLE_KEYS).filter(k=>{const e=SH.roles&&SH.roles[k];return e&&e.swap&&e.u!==SH.uid&&!RS.seen[k+':'+e.u]});
  return keys.map(k=>{const e=SH.roles[k];return `<div class="notice swapalert" role="status"><span>🔔 ${esc(L.alert.replace('{who}',e.n).replace('{role}',roleLabel(k)).replace('{d}',d?fmtDate(d):''))}</span>
    <div class="btns"><button class="small primary" data-act="r-take" data-k="${k}">${esc(L.alertTake)}</button><button class="small ghost" data-act="rs-later" data-k="${k}" data-u="${esc(e.u)}">${esc(L.alertLater)}</button></div></div>`}).join('');
}
function swapMessage(k){
  const L=RSL();const e=SH.roles[k];const names=comingNoRole();
  return L.msgPresent.replace('{who}',e&&e.n||'').replace('{role}',roleLabel(k)).replace('{d}',rsvpDate()?fmtDate(rsvpDate()):'').replace('{names}',names.length?names.join(', '):L.nobody).replace('{link}',(()=>{const u=new URL(shareLink());u.hash='roles';return u.toString()})());
}
// Who said they come, for the meeting being closed (office.js).
function attendanceSnapshot(){const on=RS.list.filter(r=>r.status==='onsite'),ol=RS.list.filter(r=>r.status==='online');
  return {onsite:on.map(r=>r.name).slice(0,200),online:ol.map(r=>r.name).slice(0,200),guests:[...on,...ol].filter(r=>r.kind==='guest').length}}

try{RS.seen=JSON.parse(sessionStorage.getItem('gt-swap-seen')||'{}')}catch(e){RS.seen={}}
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act^="rs-"]');if(!b)return;const a=b.dataset.act;const L=RSL();
  if(a==='rs-kind'){RS.kind=b.dataset.v;render();return}
  if(a==='rs-later'){RS.seen[b.dataset.k+':'+b.dataset.u]=1;try{sessionStorage.setItem('gt-swap-seen',JSON.stringify(RS.seen))}catch(e){}render();return}
  if(a==='rs-copy'){copyText(swapMessage(b.dataset.k));return}
  if(a==='rs-set'){
    const i=document.getElementById('rs-name')||document.getElementById('my-name');let name=(typeof myDisplayName==='function'?myDisplayName():myName())||(i&&i.value.trim())||'';
    if(!name){toast(L.needName);if(i)i.focus();return}
    if(i&&i.value.trim()&&!myName())setMyName(i.value.trim());
    const d=rsvpDate();RS.busy=true;render();
    SH.fs.doc(`clubs/${SH.club}/rsvp/${d}_${SH.uid}`).set({date:d,uid:SH.uid,name:name.slice(0,60),status:b.dataset.v,kind:myKind(),at:new Date().toISOString()})
      .then(()=>toast(L.saved)).catch(writeFail).finally(()=>{RS.busy=false;render()});
  }
});
