// Orato – membership: the guest book (everyone) and the member list with renewals (officers only).
//
// Data (see firestore.rules):
//   clubs/{club}/guestbook/{date_uid_x}  one entry per guest who signs in at a meeting; created by anyone with the link,
//                                        read, followed up and deleted by officers only
//   clubs/{club}/members/{id}            the member list: name, contact, member since, renewal per dues period,
//                                        notes; officers only
// Toastmasters dues are paid twice a year: the October period covers October to March, the April period April to September.
// Each member keeps one status per period (renewals: {"2026-10": "paid"}), so past periods stay visible.

const MEM={list:[],guests:[],unsubM:null,unsubG:null,loaded:false,
  edit:null,fromGuest:null,confirmDel:null,q:'',show:'active',period:'',import:null,confirmPurge:false,busy:false};
const GB={draft:null,sending:false,done:false};
const HEARD=['friend','web','social','event','work','other'];
const RENEW=['paid','pending','leaving'];
const GUEST_ST=['new','contacted','member','done'];
const emptyGuest=()=>({name:'',email:'',phone:'',heard:'',first:'first',news:false,join:false});

// ---------- dues periods ----------
function periodOf(d){const y=d.getFullYear(),m=d.getMonth()+1;return m>=10?`${y}-10`:m<4?`${y-1}-10`:`${y}-04`}
function shiftPeriod(p,n){let [y,m]=p.split('-').map(Number);for(let i=0;i<Math.abs(n);i++){if(n>0){if(m===10){m=4;y++}else m=10}else{if(m===4){m=10;y--}else m=4}}return `${y}-${String(m).padStart(2,'0')}`}
function periodLabel(p){
  const [y,m]=p.split('-').map(Number);const f=(yy,mm)=>new Date(yy,mm-1,1).toLocaleDateString(locale(),{month:'short',year:'numeric'});
  return m===10?`${f(y,10)} – ${f(y+1,3)}`:`${f(y,4)} – ${f(y,9)}`;
}
// In the last month of a period (March or September) officers are collecting the next renewals, so that period is shown first.
function defaultPeriod(){const d=new Date();const p=periodOf(d);return [3,9].includes(d.getMonth()+1)?shiftPeriod(p,1):p}
const curPeriod=()=>MEM.period||(MEM.period=defaultPeriod());
const renewalOf=(m,p)=>(m.renewals&&m.renewals[p])||'';

// ---------- live data (officers) ----------
function membersOfficerSubs(){
  membersStopSubs();
  MEM.unsubM=SH.fs.collection(`clubs/${SH.club}/members`).onSnapshot(q=>{
    MEM.list=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.name||'').localeCompare(b.name||'',locale()));MEM.loaded=true;softRender();
  },()=>{MEM.list=[]});
  MEM.unsubG=SH.fs.collection(`clubs/${SH.club}/guestbook`).orderBy('at','desc').limit(500).onSnapshot(q=>{
    MEM.guests=q.docs.map(d=>({id:d.id,...d.data()}));softRender();
  },()=>{MEM.guests=[]});
}
function membersStopSubs(){
  if(MEM.unsubM){MEM.unsubM();MEM.unsubM=null}
  if(MEM.unsubG){MEM.unsubG();MEM.unsubG=null}
  MEM.list=[];MEM.guests=[];MEM.loaded=false;
}

