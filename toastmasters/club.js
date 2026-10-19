// Toastmasters Tools Data (see firestore.rules):
//   clubs/{club}/public/info       the introduction page; everyone reads, officers write
//   clubs/{club}/interest/{uid}    one interest form per device; the sender and officers read it

const OFFICER_KEYS=['president','vpe','vpm','vppr','secretary','treasurer','saa'];
const CL={info:null,loaded:false,edit:false,draft:null,saving:false,unsub:null,
  myInterest:undefined,interestDraft:{name:'',email:'',roles:[],when:'next',message:''},interestEdit:false,
  interests:[],unsubInt:null};

// ---------- live data ----------
function clubLive(){
  if(CL.unsub)CL.unsub();
  CL.unsub=SH.fs.doc(`clubs/${SH.club}/public/info`).onSnapshot(s=>{CL.info=s.exists?s.data():null;CL.loaded=true;softRender()},()=>{CL.loaded=true;softRender()});
  loadMyInterest();
}
async function loadMyInterest(){
  if(!SH.on||!SH.uid)return;
  try{const d=await SH.fs.doc(`clubs/${SH.club}/interest/${SH.uid}`).get();CL.myInterest=d.exists?d.data():null}
  catch(e){CL.myInterest=null}
  softRender();
}
// officers: list of people interested in an officer role (started from office.js once access is confirmed)
function startInterestSub(){
  stopInterestSub();
  CL.unsubInt=SH.fs.collection(`clubs/${SH.club}/interest`).orderBy('at','desc').limit(300).onSnapshot(q=>{
    CL.interests=q.docs.map(d=>({id:d.id,...d.data()}));softRender()},()=>{});
}
function stopInterestSub(){if(CL.unsubInt){CL.unsubInt();CL.unsubInt=null}CL.interests=[]}

// ---------- helpers ----------
const linkOrText=v=>{const u=safeUrl(v);return u?`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u.replace(/^https:\/\//,''))}</a>`:esc(v)};
const paras=txt=>String(txt||'').split(/\n{2,}/).map(p=>p.trim()).filter(Boolean).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');
const cid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
function emptyInfo(){return {name:'',about:'',practical:{where:'',when:'',contact:'',fees:'',web:''},officers:OFFICER_KEYS.map(k=>({role:k,name:''})),announcements:[],events:[]}}
function normInfo(i){const e=emptyInfo();i=i||{};return {name:i.name||'',about:i.about||'',practical:{...e.practical,...(i.practical||{})},
  officers:Array.isArray(i.officers)&&i.officers.length?i.officers:e.officers,announcements:Array.isArray(i.announcements)?i.announcements:[],events:Array.isArray(i.events)?i.events:[]}}
const shortDate=d=>d?new Date(d+'T12:00').toLocaleDateString(locale(),{weekday:'short',day:'numeric',month:'long',year:'numeric'}):'';

