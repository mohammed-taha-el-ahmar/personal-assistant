// Orato – club creation requests and the administrator's page.
//
// A club space only opens once the Orato administrator has approved it (see firestore.rules):
//   requests/{club}   a request to open the club code {club}: club name, city, Toastmasters club number,
//                     requester's verified email, status pending / approved / rejected (+ reason)
//   clubs/{club}      created by the administrator on approval, with the requester as first officer;
//                     status approved or suspended (clubs created before this feature count as approved)
//   app/config        {admins:[emails]}  created by hand in the Firebase console; only admins can read it
//   app/public        {contact}          email shown to people who send a request; everyone reads it
// The administrator's page is the site address followed by ?admin (for example …/orato/?admin).

const REQ={mine:undefined,other:false,loading:false,draft:{name:'',city:'',tiNumber:'',role:'president',message:''},busy:false,contact:'',sentNow:false};
const ADM={isAdmin:undefined,requests:[],clubs:[],unsubR:null,unsubC:null,reject:null,reason:'',busy:'',contactDraft:null,showDone:false,suspendAsk:null};
const adminMode=()=>{try{return new URLSearchParams(location.search).has('admin')}catch(e){return false}};
const REQ_ROLES=['president','vpe','vpm','vppr','secretary','treasurer','saa','other'];
const fmtDay=iso=>iso?new Date(iso).toLocaleDateString(locale(),{day:'numeric',month:'short',year:'numeric'}):'';

// ---------- the public contact address ----------
function loadContact(){
  if(!SH.fs)return;
  SH.fs.doc('app/public').get().then(s=>{REQ.contact=s.exists&&s.data().contact||'';ADM.contactDraft=ADM.contactDraft??REQ.contact;softRender()},()=>{});
}

