// Toastmasters Tools – club officers' space (Bureau): Google sign-in, officer list, meeting archive, history, participation.
// Data (see firestore.rules):
//   clubs/{club}                 {officers:[emails]}   readable and editable by officers only
//   clubs/{club}/history/{id}    one archived meeting  officers only
//   clubs/{club}/meeting/reports Timer / Ah-Counter / Grammarian reports sent during the meeting

const OFF={unsubClub:null,unsubHist:null,unsubFb:null,confirmClose:false,confirmDelete:null,reset:true,busy:false};
const emailOk=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isMember=()=>SH.user&&!SH.user.anon;

// ---------- access ----------
function stopOfficerSubs(){['unsubClub','unsubHist','unsubFb'].forEach(k=>{if(OFF[k]){OFF[k]();OFF[k]=null}});SH.history=[];SH.feedback=[];if(typeof stopInterestSub==='function')stopInterestSub();if(typeof accessStopOfficerSubs==='function')accessStopOfficerSubs();if(typeof membersStopSubs==='function')membersStopSubs()}
async function officeAuthChanged(){
  stopOfficerSubs();
  if(!SH.fs||!SH.club||!isMember()){SH.officer=undefined;SH.clubExists=undefined;SH.officers=[];return}
  SH.officer=undefined;SH.officeErr='';softRender();
  const ref=SH.fs.doc('clubs/'+SH.club);
  try{
    const d=await ref.get({source:'server'});
    SH.clubExists=d.exists;SH.officers=d.exists?(d.data().officers||[]):[];
    SH.officer=d.exists&&SH.officers.includes(SH.user.email);
    SH.deletion=d.exists?(d.data().deletion||null):null;
  }catch(e){
    SH.officer=false;SH.officers=[];
    if(e&&e.code==='permission-denied'){
      // Two possible reasons: this club has officers and this person is not one, or the database still runs older rules.
      // The current rules let a Google-signed-in person read a club that does not exist; older rules refuse it.
      try{await SH.fs.doc('clubs/zz-rules-check').get({source:'server'});SH.clubExists=true}
      catch(e2){SH.officeErr='rules'}
    }else{SH.officeErr=(e&&e.code)||'error'}
  }
  if(SH.officer)startOfficerSubs();
  softRender();
}
function startOfficerSubs(){
  if(typeof startInterestSub==='function')startInterestSub();
  if(typeof accessOfficerSubs==='function')accessOfficerSubs();
  if(typeof membersOfficerSubs==='function')membersOfficerSubs();
  OFF.unsubClub=SH.fs.doc('clubs/'+SH.club).onSnapshot(s=>{
    SH.officers=s.exists?(s.data().officers||[]):[];SH.officer=SH.officers.includes(SH.user.email);
    SH.deletion=s.exists?(s.data().deletion||null):null;
    if(!SH.officer)stopOfficerSubs();softRender();
    if(typeof maybePurge==='function')maybePurge();
  },()=>{SH.officer=false;stopOfficerSubs();softRender()});
  OFF.unsubHist=SH.fs.collection('clubs/'+SH.club+'/history').orderBy('date','desc').limit(300).onSnapshot(q=>{
    SH.history=q.docs.map(d=>({id:d.id,...d.data()}));softRender();
  },()=>{});
  OFF.unsubFb=SH.fs.collection('clubs/'+SH.club+'/feedback').orderBy('at','desc').limit(1000).onSnapshot(q=>{
    SH.feedback=q.docs.map(d=>({id:d.id,...d.data()}));softRender();
  },()=>{});
}
// ---------- passwordless sign-in by email link (for officers without a Google account) ----------
// Firebase emails a one-time link. Opening it on the same device signs the officer in; on another device
// the page asks for the address again (Firebase requires it to match). Access still depends on the officer list.
const LINK_KEY='gt-emailForSignIn';
const LINK={sent:'',needEmail:false,busy:false,error:''};
function officeLinkUrl(){const u=new URL(shareLink());u.hash='office';return u.toString()}
async function sendSignInLink(email){
  email=email.trim().toLowerCase();if(!emailOk(email)){toast(t('off.invalid'));return}
  LINK.busy=true;LINK.error='';render();
  try{
    await firebase.auth().sendSignInLinkToEmail(email,{url:officeLinkUrl(),handleCodeInApp:true});
    try{localStorage.setItem(LINK_KEY,email)}catch(e){}
    LINK.sent=email;
  }catch(e){
    const c=e&&e.code||'';
    LINK.error=c==='auth/quota-exceeded'?t('link.quota'):c==='auth/operation-not-allowed'?t('link.notEnabled'):c==='auth/unauthorized-continue-uri'||c==='auth/unauthorized-domain'?t('office.domainFail'):t('link.sendFail');
  }
  LINK.busy=false;render();
}
// Called once Firebase is ready: finishes the sign-in when the page was opened from the emailed link.
async function completeEmailLink(typed){
  const a=firebase.auth();
  if(!a.isSignInWithEmailLink||!a.isSignInWithEmailLink(location.href))return;
  let email=typed;if(!email){try{email=localStorage.getItem(LINK_KEY)||''}catch(e){}}
  if(!email){LINK.needEmail=true;tab='office';render();return}
  LINK.busy=true;LINK.error='';
  try{
    await a.signInWithEmailLink(email.trim().toLowerCase(),location.href);
    try{localStorage.removeItem(LINK_KEY)}catch(e){}
    LINK.needEmail=false;LINK.sent='';
    // Remove the one-time code from the address bar.
    try{const u=new URL(officeLinkUrl());history.replaceState(null,'',u.pathname+u.search+'#office')}catch(e){}
    tab='office';toast(t('link.signedIn'));
  }catch(e){
    const c=e&&e.code||'';
    LINK.error=c==='auth/invalid-email'?t('link.wrongEmail'):c==='auth/invalid-action-code'||c==='auth/expired-action-code'?t('link.expired'):t('link.signInFail');
    LINK.needEmail=c==='auth/invalid-email';tab='office';
  }
  LINK.busy=false;render();
}
function signInBox(){
  if(LINK.needEmail)return `<form class="box" data-form="link-confirm" novalidate><h3>${t('link.confirmTitle')}</h3><p class="muted">${t('link.confirmText')}</p>
    ${LINK.error?`<p class="chip bad" style="align-self:flex-start">${esc(LINK.error)}</p>`:''}
    <div class="btns" style="flex-wrap:nowrap"><input id="link-confirm" type="email" autocomplete="email" placeholder="${t('off.addPh')}"><button type="submit" class="primary" ${LINK.busy?'disabled':''}>${t('link.finish')}</button></div></form>`;
  return `<div class="box"><p>${t('office.signInText')}</p>
    <div><button class="primary" data-act="off-signin">${t('office.signIn')}</button></div>
    <div style="border-top:1px solid var(--line);padding-top:12px;display:flex;flex-direction:column;gap:8px">
      <h3>${t('link.title')}</h3><p class="muted">${t('link.intro')}</p>
      ${LINK.sent?`<div class="notice"><span>${t('link.sent',{email:esc(LINK.sent)})}</span><button class="small" data-act="link-again">${t('link.again')}</button></div>`
        :`<form class="btns" data-form="link-send" style="flex-wrap:nowrap" novalidate><input id="link-email" type="email" autocomplete="email" placeholder="${t('off.addPh')}" aria-label="${t('fb.email')}"><button type="submit" ${LINK.busy?'disabled':''}>${t('link.send')}</button></form>`}
      ${LINK.error?`<p class="chip bad" style="align-self:flex-start;white-space:normal">${esc(LINK.error)}</p>`:''}
    </div></div>`;
}
document.addEventListener('submit',ev=>{
  const f=ev.target.dataset.form;if(f!=='link-send'&&f!=='link-confirm')return;ev.preventDefault();
  if(f==='link-send')sendSignInLink(document.getElementById('link-email').value);
  else completeEmailLink(document.getElementById('link-confirm').value);
});
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-act=link-again]');if(b){LINK.sent='';LINK.error='';render()}});

