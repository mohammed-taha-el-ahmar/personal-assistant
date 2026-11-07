// Oratia – mentoring: mentor and mentee pairs.
// Members say whether they would like a mentor or can be one (flags on their club profile). Officers (the VP Education
// or VP Membership in practice) form the pairs and end them. Each pair sees the other's name and email, a shared goal
// and a short log of their check-ins. Officers see every pair and who is waiting for a mentor.
//
// clubs/{club}/mentoring/{id} {mentor,mentorName,mentorEmail,mentee,menteeName,menteeEmail,status:'active'|'ended',
//   since,endedAt,goal,log:[{uid,name,text,at}],by,updatedAt}
// Officers read and write everything; the mentor and the mentee read their pair and update the goal and the log.

const MT={mine:[],all:[],unsubs:[],offUnsub:null,busy:false,draft:{mentee:'',mentor:'',goal:''},confirmEnd:null,openLog:{}};

function mentoringStop(){MT.unsubs.forEach(f=>f());MT.unsubs=[];MT.mine=[]}
function mentoringStopOfficer(){if(MT.offUnsub){MT.offUnsub();MT.offUnsub=null}MT.all=[]}
// Called when the signed-in person changes (profiles.js) and when officer status is known (office.js).
function mentoringAuthChanged(){
  mentoringStop();
  if(!SH.fs||!SH.club||SH.closed||!SH.user||SH.user.anon||!SH.user.verified)return;
  const seen={};
  const merge=(k,q)=>{seen[k]=q.docs.map(d=>({id:d.id,...d.data()}));MT.mine=[...(seen.a||[]),...(seen.b||[])];softRender()};
  const col=SH.fs.collection(`clubs/${SH.club}/mentoring`);
  MT.unsubs.push(col.where('mentor','==',SH.uid).onSnapshot(q=>merge('a',q),()=>{}));
  MT.unsubs.push(col.where('mentee','==',SH.uid).onSnapshot(q=>merge('b',q),()=>{}));
}
function mentoringOfficerSubs(){
  mentoringStopOfficer();
  MT.offUnsub=SH.fs.collection(`clubs/${SH.club}/mentoring`).onSnapshot(q=>{MT.all=q.docs.map(d=>({id:d.id,...d.data()}));softRender()},()=>{MT.all=[]});
}
const mentoringAccess=()=>SH.on&&(SH.officer===true||(typeof profileMember==='function'&&profileMember()));

