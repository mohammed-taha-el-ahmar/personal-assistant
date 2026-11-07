// Oratia – the Pathways education program: the six paths, their projects by level, and links to toastmasters.org.
// Project names are the official English names, copied from the path pages on toastmasters.org (November 2026);
// the short descriptions of each path are Oratia's own summary. When Toastmasters International changes a path,
// update PATHS here. Project content (objectives, evaluation forms) stays on Base Camp and is not copied.
//
// Anyone can browse the paths. A signed-in person can mark the path they follow (users/{uid}.path); speech requests
// (speeches.js) use the same list.

const PW_URL='https://www.toastmasters.org/pathways-overview/';
const PW_L1=['Ice Breaker','Writing a Speech with Purpose','Introduction to Vocal Variety and Body Language','Evaluation and Feedback'];
const PW_L3_EL=['Active Listening','Connect with Storytelling','Connect with Your Audience','Creating Effective Visual Aids','Deliver Social Speeches',
  'Effective Body Language','Focus on the Positive','Inspire Your Audience','Know Your Sense of Humor','Make Connections Through Networking',
  'Prepare for an Interview','Understanding Vocal Variety','Using Descriptive Language','Using Presentation Software','Researching and Presenting'];
const PW_L4_EL=['Building a Social Media Presence','Create a Podcast','Manage Online Meetings','Manage Projects Successfully','Managing a Difficult Audience',
  'Public Relations Strategies','Question-and-Answer Session','Write a Compelling Blog'];
const PW_L5_EL=['Ethical Leadership','High Performance Leadership','Leading in Your Volunteer Organization','Lessons Learned','Moderate a Panel Discussion','Prepare to Speak Professionally'];
const pwLevels=(l2,l3,l4,l5)=>[
  {req:PW_L1,el:[],pick:0},
  {req:l2,el:[],pick:0},
  {req:[l3],el:PW_L3_EL.filter(x=>!l2.includes(x)),pick:2},
  {req:[l4],el:PW_L4_EL.filter(x=>x!==l4),pick:1},
  {req:[l5,'Reflect on Your Path'],el:PW_L5_EL.filter(x=>x!==l5),pick:1}];
const PATHS=[
  {id:'dl',name:'Dynamic Leadership',slug:'pathways-dynamic-leadership-path',
    levels:pwLevels(['Understanding Your Leadership Style','Understanding Your Communication Style','Introduction to Toastmasters Mentoring'],'Negotiate the Best Outcome','Manage Change','Lead in Any Situation')},
  {id:'eh',name:'Engaging Humor',slug:'pathways-engaging-humor-path',
    levels:pwLevels(['Know Your Sense of Humor','Connect with Your Audience','Introduction to Toastmasters Mentoring'],'Engage Your Audience With Humor','The Power of Humor in an Impromptu Speech','Deliver Your Message With Humor')},
  {id:'ms',name:'Motivational Strategies',slug:'pathways-motivational-strategies-path',
    levels:pwLevels(['Understanding Your Communication Style','Active Listening','Introduction to Toastmasters Mentoring'],'Understanding Emotional Intelligence','Motivate Others','Team Building')},
  {id:'pi',name:'Persuasive Influence',slug:'pathways-persuasive-influence-path',
    levels:pwLevels(['Understanding Your Leadership Style','Active Listening','Introduction to Toastmasters Mentoring'],'Understanding Conflict Resolution','Leading in Difficult Situations','High Performance Leadership')},
  {id:'pm',name:'Presentation Mastery',slug:'pathways-presentation-mastery-path',
    levels:pwLevels(['Understanding Your Communication Style','Effective Body Language','Introduction to Toastmasters Mentoring'],'Persuasive Speaking','Managing a Difficult Audience','Prepare to Speak Professionally')},
  {id:'vc',name:'Visionary Communication',slug:'pathways-visionary-communication-path',
    levels:pwLevels(['Understanding Your Leadership Style','Understanding Your Communication Style','Introduction to Toastmasters Mentoring'],'Develop a Communication Plan','Communicate Change','Develop Your Vision')}
];
const pathById=id=>PATHS.find(p=>p.id===id)||null;
const pathProjects=(id,lv)=>{const p=pathById(id);if(!p)return [];const L=p.levels[lv-1];return L?[...L.req,...L.el]:[]};
// Timing suggested for a project (the speaker can change it): Ice Breaker 4–6 min, other speeches 5–7 min.
const projectPreset=pr=>pr==='Ice Breaker'?'ice':'std';

