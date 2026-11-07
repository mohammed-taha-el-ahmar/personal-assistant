// Orato – officer toolkit. Premium feature "officerKit" (plan.js), officers only.
// Four tools on one page, for the current program year (1 July – 30 June):
//   - Officer training: which officer roles were trained in each of the two training periods (feeds the DCP goal 9).
//   - Action plan: the club's actions with an owner, a due date, a status and the DCP goal they serve, on a timeline.
//   - Events: what the club organised (meetings, open houses, socials, demos…) with attendance and guests.
//   - Announcements: ready-to-send messages to members, members who have not paid, or guests, filled in with the
//     club's details; copy the message and the addresses or open them in the mail app. Officers can save their own.
// clubs/{club}/kit/{year} {training:{role:{p1,p2,name}},plan:[…],events:[…],templates:[…],updatedAt,updatedBy}
// The rules require the officerKit feature to read and write it.

const KIT={doc:null,unsub:null,busy:false,sec:'training',tpl:'reminder',to:'members',subject:null,body:null,planDraft:null,evDraft:null,confirmDel:null};
const KIT_ROLES=['pres','vpe','vpm','vppr','sec','tres','saa'];
const KIT_TPLS=['reminder','roles','renewal','welcome','guest','contest'];
const EVENT_TYPES=['meeting','open','social','demo','contest','training','other'];

function kitOfficerSubs(){
  if(KIT.unsub)KIT.unsub();
  KIT.unsub=SH.fs.doc(`clubs/${SH.club}/kit/${programYear().id}`).onSnapshot(s=>{KIT.doc=s.exists?s.data():{};softRender()},()=>{KIT.doc=null});
}
function kitStopOfficer(){if(KIT.unsub){KIT.unsub();KIT.unsub=null}KIT.doc=null}
const kitData=()=>Object.assign({training:{},plan:[],events:[],templates:[]},KIT.doc||{});
function trainedCount(p){const tr=kitData().training;return KIT_ROLES.filter(r=>tr[r]&&tr[r][p]).length}
async function kitSave(patch,ok){
  KIT.busy=true; // no render here: a field that just lost focus may be the one being saved
  try{await SH.fs.doc(`clubs/${SH.club}/kit/${programYear().id}`).set({...patch,updatedAt:new Date().toISOString(),updatedBy:SH.user.email},{merge:true});if(ok)toast(ok)}
  catch(e){writeFail(e)}
  KIT.busy=false;render();
}
const kitId=()=>Math.random().toString(36).slice(2,9);