const MTT={
en:{title:'Mentoring',intro:'A mentor helps a member with their speeches, their path and club life. Officers form the pairs; each pair keeps a shared goal and a short log.',
  myPrefs:'My mentoring wishes',wants:'I would like a mentor',offers:'I can be a mentor',prefsNote:'Officers see these wishes when they form the pairs.',saved:'Saved',
  myMentor:'My mentor',myMentees:'My mentees',none:'No mentoring pair for you yet.',since:'Since {d}',goal:'Shared goal',goalPh:'For example: Ice Breaker by March, then Level 1',
  log:'Check-ins',logPh:'What you worked on, next step…',add:'Add',save:'Save',contact:'Email',
  needProfile:'Mentoring is for members of the club. Create your profile and join the club as a member.',goMe:'Go to my profile',
  offTitle:'Pairs (officers)',offIntro:'Form a pair from members who asked for a mentor and members who offered to be one, or anyone else.',
  mentee:'Mentee',mentor:'Mentor',create:'Form the pair',created:'Pair formed',needBoth:'Choose two different people',
  waiting:'Waiting for a mentor',available:'Available mentors',active:'Active pairs',ended:'Ended pairs',noPairs:'No pair yet.',
  end:'End',endAsk:'End this pair?',endYes:'Yes, end it',endedOk:'Pair ended',del:'Delete',
  stat:'{n} member(s) mentored',choose:'Choose…'},
fr:{title:'Mentorat',intro:'Un mentor accompagne un membre dans ses discours, son parcours et la vie du club. Le bureau forme les binômes ; chaque binôme garde un objectif commun et un court journal.',
  myPrefs:'Mes souhaits de mentorat',wants:'Je souhaite un mentor',offers:'Je peux être mentor',prefsNote:'Le bureau voit ces souhaits quand il forme les binômes.',saved:'Enregistré',
  myMentor:'Mon mentor',myMentees:'Mes mentorés',none:'Aucun binôme de mentorat pour vous pour l’instant.',since:'Depuis le {d}',goal:'Objectif commun',goalPh:'Par exemple : le Brise-glace d’ici mars, puis le niveau 1',
  log:'Points d’étape',logPh:'Ce sur quoi vous avez travaillé, prochaine étape…',add:'Ajouter',save:'Enregistrer',contact:'E-mail',
  needProfile:'Le mentorat est réservé aux membres du club. Créez votre profil et rejoignez le club comme membre.',goMe:'Aller à mon profil',
  offTitle:'Binômes (bureau)',offIntro:'Formez un binôme à partir des membres qui souhaitent un mentor et de ceux qui se proposent, ou de toute autre personne.',
  mentee:'Mentoré',mentor:'Mentor',create:'Former le binôme',created:'Binôme formé',needBoth:'Choisissez deux personnes différentes',
  waiting:'En attente d’un mentor',available:'Mentors disponibles',active:'Binômes actifs',ended:'Binômes terminés',noPairs:'Aucun binôme pour l’instant.',
  end:'Terminer',endAsk:'Terminer ce binôme ?',endYes:'Oui, terminer',endedOk:'Binôme terminé',del:'Supprimer',
  stat:'{n} membre(s) accompagné(s)',choose:'Choisir…'},
nl:{title:'Mentorschap',intro:'Een mentor helpt een lid met speeches, het pad en het clubleven. Het bestuur vormt de duo’s; elk duo houdt een gezamenlijk doel en een kort logboek bij.',
  myPrefs:'Mijn wensen voor mentorschap',wants:'Ik wil graag een mentor',offers:'Ik kan mentor zijn',prefsNote:'Het bestuur ziet deze wensen bij het vormen van de duo’s.',saved:'Opgeslagen',
  myMentor:'Mijn mentor',myMentees:'Mijn mentees',none:'Nog geen mentorduo voor jou.',since:'Sinds {d}',goal:'Gezamenlijk doel',goalPh:'Bijvoorbeeld: Ice Breaker voor maart, daarna niveau 1',
  log:'Contactmomenten',logPh:'Waar jullie aan werkten, volgende stap…',add:'Toevoegen',save:'Opslaan',contact:'E-mail',
  needProfile:'Mentorschap is voor leden van de club. Maak je profiel aan en word lid van de club.',goMe:'Naar mijn profiel',
  offTitle:'Duo’s (bestuur)',offIntro:'Vorm een duo uit leden die een mentor willen en leden die mentor willen zijn, of wie dan ook.',
  mentee:'Mentee',mentor:'Mentor',create:'Duo vormen',created:'Duo gevormd',needBoth:'Kies twee verschillende personen',
  waiting:'Wacht op een mentor',available:'Beschikbare mentoren',active:'Actieve duo’s',ended:'Beëindigde duo’s',noPairs:'Nog geen duo’s.',
  end:'Beëindigen',endAsk:'Dit duo beëindigen?',endYes:'Ja, beëindigen',endedOk:'Duo beëindigd',del:'Verwijderen',
  stat:'{n} lid/leden begeleid',choose:'Kiezen…'},
ar:{title:'الإرشاد',intro:'يرافق المرشد العضو في خطاباته ومساره وحياة النادي. يشكّل مجلس الإدارة الثنائيات، ولكل ثنائي هدف مشترك وسجل قصير.',
  myPrefs:'رغباتي في الإرشاد',wants:'أرغب في مرشد',offers:'يمكنني أن أكون مرشداً',prefsNote:'يرى مجلس الإدارة هذه الرغبات عند تشكيل الثنائيات.',saved:'تم الحفظ',
  myMentor:'مرشدي',myMentees:'المسترشدون',none:'لا يوجد ثنائي إرشاد لك بعد.',since:'منذ {d}',goal:'الهدف المشترك',goalPh:'مثلاً: خطاب كسر الجليد قبل مارس، ثم المستوى 1',
  log:'محطات المتابعة',logPh:'ما عملتما عليه، والخطوة التالية…',add:'إضافة',save:'حفظ',contact:'البريد',
  needProfile:'الإرشاد مخصّص لأعضاء النادي. أنشئ ملفك وانضم إلى النادي كعضو.',goMe:'الذهاب إلى ملفي',
  offTitle:'الثنائيات (مجلس الإدارة)',offIntro:'شكّل ثنائياً من الأعضاء الراغبين في مرشد ومن المتطوعين للإرشاد، أو من أي شخص آخر.',
  mentee:'المسترشد',mentor:'المرشد',create:'تشكيل الثنائي',created:'تم تشكيل الثنائي',needBoth:'اختر شخصين مختلفين',
  waiting:'بانتظار مرشد',available:'مرشدون متاحون',active:'الثنائيات النشطة',ended:'الثنائيات المنتهية',noPairs:'لا توجد ثنائيات بعد.',
  end:'إنهاء',endAsk:'إنهاء هذا الثنائي؟',endYes:'نعم، إنهاء',endedOk:'تم إنهاء الثنائي',del:'حذف',
  stat:'{n} عضو مُرافَق',choose:'اختر…'}};
