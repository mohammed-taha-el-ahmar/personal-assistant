// Oratia – several meetings planned ahead.
// The next meeting stays where it always was (meeting/agenda and meeting/roles): the timer, votes, reports, speech
// slots and the club page work on it. Later meetings are planned in clubs/{club}/plans/{date}
// {date,agenda:{…},roles:{…},edit,createdBy,at}. In the Agenda and Roles tabs a bar lets anyone pick a planned meeting:
// members take roles in it, officers edit its agenda. When the officers close the next meeting (with "start a new
// meeting"), the earliest planned meeting becomes the next one and its plan is removed.
// Attendance answers are already kept per date, so "Are you coming?" follows the meeting picked.

const MTG={sel:'',plans:[],unsub:null,curAgenda:null,curRoles:{},open:false,date:'',confirmDel:false,busy:false};
const planRef=d=>SH.fs.doc(`clubs/${SH.club}/plans/${d}`);
const MTG_TABS=['agenda','roles'];

function meetingsLive(){
  if(MTG.unsub)MTG.unsub();
  MTG.unsub=SH.fs.collection(`clubs/${SH.club}/plans`).onSnapshot(q=>{
    MTG.plans=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    if(MTG.sel){const p=MTG.plans.find(x=>x.id===MTG.sel);
      if(!p){selectMeeting('');return}
      if(!SH.agendaDirty){S.agenda=normAgenda(p.agenda);}SH.roles=clone(p.roles||{});}
    softRender();
  },()=>{MTG.plans=[]});
}
const normAgenda=a=>{const x=clone(a||defaultAgenda());if(!Array.isArray(x.items))x.items=[];return x};
// Called by the listeners of the next meeting (app.js): keep its copy, show it unless a planned meeting is picked.
function meetingCurrent(kind,val){if(kind==='agenda')MTG.curAgenda=val;else MTG.curRoles=val;return !MTG.sel}
function selectMeeting(d){
  if(d===MTG.sel)return;
  clearTimeout(SH.agendaTimer);SH.agendaDirty=false;
  MTG.sel=d;MTG.confirmDel=false;
  if(!d){S.agenda=normAgenda(MTG.curAgenda||defaultAgenda());SH.roles=clone(MTG.curRoles||{})}
  else{const p=MTG.plans.find(x=>x.id===d);if(!p){MTG.sel='';return}S.agenda=normAgenda(p.agenda);SH.roles=clone(p.roles||{})}
  render();
}
function meetingLeave(){
  if(!MTG.sel||MTG_TABS.includes(tab))return;
  clearTimeout(SH.agendaTimer);SH.agendaDirty=false;MTG.sel='';MTG.confirmDel=false;
  S.agenda=normAgenda(MTG.curAgenda||defaultAgenda());SH.roles=clone(MTG.curRoles||{});
}
// Where writes go: the picked planned meeting, or the next meeting.
const rolesTarget=()=>MTG.sel?planRef(MTG.sel):SH.ref.roles;
async function writeAgendaTarget(agenda){if(MTG.sel)await planRef(MTG.sel).update({agenda});else await SH.ref.agenda.set(agenda)}