async function officeSignIn(){
  try{await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())}
  catch(e){
    if(e&&(e.code==='auth/popup-closed-by-user'||e.code==='auth/cancelled-popup-request'))return;
    toast(t(e&&e.code==='auth/unauthorized-domain'?'office.domainFail':'office.popupFail'));
  }
}
async function officeSignOut(){try{await firebase.auth().signOut()}catch(e){}}

// ---------- reports sent by role holders ----------
function sendBtn(kind){
  if(!SH.on||!isOn('reports'))return '';
  // Visitors are pointed to the club code; only members and officers send reports.
  if(!canAct())return `<button class="small" data-act="acc-where" title="${esc(t('acc.reportHint'))}">${t('rep.send')} 🔒</button>`;
  const r=SH.reports&&SH.reports[kind];
  const when=r&&r.at?new Date(r.at).toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit'}):'';
  return `<button class="small" data-act="send-report" data-kind="${kind}">${t('rep.send')}</button>${r?`<span class="chip ok" style="align-self:center">${t('rep.sent',{time:when})}</span>`:''}`;
}
async function sendReport(kind){
  let data;
  if(kind==='timer')data={log:S.timer.log.map(l=>({name:l.name,type:logType(l),secs:l.secs,q:l.q!==false}))};
  if(kind==='ah')data={speakers:S.ah.speakers.map(s=>({name:s.name,counts:Object.fromEntries(Object.entries(s.c).filter(([,n])=>n).map(([id,n])=>[ahLabel(id),n]))}))};
  if(kind==='gram'){const g=S.gram;data={word:g.word,type:g.type,def:g.def,ex:g.ex,speakers:g.speakers.map(s=>({name:s.name,n:s.n})),good:g.good,improve:g.improve}}
  data.at=new Date().toISOString();data.by=myName()||'';
  try{await SH.ref.reports.set({[kind]:data},{merge:true});toast(t('rep.sentToast'))}catch(e){writeFail(e)}
}