const MTL=()=>MTT[LANG]||MTT.en;

async function mtRun(fn,ok){MT.busy=true;render();try{await fn();if(ok)toast(ok)}catch(e){writeFail(e)}MT.busy=false;render()}
const mtRef=id=>SH.fs.doc(`clubs/${SH.club}/mentoring/${id}`);

function pairCard(p,asOfficer){
  const L=MTL();const iAmMentor=p.mentor===SH.uid;const other=iAmMentor?{n:p.menteeName,e:p.menteeEmail}:{n:p.mentorName,e:p.mentorEmail};
  const canEdit=p.status==='active'&&(asOfficer||p.mentor===SH.uid||p.mentee===SH.uid);
  const log=(p.log||[]).slice().reverse();
  return `<article class="spcard">
    <div class="phead"><div>${asOfficer?`<b><bdi>${esc(p.mentorName)}</bdi></b> → <b><bdi>${esc(p.menteeName)}</bdi></b>`:`<b><bdi>${esc(other.n)}</bdi></b> <span class="muted">· ${esc(iAmMentor?L.mentee:L.mentor)}</span>`}
      <div class="muted" style="font-size:.85rem">${esc(L.since.replace('{d}',fmtDay(p.since)))}${p.status==='ended'?` · <span class="chip">${esc(L.ended)}</span>`:''}</div></div>
      <div class="btns">${!asOfficer&&other.e?`<a class="btn small" href="mailto:${esc(other.e)}">${esc(L.contact)}</a>`:''}
      ${asOfficer?(MT.confirmEnd===p.id?`<span class="muted" style="align-self:center">${esc(L.endAsk)}</span><button class="small danger" data-act="mt-end" data-id="${esc(p.id)}">${esc(L.endYes)}</button><button class="small ghost" data-act="mt-end-cancel">${esc(t('common.cancel'))}</button>`
        :p.status==='active'?`<button class="small ghost" data-act="mt-end-ask" data-id="${esc(p.id)}">${esc(L.end)}</button>`:`<button class="small ghost" data-act="mt-del" data-id="${esc(p.id)}">${esc(L.del)}</button>`):''}</div></div>
    ${canEdit?`<form class="btns" data-form="mt-goal" data-id="${esc(p.id)}" style="flex-wrap:nowrap"><label class="sr-only" for="mt-g-${esc(p.id)}">${esc(L.goal)}</label><input id="mt-g-${esc(p.id)}" maxlength="200" value="${esc(p.goal||'')}" placeholder="${esc(L.goalPh)}"><button type="submit" class="small">${esc(L.save)}</button></form>`
      :p.goal?`<div><span class="label">${esc(L.goal)}</span> ${esc(p.goal)}</div>`:''}
    <details class="spcom" data-mtlog="${esc(p.id)}" ${MT.openLog[p.id]??log.length?'open':''}><summary class="muted">${esc(L.log)} (${log.length})</summary>
      ${log.map(c=>`<p class="com"><b><bdi>${esc(c.name)}</bdi></b> <span class="muted">${esc(fmtDay(c.at))}</span><br>${esc(c.text)}</p>`).join('')}
      ${canEdit?`<form class="btns" data-form="mt-log" data-id="${esc(p.id)}" style="flex-wrap:nowrap"><input id="mt-l-${esc(p.id)}" maxlength="500" placeholder="${esc(L.logPh)}" aria-label="${esc(L.log)}"><button type="submit" class="small">${esc(L.add)}</button></form>`:''}
    </details></article>`;
}
function officerPairsBox(){
  const L=MTL();const people=(PROF.people||[]).filter(p=>p.status==='active');
  const name=uid=>{const p=people.find(x=>x.id===uid);return p?p.name:''};
  const activePairs=MT.all.filter(p=>p.status==='active'),endedPairs=MT.all.filter(p=>p.status!=='active');
  const mentored=new Set(activePairs.map(p=>p.mentee));
  const waiting=people.filter(p=>p.wantsMentor&&!mentored.has(p.id));
  const avail=people.filter(p=>p.offersMentor);
  const opts=(sel,pref)=>`<option value="">${esc(L.choose)}</option>${[...pref,...people.filter(p=>!pref.includes(p))].map(p=>`<option value="${esc(p.id)}" ${p.id===sel?'selected':''}>${esc(p.name)}${pref.includes(p)?' ★':''}</option>`).join('')}`;
  const d=MT.draft;
  return `<div class="box"><div class="phead"><div><h3>${esc(L.offTitle)}</h3><p class="muted">${esc(L.offIntro)}</p></div><span class="chip ${activePairs.length?'ok':''}">${esc(L.stat.replace('{n}',mentored.size))}</span></div>
    <div class="grid2"><div><span class="label">${esc(L.waiting)}</span><p style="margin:4px 0">${waiting.length?waiting.map(p=>esc(p.name)).join(', '):'–'}</p></div>
      <div><span class="label">${esc(L.available)}</span><p style="margin:4px 0">${avail.length?avail.map(p=>esc(p.name)).join(', '):'–'}</p></div></div>
    <form class="fields" data-form="mt-create" novalidate>
      <div class="field"><label class="label" for="mt-mentee">${esc(L.mentee)}</label><select id="mt-mentee" data-mt="mentee">${opts(d.mentee,waiting)}</select></div>
      <div class="field"><label class="label" for="mt-mentor">${esc(L.mentor)}</label><select id="mt-mentor" data-mt="mentor">${opts(d.mentor,avail)}</select></div>
      <div class="field" style="grid-column:1/-1"><label class="label" for="mt-goal">${esc(L.goal)}</label><input id="mt-goal" data-mt="goal" maxlength="200" value="${esc(d.goal)}" placeholder="${esc(L.goalPh)}"></div>
      <div class="btns" style="grid-column:1/-1"><button type="submit" class="primary" ${MT.busy?'disabled':''}>${esc(L.create)}</button></div></form>
    <div><span class="label">${esc(L.active)}</span>${activePairs.length?activePairs.map(p=>pairCard(p,true)).join(''):`<p class="empty">${esc(L.noPairs)}</p>`}</div>
    ${endedPairs.length?`<details><summary class="muted">${esc(L.ended)} (${endedPairs.length})</summary>${endedPairs.map(p=>pairCard(p,true)).join('')}</details>`:''}
  </div>`;
}
function mentoringView(){
  const L=MTL();const head=`<div class="phead"><div><h2>${esc(L.title)}</h2><p class="muted">${esc(L.intro)}</p></div></div>`;
  if(!SH.on)return `<section class="panel">${head}${liveBox()}</section>`;
  const me=typeof myPerson==='function'&&myPerson();
  const member=typeof profileMember==='function'&&profileMember();
  const asMentee=MT.mine.filter(p=>p.mentee===SH.uid&&p.status==='active'),asMentor=MT.mine.filter(p=>p.mentor===SH.uid&&p.status==='active');
  const mine=member?`<div class="box"><h3>${esc(L.myPrefs)}</h3>
      <label class="check" for="mt-wants"><input type="checkbox" id="mt-wants" data-mtpref="wantsMentor" ${me&&me.wantsMentor?'checked':''}><span>${esc(L.wants)}</span></label>
      <label class="check" for="mt-offers"><input type="checkbox" id="mt-offers" data-mtpref="offersMentor" ${me&&me.offersMentor?'checked':''}><span>${esc(L.offers)}</span></label>
      <p class="muted" style="font-size:.85rem;margin:0">${esc(L.prefsNote)}</p></div>
    <div class="box">${asMentee.length?`<h3>${esc(L.myMentor)}</h3>${asMentee.map(p=>pairCard(p,false)).join('')}`:''}
      ${asMentor.length?`<h3>${esc(L.myMentees)}</h3>${asMentor.map(p=>pairCard(p,false)).join('')}`:''}
      ${!asMentee.length&&!asMentor.length?`<p class="empty">${esc(L.none)}</p>`:''}</div>`
    :SH.officer===true?'':`<div class="box"><p>${esc(L.needProfile)}</p><div><button class="primary" data-act="go-me">${esc(L.goMe)}</button></div></div>`;
  return `<section class="panel">${head}${mine}${SH.officer===true?officerPairsBox():''}</section>`;
}