// ---------- guest book (everyone) ----------
function guestbookView(){
  const head=`<div class="phead"><div><h2>${t('gb.title')}</h2><p class="muted">${t('gb.intro')}</p></div>
    ${SH.on?`<button class="small" data-act="qr-guestbook">${t('gb.showQr')}</button>`:''}</div>`;
  if(!SH.on)return `<section class="panel">${head}${liveBox()}<p class="muted">${t('gb.needLive')}</p></section>`;
  const officerNote=SH.officer===true&&isOn('members')?`<div class="notice"><span>${t('gb.officerNote',{n:MEM.guests.filter(g=>g.date===meetingDate()).length})}</span><button class="small" data-act="go-members">${t('gb.seeList')}</button></div>`:'';
  if(GB.done)return `<section class="panel">${head}${officerNote}<div class="box" style="text-align:center;align-items:center">
    <h3>${t('gb.thanks')}</h3><p class="muted">${t('gb.thanksText')}</p><button class="primary" data-act="gb-next">${t('gb.next')}</button></div></section>`;
  const g=GB.draft||(GB.draft=emptyGuest());
  return `<section class="panel">${head}${officerNote}
  <form class="box" data-form="guestbook" novalidate>
    <p class="label">${t('fb.meetingOf',{date:esc(fmtDate(meetingDate()))})}</p>
    <div class="field"><label class="label" for="gb-name">${t('gb.name')} *</label><input id="gb-name" data-gb="name" maxlength="100" value="${esc(g.name)}" autocomplete="name"></div>
    <div class="fields">
      <div class="field"><label class="label" for="gb-email">${t('mem.email')}</label><input id="gb-email" type="email" data-gb="email" maxlength="120" value="${esc(g.email)}" autocomplete="email"></div>
      <div class="field"><label class="label" for="gb-phone">${t('gb.phone')}</label><input id="gb-phone" type="tel" data-gb="phone" maxlength="40" value="${esc(g.phone)}" autocomplete="tel"></div>
    </div>
    <div class="field"><span class="label">${t('gb.firstQ')}</span><div class="speakers">${['first','again'].map(v=>chip('gb-first',v,g.first===v,t('gb.first.'+v))).join('')}</div></div>
    <div class="field"><span class="label">${t('gb.heardQ')}</span><div class="speakers">${HEARD.map(v=>chip('gb-heard',v,g.heard===v,t('gb.heard.'+v))).join('')}</div></div>
    <label class="check" for="gb-join"><input type="checkbox" id="gb-join" data-gb="join" ${g.join?'checked':''}><span>${t('gb.join')}</span></label>
    <label class="check" for="gb-news"><input type="checkbox" id="gb-news" data-gb="news" ${g.news?'checked':''}><span>${t('gb.news')}</span></label>
    <p class="muted" style="font-size:.85rem">${t('gb.privacy')}</p>
    <div class="btns"><button type="submit" class="primary" ${GB.sending?'disabled':''}>${t('gb.send')}</button></div>
  </form></section>`;
}
async function sendGuest(){
  const g=GB.draft;const name=g.name.trim(),email=g.email.trim().toLowerCase(),phone=g.phone.trim();
  if(!name){toast(t('gb.needName'));const i=document.getElementById('gb-name');if(i)i.focus();return}
  if(email&&!emailOk(email)){toast(t('off.invalid'));return}
  const date=meetingDate();
  // One device at the door can sign in many guests: each entry gets its own suffix.
  const id=`${date}_${SH.uid}_${Math.random().toString(36).slice(2,8)}`;
  const data={date,name:name.slice(0,100),email:email.slice(0,120),phone:phone.slice(0,40),heard:g.heard,first:g.first,
    news:!!g.news,join:!!g.join,lang:LANG,at:new Date().toISOString()};
  GB.sending=true;render();
  try{await SH.fs.doc(`clubs/${SH.club}/guestbook/${id}`).set(data);GB.done=true;GB.draft=emptyGuest()}
  catch(e){toast(t('live.saveFail'))}
  GB.sending=false;render();
}