const MGT={
en:{next:'Next meeting',none:'no date',planned:'Planned',plan:'+ Plan a meeting',date:'Date',create:'Plan it',created:'Meeting planned',exists:'A meeting is already planned on this date.',
  after:'Choose a date after the next meeting.',viewing:'You are on the meeting of {d}. It becomes the next meeting when the officers close the one of {n}.',
  copyNote:'Its agenda starts as a copy of the next meeting’s; apply a template if needed.',del:'Delete this planned meeting',delAsk:'Delete the meeting of {d} and its roles?',deleted:'Planned meeting deleted',
  promoted:'The meeting of {d} is now the next meeting.'},
fr:{next:'Prochaine réunion',none:'sans date',planned:'Planifiées',plan:'+ Planifier une réunion',date:'Date',create:'Planifier',created:'Réunion planifiée',exists:'Une réunion est déjà planifiée à cette date.',
  after:'Choisissez une date après la prochaine réunion.',viewing:'Vous êtes sur la réunion du {d}. Elle deviendra la prochaine réunion quand le bureau clôturera celle du {n}.',
  copyNote:'Son ordre du jour reprend celui de la prochaine réunion ; appliquez un modèle si besoin.',del:'Supprimer cette réunion planifiée',delAsk:'Supprimer la réunion du {d} et ses rôles ?',deleted:'Réunion planifiée supprimée',
  promoted:'La réunion du {d} est maintenant la prochaine réunion.'},
nl:{next:'Volgende bijeenkomst',none:'geen datum',planned:'Gepland',plan:'+ Bijeenkomst plannen',date:'Datum',create:'Plannen',created:'Bijeenkomst gepland',exists:'Op deze datum is al een bijeenkomst gepland.',
  after:'Kies een datum na de volgende bijeenkomst.',viewing:'Je bent op de bijeenkomst van {d}. Die wordt de volgende bijeenkomst zodra het bestuur die van {n} afsluit.',
  copyNote:'De agenda begint als kopie van die van de volgende bijeenkomst; pas zo nodig een sjabloon toe.',del:'Deze geplande bijeenkomst verwijderen',delAsk:'De bijeenkomst van {d} en de rollen verwijderen?',deleted:'Geplande bijeenkomst verwijderd',
  promoted:'De bijeenkomst van {d} is nu de volgende bijeenkomst.'},
ar:{next:'الاجتماع القادم',none:'بلا تاريخ',planned:'مخطَّط لها',plan:'+ تخطيط اجتماع',date:'التاريخ',create:'تخطيط',created:'تم تخطيط الاجتماع',exists:'يوجد اجتماع مخطَّط في هذا التاريخ.',
  after:'اختر تاريخاً بعد الاجتماع القادم.',viewing:'أنت على اجتماع {d}. سيصبح الاجتماع القادم عندما يغلق مجلس الإدارة اجتماع {n}.',
  copyNote:'يبدأ جدول أعماله نسخةً من جدول الاجتماع القادم؛ طبّق نموذجاً إن لزم.',del:'حذف هذا الاجتماع المخطَّط',delAsk:'حذف اجتماع {d} وأدواره؟',deleted:'تم حذف الاجتماع المخطَّط',
  promoted:'أصبح اجتماع {d} هو الاجتماع القادم.'}};
const MGL=()=>MGT[LANG]||MGT.en;
const dayShort=d=>d?new Date(d+'T12:00').toLocaleDateString(locale(),{weekday:'short',day:'numeric',month:'short'}):'';