const KT={
en:{title:'Officer toolkit',intro:'Train the officers, plan the year, track events and keep members informed. Program year {y}.',
  sec:{training:'Officer training',plan:'Action plan',events:'Events',mail:'Announcements'},
  roles:{pres:'President',vpe:'Vice President Education',vpm:'Vice President Membership',vppr:'Vice President Public Relations',sec:'Secretary',tres:'Treasurer',saa:'Sergeant at Arms'},
  trIntro:'Tick each officer role trained by the district in each period. The DCP counts four trained roles in each period.',p1:'June–August',p2:'November–February',who:'Name (optional)',trainedN:'{n} / 7 trained',dcpOk:'DCP goal reached for this period',
  planIntro:'The actions of your Club Success Plan, on a timeline. Link each action to the DCP goal it serves.',action:'Action',owner:'Who',due:'Due',goal:'DCP goal',noGoal:'—',addAction:'Add the action',
  st:{todo:'To do',doing:'In progress',done:'Done'},overdue:'Late',noPlan:'No action yet. Start with the goals your club wants this year.',
  evIntro:'Meetings, open houses, socials, demos… with attendance and guests, to see what brings people in.',evTitle:'Event',evDate:'Date',evType:'Type',evAtt:'Attendees',evGuests:'Guests',evNotes:'Notes',addEvent:'Add the event',noEvents:'No event recorded yet.',
  types:{meeting:'Special meeting',open:'Open house',social:'Social',demo:'Demo meeting',contest:'Contest',training:'Training',other:'Other'},
  totals:'{n} events · {a} attendees · {g} guests',
  mailIntro:'Choose a message and the recipients. Orato fills in the club’s details; you send it from your own mail app.',tpl:'Message',to:'Recipients',
  toL:{members:'Active members',unpaid:'Members who have not paid ({p})',guests:'Guests to follow up'},nRecip:'{n} address(es)',noRecip:'No email address for these recipients in the member list or the guest book.',
  subject:'Subject',body:'Message',copyMsg:'Copy the message',copyTo:'Copy the addresses',openMail:'Open in my mail app',saveTpl:'Save as my template',tplName:'Template name',tplSaved:'Template saved',mine:'(club template)',delTpl:'Delete this template',
  tplNames:{reminder:'Meeting reminder',roles:'Open roles',renewal:'Dues renewal',welcome:'Welcome a new member',guest:'Thank a guest',contest:'Speech contest'},
  saved:'Saved',del:'Delete',
  t:{reminder:['Our next meeting: {date}','Hello,\n\nOur next {club} meeting is on {date}{theme}.\n\nRoles still open:\n{roles}\n\nTake a role here: {link}\n\nSee you there!'],
     roles:['Roles still open for {date}','Hello,\n\nThese roles are still open for our meeting on {date}:\n{roles}\n\nTake one in a minute: {link}\n\nThank you!'],
     renewal:['Time to renew your membership','Hello,\n\nThe dues for {period} are due. Renewing on time keeps your Pathways progress and helps the club in the Distinguished Club Program.\n\nAsk the Treasurer how to pay.\n\nThank you for being part of {club}!'],
     welcome:['Welcome to {club}!','Hello,\n\nWelcome to {club}! We are happy to have you with us.\n\nYour next steps: create your profile in Orato ({link}), choose your path on Base Camp and plan your Ice Breaker with the VPE. A mentor can help you get started.\n\nSee you at the next meeting!'],
     guest:['Thank you for visiting {club}','Hello,\n\nThank you for joining our meeting. We hope you enjoyed it.\n\nOur next meeting is on {date}. You are welcome to come back, and we will be glad to tell you how to join.\n\n{link}\n\nSee you soon!'],
     contest:['Speech contest at {club}','Hello,\n\nOur club speech contest takes place on {date}. We need contestants, judges, timers and counters.\n\nSign up here: {link}\n\nThank you!']}},
fr:{title:'Boîte à outils du bureau',intro:'Former les officiers, planifier l’année, suivre les événements et informer les membres. Année Toastmasters {y}.',
  sec:{training:'Formation des officiers',plan:'Plan d’action',events:'Événements',mail:'Annonces'},
  roles:{pres:'Président',vpe:'Vice-président Formation (VPE)',vpm:'Vice-président Adhésions (VPM)',vppr:'Vice-président Relations publiques (VPPR)',sec:'Secrétaire',tres:'Trésorier',saa:'Sergent d’armes'},
  trIntro:'Cochez chaque rôle d’officier formé par le district à chaque période. Le DCP compte quatre rôles formés à chaque période.',p1:'Juin–août',p2:'Novembre–février',who:'Nom (facultatif)',trainedN:'{n} / 7 formés',dcpOk:'Objectif DCP atteint pour cette période',
  planIntro:'Les actions de votre plan de réussite du club, sur une frise. Reliez chaque action à l’objectif DCP qu’elle sert.',action:'Action',owner:'Qui',due:'Échéance',goal:'Objectif DCP',noGoal:'—',addAction:'Ajouter l’action',
  st:{todo:'À faire',doing:'En cours',done:'Fait'},overdue:'En retard',noPlan:'Aucune action pour l’instant. Commencez par les objectifs du club cette année.',
  evIntro:'Réunions spéciales, portes ouvertes, soirées, démonstrations… avec la participation et les invités, pour voir ce qui attire.',evTitle:'Événement',evDate:'Date',evType:'Type',evAtt:'Participants',evGuests:'Invités',evNotes:'Notes',addEvent:'Ajouter l’événement',noEvents:'Aucun événement enregistré pour l’instant.',
  types:{meeting:'Réunion spéciale',open:'Portes ouvertes',social:'Soirée',demo:'Réunion de démonstration',contest:'Concours',training:'Formation',other:'Autre'},
  totals:'{n} événements · {a} participants · {g} invités',
  mailIntro:'Choisissez un message et les destinataires. Orato remplit les informations du club ; vous l’envoyez depuis votre propre messagerie.',tpl:'Message',to:'Destinataires',
  toL:{members:'Membres actifs',unpaid:'Membres qui n’ont pas payé ({p})',guests:'Invités à relancer'},nRecip:'{n} adresse(s)',noRecip:'Aucune adresse e-mail pour ces destinataires dans la liste des membres ou le livre d’accueil.',
  subject:'Objet',body:'Message',copyMsg:'Copier le message',copyTo:'Copier les adresses',openMail:'Ouvrir dans ma messagerie',saveTpl:'Enregistrer comme modèle',tplName:'Nom du modèle',tplSaved:'Modèle enregistré',mine:'(modèle du club)',delTpl:'Supprimer ce modèle',
  tplNames:{reminder:'Rappel de réunion',roles:'Rôles à pourvoir',renewal:'Renouvellement de cotisation',welcome:'Accueillir un nouveau membre',guest:'Remercier un invité',contest:'Concours de discours'},
  saved:'Enregistré',del:'Supprimer',
  t:{reminder:['Notre prochaine réunion : {date}','Bonjour,\n\nLa prochaine réunion de {club} a lieu le {date}{theme}.\n\nRôles encore libres :\n{roles}\n\nPrenez un rôle ici : {link}\n\nÀ bientôt !'],
     roles:['Rôles encore libres pour le {date}','Bonjour,\n\nCes rôles sont encore libres pour notre réunion du {date} :\n{roles}\n\nPrenez-en un en une minute : {link}\n\nMerci !'],
     renewal:['Il est temps de renouveler votre adhésion','Bonjour,\n\nLa cotisation pour {period} est due. Renouveler à temps préserve votre progression Pathways et aide le club dans le programme Club exemplaire.\n\nDemandez au trésorier comment payer.\n\nMerci de faire partie de {club} !'],
     welcome:['Bienvenue à {club} !','Bonjour,\n\nBienvenue à {club} ! Nous sommes ravis de vous compter parmi nous.\n\nVos prochaines étapes : créez votre profil dans Orato ({link}), choisissez votre parcours sur Base Camp et planifiez votre Brise-glace avec le VPE. Un mentor peut vous aider à démarrer.\n\nÀ la prochaine réunion !'],
     guest:['Merci de votre visite à {club}','Bonjour,\n\nMerci d’avoir participé à notre réunion. Nous espérons qu’elle vous a plu.\n\nNotre prochaine réunion a lieu le {date}. Vous êtes le bienvenu, et nous serons heureux de vous expliquer comment nous rejoindre.\n\n{link}\n\nÀ bientôt !'],
     contest:['Concours de discours à {club}','Bonjour,\n\nLe concours de discours du club a lieu le {date}. Nous cherchons des candidats, des juges, des chronométreurs et des compteurs.\n\nInscrivez-vous ici : {link}\n\nMerci !']}},
nl:{title:'Gereedschapskist voor het bestuur',intro:'Bestuursleden trainen, het jaar plannen, evenementen bijhouden en leden informeren. Toastmasters-jaar {y}.',
  sec:{training:'Bestuurstraining',plan:'Actieplan',events:'Evenementen',mail:'Mededelingen'},
  roles:{pres:'Voorzitter',vpe:'Vicevoorzitter Educatie (VPE)',vpm:'Vicevoorzitter Leden (VPM)',vppr:'Vicevoorzitter PR (VPPR)',sec:'Secretaris',tres:'Penningmeester',saa:'Sergeant at Arms'},
  trIntro:'Vink elke bestuursrol aan die in elke periode door het district is getraind. Het DCP telt vier getrainde rollen per periode.',p1:'Juni–augustus',p2:'November–februari',who:'Naam (optioneel)',trainedN:'{n} / 7 getraind',dcpOk:'DCP-doel gehaald voor deze periode',
  planIntro:'De acties van je Club Success Plan, op een tijdlijn. Koppel elke actie aan het DCP-doel dat ze dient.',action:'Actie',owner:'Wie',due:'Deadline',goal:'DCP-doel',noGoal:'—',addAction:'Actie toevoegen',
  st:{todo:'Te doen',doing:'Bezig',done:'Klaar'},overdue:'Te laat',noPlan:'Nog geen acties. Begin met de doelen van de club dit jaar.',
  evIntro:'Speciale bijeenkomsten, open huis, sociale avonden, demo’s… met aanwezigheid en gasten, om te zien wat mensen trekt.',evTitle:'Evenement',evDate:'Datum',evType:'Soort',evAtt:'Aanwezigen',evGuests:'Gasten',evNotes:'Notities',addEvent:'Evenement toevoegen',noEvents:'Nog geen evenementen.',
  types:{meeting:'Speciale bijeenkomst',open:'Open huis',social:'Sociale avond',demo:'Demobijeenkomst',contest:'Wedstrijd',training:'Training',other:'Anders'},
  totals:'{n} evenementen · {a} aanwezigen · {g} gasten',
  mailIntro:'Kies een bericht en de ontvangers. Orato vult de gegevens van de club in; je verstuurt het vanuit je eigen mailprogramma.',tpl:'Bericht',to:'Ontvangers',
  toL:{members:'Actieve leden',unpaid:'Leden die niet betaald hebben ({p})',guests:'Gasten om op te volgen'},nRecip:'{n} adres(sen)',noRecip:'Geen e-mailadres voor deze ontvangers in de ledenlijst of het gastenboek.',
  subject:'Onderwerp',body:'Bericht',copyMsg:'Bericht kopiëren',copyTo:'Adressen kopiëren',openMail:'Openen in mijn mailprogramma',saveTpl:'Opslaan als sjabloon',tplName:'Naam van het sjabloon',tplSaved:'Sjabloon opgeslagen',mine:'(clubsjabloon)',delTpl:'Dit sjabloon verwijderen',
  tplNames:{reminder:'Herinnering bijeenkomst',roles:'Vrije rollen',renewal:'Contributie verlengen',welcome:'Nieuw lid verwelkomen',guest:'Gast bedanken',contest:'Speechwedstrijd'},
  saved:'Opgeslagen',del:'Verwijderen',
  t:{reminder:['Onze volgende bijeenkomst: {date}','Hallo,\n\nDe volgende bijeenkomst van {club} is op {date}{theme}.\n\nNog vrije rollen:\n{roles}\n\nNeem hier een rol: {link}\n\nTot dan!'],
     roles:['Nog vrije rollen voor {date}','Hallo,\n\nDeze rollen zijn nog vrij voor onze bijeenkomst van {date}:\n{roles}\n\nNeem er een in één minuut: {link}\n\nBedankt!'],
     renewal:['Tijd om je lidmaatschap te verlengen','Hallo,\n\nDe contributie voor {period} moet betaald worden. Op tijd verlengen bewaart je Pathways-voortgang en helpt de club in het Distinguished Club Program.\n\nVraag de penningmeester hoe je kunt betalen.\n\nBedankt dat je deel uitmaakt van {club}!'],
     welcome:['Welkom bij {club}!','Hallo,\n\nWelkom bij {club}! Fijn dat je erbij bent.\n\nJe volgende stappen: maak je profiel aan in Orato ({link}), kies je pad op Base Camp en plan je Ice Breaker met de VPE. Een mentor kan je op weg helpen.\n\nTot de volgende bijeenkomst!'],
     guest:['Bedankt voor je bezoek aan {club}','Hallo,\n\nBedankt dat je bij onze bijeenkomst was. We hopen dat je ervan genoten hebt.\n\nOnze volgende bijeenkomst is op {date}. Je bent welkom om terug te komen, en we vertellen je graag hoe je lid wordt.\n\n{link}\n\nTot snel!'],
     contest:['Speechwedstrijd bij {club}','Hallo,\n\nDe speechwedstrijd van de club vindt plaats op {date}. We zoeken deelnemers, juryleden, tijdwaarnemers en tellers.\n\nSchrijf je hier in: {link}\n\nBedankt!']}},
ar:{title:'عُدّة مجلس الإدارة',intro:'تدريب أعضاء المجلس، وتخطيط السنة، ومتابعة الفعاليات، وإعلام الأعضاء. سنة Toastmasters {y}.',
  sec:{training:'تدريب أعضاء المجلس',plan:'خطة العمل',events:'الفعاليات',mail:'الإعلانات'},
  roles:{pres:'الرئيس',vpe:'نائب الرئيس للتعليم',vpm:'نائب الرئيس للعضوية',vppr:'نائب الرئيس للعلاقات العامة',sec:'أمين السر',tres:'أمين الصندوق',saa:'مسؤول التنظيم'},
  trIntro:'أشّر على كل دور في المجلس دُرِّب من قِبل المقاطعة في كل فترة. يحتسب DCP أربعة أدوار مدرَّبة في كل فترة.',p1:'يونيو–أغسطس',p2:'نوفمبر–فبراير',who:'الاسم (اختياري)',trainedN:'{n} / 7 مدرَّبون',dcpOk:'تحقّق هدف DCP لهذه الفترة',
  planIntro:'إجراءات خطة نجاح النادي على خط زمني. اربط كل إجراء بهدف DCP الذي يخدمه.',action:'الإجراء',owner:'المسؤول',due:'الموعد',goal:'هدف DCP',noGoal:'—',addAction:'إضافة الإجراء',
  st:{todo:'للتنفيذ',doing:'قيد التنفيذ',done:'منجز'},overdue:'متأخر',noPlan:'لا توجد إجراءات بعد. ابدأ بأهداف النادي هذه السنة.',
  evIntro:'اجتماعات خاصة، وأبواب مفتوحة، وأمسيات، وعروض… مع الحضور والضيوف، لمعرفة ما يجذب الناس.',evTitle:'الفعالية',evDate:'التاريخ',evType:'النوع',evAtt:'الحضور',evGuests:'الضيوف',evNotes:'ملاحظات',addEvent:'إضافة الفعالية',noEvents:'لا توجد فعاليات مسجّلة بعد.',
  types:{meeting:'اجتماع خاص',open:'أبواب مفتوحة',social:'أمسية',demo:'اجتماع تعريفي',contest:'مسابقة',training:'تدريب',other:'أخرى'},
  totals:'{n} فعاليات · {a} حاضر · {g} ضيف',
  mailIntro:'اختر رسالة والمستلمين. يملأ Orato معلومات النادي، وترسلها أنت من بريدك.',tpl:'الرسالة',to:'المستلمون',
  toL:{members:'الأعضاء النشطون',unpaid:'الأعضاء الذين لم يدفعوا ({p})',guests:'ضيوف للمتابعة'},nRecip:'{n} عنوان',noRecip:'لا يوجد بريد إلكتروني لهؤلاء المستلمين في قائمة الأعضاء أو سجل الضيوف.',
  subject:'الموضوع',body:'الرسالة',copyMsg:'نسخ الرسالة',copyTo:'نسخ العناوين',openMail:'فتح في بريدي',saveTpl:'حفظ كنموذج',tplName:'اسم النموذج',tplSaved:'تم حفظ النموذج',mine:'(نموذج النادي)',delTpl:'حذف هذا النموذج',
  tplNames:{reminder:'تذكير بالاجتماع',roles:'أدوار شاغرة',renewal:'تجديد الاشتراك',welcome:'الترحيب بعضو جديد',guest:'شكر ضيف',contest:'مسابقة خطابة'},
  saved:'تم الحفظ',del:'حذف',
  t:{reminder:['اجتماعنا القادم: {date}','مرحباً،\n\nيُعقد الاجتماع القادم لـ{club} في {date}{theme}.\n\nالأدوار التي ما زالت شاغرة:\n{roles}\n\nاحجز دوراً من هنا: {link}\n\nإلى اللقاء!'],
     roles:['أدوار شاغرة في {date}','مرحباً،\n\nهذه الأدوار ما زالت شاغرة في اجتماعنا يوم {date}:\n{roles}\n\nاحجز واحداً في دقيقة: {link}\n\nشكراً!'],
     renewal:['حان وقت تجديد عضويتك','مرحباً،\n\nحان موعد اشتراك {period}. التجديد في الموعد يحفظ تقدّمك في Pathways ويساعد النادي في برنامج النادي المتميّز.\n\nاسأل أمين الصندوق عن طريقة الدفع.\n\nشكراً لكونك جزءاً من {club}!'],
     welcome:['مرحباً بك في {club}!','مرحباً،\n\nأهلاً بك في {club}! يسعدنا انضمامك إلينا.\n\nخطواتك التالية: أنشئ ملفك في Orato ({link})، واختر مسارك في Base Camp، وخطّط لخطاب كسر الجليد مع نائب الرئيس للتعليم. يمكن لمرشد أن يساعدك في البداية.\n\nإلى الاجتماع القادم!'],
     guest:['شكراً لزيارتك {club}','مرحباً،\n\nشكراً لحضورك اجتماعنا. نأمل أنه نال إعجابك.\n\nاجتماعنا القادم في {date}. أنت مرحّب بك دائماً، ويسعدنا أن نشرح لك كيفية الانضمام.\n\n{link}\n\nإلى اللقاء!'],
     contest:['مسابقة خطابة في {club}','مرحباً،\n\nتُقام مسابقة الخطابة في النادي يوم {date}. نبحث عن متسابقين وحكّام وميقاتيين وعدّادين.\n\nسجّل هنا: {link}\n\nشكراً!']}}};
