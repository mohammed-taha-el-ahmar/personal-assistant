// Oratia – speech requests.
// A member with an active profile asks for a speaking slot: path, level, project, title, timing, preferred meeting date.
// Officers (the VPE in practice) or the Toastmaster of the day approve it and choose the slot (Speaker 1–3), or decline it.
// Approved speeches show their title in the agenda and can be timed in one tap. Each request has a short comment thread
// between the speaker and the approvers.
//
// clubs/{club}/speeches/{id} {uid,name,path,level,project,title,preset,date,note,status,slot,comments:[{uid,name,text,at}],
//   at,updatedAt,decidedBy,decidedAt}   status: pending | approved | declined | withdrawn | done
// Everyone with the club link reads them (approved titles are on the agenda); the rules check who writes what.

const SP={list:[],unsub:null,draft:null,busy:false,show:'open',openCom:{},slot:{}};
const SPEECH_SLOTS=['s1','s2','s3'];
const SP_PRESETS=['ice','std','long','tt','eval'];

const isToD=()=>{const e=SH.roles&&SH.roles.toastmaster;return !!(SH.on&&e&&e.u&&e.u===SH.uid)};
const canApprove=()=>SH.on&&(SH.officer===true||isToD());
const canRequestSpeech=()=>SH.on&&(SH.officer===true||(typeof profileMember==='function'&&profileMember()));
const spMine=s=>s.uid===SH.uid;
const spOpen=s=>['pending','approved'].includes(s.status);

function speechesLive(){
  if(SP.unsub)SP.unsub();
  SP.unsub=SH.fs.collection(`clubs/${SH.club}/speeches`).orderBy('at','desc').limit(200).onSnapshot(q=>{
    SP.list=q.docs.map(d=>({id:d.id,...d.data()}));softRender();claimMySlots();
  },()=>{SP.list=[]});
}
// The approved speech for a slot at the current meeting (same date, or no date given).
function speechForSlot(slot){
  if(!SH.on)return null;const d=S.agenda&&S.agenda.date||'';
  return SP.list.find(s=>s.status==='approved'&&s.slot===slot&&(!s.date||!d||s.date===d))||null;
}
// When an approver could not write the role themselves (the Toastmaster of the day in a club with member access),
// the speaker's own device takes the free slot as soon as it sees the approval.
let spClaiming=false;
async function claimMySlots(){
  if(spClaiming||!SH.on||!SH.ref)return;
  const mine=SP.list.filter(s=>spMine(s)&&s.status==='approved'&&s.slot&&(!s.date||!S.agenda.date||s.date===S.agenda.date));
  for(const s of mine){const e=SH.roles[s.slot];
    if(!(e&&e.n)&&canAct()){spClaiming=true;try{await writeRole(s.slot,{n:s.name.slice(0,60),u:SH.uid})}catch(e){}spClaiming=false}}
}

