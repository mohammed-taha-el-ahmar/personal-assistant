// Orato – club statistics and Distinguished Club Program (DCP) progress. Premium feature "stats" (plan.js), officers only.
//
// Statistics are computed in the browser from what the club already keeps in Orato for the current program year
// (1 July – 30 June): archived meetings (history), the member list and renewals, the guest book, profiles, speech
// requests and mentoring pairs. Nothing new is collected.
//
// DCP: the ten goals of the Distinguished Club Program (Toastmasters item 1111, rev. 06/2024). Education awards, officer
// training and administration are recorded by Toastmasters International, so officers copy those numbers from Club
// Central or dashboards.toastmasters.org; Orato suggests the new-member count and the current membership from its
// member list. The official status is always the one on the Toastmasters dashboards.
// clubs/{club}/dcp/{year}  {l1,l2,l3,l45,newMembers,trained1,trained2,dues,officerList,base,members,updatedAt,updatedBy}
// Officers only.

const DCP={year:'',doc:null,unsub:null,draft:null,busy:false};
const DASHBOARDS='https://dashboards.toastmasters.org';
const DCP_INFO='https://www.toastmasters.org/Footer/FAQ/Distinguished%20Club%20Program';

function programYear(d=new Date()){const y=d.getFullYear(),m=d.getMonth()+1;const s=m>=7?y:y-1;return {id:`${s}-${s+1}`,start:`${s}-07-01`,end:`${s+1}-06-30`}}
const inYear=(iso,py)=>{const d=String(iso||'').slice(0,10);return d>=py.start&&d<=py.end};

function statsOfficerSubs(){
  if(DCP.unsub)DCP.unsub();
  const py=programYear();DCP.year=py.id;
  DCP.unsub=SH.fs.doc(`clubs/${SH.club}/dcp/${py.id}`).onSnapshot(s=>{DCP.doc=s.exists?s.data():null;softRender()},()=>{DCP.doc=null});
}
function statsStopOfficer(){if(DCP.unsub){DCP.unsub();DCP.unsub=null}DCP.doc=null;DCP.draft=null}

