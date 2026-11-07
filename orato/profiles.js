// Oratia – personal profiles and the club directory.
//
// Anyone can create a profile with a confirmed email address (Google, or email and password), then join a club:
//   users/{uid}                 the person's own profile: name, email, consent date, contact details, clubs joined.
//                               Only the person reads and writes it.
//   clubs/{club}/people/{uid}   the person in this club: role guest or member, status active or former, a pending
//                               request to become a member (requested:'member'), the history of role changes and the
//                               linked record of the member list (memberId). The person creates it as a guest and can
//                               ask to become a member; officers decide. Officers are recognised by the officer list.
//   clubs/{club}/directory/{uid} the contact card a member chooses to show to the other members (opt-in). Only active
//                               members and officers read it; only the person writes it.
// An active member profile counts like a device unlocked with the member code: no code to type on each device.
// "My data" shows everything stored, downloads it, and deletes the account with its club profiles and cards.

const PROF={user:undefined,me:undefined,people:[],dir:[],unsubs:[],offUnsub:null,dirUnsub:null,busy:false,
  draft:null,confirmDel:false,confirmLeave:false,q:'',approve:{},confirmRemove:null};
const DIR_FIELDS=['email','phone','whatsapp','linkedin'];

const myProfile=()=>PROF.user||null;
const myPerson=()=>PROF.me||null;
const personActive=()=>{const p=myPerson();return !!(p&&p.status==='active')};
const profileMember=()=>{const p=myPerson();return !!(p&&p.status==='active'&&p.role==='member')};
const directoryAccess=()=>SH.on&&(SH.officer===true||profileMember());
const pendingMember=p=>p&&p.status==='active'&&p.role==='guest'&&p.requested==='member';
const firstName=n=>String(n||'').trim().split(/\s+/)[0]||'';

function profilesStop(){PROF.unsubs.forEach(f=>f());PROF.unsubs=[];if(PROF.dirUnsub){PROF.dirUnsub();PROF.dirUnsub=null}PROF.dir=[]}
function profilesStopOfficer(){if(PROF.offUnsub){PROF.offUnsub();PROF.offUnsub=null}PROF.people=[]}
// Called whenever the signed-in person changes (app.js) and when the officer status is known (office.js).
function profilesAuthChanged(){
  profilesStop();PROF.user=undefined;PROF.me=undefined;PROF.confirmDel=PROF.confirmLeave=false;
  if(!SH.fs||!SH.user||SH.user.anon||!SH.user.verified){PROF.user=null;PROF.me=null;return}
  PROF.unsubs.push(SH.fs.doc(`users/${SH.uid}`).onSnapshot(s=>{PROF.user=s.exists?s.data():null;softRender()},()=>{PROF.user=null;softRender()}));
  if(SH.club&&!SH.closed){
    PROF.unsubs.push(SH.fs.doc(`clubs/${SH.club}/people/${SH.uid}`).onSnapshot(s=>{PROF.me=s.exists?s.data():null;profilesDirSub();softRender();if(typeof claimMySlots==='function')claimMySlots()},()=>{PROF.me=null;softRender()}));
  }else PROF.me=null;
  if(typeof mentoringAuthChanged==='function')mentoringAuthChanged();
}
function profilesDirSub(){
  if(directoryAccess()){
    if(!PROF.dirUnsub)PROF.dirUnsub=SH.fs.collection(`clubs/${SH.club}/directory`).onSnapshot(q=>{
      PROF.dir=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.name).localeCompare(String(b.name)));softRender()},
      // A refused listener is dropped so that the next call can open it again.
      e=>{console.warn('directory',e&&e.code);PROF.dir=PROF.dir.filter(d=>d.id===SH.uid);if(PROF.dirUnsub){try{PROF.dirUnsub()}catch(x){}}PROF.dirUnsub=null});
  }else if(PROF.dirUnsub){PROF.dirUnsub();PROF.dirUnsub=null;PROF.dir=[]}
}
function profilesOfficerSubs(){
  profilesStopOfficer();
  PROF.offUnsub=SH.fs.collection(`clubs/${SH.club}/people`).onSnapshot(q=>{
    PROF.people=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.name).localeCompare(String(b.name)));softRender()},()=>{PROF.people=[]});
  profilesDirSub();
}