// ---------- club not open yet: request form (on the club officers tab) ----------
async function loadMyRequest(){
  REQ.mine=undefined;REQ.other=false;
  if(!SH.fs||!SH.club||!isMember()||!SH.user.verified)return;
  try{const s=await SH.fs.doc(`requests/${SH.club}`).get({source:'server'});REQ.mine=s.exists?s.data():null}
  catch(e){REQ.mine=null;REQ.other=e&&e.code==='permission-denied'}
  render();
}
// Shown in the "live" notice of every shared tab while the club code is not open.
function closedNotice(){
  return `<div class="notice"><span>${t('req.closed',{club:esc(SH.club)})}</span>
    <div class="btns"><button class="small primary" data-act="req-goto">${t('req.askBtn')}</button><button class="small" data-act="req-other-code">${t('req.otherCode')}</button></div></div>`;
}
function requestArea(){
  const intro=`<div class="box"><h3>${t('req.title',{club:esc(SH.club)})}</h3><p>${t('req.intro')}</p></div>`;
  if(SH.clubStatus==='suspended')return `<div class="box"><h3>${t('req.suspendedTitle')}</h3><p>${t('req.suspendedText')}</p>${contactLine()}</div>`;
  if(!isMember()||LINK.needEmail)return intro+signInBox();
  const who=`<div class="notice"><span>${t('office.signedAs',{email:esc(SH.user.email)})}</span><button class="small" data-act="off-signout">${t('office.signOut')}</button></div>`;
  if(!SH.user.verified)return who+verifyBox();
  if(REQ.mine===undefined){if(!REQ.loading){REQ.loading=true;loadMyRequest().finally(()=>{REQ.loading=false})}return `${who}<p class="empty">${t('office.loading')}</p>`}
  if(REQ.other)return `${who}<div class="box"><p>${t('req.taken',{club:esc(SH.club)})}</p>${contactLine()}<div><button class="small" data-act="req-other-code">${t('req.otherCode')}</button></div></div>`;
  const m=REQ.mine;
  if(m&&m.status==='pending')return `${who}<div class="box"><h3>${t('req.pendingTitle')}</h3>
    <p>${t('req.pendingText',{club:esc(SH.club),date:esc(fmtDay(m.at))})}</p>
    <dl class="dl"><dt>${t('req.name')}</dt><dd>${esc(m.name)}</dd><dt>${t('req.city')}</dt><dd>${esc(m.city||'–')}</dd>${m.tiNumber?`<dt>${t('req.tiNumber')}</dt><dd>${esc(m.tiNumber)}</dd>`:''}</dl>
    ${contactLine(true)}
    <div class="btns"><button class="small" data-act="req-refresh">${t('req.refresh')}</button><button class="small ghost" data-act="req-cancel">${t('req.cancel')}</button></div></div>`;
  if(m&&m.status==='approved')return `${who}<div class="box"><h3>${t('req.approvedTitle')}</h3><p>${t('req.approvedText')}</p><div><button class="primary" data-act="req-reload">${t('req.open')}</button></div></div>`;
  return `${who}${intro}${m&&m.status==='rejected'?`<div class="notice danger"><span>${t('req.rejected',{reason:esc(m.reason||t('req.noReason'))})}</span></div>`:''}${requestForm()}`;
}
function contactLine(prefill){
  if(!REQ.contact)return '';
  const subject=encodeURIComponent(`Orato – ${SH.club}`);
  return `<p class="muted">${t('req.contact')} <a href="mailto:${esc(REQ.contact)}${prefill?`?subject=${subject}`:''}">${esc(REQ.contact)}</a></p>`;
}
function requestForm(){
  const d=REQ.draft;
  return `<form class="box" data-form="req" novalidate><h3>${t('req.formTitle')}</h3>
    <div class="fields">
      <div class="field"><label class="label" for="rq-name">${t('req.name')} *</label><input id="rq-name" data-rq="name" maxlength="120" value="${esc(d.name)}" placeholder="${t('req.namePh')}"></div>
      <div class="field"><label class="label" for="rq-city">${t('req.city')} *</label><input id="rq-city" data-rq="city" maxlength="120" value="${esc(d.city)}"></div>
      <div class="field"><label class="label" for="rq-ti">${t('req.tiNumber')}</label><input id="rq-ti" data-rq="tiNumber" maxlength="20" value="${esc(d.tiNumber)}" inputmode="numeric"></div>
      <div class="field"><label class="label" for="rq-role">${t('req.role')}</label><select id="rq-role" data-rq="role">${REQ_ROLES.map(r=>`<option value="${r}" ${d.role===r?'selected':''}>${esc(r==='other'?t('req.roleOther'):t('or.'+r+'.title'))}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label class="label" for="rq-msg">${t('req.message')}</label><textarea id="rq-msg" data-rq="message" maxlength="1000" rows="3">${esc(d.message)}</textarea></div>
    <p class="muted" style="font-size:.85rem">${t('req.note',{email:esc(SH.user.email),club:esc(SH.club)})}</p>
    <div class="btns"><button type="submit" class="primary" ${REQ.busy?'disabled':''}>${t('req.send')}</button></div></form>`;
}
async function sendRequest(){
  const d=REQ.draft;
  if(!d.name.trim()||!d.city.trim()){toast(t('req.missing'));return}
  const data={club:SH.club,name:d.name.trim().slice(0,120),city:d.city.trim().slice(0,120),tiNumber:d.tiNumber.trim().slice(0,20),
    role:REQ_ROLES.includes(d.role)?d.role:'other',message:d.message.trim().slice(0,1000),email:SH.user.email,lang:LANG,at:new Date().toISOString(),status:'pending'};
  REQ.busy=true;render();
  try{await SH.fs.doc(`requests/${SH.club}`).set(data);REQ.mine=data;toast(t('req.sent'))}
  catch(e){if(e&&e.code==='permission-denied'){REQ.other=true}else toast(t('live.saveFail'))}
  REQ.busy=false;render();
}

// ---------- administrator's page (?admin) ----------
async function adminAuthChanged(){
  if(!adminMode())return;
  [ADM.unsubR,ADM.unsubC].forEach(f=>f&&f());ADM.unsubR=ADM.unsubC=null;ADM.requests=[];ADM.clubs=[];
  ADM.isAdmin=undefined;render();
  if(!SH.user||SH.user.anon||!SH.user.verified){ADM.isAdmin=false;render();return}
  try{await SH.fs.doc('app/config').get({source:'server'});ADM.isAdmin=true}catch(e){ADM.isAdmin=false}
  if(ADM.isAdmin){
    ADM.unsubR=SH.fs.collection('requests').onSnapshot(q=>{ADM.requests=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at||'').localeCompare(a.at||''));render()},()=>{});
    ADM.unsubC=SH.fs.collection('clubs').onSnapshot(q=>{ADM.clubs=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.id.localeCompare(b.id));render()},()=>{});
  }
  render();
}
function adminView(){
  const head=`<div class="phead"><div><h2>${t('adm.title')}</h2><p class="muted">${t('adm.intro')}</p></div><a class="btn small" href="${esc(location.pathname)}">${t('adm.back')}</a></div>`;
  if(!configured())return `<section class="panel">${head}<p>${t('live.notConfigured')}</p></section>`;
  if(SH.error)return `<section class="panel">${head}<p>${esc(errorText())}</p></section>`;
  if(!SH.user||SH.user.anon||LINK.needEmail)return `<section class="panel">${head}${signInBox()}</section>`;
  const who=`<div class="notice"><span>${t('office.signedAs',{email:esc(SH.user.email)})}</span><button class="small" data-act="off-signout">${t('office.signOut')}</button></div>`;
  if(!SH.user.verified)return `<section class="panel">${head}${who}${verifyBox()}</section>`;
  if(ADM.isAdmin===undefined)return `<section class="panel">${head}${who}<p class="empty">${t('office.loading')}</p></section>`;
  if(!ADM.isAdmin)return `<section class="panel">${head}${who}<div class="box"><p>${t('adm.notAdmin',{email:esc(SH.user.email)})}</p><p class="muted">${t('adm.howAdmin')}</p></div></section>`;
  const pending=ADM.requests.filter(r=>r.status==='pending'),done=ADM.requests.filter(r=>r.status!=='pending');
  const clubName=id=>{const c=ADM.clubs.find(x=>x.id===id);return c&&c.name||''};
  return `<section class="panel">${head}${who}
  <div class="box"><div class="phead"><h3>${t('adm.pending')}</h3><span class="chip ${pending.length?'warn':'ok'}">${pending.length}</span></div>
    ${pending.length?pending.map(reqCard).join(''):`<p class="empty">${t('adm.noPending')}</p>`}
    <p class="muted" style="font-size:.85rem">${t('adm.noNotif')}</p></div>
  <div class="box"><div class="phead"><h3>${t('adm.clubs')}</h3><span class="muted">${ADM.clubs.length}</span></div>
    ${ADM.clubs.length?`<div class="tablewrap"><table><thead><tr><th>${t('adm.code')}</th><th>${t('req.name')}</th><th>${t('adm.officers')}</th><th>${t('adm.status')}</th><th></th></tr></thead><tbody>
    ${ADM.clubs.map(c=>{const st=c.status||'approved';const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('club',c.id);
      return `<tr><td><a href="${esc(u.toString())}" target="_blank" rel="noopener">${esc(c.id)}</a></td><td>${esc(c.name||'')}</td><td style="font-size:.9rem">${esc((c.officers||[]).join(', '))}</td>
      <td>${st==='approved'?`<span class="chip ok">${t('adm.st.approved')}</span>`:`<span class="chip bad">${t('adm.st.suspended')}</span>`}${c.deletion?` <span class="chip warn">${t('adm.deleting')}</span>`:''}</td>
      <td style="white-space:nowrap">${st==='approved'
        ?(ADM.suspendAsk===c.id?`<button class="small danger" data-act="adm-suspend" data-id="${esc(c.id)}">${t('adm.suspendYes')}</button><button class="small ghost" data-act="adm-suspend-cancel">${t('common.cancel')}</button>`
          :`<button class="small ghost" data-act="adm-suspend-ask" data-id="${esc(c.id)}">${t('adm.suspend')}</button>`)
        :`<button class="small" data-act="adm-reactivate" data-id="${esc(c.id)}">${t('adm.reactivate')}</button>`}</td></tr>`}).join('')}
    </tbody></table></div>`:`<p class="empty">${t('adm.noClubs')}</p>`}
    <p class="muted" style="font-size:.85rem">${t('adm.suspendNote')}</p></div>
  ${done.length?`<details class="box"><summary><b>${t('adm.history',{n:done.length})}</b></summary>
    <div class="tablewrap" style="margin-top:8px"><table><thead><tr><th>${t('close.date')}</th><th>${t('adm.code')}</th><th>${t('req.name')}</th><th>${t('fb.email')}</th><th>${t('adm.status')}</th></tr></thead><tbody>
    ${done.map(r=>`<tr><td>${esc(fmtDay(r.decidedAt||r.at))}</td><td>${esc(r.club)}</td><td>${esc(r.name||clubName(r.club))}</td><td>${esc(r.email)}</td>
      <td>${r.status==='approved'?`<span class="chip ok">${t('adm.st.approved')}</span>`:`<span class="chip bad">${t('adm.st.rejected')}</span>${r.reason?`<br><span class="muted" style="font-size:.85rem">${esc(r.reason)}</span>`:''}`}
      <button class="ghost small" data-act="adm-req-del" data-id="${esc(r.id)}" aria-label="${t('common.remove')}">×</button></td></tr>`).join('')}
    </tbody></table></div></details>`:''}
  <form class="box" data-form="adm-contact" novalidate><h3>${t('adm.contactTitle')}</h3><p class="muted">${t('adm.contactIntro')}</p>
    <div class="btns" style="flex-wrap:nowrap"><input id="adm-contact" type="email" value="${esc(ADM.contactDraft??REQ.contact)}" placeholder="${t('off.addPh')}"><button type="submit">${t('cl.save')}</button></div></form>
  </section>`;
}
function reqCard(r){
  const exists=ADM.clubs.some(c=>c.id===r.club);
  return `<div class="editrow">
    <div class="phead"><div><h4 style="margin:0">${esc(r.name)} <span class="muted" style="font-weight:400">· ${esc(r.city||'')}</span></h4>
      <p class="muted" style="margin:2px 0 0">${t('adm.code')} <b style="font-family:var(--mono)">${esc(r.club)}</b>${r.tiNumber?` · ${t('req.tiNumber')} ${esc(r.tiNumber)}`:''} · ${esc(fmtDay(r.at))}</p></div></div>
    <p style="margin:0">${t('adm.by',{email:`<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>`,role:esc(r.role==='other'?t('req.roleOther'):t('or.'+(r.role||'president')+'.title'))})}</p>
    ${r.message?`<p style="margin:0;white-space:pre-wrap">${esc(r.message)}</p>`:''}
    ${exists?`<p class="chip warn" style="align-self:flex-start">${t('adm.exists')}</p>`:''}
    ${ADM.reject===r.id?`<form class="btns" data-form="adm-reject" data-id="${esc(r.id)}" style="flex-wrap:nowrap" novalidate><input id="adm-reason" maxlength="300" placeholder="${t('adm.reasonPh')}" value="${esc(ADM.reason)}"><button type="submit" class="small danger">${t('adm.rejectYes')}</button><button type="button" class="small ghost" data-act="adm-reject-cancel">${t('common.cancel')}</button></form>`
      :`<div class="btns"><button class="small primary" data-act="adm-approve" data-id="${esc(r.id)}" ${ADM.busy||exists?'disabled':''}>${t('adm.approve')}</button><button class="small" data-act="adm-reject-ask" data-id="${esc(r.id)}">${t('adm.reject')}</button></div>`}
  </div>`;
}
async function approveRequest(id){
  const r=ADM.requests.find(x=>x.id===id);if(!r)return;
  ADM.busy=id;render();
  try{
    const now=new Date().toISOString();const b=SH.fs.batch();
    b.set(SH.fs.doc(`clubs/${r.club}`),{officers:[r.email],status:'approved',name:(r.name||'').slice(0,120),approvedAt:now,approvedBy:SH.user.email});
    b.update(SH.fs.doc(`requests/${r.id}`),{status:'approved',decidedAt:now,decidedBy:SH.user.email});
    await b.commit();toast(t('adm.approved',{club:r.club}));
    const u=new URL(location.href);u.search='';u.hash='office';u.searchParams.set('club',r.club);
    copyMailDraft(r,u.toString());
  }catch(e){toast(t('adm.fail',{code:e&&e.code||'error'}))}
  ADM.busy='';render();
}
// Opens the administrator's mail app with a ready-made message for the requester (no email is sent automatically).
function copyMailDraft(r,link){
  const body=t('adm.mailBody',{name:r.name,link});
  try{window.open(`mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent(t('adm.mailSubject',{name:r.name}))}&body=${encodeURIComponent(body)}`,'_blank')}catch(e){}
}
async function setClubStatus(id,status){
  try{await SH.fs.doc(`clubs/${id}`).update({status,statusAt:new Date().toISOString(),statusBy:SH.user.email});toast(t(status==='approved'?'adm.reactivated':'adm.suspended'))}
  catch(e){toast(t('adm.fail',{code:e&&e.code||'error'}))}
  ADM.suspendAsk=null;render();
}

// ---------- events ----------
document.addEventListener('input',ev=>{
  const k=ev.target.dataset&&ev.target.dataset.rq;if(k){REQ.draft[k]=ev.target.value;return}
  if(ev.target.id==='adm-reason')ADM.reason=ev.target.value;
  if(ev.target.id==='adm-contact')ADM.contactDraft=ev.target.value;
});
document.addEventListener('change',ev=>{const k=ev.target.dataset&&ev.target.dataset.rq;if(k)REQ.draft[k]=ev.target.value});
document.addEventListener('submit',async ev=>{
  const f=ev.target.dataset.form;
  if(f==='req'){ev.preventDefault();sendRequest();return}
  if(f==='adm-reject'){ev.preventDefault();const id=ev.target.dataset.id;
    try{await SH.fs.doc(`requests/${id}`).update({status:'rejected',reason:ADM.reason.trim().slice(0,300),decidedAt:new Date().toISOString(),decidedBy:SH.user.email});toast(t('adm.rejected'))}
    catch(e){toast(t('adm.fail',{code:e&&e.code||'error'}))}
    ADM.reject=null;ADM.reason='';render();return}
  if(f==='adm-contact'){ev.preventDefault();const c=(ADM.contactDraft||'').trim().toLowerCase();
    if(c&&!emailOk(c)){toast(t('off.invalid'));return}
    try{await SH.fs.doc('app/public').set({contact:c,updatedAt:new Date().toISOString()});REQ.contact=c;toast(t('adm.contactSaved'))}catch(e){toast(t('adm.fail',{code:e&&e.code||'error'}))}
    return}
});
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-act]');if(!b||!/^(req|adm)-/.test(b.dataset.act))return;const id=b.dataset.id;
  switch(b.dataset.act){
  case 'req-goto':setTab('office');return;
  case 'req-other-code':{const u=new URL(location.href);u.search='';u.hash='';if(LANG!=='en')u.searchParams.set('lang',LANG);location.href=u.toString();return}
  case 'req-refresh':loadMyRequest();return;
  case 'req-reload':location.reload();return;
  case 'req-cancel':try{await SH.fs.doc(`requests/${SH.club}`).delete();REQ.mine=null;toast(t('req.cancelled'))}catch(e){writeFail(e)}render();return;
  case 'adm-approve':approveRequest(id);return;
  case 'adm-reject-ask':ADM.reject=id;ADM.reason='';render();{const i=document.getElementById('adm-reason');if(i)i.focus()}return;
  case 'adm-reject-cancel':ADM.reject=null;render();return;
  case 'adm-suspend-ask':ADM.suspendAsk=id;render();return;
  case 'adm-suspend-cancel':ADM.suspendAsk=null;render();return;
  case 'adm-suspend':setClubStatus(id,'suspended');return;
  case 'adm-reactivate':setClubStatus(id,'approved');return;
  case 'adm-req-del':SH.fs.doc(`requests/${id}`).delete().catch(()=>{});return;
  }
});