// The bar at the top of the Agenda and Roles tabs.
function meetingBar(){
  if(!SH.on)return '';
  const L=MGL();const cur=MTG.curAgenda||{};const mgr=canManage();
  if(!MTG.plans.length&&!mgr)return '';
  const chipM=(id,label,on)=>`<button type="button" class="spk" data-act="mtg-sel" data-v="${esc(id)}" aria-pressed="${on}">${label}</button>`;
  return `<div class="box mtgbar"><div class="speakers" role="group" aria-label="${esc(L.planned)}">
      ${chipM('',`${esc(L.next)} · ${esc(cur.date?dayShort(cur.date):L.none)}`,!MTG.sel)}
      ${MTG.plans.map(p=>chipM(p.id,esc(dayShort(p.date)),MTG.sel===p.id)).join('')}
      ${mgr?`<button type="button" class="small ghost" data-act="mtg-open" aria-expanded="${MTG.open}">${esc(L.plan)}</button>`:''}</div>
    ${MTG.open&&mgr?`<div class="speakers" role="group">${['one','series'].map(k=>chip('mtg-mode',k,MTGS.mode===k,esc(MGL2()[k]))).join('')}</div>`:''}
    ${MTG.open&&mgr&&MTGS.mode==='series'?seriesForm():''}
    ${MTG.open&&mgr&&MTGS.mode!=='series'?`<form class="btns" data-form="mtg-new" style="flex-wrap:nowrap;align-items:flex-end"><div class="field"><label class="label" for="mtg-date">${esc(L.date)}</label><input id="mtg-date" type="date" value="${esc(MTG.date)}" min="${esc(cur.date||todayISO())}"></div><button type="submit" class="primary" ${MTG.busy?'disabled':''}>${esc(L.create)}</button></form><p class="muted" style="margin:0;font-size:.85rem">${esc(L.copyNote)}</p>`:''}
    ${MTG.sel?`<div class="notice" style="margin:0"><span>${esc(L.viewing.replace('{d}',fmtDate(MTG.sel)).replace('{n}',cur.date?fmtDate(cur.date):L.none))}</span>
      ${mgr?(MTG.confirmDel?`<span class="muted">${esc(L.delAsk.replace('{d}',fmtDate(MTG.sel)))}</span><button class="small danger" data-act="mtg-del">${esc(t('common.remove'))}</button><button class="small ghost" data-act="mtg-del-cancel">${esc(t('common.cancel'))}</button>`
        :`<button class="small ghost" data-act="mtg-del-ask">${esc(L.del)}</button>`):''}</div>`:''}
  </div>`;
}
// Closing the next meeting: the earliest planned meeting takes its place. Returns true when one was promoted.
async function promoteNextPlan(closedDate){
  const p=MTG.plans.find(x=>!closedDate||x.date>closedDate)||MTG.plans[0];if(!p)return false;
  const ag=normAgenda(p.agenda);ag.date=p.date;
  await SH.ref.agenda.set(ag);await SH.ref.roles.set({roles:p.roles||{}});await planRef(p.id).delete();
  toast(MGL().promoted.replace('{d}',fmtDate(p.date)));return true;
}
// A speech request approved for a planned meeting goes into that meeting's roles.
async function writeRoleOn(date,k,val){
  const p=date&&MTG.plans.find(x=>x.date===date);
  if(!p||MTG.sel===p.id)return writeRole(k,val);
  await planRef(p.id).set({roles:{[k]:val},edit:k},{merge:true});
}

document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act^="mtg-"]');if(!b)return;const a=b.dataset.act;const L=MGL();
  if(a==='mtg-sel'){selectMeeting(b.dataset.v);return}
  if(a==='mtg-open'){MTG.open=!MTG.open;render();return}
  if(a==='mtg-del-ask'){MTG.confirmDel=true;render();return}
  if(a==='mtg-del-cancel'){MTG.confirmDel=false;render();return}
  if(a==='mtg-del'){const d=MTG.sel;selectMeeting('');planRef(d).delete().then(()=>toast(L.deleted)).catch(writeFail);return}
});
document.addEventListener('input',ev=>{if(ev.target.id==='mtg-date')MTG.date=ev.target.value});
document.addEventListener('submit',ev=>{
  if(ev.target.dataset.form!=='mtg-new')return;ev.preventDefault();const L=MGL();
  const d=(document.getElementById('mtg-date')||{}).value||'';if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return;
  const cur=MTG.curAgenda||{};
  if(cur.date&&d<=cur.date){toast(L.after);return}
  if(MTG.plans.some(p=>p.id===d)){toast(L.exists);return}
  const ag=planAgendaFor(d);
  MTG.busy=true;render();
  planRef(d).set({date:d,agenda:ag,roles:{},createdBy:SH.user&&SH.user.email||SH.uid,at:new Date().toISOString()})
    .then(()=>{MTG.open=false;MTG.date='';toast(L.created);setTimeout(()=>selectMeeting(d),300)}).catch(writeFail).finally(()=>{MTG.busy=false;render()});
});