const STT={
en:{title:'Club statistics',intro:'The club’s activity this program year ({y}), computed from what the club keeps in Orato, and its progress toward the Distinguished Club Program.',
  premium:'Premium feature',
  k:{meetings:'Meetings archived',rolesPer:'Roles filled per meeting',speeches:'Speeches given',members:'Active members',newMembers:'New members',guests:'Guests',converted:'Guests who joined',mentored:'Members mentored',paid:'Dues paid ({p})'},
  speechesBy:'Speeches given by path and level',noSpeech:'No speech marked as given in Orato yet.',lv:'L{n}',total:'Total',
  partTitle:'Most active members',partNone:'Close your meetings in the officers’ page to build the history.',roles:'roles',
  monthly:'Meetings and guests by month',meetingsL:'Meetings',guestsL:'Guests',
  dcpTitle:'Distinguished Club Program',dcpIntro:'Enter the numbers shown in Club Central or on the Toastmasters dashboards: the official status is the one on the dashboards. Orato suggests what it can compute.',
  dashboards:'Toastmasters dashboards',faq:'DCP questions and answers',
  g:['Four Level 1 awards','Two Level 2 awards','Two more Level 2 awards','Two Level 3 awards','One Level 4, Level 5 or DTM award','One more Level 4, Level 5 or DTM award','Four new, dual or reinstating members','Four more new, dual or reinstating members','At least four officer roles trained in each training period','Dues paid on time with eight members (three renewing) and the officer list on time'],
  f:{l1:'Level 1 awards',l2:'Level 2 awards',l3:'Level 3 awards',l45:'Level 4, Level 5 and DTM awards',newMembers:'New, dual or reinstating members',trained1:'Officers trained, June–August',trained2:'Officers trained, November–February',dues:'Dues paid on time with eight members',officerList:'Officer list submitted on time',base:'Members on 1 July',members:'Members today'},
  suggest:'Orato: {n}',use:'Use',save:'Save',saved:'Saved',goals:'{n} of 10 goals',
  memberReq:'Membership: 20 members, or a net growth of 5',memberOk:'Met',memberNo:'Not yet',
  lvl:{none:'Not distinguished yet',d:'Distinguished',s:'Select Distinguished',p:'President’s Distinguished'},
  next:'Next level: {lvl}, {n} more goal(s)',reqNote:'A level also needs the membership requirement and the club in good standing on 30 June.'},
fr:{title:'Statistiques du club',intro:'L’activité du club pour l’année Toastmasters en cours ({y}), calculée à partir de ce que le club garde dans Orato, et sa progression dans le programme Club exemplaire (DCP).',
  premium:'Fonction premium',
  k:{meetings:'Réunions archivées',rolesPer:'Rôles pourvus par réunion',speeches:'Discours prononcés',members:'Membres actifs',newMembers:'Nouveaux membres',guests:'Invités',converted:'Invités devenus membres',mentored:'Membres accompagnés',paid:'Cotisations payées ({p})'},
  speechesBy:'Discours prononcés par parcours et niveau',noSpeech:'Aucun discours marqué comme prononcé dans Orato pour l’instant.',lv:'N{n}',total:'Total',
  partTitle:'Membres les plus actifs',partNone:'Clôturez vos réunions dans la page du bureau pour construire l’historique.',roles:'rôles',
  monthly:'Réunions et invités par mois',meetingsL:'Réunions',guestsL:'Invités',
  dcpTitle:'Programme Club exemplaire (DCP)',dcpIntro:'Saisissez les chiffres affichés dans Club Central ou sur les tableaux de bord Toastmasters : le statut officiel est celui des tableaux de bord. Orato propose ce qu’il peut calculer.',
  dashboards:'Tableaux de bord Toastmasters',faq:'Questions sur le DCP',
  g:['Quatre récompenses de niveau 1','Deux récompenses de niveau 2','Deux autres récompenses de niveau 2','Deux récompenses de niveau 3','Une récompense de niveau 4, niveau 5 ou DTM','Une autre récompense de niveau 4, niveau 5 ou DTM','Quatre membres nouveaux, doubles ou réintégrés','Quatre autres membres nouveaux, doubles ou réintégrés','Au moins quatre rôles d’officiers formés à chaque période de formation','Cotisations payées à temps avec huit membres (dont trois renouvelants) et liste des officiers à temps'],
  f:{l1:'Récompenses de niveau 1',l2:'Récompenses de niveau 2',l3:'Récompenses de niveau 3',l45:'Récompenses de niveau 4, niveau 5 et DTM',newMembers:'Membres nouveaux, doubles ou réintégrés',trained1:'Officiers formés, juin–août',trained2:'Officiers formés, novembre–février',dues:'Cotisations payées à temps avec huit membres',officerList:'Liste des officiers envoyée à temps',base:'Membres au 1er juillet',members:'Membres aujourd’hui'},
  suggest:'Orato : {n}',use:'Utiliser',save:'Enregistrer',saved:'Enregistré',goals:'{n} objectifs sur 10',
  memberReq:'Effectif : 20 membres, ou une croissance nette de 5',memberOk:'Atteint',memberNo:'Pas encore',
  lvl:{none:'Pas encore exemplaire',d:'Club exemplaire (Distinguished)',s:'Club exemplaire sélect (Select Distinguished)',p:'Club exemplaire du président (President’s Distinguished)'},
  next:'Niveau suivant : {lvl}, encore {n} objectif(s)',reqNote:'Chaque niveau demande aussi la condition d’effectif et un club en règle au 30 juin.'},
nl:{title:'Clubstatistieken',intro:'De activiteit van de club in het lopende Toastmasters-jaar ({y}), berekend uit wat de club in Orato bijhoudt, en de voortgang in het Distinguished Club Program.',
  premium:'Premiumfunctie',
  k:{meetings:'Gearchiveerde bijeenkomsten',rolesPer:'Vergeven rollen per bijeenkomst',speeches:'Gehouden speeches',members:'Actieve leden',newMembers:'Nieuwe leden',guests:'Gasten',converted:'Gasten die lid werden',mentored:'Begeleide leden',paid:'Contributie betaald ({p})'},
  speechesBy:'Gehouden speeches per pad en niveau',noSpeech:'Nog geen speech als gehouden gemarkeerd in Orato.',lv:'N{n}',total:'Totaal',
  partTitle:'Meest actieve leden',partNone:'Sluit je bijeenkomsten af op de bestuurspagina om de geschiedenis op te bouwen.',roles:'rollen',
  monthly:'Bijeenkomsten en gasten per maand',meetingsL:'Bijeenkomsten',guestsL:'Gasten',
  dcpTitle:'Distinguished Club Program',dcpIntro:'Vul de cijfers in uit Club Central of de Toastmasters-dashboards: de officiële status is die op de dashboards. Orato stelt voor wat het kan berekenen.',
  dashboards:'Toastmasters-dashboards',faq:'Vragen over het DCP',
  g:['Vier Level 1-awards','Twee Level 2-awards','Nog twee Level 2-awards','Twee Level 3-awards','Eén Level 4-, Level 5- of DTM-award','Nog één Level 4-, Level 5- of DTM-award','Vier nieuwe, dubbele of heringeschreven leden','Nog vier nieuwe, dubbele of heringeschreven leden','Minstens vier bestuursrollen getraind in elke trainingsperiode','Contributie op tijd betaald met acht leden (drie verlengend) en de bestuurslijst op tijd'],
  f:{l1:'Level 1-awards',l2:'Level 2-awards',l3:'Level 3-awards',l45:'Level 4-, Level 5- en DTM-awards',newMembers:'Nieuwe, dubbele of heringeschreven leden',trained1:'Getrainde bestuursleden, juni–augustus',trained2:'Getrainde bestuursleden, november–februari',dues:'Contributie op tijd betaald met acht leden',officerList:'Bestuurslijst op tijd ingediend',base:'Leden op 1 juli',members:'Leden vandaag'},
  suggest:'Orato: {n}',use:'Gebruiken',save:'Opslaan',saved:'Opgeslagen',goals:'{n} van 10 doelen',
  memberReq:'Ledental: 20 leden, of een nettogroei van 5',memberOk:'Gehaald',memberNo:'Nog niet',
  lvl:{none:'Nog niet distinguished',d:'Distinguished',s:'Select Distinguished',p:'President’s Distinguished'},
  next:'Volgend niveau: {lvl}, nog {n} doel(en)',reqNote:'Elk niveau vraagt ook het ledental en een club in orde op 30 juni.'},
ar:{title:'إحصاءات النادي',intro:'نشاط النادي في السنة الحالية لـToastmasters ({y})، محسوباً مما يحفظه النادي في Orato، وتقدّمه في برنامج النادي المتميّز (DCP).',
  premium:'ميزة مميّزة',
  k:{meetings:'الاجتماعات المؤرشفة',rolesPer:'الأدوار المشغولة لكل اجتماع',speeches:'الخطابات المُلقاة',members:'الأعضاء النشطون',newMembers:'الأعضاء الجدد',guests:'الضيوف',converted:'ضيوف أصبحوا أعضاء',mentored:'أعضاء مُرافَقون',paid:'الاشتراكات المدفوعة ({p})'},
  speechesBy:'الخطابات المُلقاة حسب المسار والمستوى',noSpeech:'لا يوجد خطاب محدّد كمُلقى في Orato بعد.',lv:'م{n}',total:'المجموع',
  partTitle:'الأعضاء الأكثر نشاطاً',partNone:'أغلق اجتماعاتك في صفحة مجلس الإدارة لبناء السجل.',roles:'أدوار',
  monthly:'الاجتماعات والضيوف حسب الشهر',meetingsL:'الاجتماعات',guestsL:'الضيوف',
  dcpTitle:'برنامج النادي المتميّز (DCP)',dcpIntro:'أدخل الأرقام الظاهرة في Club Central أو في لوحات Toastmasters: الحالة الرسمية هي ما تعرضه اللوحات. يقترح Orato ما يمكنه حسابه.',
  dashboards:'لوحات Toastmasters',faq:'أسئلة حول DCP',
  g:['أربع جوائز من المستوى 1','جائزتان من المستوى 2','جائزتان أخريان من المستوى 2','جائزتان من المستوى 3','جائزة من المستوى 4 أو 5 أو DTM','جائزة أخرى من المستوى 4 أو 5 أو DTM','أربعة أعضاء جدد أو مزدوجين أو عائدين','أربعة أعضاء آخرون جدد أو مزدوجون أو عائدون','تدريب أربعة أدوار على الأقل من مجلس الإدارة في كل فترة تدريب','دفع الاشتراكات في موعدها مع ثمانية أعضاء (ثلاثة مجدّدون) وقائمة المجلس في موعدها'],
  f:{l1:'جوائز المستوى 1',l2:'جوائز المستوى 2',l3:'جوائز المستوى 3',l45:'جوائز المستوى 4 و5 وDTM',newMembers:'أعضاء جدد أو مزدوجون أو عائدون',trained1:'أعضاء المجلس المدرَّبون، يونيو–أغسطس',trained2:'أعضاء المجلس المدرَّبون، نوفمبر–فبراير',dues:'الاشتراكات مدفوعة في موعدها مع ثمانية أعضاء',officerList:'قائمة المجلس مرسلة في موعدها',base:'الأعضاء في 1 يوليو',members:'الأعضاء اليوم'},
  suggest:'Orato: {n}',use:'استخدام',save:'حفظ',saved:'تم الحفظ',goals:'{n} من 10 أهداف',
  memberReq:'العضوية: 20 عضواً، أو نمو صافٍ بمقدار 5',memberOk:'محقّق',memberNo:'ليس بعد',
  lvl:{none:'ليس متميّزاً بعد',d:'متميّز (Distinguished)',s:'متميّز مختار (Select Distinguished)',p:'متميّز الرئيس (President’s Distinguished)'},
  next:'المستوى التالي: {lvl}، يتبقّى {n} هدف',reqNote:'يتطلّب كل مستوى أيضاً شرط العضوية وأن يكون النادي في وضع سليم في 30 يونيو.'}};
