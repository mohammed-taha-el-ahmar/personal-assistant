// Oratia – landing page (#home): what Oratia is, what it does, how a club starts, and a way in (club code, or the
// tools straight away). Shown first when the address has no club; reachable from the logo and the footer otherwise.

const LANDT={
en:{kicker:'Free for every Toastmasters club',title:'Club meetings that run on time, from the agenda to the applause.',
  sub:'Oratia gathers the tools your club uses every week: agenda, roles, timer, Ah-Counter, Grammarian, voting, contests, Pathways and mentoring. On any phone, in English, French, Dutch and Arabic. No app to install.',
  codeL:'Your club code',codePh:'paris-orators',go:'Open my club',codeHint:'No club space yet? Type the code you would like (for example paris-orators): if it is free, an officer can ask to open it.',
  try:'Try the timer now',tour:'Discover the tools',
  demo:{who:'Marie · Speech 2',sig:'Green card: you can wrap up',ag:['19:00 Welcome','19:04 Toastmaster of the day','19:12 Speech 1 – Paul','19:20 Speech 2 – Marie','19:28 Table Topics']},
  featTitle:'Everything a meeting needs, in one place',
  feats:{club:'A club page for guests, a guest book at the door and a member directory.',during:'Timer with lights, Ah-Counter, Grammarian, Table Topics and best-speaker voting.',
    before:'Agenda with templates, roles that members take themselves, planned meetings and role swaps.',learn:'Speech requests, Pathways paths and projects, and mentoring pairs.',
    contests:'Contest agendas with up to 8 contestants, rules, officials’ roles, documents and judges’ ballots on phones.',after:'Meeting feedback, reports and history, and club statistics.'},
  howTitle:'How a club starts',
  steps:[['Ask for your club space','An officer chooses a club code and signs in with Google. The space opens once the request is approved.'],
    ['Share the link','Members open the club link, take their roles and say whether they are coming. Guests see the agenda.'],
    ['Run the meeting','The Timer, the Ah-Counter and the Grammarian send their reports, votes are counted live, and the history fills in on its own.']],
  whyTitle:'Made for clubs',
  why:[['Free, without ads','The core tools are free for every club. A few advanced tools can be turned on per club.'],
    ['Each role has its tool','Toastmaster of the day, Timer, VPE, contest chair: everyone finds what they need, with a short guide.'],
    ['Visitors only read','Only officers edit the agenda and plan meetings; members take roles with their profile or the member code.'],
    ['Your data stays with your club','Officers can export or delete the club’s data at any time; members can delete their own.']],
  faqTitle:'Questions',
  faq:[['Is Oratia an official Toastmasters tool?','No. Oratia is an independent tool made by club members. It is not affiliated with or endorsed by Toastmasters International.'],
    ['Do members need an account?','No. Guests and visitors only need the club link. Members can create a profile to take roles on any device; officers sign in with Google.'],
    ['Can I use it without a club space?','Yes. The timer, the Ah-Counter, the Grammarian and the evaluation notes work on your device without any sign-in.'],
    ['Which languages?','English, French, Dutch and Arabic (right to left). Each person chooses their language; the club data stays the same.']],
  endTitle:'Ready for your next meeting?',endGo:'Open my club'},
fr:{kicker:'Gratuit pour tous les clubs Toastmasters',title:'Des réunions de club qui tiennent le temps, de l’ordre du jour aux applaudissements.',
  sub:'Oratia rassemble les outils que votre club utilise chaque semaine : ordre du jour, rôles, chrono, compteur d’hésitations, grammairien, votes, concours, Pathways et mentorat. Sur n’importe quel téléphone, en français, anglais, néerlandais et arabe. Aucune application à installer.',
  codeL:'Code de votre club',codePh:'paris-orateurs',go:'Ouvrir mon club',codeHint:'Pas encore d’espace club ? Tapez le code souhaité (par exemple paris-orateurs) : s’il est libre, un membre du bureau peut demander son ouverture.',
  try:'Essayer le chrono maintenant',tour:'Découvrir les outils',
  demo:{who:'Marie · Discours 2',sig:'Carton vert : vous pouvez conclure',ag:['19:00 Accueil','19:04 Animateur de la réunion','19:12 Discours 1 – Paul','19:20 Discours 2 – Marie','19:28 Improvisations']},
  featTitle:'Tout ce qu’il faut pour une réunion, au même endroit',
  feats:{club:'Une page de club pour les invités, un livre d’or à l’entrée et un annuaire des membres.',during:'Chrono avec feux, compteur d’hésitations, grammairien, sujets d’improvisation et vote du meilleur orateur.',
    before:'Ordre du jour avec modèles, rôles pris par les membres eux-mêmes, réunions planifiées et échanges de rôles.',learn:'Demandes de discours, parcours et projets Pathways, et binômes de mentorat.',
    contests:'Ordres du jour de concours jusqu’à 8 candidats, règles, rôles des officiels, documents et bulletins des juges sur téléphone.',after:'Avis sur la réunion, rapports et historique, et statistiques du club.'},
  howTitle:'Comment un club démarre',
  steps:[['Demandez votre espace club','Un membre du bureau choisit un code de club et se connecte avec Google. L’espace s’ouvre dès que la demande est approuvée.'],
    ['Partagez le lien','Les membres ouvrent le lien du club, prennent leurs rôles et indiquent s’ils viennent. Les invités voient l’ordre du jour.'],
    ['Animez la réunion','Le chronométreur, le compteur d’hésitations et le grammairien envoient leurs rapports, les votes sont comptés en direct et l’historique se remplit tout seul.']],
  whyTitle:'Pensé pour les clubs',
  why:[['Gratuit, sans publicité','Les outils de base sont gratuits pour tous les clubs. Quelques outils avancés peuvent être activés par club.'],
    ['Chaque rôle a son outil','Animateur, chronométreur, VP Éducation, président de concours : chacun trouve ce qu’il lui faut, avec un guide court.'],
    ['Les visiteurs ne font que consulter','Seul le bureau modifie l’ordre du jour et planifie les réunions ; les membres prennent leurs rôles avec leur profil ou le code membre.'],
    ['Vos données restent au club','Le bureau peut exporter ou supprimer les données du club à tout moment ; chaque membre peut supprimer les siennes.']],
  faqTitle:'Questions',
  faq:[['Oratia est-il un outil officiel de Toastmasters ?','Non. Oratia est un outil indépendant créé par des membres de club. Il n’est ni affilié à Toastmasters International ni approuvé par elle.'],
    ['Les membres doivent-ils créer un compte ?','Non. Les invités et visiteurs n’ont besoin que du lien du club. Les membres peuvent créer un profil pour prendre leurs rôles sur tous leurs appareils ; le bureau se connecte avec Google.'],
    ['Puis-je l’utiliser sans espace club ?','Oui. Le chrono, le compteur d’hésitations, le grammairien et les notes d’évaluation fonctionnent sur votre appareil, sans connexion.'],
    ['Quelles langues ?','Français, anglais, néerlandais et arabe (de droite à gauche). Chacun choisit sa langue ; les données du club restent les mêmes.']],
  endTitle:'Prêt pour votre prochaine réunion ?',endGo:'Ouvrir mon club'},
nl:{kicker:'Gratis voor elke Toastmasters-club',title:'Clubbijeenkomsten die op tijd lopen, van agenda tot applaus.',
  sub:'Oratia bundelt de tools die je club elke week gebruikt: agenda, rollen, timer, Eh-teller, grammaticus, stemmen, wedstrijden, Pathways en mentoring. Op elke telefoon, in het Nederlands, Engels, Frans en Arabisch. Geen app nodig.',
  codeL:'Code van je club',codePh:'gent-sprekers',go:'Mijn club openen',codeHint:'Nog geen clubruimte? Typ de gewenste code (bijvoorbeeld gent-sprekers): als die vrij is, kan een bestuurslid vragen om ze te openen.',
  try:'Probeer nu de timer',tour:'Ontdek de tools',
  demo:{who:'Marie · Speech 2',sig:'Groene kaart: je mag afronden',ag:['19:00 Welkom','19:04 Toastmaster van de avond','19:12 Speech 1 – Paul','19:20 Speech 2 – Marie','19:28 Table Topics']},
  featTitle:'Alles wat een bijeenkomst nodig heeft, op één plek',
  feats:{club:'Een clubpagina voor gasten, een gastenboek aan de deur en een ledenlijst.',during:'Timer met lichten, Eh-teller, grammaticus, Table Topics en stemmen voor de beste spreker.',
    before:'Agenda met sjablonen, rollen die leden zelf opnemen, geplande bijeenkomsten en rollen ruilen.',learn:'Speechaanvragen, Pathways-paden en -projecten, en mentorkoppels.',
    contests:'Wedstrijdagenda’s tot 8 deelnemers, regels, rollen van officials, documenten en juryformulieren op de telefoon.',after:'Feedback op de bijeenkomst, rapporten en geschiedenis, en clubstatistieken.'},
  howTitle:'Hoe een club start',
  steps:[['Vraag je clubruimte aan','Een bestuurslid kiest een clubcode en meldt zich aan met Google. De ruimte opent zodra de aanvraag is goedgekeurd.'],
    ['Deel de link','Leden openen de clublink, nemen hun rollen op en laten weten of ze komen. Gasten zien de agenda.'],
    ['Leid de bijeenkomst','Timer, Eh-teller en grammaticus sturen hun rapporten, stemmen worden live geteld en de geschiedenis vult zich vanzelf.']],
  whyTitle:'Gemaakt voor clubs',
  why:[['Gratis, zonder reclame','De basistools zijn gratis voor elke club. Enkele geavanceerde tools kunnen per club worden ingeschakeld.'],
    ['Elke rol zijn tool','Toastmaster van de avond, timer, VPE, wedstrijdvoorzitter: iedereen vindt wat hij nodig heeft, met een korte gids.'],
    ['Bezoekers kunnen alleen lezen','Alleen het bestuur bewerkt de agenda en plant bijeenkomsten; leden nemen rollen op met hun profiel of de ledencode.'],
    ['Je gegevens blijven bij je club','Het bestuur kan de clubgegevens altijd exporteren of verwijderen; leden kunnen hun eigen gegevens verwijderen.']],
  faqTitle:'Vragen',
  faq:[['Is Oratia een officiële Toastmasters-tool?','Nee. Oratia is een onafhankelijke tool, gemaakt door clubleden. Ze is niet verbonden met of goedgekeurd door Toastmasters International.'],
    ['Hebben leden een account nodig?','Nee. Gasten en bezoekers hebben alleen de clublink nodig. Leden kunnen een profiel maken om op elk toestel rollen op te nemen; het bestuur meldt zich aan met Google.'],
    ['Kan ik het gebruiken zonder clubruimte?','Ja. De timer, de Eh-teller, de grammaticus en de evaluatienotities werken op je toestel, zonder aanmelden.'],
    ['Welke talen?','Nederlands, Engels, Frans en Arabisch (van rechts naar links). Iedereen kiest zijn taal; de clubgegevens blijven dezelfde.']],
  endTitle:'Klaar voor je volgende bijeenkomst?',endGo:'Mijn club openen'},
ar:{kicker:'مجاني لكل نوادي توستماسترز',title:'اجتماعات نادٍ تلتزم بالوقت، من جدول الأعمال إلى التصفيق.',
  sub:'يجمع Oratia الأدوات التي يستخدمها ناديك كل أسبوع: جدول الأعمال، الأدوار، المؤقت، عدّاد الحشو، المدقق اللغوي، التصويت، المسابقات، Pathways والإرشاد. على أي هاتف، بالعربية والإنجليزية والفرنسية والهولندية. دون تثبيت أي تطبيق.',
  codeL:'رمز ناديك',codePh:'paris-orators',go:'فتح ناديي',codeHint:'لا توجد مساحة لناديك بعد؟ اكتب الرمز الذي تريده (مثلًا paris-orators): إذا كان متاحًا، يمكن لأحد أعضاء المكتب طلب فتحه.',
  try:'جرّب المؤقت الآن',tour:'اكتشف الأدوات',
  demo:{who:'مريم · الخطاب 2',sig:'البطاقة الخضراء: يمكنك الاختتام',ag:['19:00 الترحيب','19:04 مقدّم الاجتماع','19:12 الخطاب 1 – بول','19:20 الخطاب 2 – مريم','19:28 المواضيع الارتجالية']},
  featTitle:'كل ما يحتاجه الاجتماع في مكان واحد',
  feats:{club:'صفحة للنادي للضيوف، سجل للزوار عند الباب ودليل للأعضاء.',during:'مؤقت بالأضواء، عدّاد الحشو، المدقق اللغوي، المواضيع الارتجالية والتصويت لأفضل متحدث.',
    before:'جدول أعمال بقوالب، أدوار يأخذها الأعضاء بأنفسهم، اجتماعات مخططة وتبادل الأدوار.',learn:'طلبات الخطابات، مسارات ومشاريع Pathways، وثنائيات الإرشاد.',
    contests:'جداول أعمال للمسابقات حتى 8 متسابقين، القواعد، أدوار المسؤولين، الوثائق وبطاقات الحكّام على الهاتف.',after:'آراء حول الاجتماع، التقارير والسجل، وإحصاءات النادي.'},
  howTitle:'كيف يبدأ النادي',
  steps:[['اطلب مساحة ناديك','يختار أحد أعضاء المكتب رمزًا للنادي ويسجّل الدخول بحساب Google. تُفتح المساحة بعد الموافقة على الطلب.'],
    ['شارك الرابط','يفتح الأعضاء رابط النادي، يأخذون أدوارهم ويؤكدون حضورهم. يرى الضيوف جدول الأعمال.'],
    ['أدِر الاجتماع','يرسل الميقاتي وعدّاد الحشو والمدقق اللغوي تقاريرهم، وتُحسب الأصوات مباشرة، ويمتلئ السجل تلقائيًا.']],
  whyTitle:'مصمَّم للنوادي',
  why:[['مجاني ودون إعلانات','الأدوات الأساسية مجانية لكل النوادي. يمكن تفعيل بعض الأدوات المتقدمة لكل نادٍ.'],
    ['لكل دور أداته','مقدّم الاجتماع، المؤقت، نائب الرئيس للتعليم، رئيس المسابقة: يجد كلٌّ ما يحتاجه مع دليل قصير.'],
    ['الزوار يطّلعون فقط','وحده المكتب يعدّل جدول الأعمال ويخطط الاجتماعات؛ ويأخذ الأعضاء أدوارهم بملفهم الشخصي أو برمز الأعضاء.'],
    ['بياناتك تبقى لناديك','يمكن للمكتب تصدير بيانات النادي أو حذفها في أي وقت؛ ويمكن لكل عضو حذف بياناته.']],
  faqTitle:'أسئلة',
  faq:[['هل Oratia أداة رسمية من توستماسترز؟','لا. Oratia أداة مستقلة صنعها أعضاء نوادٍ، وهي غير تابعة لمنظمة توستماسترز الدولية ولا معتمدة منها.'],
    ['هل يحتاج الأعضاء إلى حساب؟','لا. يكفي الضيوف والزوار رابط النادي. يمكن للأعضاء إنشاء ملف شخصي لأخذ الأدوار من أي جهاز؛ ويسجّل المكتب الدخول بحساب Google.'],
    ['هل يمكنني استخدامه دون مساحة نادٍ؟','نعم. المؤقت وعدّاد الحشو والمدقق اللغوي وملاحظات التقييم تعمل على جهازك دون تسجيل دخول.'],
    ['ما اللغات المتاحة؟','العربية (من اليمين إلى اليسار) والإنجليزية والفرنسية والهولندية. يختار كلٌّ لغته وتبقى بيانات النادي نفسها.']],
  endTitle:'مستعد لاجتماعك القادم؟',endGo:'فتح ناديي'}
};
const LDL=()=>LANDT[LANG]||LANDT.en;