// ---------- events ----------
document.addEventListener('toggle',ev=>{const d=ev.target;if(d.dataset&&d.dataset.mtlog)MT.openLog[d.dataset.mtlog]=d.open},true);
document.addEventListener('change',ev=>{
  const el=ev.target;
  if(el.dataset&&el.dataset.mt){MT.draft[el.dataset.mt]=el.value;return}
  if(el.dataset&&el.dataset.mtpref){const k=el.dataset.mtpref,v=el.checked;
    mtRun(()=>SH.fs.doc(`clubs/${SH.club}/people/${SH.uid}`).update({[k]:v}),MTL().saved)}
});
document.addEventListener('input',ev=>{if(ev.target.dataset&&ev.target.dataset.mt==='goal')MT.draft.goal=ev.target.value});
document.addEventListener('submit',ev=>{
  const f=ev.target.dataset.form;if(!f||!f.startsWith('mt-'))return;ev.preventDefault();const L=MTL();const now=new Date().toISOString();
  if(f==='mt-create'){const d=MT.draft;const ppl=PROF.people||[];const a=ppl.find(p=>p.id===d.mentee),b=ppl.find(p=>p.id===d.mentor);
    if(!a||!b||a.id===b.id){toast(L.needBoth);return}
    mtRun(async()=>{await SH.fs.collection(`clubs/${SH.club}/mentoring`).add({mentor:b.id,mentorName:b.name,mentorEmail:b.email||'',mentee:a.id,menteeName:a.name,menteeEmail:a.email||'',
      status:'active',since:now,goal:d.goal.trim().slice(0,200),log:[],by:SH.user.email,updatedAt:now});MT.draft={mentee:'',mentor:'',goal:''}},L.created);return}
  const id=ev.target.dataset.id;const p=[...MT.all,...MT.mine].find(x=>x.id===id);if(!p)return;
  if(f==='mt-goal'){const v=(document.getElementById('mt-g-'+id).value||'').trim().slice(0,200);mtRun(()=>mtRef(id).update({goal:v,updatedAt:now}),L.saved);return}
  if(f==='mt-log'){const i=document.getElementById('mt-l-'+id);const text=(i&&i.value||'').trim().slice(0,500);if(!text)return;
    const name=(typeof myDisplayName==='function'?myDisplayName():SH.user.email).slice(0,80);
    mtRun(()=>mtRef(id).update({log:[...(p.log||[]),{uid:SH.uid,name,text,at:now}].slice(-100),updatedAt:now}));return}
});
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act^="mt-"]');if(!b)return;const a=b.dataset.act;const L=MTL();
  if(a==='mt-end-ask'){MT.confirmEnd=b.dataset.id;render();return}
  if(a==='mt-end-cancel'){MT.confirmEnd=null;render();return}
  if(a==='mt-end'){const id=b.dataset.id;MT.confirmEnd=null;mtRun(()=>mtRef(id).update({status:'ended',endedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}),L.endedOk);return}
  if(a==='mt-del'){mtRun(()=>mtRef(b.dataset.id).delete());return}
});