async function profRun(fn,ok){PROF.busy=true;render();try{await fn();if(ok)toast(ok)}catch(e){writeFail(e)}PROF.busy=false;render()}
const nowIso=()=>new Date().toISOString();

// ---------- my profile ----------
async function createProfile(name){
  await SH.fs.doc(`users/${SH.uid}`).set({name,email:SH.user.email,lang:LANG,consentAt:nowIso(),createdAt:nowIso(),updatedAt:nowIso(),contact:{},clubs:[]});
}
async function joinClub(requested){
  const u=myProfile();if(!u)return;
  await SH.fs.doc(`clubs/${SH.club}/people/${SH.uid}`).set({name:u.name,email:SH.user.email,role:'guest',status:'active',requested,at:nowIso(),history:[]});
  if(!(u.clubs||[]).includes(SH.club))await SH.fs.doc(`users/${SH.uid}`).update({clubs:[...(u.clubs||[]),SH.club].slice(-20),updatedAt:nowIso()});
}
async function leaveClub(){
  await SH.fs.doc(`clubs/${SH.club}/directory/${SH.uid}`).delete().catch(()=>{});
  await SH.fs.doc(`clubs/${SH.club}/people/${SH.uid}`).delete();
  const u=myProfile();if(u)await SH.fs.doc(`users/${SH.uid}`).update({clubs:(u.clubs||[]).filter(c=>c!==SH.club),updatedAt:nowIso()});
}
function readDirForm(){
  const v=id=>(document.getElementById(id)||{}).value||'';
  const c={email:v('pd-email').trim().toLowerCase().slice(0,120),phone:v('pd-phone').trim().slice(0,40),whatsapp:v('pd-whatsapp').trim().slice(0,40),linkedin:v('pd-linkedin').trim().slice(0,200)};
  if(c.linkedin&&!/^[a-z]+:/i.test(c.linkedin))c.linkedin='https://'+c.linkedin;
  if(c.linkedin&&!safeUrl(c.linkedin))c.linkedin='';
  const show={};DIR_FIELDS.forEach(k=>{const b=document.getElementById('pds-'+k);show[k]=!!(b&&b.checked)});
  return {c,show,listed:!!(document.getElementById('pd-listed')||{}).checked};
}
// Reads the form before anything re-renders it.
async function saveDirectory({c,show,listed}){
  const u=myProfile();
  const ref=SH.fs.doc(`clubs/${SH.club}/directory/${SH.uid}`);
  // The card first: it is what the directory shows. Then the details kept in the profile, for next time.
  if(!listed){await ref.delete();PROF.dir=PROF.dir.filter(d=>d.id!==SH.uid)}
  else{const card={name:u.name,updatedAt:nowIso()};DIR_FIELDS.forEach(k=>{card[k]=show[k]?c[k]:''});
    await ref.set(card);PROF.dir=[...PROF.dir.filter(d=>d.id!==SH.uid),{id:SH.uid,...card}].sort((a,b)=>String(a.name).localeCompare(String(b.name)))}
  try{await SH.fs.doc(`users/${SH.uid}`).update({contact:c,updatedAt:nowIso()})}catch(e){console.warn('profile contact',e&&e.code)}
  profilesDirSub();
}
async function exportMyData(){
  const out={exportedAt:nowIso(),account:{uid:SH.uid,email:SH.user.email},profile:myProfile(),clubs:{}};
  for(const c of (myProfile()&&myProfile().clubs)||[]){
    const r={};
    try{const p=await SH.fs.doc(`clubs/${c}/people/${SH.uid}`).get();r.profile=p.exists?p.data():null}catch(e){r.profile='unavailable'}
    try{const d=await SH.fs.doc(`clubs/${c}/directory/${SH.uid}`).get();r.directoryCard=d.exists?d.data():null}catch(e){r.directoryCard='unavailable'}
    out.clubs[c]=r;
  }
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));
  a.download=`oratia-my-data-${todayISO()}.json`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