// ---------- member list (officers) ----------
function membersView(){
  const head=`<div class="phead"><div><h2>${t('mem.title')}</h2><p class="muted">${t('mem.intro')}</p></div></div>`;
  if(!SH.on)return `<section class="panel">${head}${liveBox()}<p class="muted">${t('office.needLive')}</p></section>`;
  if(SH.officer!==true)return `<section class="panel">${head}<div class="box"><p>${t('mem.officersOnly')}</p><div><button class="primary" data-act="acc-officer">${t('office.signIn')}</button></div></div></section>`;
  const p=curPeriod();
  const active=MEM.list.filter(m=>(m.status||'active')==='active');
  const count=s=>active.filter(m=>renewalOf(m,p)===s).length;
  const fold=x=>String(x||'').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const q=fold(MEM.q.trim());
  const shown=MEM.list.filter(m=>(MEM.show==='all'||(m.status||'active')===MEM.show)
    &&(!q||[m.name,m.email,m.phone,m.tmId].some(x=>fold(x).includes(q))));
  const periods=[-2,-1,0,1].map(n=>shiftPeriod(periodOf(new Date()),n));if(!periods.includes(p))periods.push(p);
  return `<section class="panel">${head}
  <div class="box">
    <div class="phead"><div class="field" style="min-width:240px"><label class="label" for="mem-period">${t('mem.period')}</label>
      <select id="mem-period" data-act="mem-period">${periods.map(x=>`<option value="${x}" ${x===p?'selected':''}>${esc(periodLabel(x))}</option>`).join('')}</select></div></div>
    <div class="kv">
      <div><span class="label">${t('mem.active')}</span><b>${active.length}</b></div>
      <div><span class="label">${t('mem.r.paid')}</span><b style="color:var(--go)">${count('paid')}</b></div>
      <div><span class="label">${t('mem.r.pending')}</span><b style="color:var(--warn)">${count('pending')}</b></div>
      <div><span class="label">${t('mem.notSet')}</span><b>${count('')}</b></div>
      <div><span class="label">${t('mem.r.leaving')}</span><b style="color:var(--stop)">${count('leaving')}</b></div>
    </div>
    <p class="muted" style="font-size:.85rem">${t('mem.periodHint')}</p>
    <div class="btns"><button class="small" data-act="mem-copy-unpaid">${t('mem.copyUnpaid')}</button></div>
  </div>
  ${MEM.edit?memberForm():''}
  ${MEM.import?importBox():''}
  <div class="box">
    <div class="btns" style="align-items:center">
      <input id="mem-q" data-mem="q" value="${esc(MEM.q)}" placeholder="${t('mem.search')}" aria-label="${t('mem.search')}" style="flex:1;min-width:160px">
      <select data-act="mem-show" aria-label="${t('mem.show')}" style="width:auto">${['active','former','all'].map(x=>`<option value="${x}" ${MEM.show===x?'selected':''}>${t('mem.show.'+x)}</option>`).join('')}</select>
    </div>
    <div class="btns">
      ${MEM.edit?'':`<button class="small primary" data-act="mem-add">${t('mem.add')}</button>`}
      <button class="small" data-act="mem-export">${t('mem.export')}</button>
      <button class="small" data-act="mem-import-pick">${t('mem.import')}</button><input id="mem-file" type="file" accept=".csv,.txt,text/csv" data-act="mem-file" hidden>
    </div>
    ${!MEM.loaded?`<p class="empty">${t('office.loading')}</p>`:shown.length?`<div class="tablewrap"><table><thead><tr><th>${t('mem.name')}</th><th>${t('mem.contact')}</th><th>${t('mem.since')}</th><th>${t('mem.renewal')}</th><th></th></tr></thead><tbody>
    ${shown.map(m=>{const r=renewalOf(m,p);const former=(m.status||'active')==='former';
      return `<tr${former?' style="opacity:.6"':''}><td><b>${esc(m.name)}</b>${former?` <span class="chip">${t('mem.former')}</span>`:''}${m.tmId?`<br><span class="muted" style="font-size:.8rem">#${esc(m.tmId)}</span>`:''}${m.notes?`<br><span class="muted" style="font-size:.85rem">${esc(m.notes)}</span>`:''}</td>
      <td>${m.email?`<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>`:''}${m.phone?`<br><span class="muted">${esc(m.phone)}</span>`:''}</td>
      <td>${esc(m.joined?fmtShort(m.joined):'–')}</td>
      <td>${former?'–':`<select data-act="mem-renew" data-id="${esc(m.id)}" aria-label="${esc(t('mem.renewal')+' – '+m.name)}" class="renew ${r}"><option value="" ${r?'':'selected'}>–</option>${RENEW.map(s=>`<option value="${s}" ${r===s?'selected':''}>${t('mem.r.'+s)}</option>`).join('')}</select>`}</td>
      <td style="white-space:nowrap"><button class="ghost small" data-act="mem-edit" data-id="${esc(m.id)}">${t('mem.edit')}</button>
        ${MEM.confirmDel===m.id?`<button class="small" data-act="mem-del" data-id="${esc(m.id)}">${t('hist.yesDelete')}</button><button class="ghost small" data-act="mem-del-cancel">${t('common.cancel')}</button>`
          :`<button class="ghost small" data-act="mem-del-ask" data-id="${esc(m.id)}" aria-label="${esc(t('common.remove')+' '+m.name)}">×</button>`}</td></tr>`}).join('')}
    </tbody></table></div>`:`<p class="empty">${MEM.list.length?t('mem.noMatch'):t('mem.empty')}</p>`}
  </div>
  ${guestListBox()}
  </section>`;
}
const fmtShort=d=>{const x=new Date(d+'T12:00');return isNaN(x)?d:x.toLocaleDateString(locale(),{day:'numeric',month:'short',year:'numeric'})};

function memberForm(){
  const m=MEM.edit;
  return `<form class="box" data-form="mem-save" novalidate>
    <h3>${m.id?t('mem.editTitle',{name:esc(m.name)}):MEM.fromGuest?t('mem.fromGuestTitle'):t('mem.addTitle')}</h3>
    <div class="fields">
      <div class="field"><label class="label" for="mf-name">${t('mem.name')} *</label><input id="mf-name" data-mf="name" maxlength="100" value="${esc(m.name)}"></div>
      <div class="field"><label class="label" for="mf-email">${t('mem.email')}</label><input id="mf-email" type="email" data-mf="email" maxlength="120" value="${esc(m.email)}"></div>
      <div class="field"><label class="label" for="mf-phone">${t('gb.phone')}</label><input id="mf-phone" type="tel" data-mf="phone" maxlength="40" value="${esc(m.phone)}"></div>
      <div class="field"><label class="label" for="mf-joined">${t('mem.since')}</label><input id="mf-joined" type="date" data-mf="joined" value="${esc(m.joined)}"></div>
      <div class="field"><label class="label" for="mf-tmid">${t('mem.tmId')}</label><input id="mf-tmid" data-mf="tmId" maxlength="20" value="${esc(m.tmId)}"></div>
      <div class="field"><label class="label" for="mf-status">${t('mem.status')}</label><select id="mf-status" data-mf="status">${['active','former'].map(s=>`<option value="${s}" ${m.status===s?'selected':''}>${t('mem.st.'+s)}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label class="label" for="mf-notes">${t('mem.notes')}</label><textarea id="mf-notes" data-mf="notes" maxlength="1000" rows="2" placeholder="${t('mem.notesPh')}">${esc(m.notes)}</textarea></div>
    <div class="btns"><button type="submit" class="primary" ${MEM.busy?'disabled':''}>${t('cl.save')}</button><button type="button" data-act="mem-cancel">${t('common.cancel')}</button></div>
  </form>`;
}
const blankMember=()=>({id:null,name:'',email:'',phone:'',joined:todayISO(),tmId:'',status:'active',notes:''});
function memberData(m,source){
  return {name:m.name.trim().slice(0,100),email:m.email.trim().toLowerCase().slice(0,120),phone:m.phone.trim().slice(0,40),
    joined:/^\d{4}-\d{2}-\d{2}$/.test(m.joined||'')?m.joined:'',tmId:String(m.tmId||'').trim().slice(0,20),
    status:m.status==='former'?'former':'active',notes:String(m.notes||'').trim().slice(0,1000),
    updatedAt:new Date().toISOString(),updatedBy:SH.user.email,...(source?{source}:{})};
}
async function saveMember(){
  const m=MEM.edit;
  if(!m.name.trim()){toast(t('gb.needName'));return}
  if(m.email.trim()&&!emailOk(m.email.trim())){toast(t('off.invalid'));return}
  MEM.busy=true;render();
  try{
    if(m.id)await SH.fs.doc(`clubs/${SH.club}/members/${m.id}`).set(memberData(m),{merge:true});
    else{
      await SH.fs.collection(`clubs/${SH.club}/members`).add({...memberData(m,MEM.fromGuest?'guestbook':'manual'),renewals:{}});
      if(MEM.fromGuest)await SH.fs.doc(`clubs/${SH.club}/guestbook/${MEM.fromGuest}`).update({status:'member'});
    }
    toast(t('mem.saved',{name:m.name.trim()}));MEM.edit=null;MEM.fromGuest=null;
  }catch(e){writeFail(e)}
  MEM.busy=false;render();
}

// ---------- guest list (officers, inside the Members tab) ----------
function guestListBox(){
  const G=MEM.guests;
  const old=G.filter(g=>g.date&&g.date<monthsAgo(12));
  return `<div class="box"><div class="phead"><div><h3>${t('gb.listTitle')}</h3><p class="muted">${t('gb.listIntro')}</p></div>
    <div class="btns"><button class="small" data-act="qr-guestbook">${t('gb.showQr')}</button>${G.length?`<button class="small" data-act="gb-export">${t('mem.export')}</button>`:''}</div></div>
  ${G.length?`<div class="tablewrap"><table><thead><tr><th>${t('close.date')}</th><th>${t('mem.name')}</th><th>${t('mem.contact')}</th><th>${t('gb.details')}</th><th>${t('int.status')}</th><th></th></tr></thead><tbody>
  ${G.slice(0,200).map(g=>`<tr><td style="white-space:nowrap">${esc(fmtShort(g.date))}</td><td><b>${esc(g.name)}</b></td>
    <td>${g.email?`<a href="mailto:${esc(g.email)}">${esc(g.email)}</a>`:''}${g.phone?`<br><span class="muted">${esc(g.phone)}</span>`:''}</td>
    <td style="font-size:.9rem">${[g.first?t('gb.first.'+g.first):'',g.heard?t('gb.heard.'+g.heard):''].filter(Boolean).map(esc).join(' · ')}
      ${g.join?`<br><span class="chip ok">${t('gb.wantsJoin')}</span>`:''}${g.news?` <span class="chip">${t('gb.wantsNews')}</span>`:''}</td>
    <td><select data-act="gb-status" data-id="${esc(g.id)}" aria-label="${t('int.status')}">${GUEST_ST.map(s=>`<option value="${s}" ${(g.status||'new')===s?'selected':''}>${t('gb.st.'+s)}</option>`).join('')}</select></td>
    <td style="white-space:nowrap">${g.status==='member'?'':`<button class="small" data-act="gb-to-member" data-id="${esc(g.id)}">${t('gb.toMember')}</button>`}
      <button class="ghost small" data-act="gb-del" data-id="${esc(g.id)}" aria-label="${esc(t('common.remove')+' '+g.name)}">×</button></td></tr>`).join('')}
  </tbody></table></div>`:`<p class="empty">${t('gb.none')}</p>`}
  ${old.length?`<div class="notice"><span>${t('gb.oldText',{n:old.length})}</span>${MEM.confirmPurge
    ?`<div class="btns"><button class="small" data-act="gb-purge">${t('hist.yesDelete')}</button><button class="small ghost" data-act="gb-purge-cancel">${t('common.cancel')}</button></div>`
    :`<button class="small" data-act="gb-purge-ask">${t('gb.oldDelete')}</button>`}</div>`:''}
  </div>`;
}
function monthsAgo(n){const d=new Date();d.setMonth(d.getMonth()-n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

// ---------- CSV ----------
const csvSep=()=>LANG==='fr'?';':',';
function csvCell(v){v=String(v==null?'':v);if(/^[=+\-@]/.test(v))v="'"+v;return /[";,\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function downloadCsv(name,rows){
  const sep=csvSep();const text='﻿'+rows.map(r=>r.map(csvCell).join(sep)).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.download=name;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
function exportMembers(){
  const p=curPeriod();
  downloadCsv(`${SH.club}-members-${todayISO()}.csv`,[[t('mem.name'),t('mem.email'),t('gb.phone'),t('mem.since'),t('mem.tmId'),t('mem.status'),`${t('mem.renewal')} ${periodLabel(p)}`,t('mem.notes')],
    ...MEM.list.map(m=>[m.name,m.email,m.phone,m.joined,m.tmId,t('mem.st.'+(m.status||'active')),renewalOf(m,p)?t('mem.r.'+renewalOf(m,p)):'',m.notes])]);
}
function exportGuests(){
  downloadCsv(`${SH.club}-guests-${todayISO()}.csv`,[[t('close.date'),t('mem.name'),t('mem.email'),t('gb.phone'),t('gb.firstQ'),t('gb.heardQ'),t('gb.wantsJoin'),t('gb.wantsNews'),t('int.status')],
    ...MEM.guests.map(g=>[g.date,g.name,g.email,g.phone,g.first?t('gb.first.'+g.first):'',g.heard?t('gb.heard.'+g.heard):'',g.join?'✓':'',g.news?'✓':'',t('gb.st.'+(g.status||'new'))])]);
}
function parseCsv(text){
  text=text.replace(/^﻿/,'');
  const first=text.split(/\r?\n/)[0]||'';
  const sep=[';','\t',','].map(s=>[s,first.split(s).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else q=false}else cell+=c}
    else if(c==='"')q=true;else if(c===sep){row.push(cell);cell=''}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}
    else cell+=c}
  if(cell||row.length){row.push(cell);rows.push(row)}
  return rows.map(r=>r.map(x=>x.trim())).filter(r=>r.some(Boolean));
}
// Recognises the usual column names in English and French (and exports from other tools); otherwise name, email, phone.
function columnsOf(header){
  const norm=h=>h.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const map={};
  header.forEach((h,i)=>{const x=norm(h);
    if(/mail|courriel/.test(x))map.email??=i;
    else if(/phone|tel|mobile|portable/.test(x))map.phone??=i;
    else if(/since|depuis|join|adhesion|inscri/.test(x))map.joined??=i;
    else if(/member.?(id|number|no)|customer|numero|^id$|matricule/.test(x))map.tmId??=i;
    else if(/first|prenom|given/.test(x))map.first??=i;
    else if(/last|surname|family|nom de famille/.test(x))map.last??=i;
    else if(/name|^nom/.test(x))map.name??=i;
    else if(/note|comment/.test(x))map.notes??=i;
  });
  // "Prénom" + "Nom": with a first-name column, a plain name column holds the last name.
  if(map.first!=null&&map.last==null&&map.name!=null){map.last=map.name;delete map.name}
  const ok=map.name!=null||map.first!=null||map.last!=null;
  return ok?{map,header:true}:{map:{name:0,email:1,phone:2},header:false};
}
function parseDate(v){
  v=String(v||'').trim();let m;
  if((m=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)))return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  // Day first (as in France and the UK), unless the second number cannot be a month.
  if((m=v.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/))){let [d,mo]=[m[1],m[2]];if(+mo>12&&+d<=12)[d,mo]=[mo,d];
    return `${m[3]}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`}
  return '';
}
function readImport(text){
  const rows=parseCsv(text);if(!rows.length){toast(t('mem.importEmpty'));return}
  const {map,header}=columnsOf(rows[0]);const body=header?rows.slice(1):rows;
  const known=new Set(MEM.list.flatMap(m=>[m.email&&'e:'+m.email.toLowerCase(),'n:'+(m.name||'').toLocaleLowerCase()]).filter(Boolean));
  const add=[],skip=[];
  body.forEach(r=>{
    const g=k=>map[k]!=null?(r[map[k]]||'').trim():'';
    const name=(g('name')||[g('first'),g('last')].filter(Boolean).join(' ')).replace(/\s+/g,' ');
    if(!name)return;
    const email=g('email').toLowerCase();
    const m={name,email:emailOk(email)?email:'',phone:g('phone'),joined:parseDate(g('joined')),tmId:g('tmId'),notes:g('notes'),status:'active'};
    const dup=known.has('n:'+name.toLocaleLowerCase())||(m.email&&known.has('e:'+m.email));
    (dup?skip:add).push(m);known.add('n:'+name.toLocaleLowerCase());if(m.email)known.add('e:'+m.email);
  });
  MEM.import={add,skip};render();
}
function importBox(){
  const {add,skip}=MEM.import;
  return `<div class="box"><h3>${t('mem.importTitle')}</h3>
    <p>${t('mem.importSummary',{n:add.length,s:skip.length})}</p>
    ${add.length?`<ul>${add.slice(0,8).map(m=>`<li>${esc(m.name)}${m.email?` <span class="muted">&lt;${esc(m.email)}&gt;</span>`:''}</li>`).join('')}${add.length>8?`<li class="muted">${t('mem.andMore',{n:add.length-8})}</li>`:''}</ul>`:''}
    ${skip.length?`<p class="muted" style="font-size:.85rem">${t('mem.skipped')} ${skip.slice(0,10).map(m=>esc(m.name)).join(', ')}${skip.length>10?'…':''}</p>`:''}
    <div class="btns">${add.length?`<button class="primary" data-act="mem-import-go" ${MEM.busy?'disabled':''}>${t('mem.importGo',{n:add.length})}</button>`:''}<button data-act="mem-import-cancel">${t('common.cancel')}</button></div>
    <p class="muted" style="font-size:.85rem">${t('mem.importHelp')}</p></div>`;
}
async function runImport(){
  const list=MEM.import.add;MEM.busy=true;render();let done=0;
  try{
    for(let i=0;i<list.length;i+=10){
      await Promise.all(list.slice(i,i+10).map(m=>SH.fs.collection(`clubs/${SH.club}/members`).add({...memberData(m,'import'),renewals:{}})));
      done=Math.min(list.length,i+10);
    }
    toast(t('mem.imported',{n:done}));MEM.import=null;
  }catch(e){writeFail(e);toast(t('mem.importPartial',{n:done}))}
  MEM.busy=false;render();
}

// ---------- events ----------
document.addEventListener('input',ev=>{
  const el=ev.target;const d=el.dataset||{};
  if(d.gb&&d.gb!=='join'&&d.gb!=='news'){GB.draft[d.gb]=el.value;return}
  if(d.mf&&MEM.edit){MEM.edit[d.mf]=el.value;return}
  if(d.mem==='q'){MEM.q=el.value;const pos=el.selectionStart;render();const i=document.getElementById('mem-q');if(i){i.focus();try{i.setSelectionRange(pos,pos)}catch(e){}}}
});
document.addEventListener('change',async ev=>{
  const el=ev.target;const d=el.dataset||{};
  if(d.gb==='join'||d.gb==='news'){GB.draft[d.gb]=el.checked;return}
  if(d.mf==='status'&&MEM.edit){MEM.edit.status=el.value;return}
  switch(d.act){
  case 'mem-period':MEM.period=el.value;render();return;
  case 'mem-show':MEM.show=el.value;render();return;
  case 'mem-renew':{const id=d.id,p=curPeriod(),v=el.value;const m=MEM.list.find(x=>x.id===id);if(m){m.renewals={...(m.renewals||{}),[p]:v}}
    el.className='renew '+v;
    try{await SH.fs.doc(`clubs/${SH.club}/members/${id}`).set({renewals:{[p]:v},updatedAt:new Date().toISOString(),updatedBy:SH.user.email},{merge:true})}catch(e){writeFail(e)}
    softRender();return}
  case 'gb-status':SH.fs.doc(`clubs/${SH.club}/guestbook/${d.id}`).update({status:el.value}).catch(writeFail);return;
  case 'mem-file':{const f=el.files&&el.files[0];if(!f)return;
    if(f.size>1e6){toast(t('mem.importBig'));el.value='';return}
    const r=new FileReader();r.onload=()=>{readImport(String(r.result||''));};r.readAsText(f,'utf-8');el.value='';return}
  }
});
document.addEventListener('submit',ev=>{
  const f=ev.target.dataset.form;
  if(f==='guestbook'){ev.preventDefault();sendGuest()}
  if(f==='mem-save'){ev.preventDefault();saveMember()}
});
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act]');if(!b||b.tagName==='SELECT'||b.tagName==='INPUT')return;const a=b.dataset.act,id=b.dataset.id,v=b.dataset.v;
  switch(a){
  case 'qr-guestbook':openQr('guestbook');return;
  case 'go-members':setTab('members');return;
  case 'gb-first':GB.draft.first=v;break;
  case 'gb-heard':GB.draft.heard=GB.draft.heard===v?'':v;break;
  case 'gb-next':GB.done=false;GB.draft=emptyGuest();render();{const i=document.getElementById('gb-name');if(i)i.focus()}return;
  case 'gb-to-member':{const g=MEM.guests.find(x=>x.id===id);if(!g)return;
    MEM.edit={...blankMember(),name:g.name||'',email:g.email||'',phone:g.phone||''};MEM.fromGuest=id;render();scrollToForm();return}
  case 'gb-del':SH.fs.doc(`clubs/${SH.club}/guestbook/${id}`).delete().catch(writeFail);return;
  case 'gb-export':exportGuests();return;
  case 'gb-purge-ask':MEM.confirmPurge=true;break;
  case 'gb-purge-cancel':MEM.confirmPurge=false;break;
  case 'gb-purge':{const lim=monthsAgo(12);MEM.confirmPurge=false;
    Promise.all(MEM.guests.filter(g=>g.date&&g.date<lim).map(g=>SH.fs.doc(`clubs/${SH.club}/guestbook/${g.id}`).delete())).then(()=>toast(t('gb.oldDone'))).catch(writeFail);break}
  case 'mem-add':MEM.edit=blankMember();MEM.fromGuest=null;render();scrollToForm();return;
  case 'mem-edit':{const m=MEM.list.find(x=>x.id===id);if(!m)return;MEM.edit={...blankMember(),...m,joined:m.joined||''};MEM.fromGuest=null;render();scrollToForm();return}
  case 'mem-cancel':MEM.edit=null;MEM.fromGuest=null;break;
  case 'mem-del-ask':MEM.confirmDel=id;break;
  case 'mem-del-cancel':MEM.confirmDel=null;break;
  case 'mem-del':MEM.confirmDel=null;SH.fs.doc(`clubs/${SH.club}/members/${id}`).delete().then(()=>toast(t('mem.deleted'))).catch(writeFail);break;
  case 'mem-export':exportMembers();return;
  case 'mem-import-pick':{const f=document.getElementById('mem-file');if(f)f.click();return}
  case 'mem-import-go':runImport();return;
  case 'mem-import-cancel':MEM.import=null;break;
  case 'mem-copy-unpaid':{const p=curPeriod();
    const list=MEM.list.filter(m=>(m.status||'active')==='active'&&!['paid','leaving'].includes(renewalOf(m,p))&&m.email).map(m=>m.email);
    if(!list.length){toast(t('mem.noneUnpaid'));return}copyText(list.join(', '));return}
  default:return;
  }
  render();
});
function scrollToForm(){setTimeout(()=>{const i=document.getElementById('mf-name');if(i){i.focus();i.scrollIntoView({block:'center'})}},30)}