const PWT={
en:{title:'Pathways',intro:'The six paths of the Toastmasters education program, with their projects by level. Each path builds the same speaking foundations, then its own skills.',
  levels:['Mastering Fundamentals','Learning Your Style','Increasing Knowledge','Building Skills','Demonstrating Expertise'],level:'Level {n}',
  required:'Required',electives:'Electives: choose {n}',official:'Path page on toastmasters.org',choose:'This is my path',mine:'My path',unchoose:'Not my path',chosen:'Path saved in your profile',
  signInToChoose:'Sign in to “My profile” to mark the path you follow.',baseCamp:'Projects are done on Base Camp, the Toastmasters learning site. Oratia only lists them to help you plan your speeches.',
  overview:'Pathways overview on toastmasters.org',request:'Request a speech',
  d:{dl:'Leadership and communication styles, negotiation, managing change, and leading in any situation.',
     eh:'Your own sense of humor, connecting with an audience through it, and humorous speeches, impromptu ones included.',
     ms:'Understanding what motivates people, emotional intelligence, motivating others and building a team.',
     pi:'Leadership style, conflict resolution, difficult situations, and a self-designed high performance leadership project.',
     pm:'Speech writing and delivery, persuasive speaking, difficult audiences, and speaking as a professional.',
     vc:'Planning communication, communicating change, and developing and sharing a long-term vision.'}},
fr:{title:'Pathways',intro:'Les six parcours du programme de formation Toastmasters, avec leurs projets par niveau. Chaque parcours pose les mêmes bases de prise de parole, puis développe ses propres compétences.',
  levels:['Maîtriser les fondamentaux','Découvrir son style','Approfondir ses connaissances','Développer ses compétences','Démontrer son expertise'],level:'Niveau {n}',
  required:'Obligatoire',electives:'Au choix : {n} projet(s)',official:'Page du parcours sur toastmasters.org',choose:'C’est mon parcours',mine:'Mon parcours',unchoose:'Ce n’est pas mon parcours',chosen:'Parcours enregistré dans votre profil',
  signInToChoose:'Connectez-vous à « Mon profil » pour indiquer le parcours que vous suivez.',baseCamp:'Les projets se font sur Base Camp, le site de formation Toastmasters. Oratia les liste seulement pour vous aider à planifier vos discours.',
  overview:'Présentation de Pathways sur toastmasters.org',request:'Demander un discours',
  d:{dl:'Styles de leadership et de communication, négociation, conduite du changement, et diriger en toute situation.',
     eh:'Votre propre sens de l’humour, s’en servir pour toucher le public, et discours humoristiques, y compris improvisés.',
     ms:'Comprendre ce qui motive les gens, intelligence émotionnelle, motiver les autres et construire une équipe.',
     pi:'Style de leadership, résolution des conflits, situations difficiles, et un projet de leadership de haute performance conçu par vous.',
     pm:'Écriture et présentation de discours, discours persuasif, publics difficiles, et parler en professionnel.',
     vc:'Planifier sa communication, communiquer le changement, et construire puis partager une vision à long terme.'}},
nl:{title:'Pathways',intro:'De zes paden van het opleidingsprogramma van Toastmasters, met hun projecten per niveau. Elk pad legt dezelfde basis voor spreken en bouwt dan eigen vaardigheden op.',
  levels:['De basis beheersen','Je stijl leren kennen','Kennis verdiepen','Vaardigheden opbouwen','Expertise tonen'],level:'Niveau {n}',
  required:'Verplicht',electives:'Keuzeprojecten: kies er {n}',official:'Padpagina op toastmasters.org',choose:'Dit is mijn pad',mine:'Mijn pad',unchoose:'Niet mijn pad',chosen:'Pad opgeslagen in je profiel',
  signInToChoose:'Log in bij “Mijn profiel” om aan te geven welk pad je volgt.',baseCamp:'De projecten doe je op Base Camp, de leersite van Toastmasters. Oratia toont ze alleen om je speeches te plannen.',
  overview:'Overzicht van Pathways op toastmasters.org',request:'Een speech aanvragen',
  d:{dl:'Leiderschaps- en communicatiestijlen, onderhandelen, verandering managen en leidinggeven in elke situatie.',
     eh:'Je eigen gevoel voor humor, daarmee je publiek bereiken, en humoristische speeches, ook geïmproviseerde.',
     ms:'Begrijpen wat mensen motiveert, emotionele intelligentie, anderen motiveren en een team bouwen.',
     pi:'Leiderschapsstijl, conflicten oplossen, moeilijke situaties, en een zelf ontworpen high performance leadership-project.',
     pm:'Speeches schrijven en brengen, overtuigend spreken, moeilijk publiek, en spreken als professional.',
     vc:'Communicatie plannen, verandering communiceren, en een visie voor de lange termijn ontwikkelen en delen.'}},
ar:{title:'Pathways',intro:'المسارات الستة لبرنامج Toastmasters التعليمي، مع مشاريعها حسب المستوى. يبني كل مسار أسس الخطابة نفسها، ثم مهاراته الخاصة.',
  levels:['إتقان الأساسيات','التعرّف على أسلوبك','تعميق المعرفة','بناء المهارات','إثبات الخبرة'],level:'المستوى {n}',
  required:'إلزامي',electives:'اختياري: اختر {n}',official:'صفحة المسار على toastmasters.org',choose:'هذا مساري',mine:'مساري',unchoose:'ليس مساري',chosen:'تم حفظ المسار في ملفك',
  signInToChoose:'سجّل الدخول إلى «ملفي» لتحديد المسار الذي تتبعه.',baseCamp:'تُنجز المشاريع على Base Camp، موقع التعلّم في Toastmasters. يعرضها Oratia فقط لمساعدتك على تخطيط خطاباتك.',
  overview:'نظرة عامة على Pathways في toastmasters.org',request:'طلب خطاب',
  d:{dl:'أساليب القيادة والتواصل، والتفاوض، وإدارة التغيير، والقيادة في كل الظروف.',
     eh:'حسّ الدعابة لديك، والتواصل مع الجمهور من خلاله، والخطابات الفكاهية بما فيها المرتجلة.',
     ms:'فهم ما يحفّز الناس، والذكاء العاطفي، وتحفيز الآخرين، وبناء الفريق.',
     pi:'أسلوب القيادة، وحلّ النزاعات، والمواقف الصعبة، ومشروع قيادة عالية الأداء من تصميمك.',
     pm:'كتابة الخطاب وإلقاؤه، والخطاب الإقناعي، والجماهير الصعبة، والتحدث كمحترف.',
     vc:'تخطيط التواصل، والتواصل بشأن التغيير، وبناء رؤية طويلة الأمد ومشاركتها.'}}};