async function deleteMyAccount(){
  const u=myProfile();const clubs=[...new Set([...((u&&u.clubs)||[]),...(SH.club?[SH.club]:[])])];
  for(const c of clubs){
    await SH.fs.doc(`clubs/${c}/directory/${SH.uid}`).delete().catch(()=>{});
    await SH.fs.doc(`clubs/${c}/people/${SH.uid}`).delete().catch(()=>{});
  }
  await SH.fs.doc(`users/${SH.uid}`).delete();
  const cu=firebase.auth().currentUser;
  try{if(cu&&cu.delete)await cu.delete()}
  catch(e){if(e&&e.code==='auth/requires-recent-login'){toast(t('me.reloginToDelete'));await officeSignOut();return}throw e}
  toast(t('me.deleted'));
}

function roleChip(p){
  if(!p)return '';
  if(p.status==='former')return `<span class="chip">${t('me.role.former')}</span>`;
  if(pendingMember(p))return `<span class="chip warn">${t('me.role.pending')}</span>`;
  return p.role==='member'?`<span class="chip ok">${t('me.role.member')}</span>`:`<span class="chip">${t('me.role.guest')}</span>`;
}
function privacyNotice(){
  return `<details class="privacy"><summary>${t('me.privacyTitle')}</summary><div class="gbody1">${t('me.privacyText').split('\n').map(x=>`<p>${x}</p>`).join('')}</div></details>`;
}
function meView(){
  const head=`<div class="phead"><div><h2>${t('me.title')}</h2><p class="muted">${t('me.intro')}</p></div></div>`;
  if(!configured())return `<section class="panel">${head}<p>${t('live.notConfigured')}</p></section>`;
  if(SH.error)return `<section class="panel">${head}<p>${esc(errorText())}</p></section>`;
  if(!isMember()||LINK.needEmail)return `<section class="panel">${head}<div class="box"><h3>${t('me.whyTitle')}</h3><ul class="ctnotes">${t('me.why').split('\n').map(x=>`<li>${x}</li>`).join('')}</ul></div>${signInBox()}${privacyNotice()}</section>`;
  const who=`<div class="notice"><span>${t('office.signedAs',{email:esc(SH.user.email)})}</span><button class="small" data-act="off-signout">${t('office.signOut')}</button></div>`;
  if(!SH.user.verified)return `<section class="panel">${head}${who}${verifyBox()}</section>`;
  if(PROF.user===undefined)return `<section class="panel">${head}${who}<p class="empty">${t('office.loading')}</p></section>`;
  if(!PROF.user)return `<section class="panel">${head}${who}
    <form class="box" data-form="me-create" novalidate><h3>${t('me.createTitle')}</h3>
      <div class="field"><label class="label" for="me-name">${t('me.name')}</label><input id="me-name" maxlength="80" autocomplete="name" value="${esc(myName()||'')}"></div>
      ${privacyNotice()}
      <label class="check" for="me-consent"><input type="checkbox" id="me-consent"><span>${t('me.consent')}</span></label>
      <div class="btns"><button type="submit" class="primary" ${PROF.busy?'disabled':''}>${t('me.create')}</button></div></form></section>`;
  return `<section class="panel">${head}${who}${profileBox()}${SH.on&&!SH.closed?clubBox():`<div class="box"><p class="muted">${t('me.noClub')}</p></div>`}${SH.on&&directoryAccess()?directoryBox():''}${dataBox()}</section>`;
}
function profileBox(){
  const u=myProfile();
  return `<form class="box" data-form="me-name" novalidate><h3>${t('me.profile')}</h3>
    <div class="fields"><div class="field"><label class="label" for="me-name">${t('me.name')}</label><input id="me-name" maxlength="80" autocomplete="name" value="${esc(u.name)}"></div>
    <div class="field"><span class="label">${t('fb.email')}</span><b style="padding:9px 0">${esc(SH.user.email)}</b></div></div>
    <div class="btns"><button type="submit" ${PROF.busy?'disabled':''}>${t('cl.save')}</button></div></form>`;
}
function clubBox(){
  const p=myPerson();const off=SH.officer===true;
  const title=`<h3>${t('me.inClub',{club:esc(SH.club)})}</h3>`;
  if(p===undefined)return `<div class="box">${title}<p class="empty">${t('office.loading')}</p></div>`;
  if(!p)return `<div class="box">${title}<p>${off?t('me.joinOfficer'):t('me.joinText')}</p>
    <div class="btns"><button class="primary" data-act="me-join" data-v="member" ${PROF.busy?'disabled':''}>${t('me.joinMember')}</button><button data-act="me-join" data-v="guest" ${PROF.busy?'disabled':''}>${t('me.joinGuest')}</button></div>
    <p class="muted" style="font-size:.85rem;margin:0">${t('me.joinNote')}</p></div>`;
  const hist=(p.history||[]).slice().reverse();
  return `<div class="box"><div class="phead"><div>${title}<p class="muted" style="margin:0">${t('me.since',{d:esc(fmtDay(p.at))})}</p></div><div class="btns">${roleChip(p)}${off?`<span class="chip ok">${t('me.role.officer')}</span>`:''}</div></div>
    ${pendingMember(p)?`<div class="notice"><span>${t('me.pendingText')}</span><button class="small ghost" data-act="me-request" data-v="guest">${t('me.cancelRequest')}</button></div>`:''}
    ${p.status==='active'&&p.role==='guest'&&!pendingMember(p)?`<div class="notice"><span>${t('me.guestText')}</span><button class="small" data-act="me-request" data-v="member">${t('me.askMember')}</button></div>`:''}
    ${profileMember()?`<p class="muted" style="margin:0">${t('me.memberText')}</p>`:''}
    ${hist.length?`<div><span class="label">${t('me.history')}</span><ul class="ctnotes">${hist.map(h=>`<li>${esc(fmtDay(h.at))} · ${esc(t('me.role.'+(h.role||'guest')))}</li>`).join('')}</ul></div>`:''}
    <div class="btns">${PROF.confirmLeave?`<span class="muted" style="align-self:center">${t('me.leaveAsk')}</span><button class="small danger" data-act="me-leave">${t('me.leaveYes')}</button><button class="small ghost" data-act="me-leave-cancel">${t('common.cancel')}</button>`
      :`<button class="small ghost" data-act="me-leave-ask">${t('me.leave')}</button>`}</div></div>`;
}
function directoryBox(){
  const u=myProfile();const pend=PROF.dirPending;const c=pend?pend.c:(u.contact||{});const card=pend?(pend.listed?Object.fromEntries(DIR_FIELDS.map(k=>[k,pend.show[k]])):null):PROF.dir.find(d=>d.id===SH.uid);
  const def={email:c.email||SH.user.email};const val=k=>esc(c[k]||def[k]||'');
  const shown=k=>card?!!card[k]:k==='email';
  const row=(k,type,ph)=>`<div class="dirf"><label class="check" for="pds-${k}"><input type="checkbox" id="pds-${k}" ${shown(k)?'checked':''}><span>${t('me.show')}</span></label>
    <div class="field"><label class="label" for="pd-${k}">${t('me.f.'+k)}</label><input id="pd-${k}" type="${type}" value="${val(k)}" placeholder="${ph}" maxlength="${k==='linkedin'?200:120}"></div></div>`;
  return `<form class="box" data-form="me-dir" novalidate><div><h3>${t('me.dirTitle')}</h3><p class="muted">${t('me.dirIntro')}</p></div>
    <label class="check" for="pd-listed"><input type="checkbox" id="pd-listed" ${card?'checked':''}><span><b>${t('me.listed')}</b></span></label>
    <div class="dirgrid">${row('email','email','')}${row('phone','tel','+33 6…')}${row('whatsapp','tel','+33 6…')}${row('linkedin','url','linkedin.com/in/…')}</div>
    <div class="btns"><button type="submit" class="primary" ${PROF.busy?'disabled':''}>${t('cl.save')}</button>${isOn('directory')?`<button type="button" class="ghost" data-act="go-directory">${t('me.openDir')}</button>`:''}</div></form>`;
}
function dataBox(){
  return `<div class="box"><div><h3>${t('me.dataTitle')}</h3><p class="muted">${t('me.dataIntro')}</p></div>
    <div class="btns"><button data-act="me-export">${t('me.export')}</button>
    ${PROF.confirmDel?`<span class="muted" style="align-self:center">${t('me.deleteAsk')}</span><button class="small danger" data-act="me-delete" ${PROF.busy?'disabled':''}>${t('me.deleteYes')}</button><button class="small ghost" data-act="me-delete-cancel">${t('common.cancel')}</button>`
      :`<button class="ghost" data-act="me-delete-ask">${t('me.delete')}</button>`}</div>${privacyNotice()}</div>`;
}