// ---------- step 2: series, upcoming meetings, open roles of several meetings ----------
const MTGS={mode:'one',from:'',to:'',wd:'',rhythm:'w1',pos:{1:false,2:true,3:false,4:true,5:false}};
const MGT2={
en:{one:'One date',series:'A series',from:'From',to:'Until',weekday:'Day',rhythm:'Rhythm',r:{w1:'Every week',w2:'Every two weeks',m:'Some weeks of the month'},
  pos:{1:'1st',2:'2nd',3:'3rd',4:'4th',5:'last'},preview:'{n} meeting(s): {list}',noneDates:'No date matches.',createN:'Plan these meetings',createdN:'{n} meeting(s) planned',skipped:'{n} already planned or before the next meeting',max:'Up to 26 meetings at a time',
  upcoming:'Upcoming meetings',openN:'{n} role(s) open',full:'All roles filled',seeRoles:'Roles',copyMulti:'Copy the open roles of the coming meetings',msgHead:'Roles still open:',msgFoot:'Take a role here: {link}',msgNone:'All roles are filled for the coming meetings.'},
fr:{one:'Une date',series:'Une série',from:'Du',to:'Au',weekday:'Jour',rhythm:'Rythme',r:{w1:'Toutes les semaines',w2:'Toutes les deux semaines',m:'Certaines semaines du mois'},
  pos:{1:'1er',2:'2e',3:'3e',4:'4e',5:'dernier'},preview:'{n} réunion(s) : {list}',noneDates:'Aucune date ne correspond.',createN:'Planifier ces réunions',createdN:'{n} réunion(s) planifiée(s)',skipped:'{n} déjà planifiée(s) ou avant la prochaine réunion',max:'26 réunions au maximum à la fois',
  upcoming:'Prochaines réunions',openN:'{n} rôle(s) libre(s)',full:'Tous les rôles sont pris',seeRoles:'Rôles',copyMulti:'Copier les rôles libres des prochaines réunions',msgHead:'Rôles encore libres :',msgFoot:'Prenez un rôle ici : {link}',msgNone:'Tous les rôles sont pris pour les prochaines réunions.'},
nl:{one:'Eén datum',series:'Een reeks',from:'Van',to:'Tot',weekday:'Dag',rhythm:'Ritme',r:{w1:'Elke week',w2:'Om de twee weken',m:'Bepaalde weken van de maand'},
  pos:{1:'1e',2:'2e',3:'3e',4:'4e',5:'laatste'},preview:'{n} bijeenkomst(en): {list}',noneDates:'Geen datum past.',createN:'Deze bijeenkomsten plannen',createdN:'{n} bijeenkomst(en) gepland',skipped:'{n} al gepland of vóór de volgende bijeenkomst',max:'Maximaal 26 bijeenkomsten tegelijk',
  upcoming:'Komende bijeenkomsten',openN:'{n} rol(len) vrij',full:'Alle rollen bezet',seeRoles:'Rollen',copyMulti:'Vrije rollen van de komende bijeenkomsten kopiëren',msgHead:'Nog vrije rollen:',msgFoot:'Neem hier een rol: {link}',msgNone:'Alle rollen zijn bezet voor de komende bijeenkomsten.'},
ar:{one:'تاريخ واحد',series:'سلسلة',from:'من',to:'إلى',weekday:'اليوم',rhythm:'الإيقاع',r:{w1:'كل أسبوع',w2:'كل أسبوعين',m:'أسابيع محدّدة من الشهر'},
  pos:{1:'الأول',2:'الثاني',3:'الثالث',4:'الرابع',5:'الأخير'},preview:'{n} اجتماع: {list}',noneDates:'لا يوجد تاريخ مطابق.',createN:'تخطيط هذه الاجتماعات',createdN:'تم تخطيط {n} اجتماع',skipped:'{n} مخطَّط مسبقاً أو قبل الاجتماع القادم',max:'26 اجتماعاً كحدّ أقصى في المرة الواحدة',
  upcoming:'الاجتماعات القادمة',openN:'{n} دور شاغر',full:'كل الأدوار مشغولة',seeRoles:'الأدوار',copyMulti:'نسخ الأدوار الشاغرة للاجتماعات القادمة',msgHead:'الأدوار التي ما زالت شاغرة:',msgFoot:'احجز دوراً من هنا: {link}',msgNone:'كل الأدوار مشغولة في الاجتماعات القادمة.'}};