const SPT={
en:{title:'Speech requests',intro:'Ask for a speaking slot with your Pathways project. The VPE or the Toastmaster of the day confirms it and puts it on the agenda.',
  newTitle:'Request a speech',path:'Path',level:'Level',project:'Project',other:'Other project (type it)',speechTitle:'Speech title',timing:'Timing',date:'Preferred meeting',dateHint:'Leave empty for the next meeting with a free slot.',
  note:'Note for the VPE (optional)',send:'Send the request',sent:'Request sent',needTitle:'Enter a project and a title',
  needProfile:'To request a speech, create your profile and join the club as a member.',goMe:'Go to my profile',
  show:{open:'Open',mine:'Mine',all:'All'},none:'No request here yet.',
  st:{pending:'Waiting',approved:'Approved',declined:'Declined',withdrawn:'Withdrawn',done:'Given'},
  slot:'Slot',approve:'Approve',decline:'Decline',reopen:'Back to waiting',markDone:'Mark as given',withdraw:'Withdraw',del:'Delete',
  approved:'Speech approved',onAgenda:'On the agenda as {slot}',time:'Time this speech',comments:'Comments',addComment:'Write a comment…',post:'Send',
  approverNote:'You can approve: you are {who}.',whoOfficer:'a club officer',whoTod:'the Toastmaster of the day',anyDate:'Next meeting',
  pathwaysLink:'See the paths and projects',noPath:'Not a Pathways project'},
fr:{title:'Demandes de discours',intro:'Demandez un créneau d’orateur avec votre projet Pathways. Le VPE ou le Toastmaster du jour le confirme et l’inscrit à l’ordre du jour.',
  newTitle:'Demander un discours',path:'Parcours',level:'Niveau',project:'Projet',other:'Autre projet (à saisir)',speechTitle:'Titre du discours',timing:'Durée',date:'Réunion souhaitée',dateHint:'Laissez vide pour la prochaine réunion avec un créneau libre.',
  note:'Note pour le VPE (facultatif)',send:'Envoyer la demande',sent:'Demande envoyée',needTitle:'Indiquez un projet et un titre',
  needProfile:'Pour demander un discours, créez votre profil et rejoignez le club comme membre.',goMe:'Aller à mon profil',
  show:{open:'En cours',mine:'Les miennes',all:'Toutes'},none:'Aucune demande ici pour l’instant.',
  st:{pending:'En attente',approved:'Validé',declined:'Refusé',withdrawn:'Retiré',done:'Prononcé'},
  slot:'Créneau',approve:'Valider',decline:'Refuser',reopen:'Remettre en attente',markDone:'Marquer comme prononcé',withdraw:'Retirer',del:'Supprimer',
  approved:'Discours validé',onAgenda:'À l’ordre du jour : {slot}',time:'Chronométrer ce discours',comments:'Commentaires',addComment:'Écrire un commentaire…',post:'Envoyer',
  approverNote:'Vous pouvez valider : vous êtes {who}.',whoOfficer:'membre du bureau',whoTod:'le Toastmaster du jour',anyDate:'Prochaine réunion',
  pathwaysLink:'Voir les parcours et les projets',noPath:'Hors Pathways'},
nl:{title:'Speechaanvragen',intro:'Vraag een sprekersplek aan met je Pathways-project. De VPE of de Toastmaster van de avond bevestigt het en zet het op de agenda.',
  newTitle:'Een speech aanvragen',path:'Pad',level:'Niveau',project:'Project',other:'Ander project (typ het)',speechTitle:'Titel van de speech',timing:'Duur',date:'Gewenste bijeenkomst',dateHint:'Laat leeg voor de volgende bijeenkomst met een vrije plek.',
  note:'Notitie voor de VPE (optioneel)',send:'Aanvraag versturen',sent:'Aanvraag verstuurd',needTitle:'Vul een project en een titel in',
  needProfile:'Maak je profiel aan en word lid van de club om een speech aan te vragen.',goMe:'Naar mijn profiel',
  show:{open:'Open',mine:'Mijn aanvragen',all:'Alle'},none:'Hier nog geen aanvragen.',
  st:{pending:'Wacht',approved:'Goedgekeurd',declined:'Geweigerd',withdrawn:'Ingetrokken',done:'Gehouden'},
  slot:'Plek',approve:'Goedkeuren',decline:'Weigeren',reopen:'Terug naar wachten',markDone:'Markeren als gehouden',withdraw:'Intrekken',del:'Verwijderen',
  approved:'Speech goedgekeurd',onAgenda:'Op de agenda als {slot}',time:'Deze speech timen',comments:'Opmerkingen',addComment:'Schrijf een opmerking…',post:'Versturen',
  approverNote:'Je kunt goedkeuren: je bent {who}.',whoOfficer:'bestuurslid',whoTod:'de Toastmaster van de avond',anyDate:'Volgende bijeenkomst',
  pathwaysLink:'De paden en projecten bekijken',noPath:'Geen Pathways-project'},
ar:{title:'طلبات الخطابات',intro:'اطلب موعداً لإلقاء خطاب مع مشروعك في Pathways. يؤكّده نائب الرئيس للتعليم أو مقدّم الاجتماع ويضعه في جدول الأعمال.',
  newTitle:'طلب خطاب',path:'المسار',level:'المستوى',project:'المشروع',other:'مشروع آخر (اكتبه)',speechTitle:'عنوان الخطاب',timing:'المدة',date:'الاجتماع المطلوب',dateHint:'اتركه فارغاً لأقرب اجتماع فيه مكان شاغر.',
  note:'ملاحظة لنائب الرئيس للتعليم (اختياري)',send:'إرسال الطلب',sent:'تم إرسال الطلب',needTitle:'أدخل مشروعاً وعنواناً',
  needProfile:'لطلب خطاب، أنشئ ملفك وانضم إلى النادي كعضو.',goMe:'الذهاب إلى ملفي',
  show:{open:'الجارية',mine:'طلباتي',all:'الكل'},none:'لا توجد طلبات هنا بعد.',
  st:{pending:'بالانتظار',approved:'مقبول',declined:'مرفوض',withdrawn:'مسحوب',done:'أُلقي'},
  slot:'الموعد',approve:'قبول',decline:'رفض',reopen:'إعادة إلى الانتظار',markDone:'تحديد كمُلقى',withdraw:'سحب',del:'حذف',
  approved:'تم قبول الخطاب',onAgenda:'في جدول الأعمال: {slot}',time:'توقيت هذا الخطاب',comments:'التعليقات',addComment:'اكتب تعليقاً…',post:'إرسال',
  approverNote:'يمكنك القبول: أنت {who}.',whoOfficer:'عضو في مجلس الإدارة',whoTod:'مقدّم الاجتماع',anyDate:'الاجتماع القادم',
  pathwaysLink:'عرض المسارات والمشاريع',noPath:'ليس مشروعاً في Pathways'}};