// ---------- club page ----------
function clubView(){
  const head=title=>`<div class="phead"><div><h2>${title}</h2></div>${SH.officer&&!CL.edit&&SH.on?`<button class="small primary" data-act="cl-edit">${t('cl.edit')}</button>`:''}</div>`;
  if(!SH.on)return `<section class="panel"><div class="phead"><div><h2>${t('cl.title')}</h2><p class="muted">${t('cl.intro')}</p></div></div>${liveBox()}<p class="muted">${t('cl.needLive')}</p></section>`;
  if(!CL.loaded)return `<section class="panel">${head(t('cl.title'))}<p class="empty">${t('office.loading')}</p></section>`;
  if(CL.edit)return clubEditView();
  const info=normInfo(CL.info);const p=info.practical;const a=S.agenda||{};const o=online(a);
  const today=todayISO();
  const upcoming=info.events.filter(e=>(e.date||'')>=today).sort((x,y)=>(x.date+x.time).localeCompare(y.date+y.time));
  const past=info.events.filter(e=>(e.date||'')<today).sort((x,y)=>y.date.localeCompare(x.date));
  const anns=[...info.announcements].sort((x,y)=>(y.date||'').localeCompare(x.date||''));
  const officers=info.officers.filter(x=>x.name);
  const name=info.name||a.club||'';
  const empty=!CL.info;
  const practical=[['where',p.where],['when',p.when],['contact',p.contact],['fees',p.fees],['web',p.web]].filter(([,v])=>v);
  return `<section class="panel">
  ${head(esc(name)||t('cl.title'))}
  ${empty?`<div class="notice"><span>${SH.officer?t('cl.emptyOfficer'):t('cl.empty')}</span>${SH.officer?'':`<button class="small" data-act="go-office">${t('cl.officerLink')}</button>`}</div>`:''}
  ${info.about?`<div class="box about">${paras(info.about)}</div>`:''}
  <div class="grid2">
    <div class="box"><h3>${t('cl.next')}</h3>
      ${a.date?`<p><b>${esc(fmtDate(a.date))}</b>${a.start?' · '+esc(a.start):''}</p>${a.theme?`<p>${t('ag.themeIs')} ${esc(a.theme)}</p>`:''}
        ${o.format!=='online'&&a.venue?`<p class="muted">${esc(a.venue)}</p>`:''}
        ${o.format!=='inperson'?`<div class="join"><span class="chip ok">${t('fmt.'+o.format)}</span>${safeUrl(o.url)?`<a class="btn primary" href="${esc(safeUrl(o.url))}" target="_blank" rel="noopener noreferrer">${t('on.join')}</a>`:''}</div>`:''}`
        :`<p class="muted">${t('cl.noNext')}</p>`}
      <div class="btns"><button class="small" data-act="go-agenda">${t('cl.seeAgenda')}</button><button class="small" data-act="go-roles">${t('cl.takeRole')}</button></div>
    </div>
    ${practical.length?`<div class="box"><h3>${t('cl.practical')}</h3><dl class="dl">${practical.map(([k,v])=>`<dt>${t('cl.p.'+k)}</dt><dd>${k==='web'?linkOrText(v):paras(v)||esc(v)}</dd>`).join('')}</dl></div>`:''}
  </div>
  ${anns.length?`<div class="box"><h3>${t('cl.announcements')}</h3>${anns.map(n=>`<article class="ann"><div class="label">${esc(shortDate(n.date))}</div><h4>${esc(n.title)}</h4>${paras(n.text)}</article>`).join('')}</div>`:''}
  ${upcoming.length||past.length?`<div class="box"><h3>${t('cl.events')}</h3>
    ${upcoming.length?upcoming.map(eventHtml).join(''):`<p class="muted">${t('cl.noUpcoming')}</p>`}
    ${past.length?`<details class="past"><summary class="muted">${tn('cl.past',past.length)}</summary>${past.map(eventHtml).join('')}</details>`:''}</div>`:''}
  ${officers.length?`<div class="box"><h3>${t('cl.board')}</h3><dl class="dl">${officers.map(x=>`<dt>${esc(t('or.'+x.role+'.title'))}</dt><dd>${esc(x.name)}</dd>`).join('')}</dl>
    <div><button class="small" data-act="go-office">${t('cl.joinBoard')}</button></div></div>`:''}
  </section>`;
}
function eventHtml(e){
  return `<div class="event"><div class="when"><b>${esc(e.date?new Date(e.date+'T12:00').toLocaleDateString(locale(),{day:'numeric'}):'')}</b><span>${esc(e.date?new Date(e.date+'T12:00').toLocaleDateString(locale(),{month:'short'}):'')}</span></div>
    <div><h4>${esc(e.title)}</h4><p class="muted">${esc([shortDate(e.date),e.time,e.place].filter(Boolean).join(' · '))}</p>${paras(e.text)}</div></div>`;
}