function landingDemo(L){
  return `<div class="ld-demo" aria-hidden="true">
    <div class="ld-phone"><div class="ld-stage"><span class="ld-who">${esc(L.demo.who)}</span><span class="ld-clock">5:12</span><span class="ld-sig">${esc(L.demo.sig)}</span>
      <span class="ld-marks"><b class="g">5:00</b><b class="a">6:00</b><b class="r">7:00</b></span></div>
      <ol class="ld-ag">${L.demo.ag.map((x,i)=>`<li class="${i===3?'cur':i<3?'done':''}"><span>${esc(x.slice(0,5))}</span>${esc(x.slice(6))}</li>`).join('')}</ol></div>
  </div>`;
}
function landingJoin(L,id){
  if(typeof configured==='function'&&!configured())return '';
  return `<form class="ld-join" data-form="ld-join"><label class="label" for="${id}">${esc(L.codeL)}</label>
    <div class="ld-joinrow"><input id="${id}" placeholder="${esc(L.codePh)}" autocomplete="off" autocapitalize="none" spellcheck="false"><button type="submit" class="primary">${esc(L.go)}</button></div>
    <p class="muted">${esc(L.codeHint)}</p></form>`;
}
function landingView(){
  const L=LDL();const sec=NAV_SECTIONS;
  const club=SH.club&&SH.on;
  return `<section class="landing">
  <div class="ld-hero">
    <div class="ld-copy"><span class="ld-kicker"><span class="lights" aria-hidden="true"><i></i><i></i><i></i></span>${esc(L.kicker)}</span>
      <h2 class="ld-title">${esc(L.title)}</h2><p class="ld-sub">${esc(L.sub)}</p>
      ${club?`<div class="btns"><button class="primary" data-act="ld-club">${esc(L.endGo)}</button></div>`:landingJoin(L,'ld-code')}
      <div class="btns ld-alt"><button data-act="ld-timer">${esc(L.try)}</button><a class="btn ghost" href="#ld-feats" data-act="ld-tour">${esc(L.tour)} ↓</a></div></div>
    ${landingDemo(L)}
  </div>
  <div class="ld-block" id="ld-feats"><h2>${esc(L.featTitle)}</h2>
    <div class="ld-feats">${sec.map(s=>`<button type="button" class="ld-feat" data-act="ld-sec" data-v="${s.id}"><span class="ld-ico">${navIcon(s.icon)}</span><b>${esc(t(s.label))}</b><span>${esc(L.feats[s.id]||'')}</span></button>`).join('')}</div></div>
  <div class="ld-block"><h2>${esc(L.howTitle)}</h2>
    <ol class="ld-steps">${L.steps.map(([h,p],i)=>`<li><span class="ld-n">${i+1}</span><div><b>${esc(h)}</b><p>${esc(p)}</p></div></li>`).join('')}</ol></div>
  <div class="ld-block"><h2>${esc(L.whyTitle)}</h2>
    <div class="ld-why">${L.why.map(([h,p])=>`<div><b>${esc(h)}</b><p>${esc(p)}</p></div>`).join('')}</div></div>
  <div class="ld-block"><h2>${esc(L.faqTitle)}</h2>
    <div class="ld-faq">${L.faq.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></div>
  <div class="ld-end"><h2>${esc(L.endTitle)}</h2>${club?`<button class="primary" data-act="ld-club">${esc(L.endGo)}</button>`:landingJoin(L,'ld-code2')}</div>
  </section>`;
}