const STL=()=>STT[LANG]||STT.en;

// ---------- statistics ----------
function computeStats(){
  const py=programYear();
  const hist=(SH.history||[]).filter(m=>inYear(m.date,py));
  const rolesFilled=hist.map(m=>Object.values(m.roles||{}).filter(Boolean).length);
  const active=(MEM.list||[]).filter(m=>(m.status||'active')==='active');
  const newM=active.filter(m=>inYear(m.joined,py));
  const guests=(MEM.guests||[]).filter(g=>inYear(g.at,py));
  const converted=guests.filter(g=>g.status==='member');
  const given=(SP.list||[]).filter(s=>s.status==='done'&&inYear(s.date||s.decidedAt||s.at,py));
  const per=typeof curPeriod==='function'?curPeriod():'';
  const paid=per?active.filter(m=>renewalOf(m,per)==='paid').length:0;
  const mentored=new Set((MT.all||[]).filter(p=>p.status==='active').map(p=>p.mentee)).size;
  const months={};const mk=d=>String(d||'').slice(0,7);
  hist.forEach(m=>{const k=mk(m.date);(months[k]=months[k]||{m:0,g:0}).m++});
  guests.forEach(g=>{const k=mk(g.at);(months[k]=months[k]||{m:0,g:0}).g++});
  return {py,hist,rolesPer:rolesFilled.length?rolesFilled.reduce((a,b)=>a+b,0)/rolesFilled.length:0,active,newM,guests,converted,given,per,paid,mentored,months};
}
function kpi(label,value,sub){return `<div class="kpi"><span class="label">${esc(label)}</span><b>${esc(value)}</b>${sub?`<span class="muted">${esc(sub)}</span>`:''}</div>`}
function bar(n,max){const w=max?Math.round(n/max*100):0;return `<span class="sbar" aria-hidden="true"><span style="width:${w}%"></span></span>`}
function statsView(){
  const L=STL();const s=computeStats();
  const head=`<div class="phead"><div><h2>${esc(L.title)}</h2><p class="muted">${esc(L.intro.replace('{y}',s.py.id))}</p></div><span class="chip ok">${esc(L.premium)}</span></div>`;
  if(!SH.on||SH.officer!==true)return `<section class="panel">${head}${!SH.on?liveBox():`<div class="box"><p>${t('mem.officersOnly')}</p></div>`}</section>`;
  // speeches by path and level
  const byPath={};s.given.forEach(x=>{const k=x.path||'';(byPath[k]=byPath[k]||[0,0,0,0,0,0]);byPath[k][x.level>=1&&x.level<=5?x.level:0]++});
  const pathRows=Object.entries(byPath).map(([k,v])=>`<tr><td>${esc(k?(pathById(k)||{name:k}).name:SPL().noPath)}</td>${[1,2,3,4,5].map(n=>`<td class="num">${v[n]||''}</td>`).join('')}<td class="num"><b>${v.reduce((a,b)=>a+b,0)}</b></td></tr>`).join('');
  const P=participation().filter(p=>p.last&&inYear(p.last,s.py)).slice(0,10);const maxP=P.length?P[0].roles:0;
  const months=Object.keys(s.months).sort();const maxM=Math.max(1,...months.map(k=>Math.max(s.months[k].m,s.months[k].g)));
  const mLabel=k=>new Date(k+'-15T12:00').toLocaleDateString(locale(),{month:'short',year:'2-digit'});
  return `<section class="panel">${head}
  <div class="kpis">
    ${kpi(L.k.meetings,s.hist.length)}${kpi(L.k.rolesPer,s.rolesPer?s.rolesPer.toFixed(1):'–')}${kpi(L.k.speeches,s.given.length)}
    ${kpi(L.k.members,s.active.length)}${kpi(L.k.newMembers,s.newM.length)}${kpi(L.k.paid.replace('{p}',s.per?periodLabel(s.per):''),s.active.length?`${s.paid} / ${s.active.length}`:'–')}
    ${kpi(L.k.guests,s.guests.length)}${kpi(L.k.converted,s.converted.length,s.guests.length?Math.round(s.converted.length/s.guests.length*100)+' %':'')}${kpi(L.k.mentored,s.mentored)}
  </div>
  ${dcpBox(s)}
  <div class="box"><h3>${esc(L.speechesBy)}</h3>${pathRows?`<div class="tablewrap"><table><thead><tr><th>${esc(SPL().path)}</th>${[1,2,3,4,5].map(n=>`<th class="num">${esc(L.lv.replace('{n}',n))}</th>`).join('')}<th class="num">${esc(L.total)}</th></tr></thead><tbody>${pathRows}</tbody></table></div>`:`<p class="empty">${esc(L.noSpeech)}</p>`}</div>
  <div class="grid2">
    <div class="box"><h3>${esc(L.partTitle)}</h3>${P.length?`<ul class="sbars">${P.map(p=>`<li><span>${esc(p.name)}</span>${bar(p.roles,maxP)}<b>${p.roles}</b></li>`).join('')}</ul>`:`<p class="empty">${esc(L.partNone)}</p>`}</div>
    <div class="box"><h3>${esc(L.monthly)}</h3>${months.length?`<ul class="sbars">${months.map(k=>`<li><span>${esc(mLabel(k))}</span><span class="sbar2">${bar(s.months[k].m,maxM)}${bar(s.months[k].g,maxM).replace('sbar','sbar g')}</span><b>${s.months[k].m} · ${s.months[k].g}</b></li>`).join('')}</ul>
      <p class="muted" style="font-size:.85rem;margin:0"><span class="dotk"></span> ${esc(L.meetingsL)} · <span class="dotk g"></span> ${esc(L.guestsL)}</p>`:`<p class="empty">${esc(L.partNone)}</p>`}</div>
  </div></section>`;
}