// ---------- directory ----------
const waLink=n=>{const d=String(n||'').replace(/[^\d+]/g,'').replace(/^00/,'+').replace(/^\+/,'');return d.length>=6?'https://wa.me/'+d:''};
function directoryView(){
  const head=`<div class="phead"><div><h2>${t('dir.title')}</h2><p class="muted">${t('dir.intro')}</p></div></div>`;
  if(!SH.on)return `<section class="panel">${head}${liveBox()}</section>`;
  if(!directoryAccess())return `<section class="panel">${head}<div class="box"><p>${t('dir.membersOnly')}</p><div><button class="primary" data-act="go-me">${t('dir.goMe')}</button></div></div></section>`;
  const fold=x=>String(x||'').toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const q=fold(PROF.q.trim());const list=PROF.dir.filter(d=>!q||fold(d.name).includes(q));
  const mine=PROF.dir.some(d=>d.id===SH.uid);
  const a=(href,label,ext)=>`<a class="btn small" href="${esc(href)}" ${ext?'target="_blank" rel="noopener noreferrer"':''}>${esc(label)}</a>`;
  return `<section class="panel">${head}
    ${mine?'':`<div class="notice"><span>${t('dir.notListed')}</span><button class="small" data-act="go-me">${t('dir.addMe')}</button></div>`}
    <div class="box"><div class="field"><label class="label" for="dir-q">${t('mem.search')}</label><input id="dir-q" data-act="dir-q" value="${esc(PROF.q)}" autocomplete="off"></div>
    ${list.length?`<div class="dircards">${list.map(d=>{const li=d.linkedin&&safeUrl(d.linkedin);const wa=waLink(d.whatsapp);
      return `<div class="dircard"><b>${esc(d.name)}</b>${d.id===SH.uid?` <span class="muted">${t('roles.you')}</span>`:''}
        <div class="btns">${d.email?a('mailto:'+d.email,t('me.f.email')):''}${d.phone?a('tel:'+d.phone.replace(/[^\d+]/g,''),t('me.f.phone')):''}${wa?a(wa,'WhatsApp',true):''}${li?a(li,'LinkedIn',true):''}</div></div>`}).join('')}</div>`
      :`<p class="empty">${PROF.dir.length?t('dir.noMatch'):t('dir.empty')}</p>`}
    <p class="muted" style="font-size:.85rem;margin:0">${t('dir.note')}</p></div></section>`;
}