const MGL2=()=>MGT2[LANG]||MGT2.en;
const isoDay=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseDay=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12)};
function seriesDates(){
  const f=MTGS.from,to=MTGS.to;if(!/^\d{4}-\d{2}-\d{2}$/.test(f)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||to<f)return [];
  const wd=MTGS.wd===''?parseDay(f).getDay():+MTGS.wd;const out=[];
  let d=parseDay(f);while(d.getDay()!==wd)d.setDate(d.getDate()+1);
  let k=0;
  while(isoDay(d)<=to&&out.length<60){
    let ok=true;
    if(MTGS.rhythm==='w2')ok=k%2===0;
    if(MTGS.rhythm==='m'){const n=Math.ceil(d.getDate()/7);const nx=new Date(d);nx.setDate(d.getDate()+7);const last=nx.getMonth()!==d.getMonth();
      ok=!!MTGS.pos[n]||(last&&!!MTGS.pos[5])}
    if(ok)out.push(isoDay(d));d.setDate(d.getDate()+7);k++;
  }
  return out;
}
function seriesForm(){
  const L=MGL2();const cur=MTG.curAgenda||{};
  if(!MTGS.from){const s=cur.date?parseDay(cur.date):new Date();s.setDate(s.getDate()+7);MTGS.from=isoDay(s);const e=new Date(s);e.setMonth(e.getMonth()+3);MTGS.to=isoDay(e);
    if(MTGS.wd==='')MTGS.wd=String(cur.date?parseDay(cur.date).getDay():s.getDay())}
  const days=[1,2,3,4,5,6,0];const dn=n=>new Date(2026,1,1+n).toLocaleDateString(locale(),{weekday:'long'}); // 1 Feb 2026 is a Sunday
  const all=seriesDates();const fresh=all.filter(d=>(!cur.date||d>cur.date)&&!MTG.plans.some(p=>p.id===d));
  return `<form class="fields seriesf" data-form="mtg-series" novalidate>
    <div class="field"><label class="label" for="ms-from">${esc(L.from)}</label><input id="ms-from" type="date" data-ms="from" value="${esc(MTGS.from)}"></div>
    <div class="field"><label class="label" for="ms-to">${esc(L.to)}</label><input id="ms-to" type="date" data-ms="to" value="${esc(MTGS.to)}"></div>
    <div class="field"><label class="label" for="ms-wd">${esc(L.weekday)}</label><select id="ms-wd" data-ms="wd">${days.map(n=>`<option value="${n}" ${String(n)===MTGS.wd?'selected':''}>${esc(dn(n))}</option>`).join('')}</select></div>
    <div class="field"><label class="label" for="ms-r">${esc(L.rhythm)}</label><select id="ms-r" data-ms="rhythm">${['w1','w2','m'].map(r=>`<option value="${r}" ${r===MTGS.rhythm?'selected':''}>${esc(L.r[r])}</option>`).join('')}</select></div>
    ${MTGS.rhythm==='m'?`<div class="btns" style="grid-column:1/-1">${[1,2,3,4,5].map(n=>`<label class="check" for="ms-p${n}"><input type="checkbox" id="ms-p${n}" data-mspos="${n}" ${MTGS.pos[n]?'checked':''}><span>${esc(L.pos[n])}</span></label>`).join('')}</div>`:''}
    <p class="muted" style="grid-column:1/-1;margin:0;font-size:.88rem">${fresh.length?esc(L.preview.replace('{n}',Math.min(fresh.length,26)).replace('{list}',fresh.slice(0,26).map(dayShort).join(', '))):esc(L.noneDates)}${all.length>fresh.length?' · '+esc(L.skipped.replace('{n}',all.length-fresh.length)):''}${fresh.length>26?' · '+esc(L.max):''}</p>
    <div class="btns" style="grid-column:1/-1"><button type="submit" class="primary" ${MTG.busy||!fresh.length?'disabled':''}>${esc(L.createN)}</button></div></form>`;
}
function planAgendaFor(d){const cur=MTG.curAgenda||S.agenda;const ag=normAgenda(cur);ag.date=d;ag.theme='';ag.items.forEach(it=>{if(it.k)it.title=null});return ag}

