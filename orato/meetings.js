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
    ${MTG.open&&mgr?`<form class="btns" data-form="mtg-new" style="flex-wrap:nowrap;align-items:flex-end"><div class="field"><label class="label" for="mtg-date">${esc(L.date)}</label><input id="mtg-date" type="date" value="${esc(MTG.date)}" min="${esc(cur.date||todayISO())}"></div><button type="submit" class="primary" ${MTG.busy?'disabled':''}>${esc(L.create)}</button></form><p class="muted" style="margin:0;font-size:.85rem">${esc(L.copyNote)}</p>`:''}
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
  const ag=normAgenda(cur.date?cur:S.agenda);ag.date=d;ag.theme='';ag.items.forEach(it=>{if(it.k)it.title=null});
  MTG.busy=true;render();
  planRef(d).set({date:d,agenda:ag,roles:{},createdBy:SH.user&&SH.user.email||SH.uid,at:new Date().toISOString()})
    .then(()=>{MTG.open=false;MTG.date='';toast(L.created);setTimeout(()=>selectMeeting(d),300)}).catch(writeFail).finally(()=>{MTG.busy=false;render()});
});