// ---------- club page editor (officers) ----------
function clubEditView(){
  const d=CL.draft;const p=d.practical;
  const fld=(id,label,val,attrs='')=>`<div class="field"><label class="label" for="${id}">${label}</label><input id="${id}" ${attrs} value="${esc(val)}"></div>`;
  return `<section class="panel">
  <div class="phead"><div><h2>${t('cl.editTitle')}</h2><p class="muted">${t('cl.editIntro')}</p></div>
    <div class="btns"><button class="primary" data-act="cl-save" ${CL.saving?'disabled':''}>${t('cl.save')}</button><button data-act="cl-cancel">${t('common.cancel')}</button></div></div>
  <div class="box"><h3>${t('cl.presentation')}</h3>
    ${fld('cl-name',t('cl.name'),d.name,'data-cl="name" maxlength="120"')}
    <div class="field"><label class="label" for="cl-about">${t('cl.about')}</label><textarea id="cl-about" data-cl="about" rows="6" maxlength="4000" placeholder="${t('cl.aboutPh')}">${esc(d.about)}</textarea></div>
  </div>
  <div class="box"><h3>${t('cl.practical')}</h3><div class="fields">
    ${['where','when','contact','fees','web'].map(k=>fld('cl-p-'+k,t('cl.p.'+k),p[k],`data-cl="practical.${k}" maxlength="300" placeholder="${esc(t('cl.ph.'+k))}"`)).join('')}
  </div></div>
  <div class="box"><h3>${t('cl.board')}</h3><p class="muted">${t('cl.boardIntro')}</p><div class="fields">
    ${d.officers.map((x,i)=>fld('cl-o'+i,t('or.'+x.role+'.title'),x.name,`data-clo="${i}" maxlength="80"`)).join('')}
  </div></div>
  <div class="box"><div class="phead"><h3>${t('cl.announcements')}</h3><button class="small" data-act="cl-add-ann">${t('cl.addAnn')}</button></div>
    ${d.announcements.length?d.announcements.map((n,i)=>`<div class="editrow">
      <div class="fields">${fld('cl-an-t'+i,t('cl.annTitle'),n.title,`data-cla="${i}" data-k="title" maxlength="120"`)}${fld('cl-an-d'+i,t('ag.date'),n.date,`type="date" data-cla="${i}" data-k="date"`)}</div>
      <div class="field"><label class="label" for="cl-an-x${i}">${t('cl.annText')}</label><textarea id="cl-an-x${i}" data-cla="${i}" data-k="text" maxlength="2000">${esc(n.text)}</textarea></div>
      <div><button class="small ghost" data-act="cl-del-ann" data-i="${i}">${t('hist.delete')}</button></div></div>`).join(''):`<p class="muted">${t('cl.noAnn')}</p>`}
  </div>
  <div class="box"><div class="phead"><h3>${t('cl.events')}</h3><button class="small" data-act="cl-add-ev">${t('cl.addEv')}</button></div>
    ${d.events.length?d.events.map((e,i)=>`<div class="editrow">
      <div class="fields">${fld('cl-ev-t'+i,t('cl.evTitle'),e.title,`data-cle="${i}" data-k="title" maxlength="120"`)}${fld('cl-ev-d'+i,t('ag.date'),e.date,`type="date" data-cle="${i}" data-k="date"`)}
        ${fld('cl-ev-h'+i,t('cl.evTime'),e.time,`type="time" data-cle="${i}" data-k="time"`)}${fld('cl-ev-p'+i,t('ag.venue'),e.place,`data-cle="${i}" data-k="place" maxlength="160"`)}</div>
      <div class="field"><label class="label" for="cl-ev-x${i}">${t('cl.evText')}</label><textarea id="cl-ev-x${i}" data-cle="${i}" data-k="text" maxlength="2000">${esc(e.text)}</textarea></div>
      <div><button class="small ghost" data-act="cl-del-ev" data-i="${i}">${t('hist.delete')}</button></div></div>`).join(''):`<p class="muted">${t('cl.noEv')}</p>`}
  </div>
  <div class="btns"><button class="primary" data-act="cl-save" ${CL.saving?'disabled':''}>${t('cl.save')}</button><button data-act="cl-cancel">${t('common.cancel')}</button></div>
  </section>`;
}
async function saveClubInfo(){
  const d=clone(CL.draft);
  d.announcements=d.announcements.filter(n=>n.title||n.text).slice(0,50);
  d.events=d.events.filter(e=>e.title||e.date).slice(0,100);
  d.updatedAt=new Date().toISOString();d.updatedBy=SH.user&&SH.user.email||'';
  CL.saving=true;render();
  try{await SH.fs.doc(`clubs/${SH.club}/public/info`).set(d);CL.edit=false;CL.draft=null;toast(t('cl.saved'))}
  catch(e){writeFail(e)}
  CL.saving=false;render();
}