const SPL=()=>SPT[LANG]||SPT.en;
const spPresetLabel=id=>{const p=PRESETS.find(x=>x.id===id);return p?`${t('preset.'+id)}`:''};

function emptySpeech(){const p=typeof myPathId==='function'&&myPathId()||'pm';return {path:p,level:1,project:pathProjects(p,1)[0],other:'',title:'',preset:'ice',date:'',note:''}}
function speechForm(){
  const L=SPL();const d=SP.draft||(SP.draft=emptySpeech());
  const projs=d.path?pathProjects(d.path,+d.level):[];
  const other=!d.path||d.project==='__other';
  return `<form class="box spform" data-form="sp-new" novalidate><div class="phead"><h3>${esc(L.newTitle)}</h3>${isOn('pathways')?`<button type="button" class="small ghost" data-act="go-pathways">${esc(L.pathwaysLink)}</button>`:''}</div>
    <div class="fields">
      <div class="field"><label class="label" for="sp-path">${esc(L.path)}</label><select id="sp-path" data-sp="path">${[...PATHS].sort((a,b)=>{const m=myPathIds(),ia=m.indexOf(a.id),ib=m.indexOf(b.id);return (ia<0?99:ia)-(ib<0?99:ib)}).map(p=>`<option value="${p.id}" ${p.id===d.path?'selected':''}>${esc(p.name)}</option>`).join('')}<option value="" ${!d.path?'selected':''}>${esc(L.noPath)}</option></select></div>
      ${d.path?`<div class="field"><label class="label" for="sp-level">${esc(L.level)}</label><select id="sp-level" data-sp="level">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===+d.level?'selected':''}>${n} · ${esc(PWL().levels[n-1])}</option>`).join('')}</select></div>
      <div class="field" style="grid-column:1/-1"><label class="label" for="sp-project">${esc(L.project)}</label><select id="sp-project" data-sp="project">${projs.map(x=>`<option ${x===d.project?'selected':''}>${esc(x)}</option>`).join('')}<option value="__other" ${d.project==='__other'?'selected':''}>${esc(L.other)}</option></select></div>`:''}
      ${other?`<div class="field" style="grid-column:1/-1"><label class="label" for="sp-other">${esc(L.project)}</label><input id="sp-other" data-sp="other" maxlength="100" value="${esc(d.other)}"></div>`:''}
      <div class="field" style="grid-column:1/-1"><label class="label" for="sp-title">${esc(L.speechTitle)}</label><input id="sp-title" data-sp="title" maxlength="120" value="${esc(d.title)}"></div>
      <div class="field"><label class="label" for="sp-preset">${esc(L.timing)}</label><select id="sp-preset" data-sp="preset">${SP_PRESETS.map(x=>`<option value="${x}" ${x===d.preset?'selected':''}>${esc(spPresetLabel(x))}</option>`).join('')}</select></div>
      <div class="field"><label class="label" for="sp-date">${esc(L.date)}</label><input id="sp-date" type="date" data-sp="date" value="${esc(d.date)}"><span class="muted" style="font-size:.8rem">${esc(L.dateHint)}</span></div>
      <div class="field" style="grid-column:1/-1"><label class="label" for="sp-note">${esc(L.note)}</label><input id="sp-note" data-sp="note" maxlength="300" value="${esc(d.note)}"></div>
    </div>
    <div class="btns"><button type="submit" class="primary" ${SP.busy?'disabled':''}>${esc(L.send)}</button></div></form>`;
}
function speechCard(s){
  const L=SPL();const mine=spMine(s);const appr=canApprove();const p=pathById(s.path);
  const chipCls={pending:'warn',approved:'ok',declined:'bad',withdrawn:'',done:'ok'}[s.status]||'';
  const slotSel=SP.slot[s.id]||s.slot||SPEECH_SLOTS.find(k=>!roleName(k)&&!SP.list.some(x=>x.status==='approved'&&x.slot===k&&x.id!==s.id))||'s1';
  const comments=(s.comments||[]);
  return `<article class="spcard"><div class="phead"><div>
      <b><bdi>${esc(s.title)}</bdi></b> <span class="chip ${chipCls}">${esc(L.st[s.status]||s.status)}</span>
      <div class="muted" style="font-size:.88rem"><bdi>${esc(s.name)}</bdi> · ${p?`<bdi>${esc(p.name)}</bdi> · ${esc(L.level)} ${esc(s.level)} · `:''}<bdi>${esc(s.project)}</bdi> · ${esc(spPresetLabel(s.preset))}</div>
      <div class="muted" style="font-size:.85rem">${esc(s.date?fmtDate(s.date):L.anyDate)}${s.status==='approved'&&s.slot?` · ${esc(L.onAgenda.replace('{slot}',roleLabel(s.slot)))}`:''}</div>
      ${s.note?`<div style="font-size:.9rem;margin-top:4px">${esc(s.note)}</div>`:''}
    </div></div>
    <div class="btns">
      ${appr&&s.status==='pending'?`<label class="sr-only" for="sp-slot-${esc(s.id)}">${esc(L.slot)}</label><select id="sp-slot-${esc(s.id)}" data-spslot="${esc(s.id)}" style="width:auto">${SPEECH_SLOTS.map(k=>`<option value="${k}" ${k===slotSel?'selected':''}>${esc(roleLabel(k))}${roleName(k)?' · '+esc(roleName(k)):''}</option>`).join('')}</select>
        <button class="small primary" data-act="sp-approve" data-id="${esc(s.id)}" ${SP.busy?'disabled':''}>${esc(L.approve)}</button><button class="small ghost" data-act="sp-status" data-v="declined" data-id="${esc(s.id)}">${esc(L.decline)}</button>`:''}
      ${appr&&s.status==='approved'?`<button class="small" data-act="sp-status" data-v="done" data-id="${esc(s.id)}">${esc(L.markDone)}</button><button class="small ghost" data-act="sp-status" data-v="pending" data-id="${esc(s.id)}">${esc(L.reopen)}</button>`:''}
      ${appr&&s.status==='declined'?`<button class="small ghost" data-act="sp-status" data-v="pending" data-id="${esc(s.id)}">${esc(L.reopen)}</button>`:''}
      ${s.status==='approved'&&isOn('timer')?`<button class="small" data-act="sp-time" data-id="${esc(s.id)}">${esc(L.time)}</button>`:''}
      ${mine&&spOpen(s)?`<button class="small ghost" data-act="sp-withdraw" data-id="${esc(s.id)}">${esc(L.withdraw)}</button>`:''}
      ${(mine||SH.officer===true)&&!spOpen(s)?`<button class="small ghost" data-act="sp-del" data-id="${esc(s.id)}">${esc(L.del)}</button>`:''}
    </div>
    ${(mine||appr)?`<details class="spcom" data-spcom="${esc(s.id)}" ${SP.openCom[s.id]??comments.length?'open':''}><summary class="muted">${esc(L.comments)} (${comments.length})</summary>
      ${comments.map(c=>`<p class="com"><b><bdi>${esc(c.name)}</bdi></b> <span class="muted">${esc(fmtDay(c.at))}</span><br>${esc(c.text)}</p>`).join('')}
      <form class="btns" data-form="sp-com" data-id="${esc(s.id)}" style="flex-wrap:nowrap"><input id="sp-c-${esc(s.id)}" maxlength="500" placeholder="${esc(L.addComment)}" aria-label="${esc(L.addComment)}"><button type="submit" class="small">${esc(L.post)}</button></form>
    </details>`:''}
  </article>`;
}
function speechesView(){
  const L=SPL();
  const head=`<div class="phead"><div><h2>${esc(L.title)}</h2><p class="muted">${esc(L.intro)}</p></div></div>`;
  if(!SH.on)return `<section class="panel">${head}${liveBox()}</section>`;
  const appr=canApprove();
  const list=SP.list.filter(s=>SP.show==='all'?true:SP.show==='mine'?spMine(s):spOpen(s));
  return `<section class="panel">${head}${liveBox()}
    ${appr?`<div class="notice"><span>${esc(L.approverNote.replace('{who}',SH.officer===true?L.whoOfficer:L.whoTod))}</span></div>`:''}
    ${canRequestSpeech()?speechForm():`<div class="box"><p>${esc(L.needProfile)}</p><div><button class="primary" data-act="go-me">${esc(L.goMe)}</button></div></div>`}
    <div class="box"><div class="speakers" role="group">${['open','mine','all'].map(k=>chip('sp-show',k,SP.show===k,esc(L.show[k]))).join('')}</div>
      ${list.length?list.map(speechCard).join(''):`<p class="empty">${esc(L.none)}</p>`}</div>
  </section>`;
}

async function spRun(fn,ok){SP.busy=true;render();try{await fn();if(ok)toast(ok)}catch(e){writeFail(e)}SP.busy=false;render()}
const spRef=id=>SH.fs.doc(`clubs/${SH.club}/speeches/${id}`);
async function approveSpeech(s,slot){
  const now=new Date().toISOString();
  await spRef(s.id).update({status:'approved',slot,decidedBy:SH.user&&SH.user.email||SH.uid,decidedAt:now,updatedAt:now});
  // Officers (and everyone while member access is off) write the role directly; otherwise the speaker's device takes it.
  if(canEditMeeting()&&!(s.date===S.agenda.date&&roleName(slot)))await (typeof writeRoleOn==='function'?writeRoleOn(s.date,slot,{n:s.name.slice(0,60),u:s.uid}):writeRole(slot,{n:s.name.slice(0,60),u:s.uid}));
}
function myDisplayName(){const u=typeof myProfile==='function'&&myProfile();return u&&u.name||myName()||SH.user&&SH.user.email||''}

document.addEventListener('change',ev=>{
  const el=ev.target;
  if(el.dataset&&el.dataset.spslot){SP.slot[el.dataset.spslot]=el.value;return}
  const k=el.dataset&&el.dataset.sp;if(!k)return;const d=SP.draft;
  if(k==='path'){d.path=el.value;d.level=1;d.project=d.path?pathProjects(d.path,1)[0]:'__other';d.preset=projectPreset(d.project);render();return}
  if(k==='level'){d.level=+el.value;d.project=pathProjects(d.path,d.level)[0];d.preset=projectPreset(d.project);render();return}
  if(k==='project'){d.project=el.value;d.preset=projectPreset(d.project);render();return}
  d[k]=el.value;
});
document.addEventListener('toggle',ev=>{const d=ev.target;if(d.dataset&&d.dataset.spcom)SP.openCom[d.dataset.spcom]=d.open},true);
document.addEventListener('input',ev=>{const k=ev.target.dataset&&ev.target.dataset.sp;if(k&&SP.draft&&['title','other','note','date'].includes(k))SP.draft[k]=ev.target.value});
document.addEventListener('submit',ev=>{
  const f=ev.target.dataset.form;if(f!=='sp-new'&&f!=='sp-com')return;ev.preventDefault();const L=SPL();
  if(f==='sp-com'){const id=ev.target.dataset.id;const i=document.getElementById('sp-c-'+id);const text=(i&&i.value||'').trim().slice(0,500);if(!text)return;
    const s=SP.list.find(x=>x.id===id);if(!s)return;
    spRun(()=>spRef(id).update({comments:[...(s.comments||[]),{uid:SH.uid,name:myDisplayName().slice(0,80),text,at:new Date().toISOString()}].slice(-50),updatedAt:new Date().toISOString()}));return}
  const d=SP.draft;const project=(!d.path||d.project==='__other'?d.other:d.project).trim().slice(0,100);const title=d.title.trim().slice(0,120);
  if(!project||!title){toast(L.needTitle);return}
  const now=new Date().toISOString();
  const doc={uid:SH.uid,name:myDisplayName().slice(0,80),path:d.path||'',level:d.path?+d.level:0,project,title,preset:SP_PRESETS.includes(d.preset)?d.preset:'std',
    date:/^\d{4}-\d{2}-\d{2}$/.test(d.date)?d.date:'',note:d.note.trim().slice(0,300),status:'pending',slot:'',comments:[],at:now,updatedAt:now};
  spRun(async()=>{await SH.fs.collection(`clubs/${SH.club}/speeches`).add(doc);SP.draft=null;SP.show='mine'},L.sent);
});
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act^="sp-"]');if(!b)return;const a=b.dataset.act;const s=SP.list.find(x=>x.id===b.dataset.id);
  if(a==='sp-show'){SP.show=b.dataset.v;render();return}
  if(!s)return;const L=SPL();const now=new Date().toISOString();
  if(a==='sp-approve'){const sel=document.getElementById('sp-slot-'+s.id);spRun(()=>approveSpeech(s,sel?sel.value:'s1'),L.approved);return}
  if(a==='sp-status'){const v=b.dataset.v;spRun(async()=>{await spRef(s.id).update({status:v,...(v==='pending'?{slot:''}:{}),decidedBy:SH.user&&SH.user.email||SH.uid,decidedAt:now,updatedAt:now});
    if(v==='pending'&&s.slot&&canEditMeeting()){const e=SH.roles[s.slot];if(e&&e.u===s.uid)await writeRole(s.slot,null)}});return}
  if(a==='sp-withdraw'){spRun(async()=>{await spRef(s.id).update({status:'withdrawn',updatedAt:now});const e=s.slot&&SH.roles[s.slot];if(e&&e.u===SH.uid)await writeRole(s.slot,null)});return}
  if(a==='sp-del'){spRun(()=>spRef(s.id).delete());return}
  if(a==='sp-time'){S.timer.preset=s.preset||'std';S.timer.name=s.name;save();setTab('timer');return}
});
