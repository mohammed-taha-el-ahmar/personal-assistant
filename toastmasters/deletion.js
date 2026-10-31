// Orato – deleting a club space, with a 3-day delay during which any officer can cancel.
// The request is stamped with the server's clock (see firestore.rules), so the delay cannot be shortened.
// After the delay the database locks the club; the next officer who opens the site erases everything.
// clubs/{club}/public/status repeats the deadline so every member sees the notice.

const DEL_DAYS=3, DEL_MS=DEL_DAYS*24*3600*1000;
const DEL={status:null,unsub:null,ask:false,typed:'',busy:false,progress:'',done:false,failed:false};

function deletionLive(){
  if(DEL.unsub)DEL.unsub();
  DEL.unsub=SH.fs.doc(`clubs/${SH.club}/public/status`).onSnapshot(s=>{DEL.status=s.exists?s.data():null;render();maybePurge()},()=>{});
}
// The pending deletion, as the officers' document records it (officers) or as the public notice repeats it (everyone).
function pendingDeletion(){
  const d=SH.officer&&SH.deletion;
  if(d&&d.requestedAt){const at=d.requestedAt.toMillis?d.requestedAt.toMillis():Date.parse(d.requestedAt);return {at,deleteAt:at+DEL_MS,by:d.requestedBy}}
  if(DEL.status&&DEL.status.deleteAt)return {at:Date.parse(DEL.status.requestedAt||''),deleteAt:Date.parse(DEL.status.deleteAt),by:DEL.status.requestedBy||''};
  return null;
}
const deletionPassed=()=>{const p=pendingDeletion();return !!p&&Date.now()>p.deleteAt};
const fmtWhen=ms=>new Date(ms).toLocaleString(locale(),{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
function timeLeft(ms){const m=Math.max(0,Math.round((ms-Date.now())/60000));const d=Math.floor(m/1440),h=Math.floor(m%1440/60);
  return d?t('del.leftDH',{d,h}):h?t('del.leftH',{h,m:m%60}):t('del.leftM',{m})}

// Banner shown on every tab while a deletion is pending; full-page notice once it has happened.
function deletionBanner(){
  if(!SH.on)return '';const p=pendingDeletion();if(!p||Date.now()>p.deleteAt)return '';
  return `<div class="notice danger"><span>${t('del.banner',{when:esc(fmtWhen(p.deleteAt))})}</span>${SH.officer?`<button class="small" data-act="del-goto">${t('del.manage')}</button>`:''}</div>`;
}
function deletedView(){
  return `<section class="panel"><div class="box" style="align-items:flex-start">
    <h2>${t(DEL.done?'del.doneTitle':'del.goneTitle')}</h2><p class="muted">${t(DEL.done?'del.doneText':'del.goneText')}</p>
    ${DEL.busy?`<p><b>${esc(DEL.progress)}</b></p>`:''}
    ${DEL.failed&&SH.officer?`<button class="primary" data-act="del-purge">${t('del.retry')}</button>`:''}
    ${!DEL.done&&!DEL.busy&&!SH.officer?`<p class="muted">${t('del.officerFinish')}</p><button data-act="off-signin">${t('office.signIn')}</button>`:''}
    ${!DEL.busy?`<a class="btn" href="${esc(location.pathname)}">${t('del.leave')}</a>`:''}
  </div></section>`;
}

// ---------- officers' "danger zone" ----------
function deletionBox(){
  const p=SH.deletion&&pendingDeletion();
  if(p){
    return `<div class="box danger-box"><h3>${t('del.pendingTitle')}</h3>
      <p>${t('del.pendingText',{by:esc(p.by),when:esc(fmtWhen(p.deleteAt)),left:esc(timeLeft(p.deleteAt))})}</p>
      <p class="muted">${t('del.cancelHint')}</p>
      <div class="btns"><button class="primary" data-act="del-cancel" ${DEL.busy?'disabled':''}>${t('del.cancel')}</button></div></div>`;
  }
  return `<div class="box danger-box"><h3>${t('del.title')}</h3><p class="muted">${t('del.intro',{days:DEL_DAYS})}</p>
    ${DEL.ask?`<div class="field"><label class="label" for="del-code">${t('del.typeCode',{club:esc(SH.club)})}</label>
        <input id="del-code" data-del="code" autocomplete="off" value="${esc(DEL.typed)}" spellcheck="false"></div>
      <div class="btns"><button class="danger" data-act="del-request" ${DEL.typed.trim()===SH.club&&!DEL.busy?'':'disabled'}>${t('del.confirm',{days:DEL_DAYS})}</button><button data-act="del-ask-cancel">${t('common.cancel')}</button></div>`
      :`<div><button class="danger" data-act="del-ask">${t('del.button')}</button></div>`}
  </div>`;
}

async function requestDeletion(){
  DEL.busy=true;render();
  try{
    const ref=SH.fs.doc('clubs/'+SH.club);
    await ref.update({deletion:{requestedAt:firebase.firestore.FieldValue.serverTimestamp(),requestedBy:SH.user.email}});
    const d=(await ref.get({source:'server'})).data().deletion;
    const at=d.requestedAt.toMillis?d.requestedAt.toMillis():Date.now();
    await SH.fs.doc(`clubs/${SH.club}/public/status`).set({requestedAt:new Date(at).toISOString(),deleteAt:new Date(at+DEL_MS).toISOString(),requestedBy:SH.user.email});
    toast(t('del.requested'));
  }catch(e){writeFail(e)}
  DEL.busy=false;DEL.ask=false;DEL.typed='';render();
}
async function cancelDeletion(){
  DEL.busy=true;render();
  try{
    await SH.fs.doc('clubs/'+SH.club).update({deletion:firebase.firestore.FieldValue.delete()});
    await SH.fs.doc(`clubs/${SH.club}/public/status`).delete();
    toast(t('del.cancelled'));
  }catch(e){writeFail(e)}
  DEL.busy=false;render();
}

// Erase every document of the club. Runs once the delay has passed and an officer is signed in.
const PURGE_DOCS=['meeting/roles','meeting/agenda','meeting/vote','meeting/reports','meeting/draw','public/info','public/modules','public/access','private/config'];
const PURGE_COLLECTIONS=['ballots','history','feedback','interest','templates','devices','members','guestbook','media'];
async function maybePurge(){
  if(!SH.on||!SH.officer||DEL.busy||DEL.done||!SH.deletion||!deletionPassed())return;
  // Leave a minute of margin so the server's clock has passed the deadline too.
  if(Date.now()<pendingDeletion().deleteAt+60000){setTimeout(maybePurge,61000);return}
  purgeClub();
}
async function purgeClub(){
  DEL.busy=true;DEL.failed=false;render();
  const base='clubs/'+SH.club;
  const step=k=>{DEL.progress=t('del.progress',{what:k});render()};
  try{
    for(const c of PURGE_COLLECTIONS){
      step(c);
      const q=await SH.fs.collection(`${base}/${c}`).get();
      for(let i=0;i<q.docs.length;i+=400){const b=SH.fs.batch();q.docs.slice(i,i+400).forEach(d=>b.delete(d.ref));await b.commit()}
    }
    step('meeting');
    const b=SH.fs.batch();PURGE_DOCS.forEach(p=>b.delete(SH.fs.doc(`${base}/${p}`)));await b.commit();
    step('club');
    await SH.fs.doc(`${base}/public/status`).delete();
    await SH.fs.doc(base).delete();
    // Free the club code: the approved creation request is removed too, so the code can be requested again.
    try{await SH.fs.doc('requests/'+SH.club).delete()}catch(e){}
    DEL.done=true;
  }catch(e){DEL.failed=true;toast(t('del.purgeFail'))}
  DEL.busy=false;render();
}

document.addEventListener('input',ev=>{
  if(ev.target.dataset.del!=='code')return;DEL.typed=ev.target.value;
  const b=document.querySelector('[data-act=del-request]');if(b)b.disabled=DEL.typed.trim()!==SH.club;
});
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act]');if(!b||!b.dataset.act.startsWith('del-'))return;
  switch(b.dataset.act){
  case 'del-ask':DEL.ask=true;render();{const i=document.getElementById('del-code');if(i)i.focus()}return;
  case 'del-ask-cancel':DEL.ask=false;DEL.typed='';break;
  case 'del-request':if(DEL.typed.trim()===SH.club)requestDeletion();return;
  case 'del-cancel':cancelDeletion();return;
  case 'del-purge':purgeClub();return;
  case 'del-goto':setTab('office');setTimeout(()=>{const x=document.querySelector('.danger-box');if(x)x.scrollIntoView({block:'center'})},50);return;
  default:return;
  }
  render();
});
// Keep the countdown fresh and catch the moment the delay ends while the page is open.
setInterval(()=>{if(SH.on&&pendingDeletion()){softRender();maybePurge()}},60000);