// ---------- officer roles (public part of the Bureau tab) ----------
function bureauPublic(){
  const R=OFFICER_KEYS;
  return `<div class="box"><div><h3>${t('or.title')}</h3><p class="muted">${t('or.intro')}</p></div>
    ${R.map(k=>`<details class="guide"><summary><h3>${esc(t('or.'+k+'.title'))}</h3><span class="muted">${esc(t('or.'+k+'.sum'))}</span></summary>
      <div class="gbody"><div><span class="label">${t('or.resp')}</span><ul>${OFFICER_ROLES_TEXT(k,'resp').map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div><span class="label">${t('or.gain')}</span><ul>${OFFICER_ROLES_TEXT(k,'gain').map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div></details>`).join('')}
    <p class="muted" style="font-size:.9rem">${t('or.term')}</p>
  </div>${interestBox()}`;
}
const OFFICER_ROLES_TEXT=(k,part)=>((OFFICER_ROLES[LANG]||OFFICER_ROLES.en)[k]||{})[part]||[];
function interestBox(){
  if(!SH.on)return `<div class="box"><h3>${t('int.title')}</h3><p class="muted">${t('int.needLive')}</p></div>`;
  if(CL.myInterest&&!CL.interestEdit){
    const m=CL.myInterest;
    return `<div class="box"><h3>${t('int.title')}</h3><p>${t('int.thanks',{name:esc(m.name)})}</p>
      <p class="muted">${esc((m.roles||[]).map(r=>r==='any'?t('int.any'):t('or.'+r+'.title')).join(', '))} · ${esc(t('int.when.'+m.when))}</p>
      <div><button class="small" data-act="int-edit">${t('int.editMine')}</button></div></div>`;
  }
  const d=CL.interestDraft;
  return `<form class="box" data-form="interest" novalidate><div><h3>${t('int.title')}</h3><p class="muted">${t('int.intro')}</p></div>
    <div class="fields">
      <div class="field"><label class="label" for="int-name">${t('int.name')} *</label><input id="int-name" data-int="name" maxlength="100" value="${esc(d.name)}" autocomplete="name"></div>
      <div class="field"><label class="label" for="int-email">${t('fb.email')} *</label><input id="int-email" type="email" data-int="email" maxlength="120" value="${esc(d.email)}" autocomplete="email"></div>
    </div>
    <div class="field"><span class="label">${t('int.roles')}</span><div class="speakers">${[...OFFICER_KEYS,'any'].map(k=>`<button type="button" class="spk" data-act="int-role" data-v="${k}" aria-pressed="${d.roles.includes(k)}">${esc(k==='any'?t('int.any'):t('or.'+k+'.title'))}</button>`).join('')}</div></div>
    <div class="field"><span class="label">${t('int.whenQ')}</span><div class="speakers">${['now','next','either'].map(v=>`<button type="button" class="spk" data-act="int-when" data-v="${v}" aria-pressed="${d.when===v}">${t('int.when.'+v)}</button>`).join('')}</div></div>
    <div class="field"><label class="label" for="int-msg">${t('int.message')}</label><textarea id="int-msg" data-int="message" maxlength="1000">${esc(d.message)}</textarea></div>
    <p class="muted" style="font-size:.85rem">${t('int.privacy')}</p>
    <div class="btns"><button type="submit" class="primary">${t('int.send')}</button>${CL.interestEdit?`<button type="button" data-act="int-cancel">${t('common.cancel')}</button>`:''}</div>
  </form>`;
}
async function sendInterest(){
  const d=CL.interestDraft;const name=d.name.trim(),email=d.email.trim().toLowerCase();
  if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast(t('int.missing'));return}
  const data={name:name.slice(0,100),email:email.slice(0,120),roles:d.roles.slice(0,10),when:d.when,message:d.message.trim().slice(0,1000),at:new Date().toISOString(),lang:LANG};
  try{await SH.fs.doc(`clubs/${SH.club}/interest/${SH.uid}`).set(data,{merge:true});CL.myInterest=data;CL.interestEdit=false;toast(t('int.sent'))}
  catch(e){writeFail(e)}
  render();
}
// Officers' view of the interest list
function interestListBox(){
  const L=CL.interests;
  return `<div class="box"><div class="phead"><h3>${t('int.listTitle')}</h3><span class="muted">${L.length}</span></div>
  ${L.length?`<div class="tablewrap"><table><thead><tr><th>${t('int.name')}</th><th>${t('int.roles')}</th><th>${t('int.whenQ')}</th><th>${t('int.status')}</th><th></th></tr></thead><tbody>
  ${L.map(x=>`<tr><td><b>${esc(x.name)}</b><br><span class="muted" style="user-select:all">${esc(x.email)}</span>${x.message?`<br><span style="font-size:.9rem">${esc(x.message)}</span>`:''}<br><span class="muted" style="font-size:.8rem">${esc(x.at?new Date(x.at).toLocaleDateString(locale()):'')}</span></td>
    <td>${esc((x.roles||[]).map(r=>r==='any'?t('int.any'):t('or.'+r+'.title')).join(', ')||'–')}</td><td>${esc(t('int.when.'+(x.when||'either')))}</td>
    <td><select data-act="int-status" data-id="${esc(x.id)}" aria-label="${t('int.status')}">${['new','contacted','offered','joined','declined'].map(s=>`<option value="${s}" ${(x.status||'new')===s?'selected':''}>${t('int.st.'+s)}</option>`).join('')}</select></td>
    <td><button class="ghost small" data-act="int-del" data-id="${esc(x.id)}" aria-label="${t('common.remove')}">×</button></td></tr>`).join('')}
  </tbody></table></div>`:`<p class="empty">${t('int.none')}</p>`}</div>`;
}

// ---------- events ----------
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,i=+b.dataset.i;
  switch(a){
  case 'go-agenda':setTab('agenda');return;
  case 'go-roles':setTab('roles');return;
  case 'go-office':setTab('office');return;
  case 'cl-edit':CL.draft=normInfo(CL.info);if(!CL.draft.name)CL.draft.name=(S.agenda&&S.agenda.club)||'';CL.edit=true;break;
  case 'cl-cancel':CL.edit=false;CL.draft=null;break;
  case 'cl-save':saveClubInfo();return;
  case 'cl-add-ann':CL.draft.announcements.unshift({id:cid(),title:'',date:todayISO(),text:''});break;
  case 'cl-del-ann':CL.draft.announcements.splice(i,1);break;
  case 'cl-add-ev':CL.draft.events.push({id:cid(),title:'',date:'',time:'',place:'',text:''});break;
  case 'cl-del-ev':CL.draft.events.splice(i,1);break;
  case 'int-role':{const v=b.dataset.v,r=CL.interestDraft.roles;CL.interestDraft.roles=r.includes(v)?r.filter(x=>x!==v):[...r,v];break}
  case 'int-when':CL.interestDraft.when=b.dataset.v;break;
  case 'int-edit':CL.interestDraft={name:CL.myInterest.name||'',email:CL.myInterest.email||'',roles:[...(CL.myInterest.roles||[])],when:CL.myInterest.when||'next',message:CL.myInterest.message||''};CL.interestEdit=true;break;
  case 'int-cancel':CL.interestEdit=false;break;
  case 'int-del':SH.fs.doc(`clubs/${SH.club}/interest/${b.dataset.id}`).delete().catch(writeFail);return;
  default:return;
  }
  render();
});
document.addEventListener('input',ev=>{
  const el=ev.target,ds=el.dataset||{};
  if(ds.int){CL.interestDraft[ds.int]=el.value;return}
  if(!CL.edit||!CL.draft)return;
  if(ds.cl){const ks=ds.cl.split('.');if(ks.length===2)CL.draft[ks[0]][ks[1]]=el.value;else CL.draft[ks[0]]=el.value}
  else if(ds.clo!==undefined)CL.draft.officers[+ds.clo].name=el.value;
  else if(ds.cla!==undefined)CL.draft.announcements[+ds.cla][ds.k]=el.value;
  else if(ds.cle!==undefined)CL.draft.events[+ds.cle][ds.k]=el.value;
});
document.addEventListener('change',ev=>{
  const el=ev.target;
  if(el.dataset.act==='int-status')SH.fs.doc(`clubs/${SH.club}/interest/${el.dataset.id}`).update({status:el.value}).catch(writeFail);
});
document.addEventListener('submit',ev=>{if(ev.target.dataset.form!=='interest')return;ev.preventDefault();sendInterest()});