document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act^="ld-"]');if(!b)return;const a=b.dataset.act;
  if(a==='ld-timer'){setTab('timer');window.scrollTo({top:0});return}
  if(a==='ld-club'){setTab('club');window.scrollTo({top:0});return}
  if(a==='ld-tour'){ev.preventDefault();const f=document.getElementById('ld-feats');if(f)f.scrollIntoView({behavior:'smooth',block:'start'});return}
  if(a==='ld-sec'){const s=NAV_SECTIONS.find(x=>x.id===b.dataset.v);const first=s&&s.tabs.find(x=>typeof navVisible==='function'?navVisible(x):true);if(first){setTab(first);window.scrollTo({top:0})}return}
});
document.addEventListener('submit',ev=>{
  if(ev.target.dataset.form!=='ld-join')return;ev.preventDefault();
  const inp=ev.target.querySelector('input');const c=cleanClub(inp.value);if(c.length<3){toast(t('live.tooShort'));inp.focus();return}
  setQuery({club:c});tab='club';try{history.replaceState(null,'',location.pathname+location.search+'#club')}catch(e){}
  initShared().then(()=>{render();window.scrollTo({top:0})});
});
// The logo and the footer link open the landing page.
document.addEventListener('click',ev=>{
  if(ev.target.closest('[data-act="go-home"]')){ev.preventDefault();setTab('home');window.scrollTo({top:0});return}
  if(ev.target.closest('header .brand h1, header .brand .lights')){setTab('home');window.scrollTo({top:0})}});