// Open roles of a meeting (its agenda decides between the meeting and the contest list).
function openRolesOf(agenda,roles){
  const keys=[...(agenda&&agenda.rolesMode==='contest'?CONTEST_OFFICIAL_KEYS:ROLE_KEYS),...customRoles(agenda).map(r=>r.id)];
  return keys.filter(k=>{const e=(roles||{})[k];return (!(e&&e.n)&&!OPTIONAL_ROLES.includes(k))||(e&&e.swap)});
}
function upcomingMeetings(n=5){
  const cur=MTG.curAgenda||(MTG.sel?null:S.agenda);const list=[];
  if(cur&&cur.date)list.push({id:'',date:cur.date,theme:cur.theme||'',ag:cur,open:openRolesOf(cur,MTG.curRoles||SH.roles)});
  MTG.plans.forEach(p=>list.push({id:p.id,date:p.date,theme:(p.agenda&&p.agenda.theme)||'',ag:p.agenda,open:openRolesOf(p.agenda,p.roles)}));
  return list.slice(0,n);
}
function upcomingBox(){
  if(!SH.on)return '';const L=MGL2();const ms=upcomingMeetings(5);if(ms.length<2)return '';
  return `<div class="box"><h3>${esc(L.upcoming)}</h3><ul class="upcoming">${ms.map(m=>`<li><div><b>${esc(fmtDate(m.date))}</b>${m.theme?` <span class="muted">· ${esc(m.theme)}</span>`:''}<br>
      <span class="chip ${m.open.length?'warn':'ok'}">${esc(m.open.length?L.openN.replace('{n}',m.open.length):L.full)}</span></div>
      ${isOn('roles')?`<button class="small" data-act="mtg-goroles" data-v="${esc(m.id)}">${esc(L.seeRoles)}</button>`:''}</li>`).join('')}</ul></div>`;
}
function multiOpenMessage(){
  const L=MGL2();const ms=upcomingMeetings(5).filter(m=>m.open.length);if(!ms.length)return L.msgNone;
  const u=new URL(shareLink());u.hash='roles';
  return `${L.msgHead}\n\n`+ms.map(m=>`${fmtDate(m.date)}${m.theme?' – '+m.theme:''}\n`+m.open.map(k=>'• '+roleLabel(k,m.ag)).join('\n')).join('\n\n')+`\n\n${L.msgFoot.replace('{link}',u.toString())}`;
}

document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act="mtg-mode"],[data-act="mtg-goroles"],[data-act="mtg-copy"]');if(!b)return;
  if(b.dataset.act==='mtg-mode'){MTGS.mode=b.dataset.v;render();return}
  if(b.dataset.act==='mtg-copy'){copyText(multiOpenMessage());return}
  if(b.dataset.act==='mtg-goroles'){setTab('roles');selectMeeting(b.dataset.v);return}
});
document.addEventListener('change',ev=>{const ds=ev.target.dataset||{};
  if(ds.ms){MTGS[ds.ms]=ev.target.value;render();return}
  if(ds.mspos){MTGS.pos[ds.mspos]=ev.target.checked;render();return}});
document.addEventListener('submit',ev=>{
  if(ev.target.dataset.form!=='mtg-series')return;ev.preventDefault();const L=MGL2();const cur=MTG.curAgenda||{};
  const dates=seriesDates().filter(d=>(!cur.date||d>cur.date)&&!MTG.plans.some(p=>p.id===d)).slice(0,26);if(!dates.length)return;
  MTG.busy=true;render();
  (async()=>{const by=SH.user&&SH.user.email||SH.uid,at=new Date().toISOString();
    for(const d of dates)await planRef(d).set({date:d,agenda:planAgendaFor(d),roles:{},createdBy:by,at});})()
    .then(()=>{MTG.open=false;toast(L.createdN.replace('{n}',dates.length))}).catch(writeFail).finally(()=>{MTG.busy=false;render()});
});