// ---------- closing a meeting ----------
const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function currentSnapshot(){
  const a=S.agenda;const roles={};ROLE_KEYS.forEach(k=>{const n=roleName(k);if(n)roles[k]=n});
  const votes=S.vote.cats.map((c,i)=>{const {votes,total}=tally(i);return {key:c.key||null,name:c.name||null,cands:c.cands||[],results:votes,total}});
  return {date:a.date||todayISO(),club:a.club||'',theme:a.theme||'',venue:a.venue||'',start:a.start||'19:00',online:online(a),
    items:(a.items||[]).map(it=>({k:it.k||null,title:it.title||null,role:it.role||'',dur:Number(it.dur)||0})),
    roles,votes,reports:clone(SH.reports||{}),closedAt:new Date().toISOString(),closedBy:SH.user.email};
}
async function closeMeeting(){
  if(OFF.busy)return;OFF.busy=true;
  const snap=currentSnapshot();
  const id=snap.date+'-'+Date.now().toString(36);
  try{
    await SH.fs.doc('clubs/'+SH.club+'/history/'+id).set(snap);
    if(OFF.reset){
      SH.roles={};await SH.ref.roles.set({roles:{}});
      await SH.ref.reports.set({});
      S.vote.cats.forEach(c=>{c.round=(c.round||0)+1;c.cands=[]});S.vote.reveal=false;await pushVote();
      S.agenda.date='';S.agenda.theme='';S.agenda.items.forEach(it=>{if(it.k)it.title=null});
      clearTimeout(SH.agendaTimer);SH.agendaDirty=false;await SH.ref.agenda.set(clone(S.agenda));
    }
    toast(t('close.done'));
  }catch(e){writeFail(e)}
  OFF.busy=false;OFF.confirmClose=false;render();
}

// ---------- history helpers ----------
const fbFor=date=>(SH.feedback||[]).filter(f=>f.date===date);
const histPerson=(m,it)=>it.role?((m.roles||{})[it.role]||t('ag.open')):'';
const voteLabel=v=>v.key?t('cat.'+v.key):(v.name||'');
function voteLines(m){
  return (m.votes||[]).filter(v=>v.total).map(v=>{
    const sorted=Object.entries(v.results||{}).sort((a,b)=>b[1]-a[1]);
    return `${voteLabel(v)}: ${sorted.map(([n,c])=>`${n} (${c})`).join(', ')}`;
  });
}
function reportLines(m){
  const r=m.reports||{},out={timer:[],ah:[],gram:[]};
  if(r.timer)out.timer=(r.timer.log||[]).map(l=>`${l.name} – ${l.type} – ${mmss(l.secs)} – ${l.q?t('timer.repQ'):t('timer.repOut')}`);
  if(r.ah)out.ah=(r.ah.speakers||[]).map(s=>{const e=Object.entries(s.counts||{});const n=e.reduce((a,[,c])=>a+c,0);return `${s.name}: ${n?e.map(([w,c])=>`${w} ×${c}`).join(', '):t('ah.clean')}`});
  if(r.gram){const g=r.gram;out.gram=[t('hist.word',{w:g.word||'–'}),...(g.speakers||[]).filter(s=>s.n).map(s=>`${s.name} ×${s.n}`),g.good?`${t('gram.repGood')}: ${g.good}`:'',g.improve?`${t('gram.repImprove')}: ${g.improve}`:''].filter(Boolean)}
  return out;
}
function historyPdf(m){
  const rl=reportLines(m);
  return buildAgendaPdf({club:m.club,date:m.date,venue:m.venue,theme:m.theme,start:m.start,online:m.online,items:m.items||[],person:it=>histPerson(m,it),
    sections:[{title:t('hist.votes'),lines:voteLines(m)},{title:t('fb.title'),lines:feedbackPdfLines(fbFor(m.date))},{title:t('hist.timer'),lines:rl.timer},{title:t('hist.ah'),lines:rl.ah},{title:t('hist.gram'),lines:rl.gram}]},
    pdfName(m.date));
}
function participation(){
  const map={};
  SH.history.forEach(m=>Object.entries(m.roles||{}).forEach(([k,name])=>{
    const key=String(name).trim().toLocaleLowerCase();if(!key)return;
    const p=map[key]||(map[key]={name:String(name).trim(),roles:0,speeches:0,evals:0,last:''});
    p.roles++;if(/^s\d$/.test(k))p.speeches++;if(/^e\d$/.test(k)||k==='tte')p.evals++;if((m.date||'')>p.last)p.last=m.date||'';
  }));
  return Object.values(map).sort((a,b)=>b.roles-a.roles||a.name.localeCompare(b.name));
}