const KTL=()=>KT[LANG]||KT.en;

// ---------- officer training ----------
function trainingBox(){
  const L=KTL();const tr=kitData().training;
  const cnt=p=>trainedCount(p);
  return `<div class="box"><div><h3>${esc(L.sec.training)}</h3><p class="muted">${esc(L.trIntro)}</p></div>
    <div class="btns">${['p1','p2'].map(p=>`<span class="chip ${cnt(p)>=4?'ok':'warn'}">${esc(L[p])} · ${esc(L.trainedN.replace('{n}',cnt(p)))}${cnt(p)>=4?' ✓':''}</span>`).join('')}</div>
    <div class="tablewrap"><table><thead><tr><th>${t('roles.colRole')}</th><th>${esc(L.who)}</th><th class="num">${esc(L.p1)}</th><th class="num">${esc(L.p2)}</th></tr></thead><tbody>
    ${KIT_ROLES.map(r=>{const x=tr[r]||{};return `<tr><td>${esc(L.roles[r])}</td>
      <td><input id="kt-n-${r}" data-ktname="${r}" maxlength="60" value="${esc(x.name||'')}" aria-label="${esc(L.who+' – '+L.roles[r])}"></td>
      ${['p1','p2'].map(p=>`<td class="num"><input type="checkbox" data-kttr="${r}" data-p="${p}" ${x[p]?'checked':''} aria-label="${esc(L.roles[r]+' – '+L[p])}"></td>`).join('')}</tr>`}).join('')}
    </tbody></table></div></div>`;
}