// ---------- officers: profiles and requests (Members tab) ----------
function peopleBox(){
  if(!SH.on||SH.officer!==true)return '';
  const pend=PROF.people.filter(pendingMember);
  const others=PROF.people.filter(p=>!pendingMember(p));
  const memberOpts=sel=>`<option value="new">${t('pp.newRecord')}</option>${MEM.list.filter(m=>(m.status||'active')==='active').map(m=>`<option value="${esc(m.id)}" ${m.id===sel?'selected':''}>${esc(m.name)}</option>`).join('')}<option value="none" ${sel==='none'?'selected':''}>${t('pp.noRecord')}</option>`;
  const guess=p=>{const m=MEM.list.find(m=>m.email&&m.email===p.email)||MEM.list.find(m=>String(m.name).trim().toLowerCase()===String(p.name).trim().toLowerCase());return m?m.id:'new'};
  return `<div class="box"><div class="phead"><div><h3>${t('pp.title')}</h3><p class="muted">${t('pp.intro')}</p></div><span class="chip ${pend.length?'warn':''}">${t('pp.pendingN',{n:pend.length})}</span></div>
    ${pend.map(p=>`<div class="ppreq"><div><b>${esc(p.name)}</b> <span class="muted">${esc(p.email)}</span><br><span class="muted" style="font-size:.85rem">${t('pp.asks',{d:esc(fmtDay(p.at))})}</span></div>
      <div class="btns"><label class="sr-only" for="pp-m-${esc(p.id)}">${t('pp.record')}</label><select id="pp-m-${esc(p.id)}" data-ppm="${esc(p.id)}" style="width:auto">${memberOpts(PROF.approve[p.id]||guess(p))}</select>
      <button class="small primary" data-act="pp-approve" data-id="${esc(p.id)}" ${PROF.busy?'disabled':''}>${t('pp.approve')}</button><button class="small ghost" data-act="pp-guest" data-id="${esc(p.id)}">${t('pp.keepGuest')}</button></div></div>`).join('')}
    ${others.length?`<div class="tablewrap"><table><thead><tr><th>${t('me.name')}</th><th>${t('fb.email')}</th><th>${t('adm.status')}</th><th>${t('pp.since')}</th><th></th></tr></thead><tbody>
      ${others.map(p=>`<tr><td>${esc(p.name)}${SH.officers.includes(p.email)?` <span class="chip ok">${t('me.role.officer')}</span>`:''}</td><td style="font-size:.9rem">${esc(p.email)}</td><td>${roleChip(p)}</td><td>${esc(fmtDay(p.at))}</td>
      <td style="white-space:nowrap">${p.status==='active'&&p.role==='member'?`<button class="small ghost" data-act="pp-set" data-id="${esc(p.id)}" data-v="former">${t('pp.toFormer')}</button>`
        :p.status==='former'?`<button class="small ghost" data-act="pp-set" data-id="${esc(p.id)}" data-v="member">${t('pp.toMember')}</button>`
        :`<button class="small ghost" data-act="pp-set" data-id="${esc(p.id)}" data-v="member">${t('pp.toMember')}</button>`}
        ${PROF.confirmRemove===p.id?`<button class="small danger" data-act="pp-remove" data-id="${esc(p.id)}">${t('pp.removeYes')}</button><button class="small ghost" data-act="pp-remove-cancel">${t('common.cancel')}</button>`
          :`<button class="small ghost" data-act="pp-remove-ask" data-id="${esc(p.id)}" aria-label="${esc(t('common.remove')+' '+p.name)}">×</button>`}</td></tr>`).join('')}
      </tbody></table></div>`:(pend.length?'':`<p class="empty">${t('pp.none')}</p>`)}
    <p class="muted" style="font-size:.85rem;margin:0">${t('pp.note')}</p></div>`;
}
async function setPersonRole(id,v,memberChoice){
  const p=PROF.people.find(x=>x.id===id);if(!p)return;
  const upd={requested:'guest',history:[...(p.history||[]),{role:v,at:nowIso(),by:SH.user.email}].slice(-30),decidedAt:nowIso(),decidedBy:SH.user.email};
  if(v==='former'){upd.status='former'}else{upd.status='active';upd.role=v}
  if(v==='member'&&memberChoice&&memberChoice!=='none'){
    if(memberChoice==='new'){const r=await SH.fs.collection(`clubs/${SH.club}/members`).add({...memberData({name:p.name,email:p.email,phone:'',joined:todayISO(),status:'active'},'profile'),renewals:{}});upd.memberId=r.id}
    else upd.memberId=memberChoice;
  }
  await SH.fs.doc(`clubs/${SH.club}/people/${id}`).update(upd);
}