// ---------- view ----------
function officeView(){
  return `<section class="panel">
  ${isOn('office.roles')?`<div class="phead"><div><h2>${t('office.pubTitle')}</h2><p class="muted">${t('office.pubIntro')}</p></div></div>
  ${bureauPublic()}`:''}
  <div class="phead" style="${isOn('office.roles')?'margin-top:16px':''}"><div><h2>${t('office.title')}</h2><p class="muted">${t('office.intro')}</p></div></div>
  ${officerArea()}</section>`;
}
function officerArea(){
  if(!SH.on)return `${liveBox()}${configured()?`<p class="muted">${t('office.needLive')}</p>`:''}`;
  if(!isMember()||LINK.needEmail)return signInBox();
  const who=`<div class="notice"><span>${t('office.signedAs',{email:esc(SH.user.email)})}</span><button class="small" data-act="off-signout">${t('office.signOut')}</button></div>`;
  if(!SH.user.email||!SH.user.verified)return `${who}<div class="box"><p>${t('office.noEmail')}</p></div>`;
  if(SH.officer===undefined)return `${who}<p class="empty">${t('office.loading')}</p>`;
  if(SH.officeErr==='rules')return `${who}<div class="box"><h3>${t('office.rulesTitle')}</h3><p>${t('office.rulesText')}</p><div><button class="small" data-act="off-retry">${t('office.retry')}</button></div></div>`;
  if(SH.officeErr)return `${who}<div class="box"><p>${t('office.otherErr',{code:esc(SH.officeErr)})}</p><div><button class="small" data-act="off-retry">${t('office.retry')}</button></div></div>`;
  if(!SH.officer){
    return `${who}<div class="box">${SH.clubExists===false
      ?`<h3>${t('office.claimTitle')}</h3><p class="muted">${t('office.claimText')}</p><div><button class="primary" data-act="off-claim">${t('office.claim')}</button></div>`
      :`<p>${t('office.notOfficer',{email:esc(SH.user.email)})}</p>`}</div>`;
  }
  return `${who}<div class="notice"><span>${t('office.editClubHint')}</span><button class="small" data-act="go-club-edit">${t('cl.edit')}</button></div>
    ${accessOn()?'':accessBox()}${isOn('members')?`<div class="notice"><span>${t('mem.officeHint')}</span><button class="small" data-act="go-members">${t('tab.members')}</button></div>`:''}${linkBox()}${accessOn()?accessBox():''}${closeBox()}${isOn('feedback')?currentFeedbackBox():''}${interestListBox()}${historyBox()}${participationBox()}${modulesBox()}${officersBox()}${deletionBox()}`;
}
function linkBox(){
  return `<div class="box"><div class="phead"><div><h3>${t('qr.clubTitle')}</h3><p class="muted">${t('qr.officeText')}</p></div>
    <div class="btns"><button class="small primary" data-act="qr-club">${t('qr.show')}</button>${isOn('feedback')?`<button class="small" data-act="qr-feedback">${t('fb.showQr')}</button>`:''}<button class="small" data-act="copy-link">${t('live.copyLink')}</button></div></div>
    <p class="qrurl" style="text-align:left">${esc(shareLink())}</p></div>`;
}
function currentFeedbackBox(){
  const d=meetingDate();
  return `<div class="box"><div><h3>${t('fb.currentTitle')}</h3><p class="muted">${t('fb.meetingOf',{date:esc(fmtDate(d))})}</p></div>${feedbackHtml(fbFor(d))}</div>`;
}
function closeBox(){
  const a=S.agenda;const filled=ROLE_KEYS.filter(k=>roleName(k)).length;
  const ballots=S.vote.cats.reduce((n,c,i)=>n+tally(i).total,0);
  const rep=k=>SH.reports&&SH.reports[k]?`<span class="chip ok">${t('tab.'+k)} ✓</span>`:`<span class="chip warn">${t('tab.'+k)}: ${t('hist.noReport')}</span>`;
  return `<div class="box"><div><h3>${t('close.title')}</h3><p class="muted">${t('close.intro')}</p></div>
    <div class="kv">
      <div><span class="label">${t('close.date')}</span><b>${esc(a.date?fmtDate(a.date):'–')}</b></div>
      <div><span class="label">${t('close.rolesFilled')}</span><b>${filled} / ${ROLE_KEYS.length}</b></div>
      <div><span class="label">${t('close.votes')}</span><b>${ballots}</b></div>
    </div>
    <div><span class="label">${t('close.reports')}</span><div class="btns" style="margin-top:6px">${rep('timer')}${rep('ah')}${rep('gram')}</div></div>
    <label class="check" for="off-reset"><input type="checkbox" id="off-reset" data-act="off-reset" ${OFF.reset?'checked':''}><span>${t('close.reset')}</span></label>
    <div class="btns">${!a.date?`<span class="muted">${t('close.noDate')}</span>`:OFF.confirmClose
      ?`<span class="muted" style="align-self:center">${t('close.confirm',{date:esc(fmtDate(a.date))})}</span><button class="primary" data-act="off-close" ${OFF.busy?'disabled':''}>${t('close.yes')}</button><button data-act="off-close-cancel">${t('common.cancel')}</button>`
      :`<button class="primary" data-act="off-close-ask">${t('close.button')}</button>`}</div>
  </div>`;
}
function historyBox(){
  const H=SH.history;
  return `<div class="box"><div class="phead"><h3>${t('hist.title')}</h3><span class="muted">${tn('hist.count',H.length)}</span></div>
  ${H.length?H.map(m=>{const rl=reportLines(m);const vl=voteLines(m);const nRoles=Object.keys(m.roles||{}).length;const times=timesFor(m.start,m.items||[]);
    const list=(title,lines)=>`<div><span class="label">${title}</span>${lines.length?`<ul>${lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`:`<p class="muted">${t('hist.noReport')}</p>`}</div>`;
    return `<details class="meeting"><summary><b>${esc(fmtDate(m.date))}</b>${m.theme?`<span>${t('ag.themeIs')} ${esc(m.theme)}</span>`:''}<span class="muted">${t('hist.summary',{items:(m.items||[]).length,roles:nRoles})}</span></summary>
    <div class="mbody">
      <div><span class="label">${t('hist.agenda')}</span><ul>${(m.items||[]).map((it,i)=>`<li><span style="font-family:var(--mono)">${times[i]}</span> ${esc(itemTitle(it))}${it.role?` – <b>${esc(histPerson(m,it))}</b>`:''}</li>`).join('')}</ul></div>
      <div><span class="label">${t('hist.votes')}</span>${vl.length?`<ul>${vl.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`:`<p class="muted">${t('hist.noVotes')}</p>`}</div>
      ${list(t('hist.timer'),rl.timer)}${list(t('hist.ah'),rl.ah)}${list(t('hist.gram'),rl.gram)}
      <div style="grid-column:1/-1;display:flex;flex-direction:column;gap:10px"><span class="label">${t('fb.title')}</span>${feedbackHtml(fbFor(m.date))}</div>
      <div style="grid-column:1/-1" class="btns"><button class="small primary" data-act="off-hpdf" data-id="${esc(m.id)}">${t('ag.pdf')}</button>
        ${OFF.confirmDelete===m.id?`<span class="muted" style="align-self:center">${t('hist.confirmDelete')}</span><button class="small" data-act="off-hdel" data-id="${esc(m.id)}">${t('hist.yesDelete')}</button><button class="small ghost" data-act="off-hdel-cancel">${t('common.cancel')}</button>`
          :`<button class="small ghost" data-act="off-hdel-ask" data-id="${esc(m.id)}">${t('hist.delete')}</button>`}
        <span class="muted" style="align-self:center;margin-left:auto;font-size:.85rem">${t('hist.closedBy',{email:esc(m.closedBy||'')})}</span></div>
    </div></details>`}).join(''):`<p class="empty">${t('hist.empty')}</p>`}
  </div>`;
}
function participationBox(){
  const P=participation();if(!P.length)return '';
  return `<div class="box"><div><h3>${t('part.title')}</h3><p class="muted">${t('part.intro')}</p></div>
  <div class="tablewrap"><table><thead><tr><th>${t('part.member')}</th><th class="num">${t('part.roles')}</th><th class="num">${t('part.speeches')}</th><th class="num">${t('part.evals')}</th><th>${t('part.last')}</th></tr></thead><tbody>
  ${P.map(p=>`<tr><td>${esc(p.name)}</td><td class="num">${p.roles}</td><td class="num">${p.speeches||''}</td><td class="num">${p.evals||''}</td><td>${esc(p.last?new Date(p.last+'T12:00').toLocaleDateString(locale(),{day:'numeric',month:'short',year:'numeric'}):'')}</td></tr>`).join('')}
  </tbody></table></div></div>`;
}
function officersBox(){
  return `<div class="box"><div><h3>${t('off.title')}</h3><p class="muted">${t('off.intro')}</p></div>
  <div class="wchips">${SH.officers.map(e=>`<span class="wchip">${esc(e)}${e===SH.user.email?' '+t('off.you'):''}${SH.officers.length>1&&!SH.deletion?`<button class="ghost small" data-act="off-remove" data-email="${esc(e)}" aria-label="${esc(t('off.remove',{email:e}))}">×</button>`:'&nbsp;&nbsp;'}</span>`).join('')}</div>
  <form class="btns" data-form="off-add" style="flex-wrap:nowrap"><input id="off-email" type="email" placeholder="${t('off.addPh')}" autocomplete="off"><button type="submit">${t('common.add')}</button></form></div>`;
}