// ---------- action plan ----------
function planBoxKit(){
  const L=KTL();const items=kitData().plan.slice().sort((a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999')));
  const today=todayISO();const goals=STL().g;
  const d=KIT.planDraft||(KIT.planDraft={title:'',owner:'',due:'',goal:''});
  const byMonth={};items.forEach(it=>{const k=(it.due||'').slice(0,7)||'—';(byMonth[k]=byMonth[k]||[]).push(it)});
  const mLabel=k=>k==='—'?'—':new Date(k+'-15T12:00').toLocaleDateString(locale(),{month:'long',year:'numeric'});
  return `<div class="box"><div><h3>${esc(L.sec.plan)}</h3><p class="muted">${esc(L.planIntro)}</p></div>
    ${items.length?`<div class="timeline">${Object.keys(byMonth).map(k=>`<div class="tlm"><span class="label">${esc(mLabel(k))}</span>
      ${byMonth[k].map(it=>{const late=it.status!=='done'&&it.due&&it.due<today;return `<div class="tli ${it.status||'todo'} ${late?'late':''}">
        <select data-ktst="${esc(it.id)}" aria-label="${esc(L.st.todo)}" style="width:auto">${['todo','doing','done'].map(s=>`<option value="${s}" ${s===(it.status||'todo')?'selected':''}>${esc(L.st[s])}</option>`).join('')}</select>
        <div><b>${esc(it.title)}</b>${late?` <span class="chip bad">${esc(L.overdue)}</span>`:''}<br><span class="muted" style="font-size:.85rem">${esc([it.owner,it.due?fmtDay(it.due+'T12:00'):'',it.goal?`DCP ${it.goal}`:''].filter(Boolean).join(' · '))}</span></div>
        <button class="ghost small" data-act="kt-plan-del" data-id="${esc(it.id)}" aria-label="${esc(L.del+' '+it.title)}">×</button></div>`}).join('')}</div>`).join('')}</div>`
      :`<p class="empty">${esc(L.noPlan)}</p>`}
    <form class="fields" data-form="kt-plan" novalidate>
      <div class="field" style="grid-column:1/-1"><label class="label" for="kt-pt">${esc(L.action)}</label><input id="kt-pt" data-ktp="title" maxlength="150" value="${esc(d.title)}"></div>
      <div class="field"><label class="label" for="kt-po">${esc(L.owner)}</label><input id="kt-po" data-ktp="owner" maxlength="60" value="${esc(d.owner)}"></div>
      <div class="field"><label class="label" for="kt-pd">${esc(L.due)}</label><input id="kt-pd" type="date" data-ktp="due" value="${esc(d.due)}"></div>
      <div class="field" style="grid-column:1/-1"><label class="label" for="kt-pg">${esc(L.goal)}</label><select id="kt-pg" data-ktp="goal"><option value="">${esc(L.noGoal)}</option>${goals.map((g,i)=>`<option value="${i+1}" ${String(i+1)===String(d.goal)?'selected':''}>${i+1}. ${esc(g)}</option>`).join('')}</select></div>
      <div class="btns" style="grid-column:1/-1"><button type="submit" ${KIT.busy?'disabled':''}>${esc(L.addAction)}</button></div></form></div>`;
}

// ---------- events ----------
function eventsBox(){
  const L=KTL();const evs=kitData().events.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const d=KIT.evDraft||(KIT.evDraft={title:'',date:todayISO(),type:'open',att:'',guests:'',notes:''});
  const A=evs.reduce((s,e)=>s+(+e.att||0),0),G=evs.reduce((s,e)=>s+(+e.guests||0),0);
  const byType={};evs.forEach(e=>{const x=byType[e.type]=byType[e.type]||{n:0,g:0};x.n++;x.g+=(+e.guests||0)});
  return `<div class="box"><div class="phead"><div><h3>${esc(L.sec.events)}</h3><p class="muted">${esc(L.evIntro)}</p></div>${evs.length?`<span class="chip">${esc(L.totals.replace('{n}',evs.length).replace('{a}',A).replace('{g}',G))}</span>`:''}</div>
    ${evs.length?`<div class="tablewrap"><table><thead><tr><th>${esc(L.evDate)}</th><th>${esc(L.evTitle)}</th><th>${esc(L.evType)}</th><th class="num">${esc(L.evAtt)}</th><th class="num">${esc(L.evGuests)}</th><th></th></tr></thead><tbody>
      ${evs.map(e=>`<tr><td>${esc(fmtDay(e.date+'T12:00'))}</td><td>${esc(e.title)}${e.notes?`<br><span class="muted" style="font-size:.85rem">${esc(e.notes)}</span>`:''}</td><td>${esc(L.types[e.type]||e.type)}</td><td class="num">${esc(e.att||'')}</td><td class="num">${esc(e.guests||'')}</td>
      <td><button class="ghost small" data-act="kt-ev-del" data-id="${esc(e.id)}" aria-label="${esc(L.del+' '+e.title)}">×</button></td></tr>`).join('')}</tbody></table></div>
      <p class="muted" style="font-size:.88rem;margin:0">${Object.entries(byType).map(([k,x])=>`${esc(L.types[k]||k)} : ${x.n} · ${esc(L.evGuests.toLowerCase())} ${x.g}`).join(' — ')}</p>`
      :`<p class="empty">${esc(L.noEvents)}</p>`}
    <form class="fields" data-form="kt-ev" novalidate>
      <div class="field" style="grid-column:1/-1"><label class="label" for="kt-et">${esc(L.evTitle)}</label><input id="kt-et" data-kte="title" maxlength="120" value="${esc(d.title)}"></div>
      <div class="field"><label class="label" for="kt-ed">${esc(L.evDate)}</label><input id="kt-ed" type="date" data-kte="date" value="${esc(d.date)}"></div>
      <div class="field"><label class="label" for="kt-ety">${esc(L.evType)}</label><select id="kt-ety" data-kte="type">${EVENT_TYPES.map(x=>`<option value="${x}" ${x===d.type?'selected':''}>${esc(L.types[x])}</option>`).join('')}</select></div>
      <div class="field"><label class="label" for="kt-ea">${esc(L.evAtt)}</label><input id="kt-ea" type="number" min="0" max="9999" data-kte="att" value="${esc(d.att)}"></div>
      <div class="field"><label class="label" for="kt-eg">${esc(L.evGuests)}</label><input id="kt-eg" type="number" min="0" max="9999" data-kte="guests" value="${esc(d.guests)}"></div>
      <div class="field" style="grid-column:1/-1"><label class="label" for="kt-en">${esc(L.evNotes)}</label><input id="kt-en" data-kte="notes" maxlength="200" value="${esc(d.notes)}"></div>
      <div class="btns" style="grid-column:1/-1"><button type="submit" ${KIT.busy?'disabled':''}>${esc(L.addEvent)}</button></div></form></div>`;
}

// ---------- announcements ----------
function recipients(to){
  const p=typeof curPeriod==='function'?curPeriod():'';
  const act=(MEM.list||[]).filter(m=>(m.status||'active')==='active'&&m.email);
  if(to==='unpaid')return act.filter(m=>renewalOf(m,p)!=='paid'&&renewalOf(m,p)!=='leaving').map(m=>m.email);
  if(to==='guests')return (MEM.guests||[]).filter(g=>g.email&&['new','contacted'].includes(g.status||'new')).map(g=>g.email);
  return act.map(m=>m.email);
}
function fillTpl(s){
  const a=S.agenda||{};const open=(typeof officialKeys==='function'?officialKeys():ROLE_KEYS).filter(k=>!roleName(k)).map(k=>'• '+roleLabel(k)).join('\n')||'—';
  const link=typeof shareLink==='function'?shareLink():location.href;
  return String(s).replace(/\{club\}/g,a.club||SH.club).replace(/\{date\}/g,a.date?fmtDate(a.date):'…').replace(/\{theme\}/g,a.theme?` (${a.theme})`:'')
    .replace(/\{roles\}/g,open).replace(/\{link\}/g,link).replace(/\{period\}/g,typeof curPeriod==='function'?periodLabel(curPeriod()):'');
}
function currentTpl(){
  const L=KTL();const own=kitData().templates.find(x=>'c:'+x.id===KIT.tpl);
  if(own)return {subject:own.subject,body:own.body,own};
  const b=L.t[KIT.tpl]||L.t.reminder;return {subject:fillTpl(b[0]),body:fillTpl(b[1])};
}
function mailBox(){
  const L=KTL();const tp=currentTpl();
  const subject=KIT.subject??tp.subject,body=KIT.body??tp.body;
  const rec=recipients(KIT.to);const p=typeof curPeriod==='function'?periodLabel(curPeriod()):'';
  const own=kitData().templates;
  return `<div class="box"><div><h3>${esc(L.sec.mail)}</h3><p class="muted">${esc(L.mailIntro)}</p></div>
    <div class="fields">
      <div class="field"><label class="label" for="kt-tpl">${esc(L.tpl)}</label><select id="kt-tpl" data-ktm="tpl">${KIT_TPLS.map(k=>`<option value="${k}" ${k===KIT.tpl?'selected':''}>${esc(L.tplNames[k])}</option>`).join('')}${own.map(x=>`<option value="c:${esc(x.id)}" ${'c:'+x.id===KIT.tpl?'selected':''}>${esc(x.name)} ${esc(L.mine)}</option>`).join('')}</select></div>
      <div class="field"><label class="label" for="kt-to">${esc(L.to)}</label><select id="kt-to" data-ktm="to">${['members','unpaid','guests'].map(k=>`<option value="${k}" ${k===KIT.to?'selected':''}>${esc(L.toL[k].replace('{p}',p))}</option>`).join('')}</select>
        <span class="muted" style="font-size:.82rem">${rec.length?esc(L.nRecip.replace('{n}',rec.length)):esc(L.noRecip)}</span></div>
      <div class="field" style="grid-column:1/-1"><label class="label" for="kt-subj">${esc(L.subject)}</label><input id="kt-subj" data-ktm="subject" maxlength="200" value="${esc(subject)}"></div>
      <div class="field" style="grid-column:1/-1"><label class="label" for="kt-body">${esc(L.body)}</label><textarea id="kt-body" data-ktm="body" rows="10" maxlength="4000">${esc(body)}</textarea></div>
    </div>
    <div class="btns"><button class="primary" data-act="kt-mail">${esc(L.openMail)}</button><button data-act="kt-copy-msg">${esc(L.copyMsg)}</button><button data-act="kt-copy-to" ${rec.length?'':'disabled'}>${esc(L.copyTo)}</button></div>
    <details><summary class="muted">${esc(L.saveTpl)}</summary><form class="btns" data-form="kt-tpl" style="flex-wrap:nowrap;margin-top:8px"><input id="kt-tname" maxlength="60" placeholder="${esc(L.tplName)}" aria-label="${esc(L.tplName)}"><button type="submit" class="small">${esc(L.saveTpl)}</button></form>
      ${tp.own?`<button class="small ghost" data-act="kt-tpl-del" data-id="${esc(tp.own.id)}" style="margin-top:8px">${esc(L.delTpl)}</button>`:''}</details></div>`;
}

function kitView(){
  const L=KTL();const py=programYear();
  const head=`<div class="phead"><div><h2>${esc(L.title)}</h2><p class="muted">${esc(L.intro.replace('{y}',py.id))}</p></div><span class="chip ok">${esc(STL().premium)}</span></div>`;
  if(!SH.on||SH.officer!==true)return `<section class="panel">${head}${!SH.on?liveBox():`<div class="box"><p>${t('mem.officersOnly')}</p></div>`}</section>`;
  if(KIT.doc===null)return `<section class="panel">${head}<p class="empty">${t('office.loading')}</p></section>`;
  const box={training:trainingBox,plan:planBoxKit,events:eventsBox,mail:mailBox}[KIT.sec]||trainingBox;
  return `<section class="panel">${head}
    <div class="speakers" role="group">${['training','plan','events','mail'].map(k=>chip('kt-sec',k,KIT.sec===k,esc(L.sec[k]))).join('')}</div>
    ${box()}</section>`;
}

// ---------- events ----------
document.addEventListener('change',ev=>{
  const el=ev.target;const ds=el.dataset||{};
  if(ds.kttr){const tr=kitData().training;const x=Object.assign({},tr[ds.kttr]||{});x[ds.p]=el.checked;kitSave({training:{...tr,[ds.kttr]:x}},KTL().saved);return}
  if(ds.ktname){const tr=kitData().training;const x=Object.assign({},tr[ds.ktname]||{});x.name=el.value.trim().slice(0,60);kitSave({training:{...tr,[ds.ktname]:x}});return}
  if(ds.ktst){const plan=kitData().plan.map(it=>it.id===ds.ktst?{...it,status:el.value}:it);kitSave({plan});return}
  if(ds.ktp){KIT.planDraft[ds.ktp]=el.value;return}
  if(ds.kte){KIT.evDraft[ds.kte]=el.value;return}
  if(ds.ktm==='tpl'){KIT.tpl=el.value;KIT.subject=KIT.body=null;render();return}
  if(ds.ktm==='to'){KIT.to=el.value;render();return}
});
document.addEventListener('input',ev=>{const ds=ev.target.dataset||{};
  if(ds.ktp)KIT.planDraft[ds.ktp]=ev.target.value;if(ds.kte)KIT.evDraft[ds.kte]=ev.target.value;
  if(ds.ktm==='subject')KIT.subject=ev.target.value;if(ds.ktm==='body')KIT.body=ev.target.value});
document.addEventListener('submit',ev=>{
  const f=ev.target.dataset.form;if(!f||!f.startsWith('kt-'))return;ev.preventDefault();const L=KTL();
  if(f==='kt-plan'){const d=KIT.planDraft;const title=d.title.trim().slice(0,150);if(!title)return;
    const plan=[...kitData().plan,{id:kitId(),title,owner:d.owner.trim().slice(0,60),due:/^\d{4}-\d{2}-\d{2}$/.test(d.due)?d.due:'',goal:d.goal?+d.goal:0,status:'todo'}].slice(-60);
    KIT.planDraft=null;kitSave({plan},L.saved);return}
  if(f==='kt-ev'){const d=KIT.evDraft;const title=d.title.trim().slice(0,120);if(!title)return;
    const events=[...kitData().events,{id:kitId(),title,date:/^\d{4}-\d{2}-\d{2}$/.test(d.date)?d.date:todayISO(),type:EVENT_TYPES.includes(d.type)?d.type:'other',att:Math.min(9999,Math.max(0,+d.att||0)),guests:Math.min(9999,Math.max(0,+d.guests||0)),notes:d.notes.trim().slice(0,200)}].slice(-100);
    KIT.evDraft=null;kitSave({events},L.saved);return}
  if(f==='kt-tpl'){const name=document.getElementById('kt-tname').value.trim().slice(0,60);if(!name)return;const tp=currentTpl();
    const x={id:kitId(),name,subject:(KIT.subject??tp.subject).slice(0,200),body:(KIT.body??tp.body).slice(0,4000)};
    KIT.tpl='c:'+x.id;KIT.subject=KIT.body=null;kitSave({templates:[...kitData().templates,x].slice(-20)},L.tplSaved);return}
});
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act^="kt-"]');if(!b)return;const a=b.dataset.act;
  if(a==='kt-sec'){KIT.sec=b.dataset.v;render();return}
  if(a==='kt-plan-del'){kitSave({plan:kitData().plan.filter(x=>x.id!==b.dataset.id)});return}
  if(a==='kt-ev-del'){kitSave({events:kitData().events.filter(x=>x.id!==b.dataset.id)});return}
  if(a==='kt-tpl-del'){KIT.tpl='reminder';KIT.subject=KIT.body=null;kitSave({templates:kitData().templates.filter(x=>x.id!==b.dataset.id)});return}
  const tp=currentTpl();const subject=KIT.subject??tp.subject,body=KIT.body??tp.body;const rec=recipients(KIT.to);
  if(a==='kt-copy-msg'){copyText(subject+'\n\n'+body);return}
  if(a==='kt-copy-to'){copyText(rec.join(', '));return}
  if(a==='kt-mail'){const href=`mailto:?bcc=${encodeURIComponent(rec.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if(href.length>1900&&rec.length){copyText(rec.join(', '));location.href=`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}else location.href=href;return}
});