const PWL=()=>PWT[LANG]||PWT.en;
const PWV={open:null};

function myPathId(){const u=typeof myProfile==='function'&&myProfile();return u&&u.path||''}
function pathwaysView(){
  const L=PWL();const mine=myPathId();const signed=typeof myProfile==='function'&&!!myProfile();
  const a=(href,label)=>`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
  return `<section class="panel">
  <div class="phead"><div><h2>${esc(L.title)}</h2><p class="muted">${esc(L.intro)}</p></div><div class="btns"><a class="btn small" href="${esc(PW_URL)}" target="_blank" rel="noopener noreferrer">${esc(L.overview)} ↗</a></div></div>
  <div class="notice"><span>${esc(L.baseCamp)}</span>${isOn('speeches')?`<button class="small" data-act="go-speeches">${esc(L.request)}</button>`:''}</div>
  ${signed?'':`<p class="muted" style="margin:0">${esc(L.signInToChoose)}</p>`}
  ${PATHS.map(p=>`<details class="guide path" ${PWV.open===p.id||(!PWV.open&&mine===p.id)?'open':''} data-path="${p.id}"><summary><h3><bdi>${esc(p.name)}</bdi>${mine===p.id?` <span class="chip ok">${esc(L.mine)}</span>`:''}</h3><span class="muted">${esc(L.d[p.id])}</span></summary>
    <div class="pathbody">
      <div class="btns">${a(PW_URL+p.slug,L.official)}${signed?(mine===p.id?`<button class="small ghost" data-act="pw-choose" data-v="">${esc(L.unchoose)}</button>`:`<button class="small" data-act="pw-choose" data-v="${p.id}">${esc(L.choose)}</button>`):''}</div>
      <ol class="levels">${p.levels.map((lv,i)=>`<li><b>${esc(L.level.replace('{n}',i+1))} · ${esc(L.levels[i])}</b>
        <div><span class="label">${esc(L.required)}</span><ul>${lv.req.map(x=>`<li><bdi>${esc(x)}</bdi></li>`).join('')}</ul></div>
        ${lv.el.length?`<details class="els"><summary class="muted">${esc(L.electives.replace('{n}',lv.pick))}</summary><ul>${lv.el.map(x=>`<li><bdi>${esc(x)}</bdi></li>`).join('')}</ul></details>`:''}</li>`).join('')}</ol>
    </div></details>`).join('')}
  </section>`;
}
document.addEventListener('toggle',ev=>{const d=ev.target;if(d.matches&&d.matches('details.path')&&d.open)PWV.open=d.dataset.path},true);
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act="pw-choose"],[data-act="go-speeches"],[data-act="go-pathways"]');if(!b)return;
  if(b.dataset.act==='go-speeches'){setTab('speeches');return}
  if(b.dataset.act==='go-pathways'){setTab('pathways');return}
  const v=b.dataset.v;PWV.open=v||PWV.open;
  SH.fs.doc(`users/${SH.uid}`).update({path:v,updatedAt:new Date().toISOString()}).then(()=>{if(v)toast(PWL().chosen)}).catch(writeFail);
});