// ---------- events ----------
document.addEventListener('submit',ev=>{
  const f=ev.target.dataset.form;if(!f||!f.startsWith('me-'))return;ev.preventDefault();
  if(f==='me-create'){const n=document.getElementById('me-name').value.trim().slice(0,80);
    if(!n){toast(t('me.needName'));return}if(!document.getElementById('me-consent').checked){toast(t('me.needConsent'));return}
    profRun(()=>createProfile(n),t('me.created'));if(typeof setMyName==='function'&&!myName())setMyName(n);return}
  if(f==='me-name'){const n=document.getElementById('me-name').value.trim().slice(0,80);if(!n){toast(t('me.needName'));return}
    profRun(async()=>{await SH.fs.doc(`users/${SH.uid}`).update({name:n,updatedAt:nowIso()});
      if(myPerson())await SH.fs.doc(`clubs/${SH.club}/people/${SH.uid}`).update({name:n});
      if(PROF.dir.some(d=>d.id===SH.uid))await SH.fs.doc(`clubs/${SH.club}/directory/${SH.uid}`).update({name:n,updatedAt:nowIso()})},t('me.saved'));return}
  if(f==='me-dir'){const v=readDirForm();PROF.dirPending=v;profRun(()=>saveDirectory(v).finally(()=>{PROF.dirPending=null}),t('me.saved'));return}
});
document.addEventListener('input',ev=>{if(ev.target.dataset&&ev.target.dataset.act==='dir-q'){PROF.q=ev.target.value;const pos=ev.target.selectionStart;render();const i=document.getElementById('dir-q');if(i){i.focus();try{i.setSelectionRange(pos,pos)}catch(e){}}}});
document.addEventListener('change',ev=>{const id=ev.target.dataset&&ev.target.dataset.ppm;if(id)PROF.approve[id]=ev.target.value});
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(!/^(me-|pp-|go-me$|go-directory$)/.test(a))return;
  switch(a){
  case 'go-me':setTab('me');return;
  case 'go-directory':setTab('directory');return;
  case 'me-join':profRun(()=>joinClub(b.dataset.v==='member'?'member':'guest'),t(b.dataset.v==='member'?'me.requestSent':'me.joined'));return;
  case 'me-request':profRun(()=>SH.fs.doc(`clubs/${SH.club}/people/${SH.uid}`).update({requested:b.dataset.v==='member'?'member':'guest'}),b.dataset.v==='member'?t('me.requestSent'):'');return;
  case 'me-leave-ask':PROF.confirmLeave=true;render();return;
  case 'me-leave-cancel':PROF.confirmLeave=false;render();return;
  case 'me-leave':PROF.confirmLeave=false;profRun(leaveClub,t('me.left'));return;
  case 'me-export':exportMyData().catch(writeFail);return;
  case 'me-delete-ask':PROF.confirmDel=true;render();return;
  case 'me-delete-cancel':PROF.confirmDel=false;render();return;
  case 'me-delete':PROF.confirmDel=false;profRun(deleteMyAccount);return;
  case 'pp-approve':{const id=b.dataset.id;const sel=document.getElementById('pp-m-'+id);profRun(()=>setPersonRole(id,'member',sel?sel.value:'none'),t('pp.approved'));return}
  case 'pp-guest':profRun(()=>setPersonRole(b.dataset.id,'guest'));return;
  case 'pp-set':profRun(()=>setPersonRole(b.dataset.id,b.dataset.v,b.dataset.v==='member'?'none':undefined));return;
  case 'pp-remove-ask':PROF.confirmRemove=b.dataset.id;render();return;
  case 'pp-remove-cancel':PROF.confirmRemove=null;render();return;
  case 'pp-remove':{const id=b.dataset.id;PROF.confirmRemove=null;profRun(async()=>{await SH.fs.doc(`clubs/${SH.club}/directory/${id}`).delete().catch(()=>{});await SH.fs.doc(`clubs/${SH.club}/people/${id}`).delete()},t('pp.removed'));return}
  }
});