// ---------- DCP ----------
const DCP_NUM=['l1','l2','l3','l45','newMembers','trained1','trained2','base','members'];
function dcpValues(){const d=Object.assign({},DCP.doc||{},DCP.draft||{});DCP_NUM.forEach(k=>d[k]=Math.max(0,Number(d[k])||0));d.dues=!!d.dues;d.officerList=!!d.officerList;return d}
function dcpGoals(d){return [d.l1>=4,d.l2>=2,d.l2>=4,d.l3>=2,d.l45>=1,d.l45>=2,d.newMembers>=4,d.newMembers>=8,d.trained1>=4&&d.trained2>=4,d.dues&&d.officerList]}
// The summary (goals reached, level, ten-square bar, goal list): repainted alone while officers type.
function dcpSummary(){
  const L=STL();const d=dcpValues();const goals=dcpGoals(d);const n=goals.filter(Boolean).length;
  const memberOk=d.members>=20||(d.base&&d.members-d.base>=5);
  const lvl=n>=9?'p':n>=7?'s':n>=5?'d':'none';const nxt=n<5?['d',5]:n<7?['s',7]:n<9?['p',9]:null;
  return `<div class="dcphead"><div><b class="dcpn">${esc(L.goals.replace('{n}',n))}</b><span class="chip ${lvl==='none'?'':memberOk?'ok':'warn'}">${esc(L.lvl[lvl])}${lvl!=='none'&&!memberOk?' *':''}</span>
      <span class="chip ${memberOk?'ok':'warn'}">${esc(L.memberReq)} · ${esc(memberOk?L.memberOk:L.memberNo)}</span></div>
      <div class="dcpmeter" role="img" aria-label="${esc(L.goals.replace('{n}',n))}">${goals.map((g,i)=>`<span class="${g?'on':''}" title="${i+1}. ${esc(L.g[i])}"></span>`).join('')}</div>
      ${nxt?`<p class="muted" style="margin:0">${esc(L.next.replace('{lvl}',L.lvl[nxt[0]]).replace('{n}',nxt[1]-n))}</p>`:''}</div>
    <ol class="dcpgoals">${L.g.map((g,i)=>`<li class="${goals[i]?'ok':''}"><span aria-hidden="true">${goals[i]?'✓':'○'}</span> ${esc(g)}</li>`).join('')}</ol>`;
}
function paintDcp(){const el=document.getElementById('dcp-sum');if(el)el.innerHTML=dcpSummary()}
function dcpBox(s){
  const L=STL();const d=dcpValues();
  const sug={newMembers:s.newM.length,members:s.active.length};
  const num=k=>`<div class="field dcpf"><label class="label" for="dcp-${k}">${esc(L.f[k])}</label><div class="btns" style="flex-wrap:nowrap"><input id="dcp-${k}" type="number" min="0" max="999" inputmode="numeric" data-dcp="${k}" value="${d[k]||0}">
    ${sug[k]!=null&&sug[k]!==d[k]?`<button type="button" class="small ghost" data-act="dcp-use" data-k="${k}" data-v="${sug[k]}" title="${esc(L.suggest.replace('{n}',sug[k]))}">${esc(L.use)} ${sug[k]}</button>`:''}</div></div>`;
  const chk=k=>`<label class="check" for="dcp-${k}"><input type="checkbox" id="dcp-${k}" data-dcp="${k}" ${d[k]?'checked':''}><span>${esc(L.f[k])}</span></label>`;
  return `<div class="box"><div class="phead"><div><h3>${esc(L.dcpTitle)} · ${esc(s.py.id)}</h3><p class="muted">${esc(L.dcpIntro)}</p></div>
      <div class="btns"><a class="btn small" href="${DASHBOARDS}" target="_blank" rel="noopener noreferrer">${esc(L.dashboards)} ↗</a><a class="btn small ghost" href="${DCP_INFO}" target="_blank" rel="noopener noreferrer">${esc(L.faq)} ↗</a></div></div>
    <div id="dcp-sum" aria-live="polite">${dcpSummary()}</div>
    <form data-form="dcp" novalidate><div class="dcpgrid">${['l1','l2','l3','l45','newMembers','trained1','trained2','base','members'].map(num).join('')}</div>
      <div class="btns">${chk('dues')}${chk('officerList')}</div>
      <div class="btns"><button type="submit" class="primary" ${DCP.busy?'disabled':''}>${esc(L.save)}</button></div></form>
    <p class="muted" style="font-size:.85rem;margin:0">${esc(L.reqNote)}</p></div>`;
}
function dcpInput(ev){const k=ev.target.dataset&&ev.target.dataset.dcp;if(!k)return;DCP.draft=DCP.draft||{};DCP.draft[k]=ev.target.type==='checkbox'?ev.target.checked:ev.target.value;paintDcp()}
document.addEventListener('input',dcpInput);document.addEventListener('change',dcpInput);
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-act="dcp-use"]');if(!b)return;const k=b.dataset.k;DCP.draft=DCP.draft||{};DCP.draft[k]=Number(b.dataset.v);
  const i=document.getElementById('dcp-'+k);if(i)i.value=b.dataset.v;b.remove();paintDcp()});
document.addEventListener('submit',ev=>{
  if(ev.target.dataset.form!=='dcp')return;ev.preventDefault();
  const d=dcpValues();const doc={updatedAt:new Date().toISOString(),updatedBy:SH.user.email,dues:d.dues,officerList:d.officerList};DCP_NUM.forEach(k=>doc[k]=Math.min(999,d[k]));
  DCP.busy=true;render();
  SH.fs.doc(`clubs/${SH.club}/dcp/${DCP.year||programYear().id}`).set(doc).then(()=>{DCP.draft=null;toast(STL().saved)}).catch(writeFail).finally(()=>{DCP.busy=false;render()});
});