// ---------- actions ----------
function officeAct(a,b){
  switch(a){
  case 'send-report':sendReport(b.dataset.kind);break;
  case 'off-signin':officeSignIn();break;
  case 'off-signout':officeSignOut();break;
  case 'off-retry':officeAuthChanged();break;
  case 'go-club-edit':CL.draft=normInfo(CL.info);if(!CL.draft.name)CL.draft.name=(S.agenda&&S.agenda.club)||'';CL.edit=true;setTab('club');break;
  case 'off-claim':SH.fs.doc('clubs/'+SH.club).set({officers:[SH.user.email]}).then(officeAuthChanged).catch(writeFail);break;
  case 'off-reset':OFF.reset=b.checked;break;
  case 'off-close-ask':OFF.confirmClose=true;render();break;
  case 'off-close-cancel':OFF.confirmClose=false;render();break;
  case 'off-close':closeMeeting();break;
  case 'off-hpdf':{const m=SH.history.find(h=>h.id===b.dataset.id);if(m)historyPdf(m);break}
  case 'off-hdel-ask':OFF.confirmDelete=b.dataset.id;render();break;
  case 'off-hdel-cancel':OFF.confirmDelete=null;render();break;
  case 'off-hdel':SH.fs.doc('clubs/'+SH.club+'/history/'+b.dataset.id).delete().then(()=>toast(t('hist.deleted'))).catch(writeFail);OFF.confirmDelete=null;render();break;
  case 'off-remove':{const e=b.dataset.email;if(SH.officers.length<=1){toast(t('off.last'));break}if(SH.deletion){toast(t('del.noRemove'));break}
    SH.fs.doc('clubs/'+SH.club).update({officers:firebase.firestore.FieldValue.arrayRemove(e)}).catch(writeFail);break}
  }
}
document.addEventListener('change',ev=>{if(ev.target.id==='off-reset')OFF.reset=ev.target.checked});
document.addEventListener('submit',ev=>{
  if(ev.target.dataset.form!=='off-add')return;ev.preventDefault();
  const inp=document.getElementById('off-email');const e=inp.value.trim().toLowerCase();
  if(!emailOk(e)){toast(t('off.invalid'));return}
  if(SH.officers.includes(e)){inp.value='';return}
  if(SH.officers.length>=20){toast(t('off.tooMany'));return}
  SH.fs.doc('clubs/'+SH.club).update({officers:firebase.firestore.FieldValue.arrayUnion(e)}).then(()=>{inp.value=''}).catch(writeFail);
});
