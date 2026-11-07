// Orato – Contests pro: judges vote on their phones, with secret counting. Premium feature "contestsPro" (plan.js).
// Works for a club contest or for an area, division or district contest hosted in a club space (contestants from any club).
//
// The chief judge (an officer of the hosting club space) creates the contest and gets two codes: one for the voting
// judges, one for the tiebreaking judge. Judges open the judging link (or type the code) on their phone; nobody sees
// who the other judges are. Each voting judge ranks their first, second and third place; the tiebreaking judge ranks
// every contestant. Counting: 3 points for a first place, 2 for a second, 1 for a third; equal totals are separated by
// the tiebreaking judge's ranking. The chief judge can disqualify a contestant before publishing the results; winners
// and participants get certificates (PDF). Always check the current Speech Contest Rulebook: it is the reference.
//
// clubs/{club}/contests/{id}            {title,type,date,level,contestants:[{id,name,club}],dq:[],status,results,…}
//                                        everyone with the club link reads it (results appear once published)
// clubs/{club}/contests/{id}/keys/codes {judge,tie}            officers only
// clubs/{club}/contests/{id}/judges/{uid} {code,tie,at}         created by the judge with the right code
// clubs/{club}/contests/{id}/ballots/{uid} {rank:[ids],tie,at}  written by that judge while voting; read by officers only

const CP={list:[],unsub:null,keys:{},mine:{},ballots:{},judges:{},subs:{},draft:null,busy:false,code:'',sel:{},open:null,triedUrl:false};
const CP_LEVELS=['club','area','division','district'];
const CP_STEPS=['setup','voting','closed','published'];

function cproLive(){
  if(CP.unsub)CP.unsub();
  CP.unsub=SH.fs.collection(`clubs/${SH.club}/contests`).onSnapshot(q=>{
    CP.list=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    cproMineSubs();if(SH.officer===true)cproOfficerSubs();softRender();cproTryUrl();
  },()=>{CP.list=[]});
}
// My judge status (and my ballot) in each open contest.
function cproMineSubs(){
  CP.list.filter(c=>['setup','voting'].includes(c.status)).forEach(c=>{
    const k='m'+c.id;if(CP.subs[k]||!SH.uid)return;
    const a=SH.fs.doc(`clubs/${SH.club}/contests/${c.id}/judges/${SH.uid}`).onSnapshot(s=>{CP.mine[c.id]=s.exists?s.data():null;softRender()},()=>{CP.mine[c.id]=null});
    const b=SH.fs.doc(`clubs/${SH.club}/contests/${c.id}/ballots/${SH.uid}`).onSnapshot(s=>{CP.mine[c.id+':b']=s.exists?s.data():null;softRender()},()=>{});
    CP.subs[k]=()=>{a();b()};
  });
}
function cproOfficerSubs(){
  CP.list.forEach(c=>{
    const k='o'+c.id;if(CP.subs[k])return;
    const a=SH.fs.doc(`clubs/${SH.club}/contests/${c.id}/keys/codes`).onSnapshot(s=>{CP.keys[c.id]=s.exists?s.data():null;softRender()},()=>{});
    const b=SH.fs.collection(`clubs/${SH.club}/contests/${c.id}/ballots`).onSnapshot(q=>{CP.ballots[c.id]=q.docs.map(d=>({id:d.id,...d.data()}));softRender()},()=>{});
    const j=SH.fs.collection(`clubs/${SH.club}/contests/${c.id}/judges`).onSnapshot(q=>{CP.judges[c.id]=q.docs.map(d=>({id:d.id,...d.data()}));softRender()},()=>{});
    CP.subs[k]=()=>{a();b();j()};
  });
}
function cproAuthChanged(){Object.keys(CP.subs).forEach(k=>{CP.subs[k]();delete CP.subs[k]});CP.mine={};if(SH.club&&CP.unsub){cproMineSubs();if(SH.officer===true)cproOfficerSubs()}}

const CPT={
en:{title:'Judging',intro:'Judges vote on their phones and the counting stays secret. For a club contest, or an area, division or district contest hosted in this club space.',
  rule:'Orato counts 3 points for each first place, 2 for a second and 1 for a third; equal totals are separated by the tiebreaking judge. The Speech Contest Rulebook is the reference.',
  newTitle:'New contest',ctitle:'Contest name',type:'Contest',date:'Date',level:'Level',lv:{club:'Club',area:'Area',division:'Division',district:'District'},
  contestants:'Contestants, in speaking order (one per line; add “ – club” for other clubs)',create:'Create the contest',needC:'Enter a name and at least two contestants',
  st:{setup:'Preparing',voting:'Voting open',closed:'Voting closed',published:'Results published'},
  codes:'Judge codes',judgeCode:'Voting judges',tieCode:'Tiebreaking judge',showQr:'QR code',copyLink:'Copy the link',qrJudge:'Judges: scan to vote',qrText:'Then type the code given by the chief judge.',
  open:'Open the voting',close:'Close the voting',reopen:'Reopen the voting',publish:'Publish the results',unpublish:'Hide the results',del:'Delete the contest',delAsk:'Delete this contest and its ballots?',
  received:'{j} judge(s) joined · {b} ballot(s) received',tieIn:'Tiebreaking ballot received',tieMissing:'No tiebreaking ballot yet',
  tally:'Count',points:'Points',place:'Place',dq:'Disqualified',first:'1st',second:'2nd',third:'3rd',tieRank:'Tiebreak',
  results:'Results',certs:'Certificates (PDF)',noResults:'No result published yet.',
  judgeTitle:'I am a judge',judgeIntro:'Type the code the chief judge gave you.',judgeGo:'Join',judgeBad:'This code does not open any contest.',judgeOk:'You are a judge for this contest.',
  ballot:'My ballot',ballotTie:'My tiebreaking ballot: rank every contestant',rank:'{n}',choose:'Choose…',send:'Save my ballot',sent:'Ballot saved. You can change it until the voting closes.',dup:'Choose different contestants',
  waiting:'The voting is not open yet.',closedJ:'The voting is closed. Thank you!',yourBallot:'Your ballot is saved.',
  places:['1st place','2nd place','3rd place'],certTitle:'Certificate',certPart:'Certificate of participation',awarded:'awarded to',forPart:'for taking part in',none:'No contest yet.'},
fr:{title:'Vote des juges',intro:'Les juges votent sur leur téléphone et le dépouillement reste secret. Pour un concours de club, ou un concours de secteur, de division ou de district organisé dans cet espace.',
  rule:'Orato compte 3 points pour chaque première place, 2 pour une deuxième et 1 pour une troisième ; les égalités sont départagées par le juge de départage. Le règlement des concours fait foi.',
  newTitle:'Nouveau concours',ctitle:'Nom du concours',type:'Concours',date:'Date',level:'Niveau',lv:{club:'Club',area:'Secteur',division:'Division',district:'District'},
  contestants:'Candidats, dans l’ordre de passage (un par ligne ; ajoutez « – club » pour les autres clubs)',create:'Créer le concours',needC:'Indiquez un nom et au moins deux candidats',
  st:{setup:'En préparation',voting:'Vote ouvert',closed:'Vote clos',published:'Résultats publiés'},
  codes:'Codes des juges',judgeCode:'Juges votants',tieCode:'Juge de départage',showQr:'QR code',copyLink:'Copier le lien',qrJudge:'Juges : scannez pour voter',qrText:'Puis saisissez le code donné par le juge en chef.',
  open:'Ouvrir le vote',close:'Clore le vote',reopen:'Rouvrir le vote',publish:'Publier les résultats',unpublish:'Masquer les résultats',del:'Supprimer le concours',delAsk:'Supprimer ce concours et ses bulletins ?',
  received:'{j} juge(s) connecté(s) · {b} bulletin(s) reçu(s)',tieIn:'Bulletin de départage reçu',tieMissing:'Pas encore de bulletin de départage',
  tally:'Dépouillement',points:'Points',place:'Place',dq:'Disqualifié',first:'1er',second:'2e',third:'3e',tieRank:'Départage',
  results:'Résultats',certs:'Certificats (PDF)',noResults:'Aucun résultat publié pour l’instant.',
  judgeTitle:'Je suis juge',judgeIntro:'Saisissez le code que le juge en chef vous a donné.',judgeGo:'Rejoindre',judgeBad:'Ce code n’ouvre aucun concours.',judgeOk:'Vous êtes juge pour ce concours.',
  ballot:'Mon bulletin',ballotTie:'Mon bulletin de départage : classez tous les candidats',rank:'{n}',choose:'Choisir…',send:'Enregistrer mon bulletin',sent:'Bulletin enregistré. Vous pouvez le modifier jusqu’à la clôture.',dup:'Choisissez des candidats différents',
  waiting:'Le vote n’est pas encore ouvert.',closedJ:'Le vote est clos. Merci !',yourBallot:'Votre bulletin est enregistré.',
  places:['1re place','2e place','3e place'],certTitle:'Certificat',certPart:'Certificat de participation',awarded:'décerné à',forPart:'pour sa participation au',none:'Aucun concours pour l’instant.'},
nl:{title:'Jurering',intro:'Juryleden stemmen op hun telefoon en de telling blijft geheim. Voor een clubwedstrijd, of een area-, divisie- of districtswedstrijd in deze clubruimte.',
  rule:'Orato telt 3 punten voor elke eerste plaats, 2 voor een tweede en 1 voor een derde; gelijke totalen worden beslist door het tiebreak-jurylid. Het Speech Contest Rulebook is de referentie.',
  newTitle:'Nieuwe wedstrijd',ctitle:'Naam van de wedstrijd',type:'Wedstrijd',date:'Datum',level:'Niveau',lv:{club:'Club',area:'Area',division:'Divisie',district:'District'},
  contestants:'Deelnemers, in sprekersvolgorde (één per regel; voeg “ – club” toe voor andere clubs)',create:'Wedstrijd aanmaken',needC:'Vul een naam en minstens twee deelnemers in',
  st:{setup:'Voorbereiding',voting:'Stemmen open',closed:'Stemmen gesloten',published:'Uitslag gepubliceerd'},
  codes:'Codes voor de jury',judgeCode:'Stemmende juryleden',tieCode:'Tiebreak-jurylid',showQr:'QR-code',copyLink:'Link kopiëren',qrJudge:'Jury: scan om te stemmen',qrText:'Typ daarna de code van het hoofdjurylid.',
  open:'Stemmen openen',close:'Stemmen sluiten',reopen:'Stemmen heropenen',publish:'Uitslag publiceren',unpublish:'Uitslag verbergen',del:'Wedstrijd verwijderen',delAsk:'Deze wedstrijd en de stembiljetten verwijderen?',
  received:'{j} jurylid/leden verbonden · {b} stembiljet(ten) ontvangen',tieIn:'Tiebreak-stembiljet ontvangen',tieMissing:'Nog geen tiebreak-stembiljet',
  tally:'Telling',points:'Punten',place:'Plaats',dq:'Gediskwalificeerd',first:'1e',second:'2e',third:'3e',tieRank:'Tiebreak',
  results:'Uitslag',certs:'Certificaten (PDF)',noResults:'Nog geen uitslag gepubliceerd.',
  judgeTitle:'Ik ben jurylid',judgeIntro:'Typ de code die het hoofdjurylid je gaf.',judgeGo:'Deelnemen',judgeBad:'Deze code opent geen wedstrijd.',judgeOk:'Je bent jurylid voor deze wedstrijd.',
  ballot:'Mijn stembiljet',ballotTie:'Mijn tiebreak-stembiljet: rangschik alle deelnemers',rank:'{n}',choose:'Kiezen…',send:'Mijn stembiljet opslaan',sent:'Stembiljet opgeslagen. Je kunt het wijzigen tot het stemmen sluit.',dup:'Kies verschillende deelnemers',
  waiting:'Het stemmen is nog niet open.',closedJ:'Het stemmen is gesloten. Bedankt!',yourBallot:'Je stembiljet is opgeslagen.',
  places:['1e plaats','2e plaats','3e plaats'],certTitle:'Certificaat',certPart:'Certificaat van deelname',awarded:'uitgereikt aan',forPart:'voor de deelname aan',none:'Nog geen wedstrijden.'},
ar:{title:'تصويت الحكّام',intro:'يصوّت الحكّام على هواتفهم ويبقى الفرز سرّياً. لمسابقة نادٍ، أو لمسابقة منطقة أو قسم أو مقاطعة تُنظَّم في مساحة هذا النادي.',
  rule:'يحتسب Orato ثلاث نقاط لكل مركز أول، ونقطتين للثاني، ونقطة للثالث؛ ويفصل حَكَم الترجيح في حالات التعادل. دليل المسابقات هو المرجع.',
  newTitle:'مسابقة جديدة',ctitle:'اسم المسابقة',type:'المسابقة',date:'التاريخ',level:'المستوى',lv:{club:'النادي',area:'المنطقة',division:'القسم',district:'المقاطعة'},
  contestants:'المتسابقون بترتيب الإلقاء (واحد في كل سطر؛ أضف « – النادي» للأندية الأخرى)',create:'إنشاء المسابقة',needC:'أدخل اسماً ومتسابقَين على الأقل',
  st:{setup:'قيد التحضير',voting:'التصويت مفتوح',closed:'التصويت مغلق',published:'النتائج منشورة'},
  codes:'رموز الحكّام',judgeCode:'الحكّام المصوّتون',tieCode:'حَكَم الترجيح',showQr:'رمز QR',copyLink:'نسخ الرابط',qrJudge:'الحكّام: امسحوا للتصويت',qrText:'ثم أدخلوا الرمز الذي أعطاه رئيس الحكّام.',
  open:'فتح التصويت',close:'إغلاق التصويت',reopen:'إعادة فتح التصويت',publish:'نشر النتائج',unpublish:'إخفاء النتائج',del:'حذف المسابقة',delAsk:'حذف هذه المسابقة وأوراق التصويت؟',
  received:'{j} حَكَم متصل · {b} ورقة مستلمة',tieIn:'تم استلام ورقة الترجيح',tieMissing:'لم تصل ورقة الترجيح بعد',
  tally:'الفرز',points:'النقاط',place:'المركز',dq:'مستبعد',first:'الأول',second:'الثاني',third:'الثالث',tieRank:'الترجيح',
  results:'النتائج',certs:'الشهادات (PDF)',noResults:'لم تُنشر نتائج بعد.',
  judgeTitle:'أنا حَكَم',judgeIntro:'أدخل الرمز الذي أعطاك إياه رئيس الحكّام.',judgeGo:'انضمام',judgeBad:'هذا الرمز لا يفتح أي مسابقة.',judgeOk:'أنت حَكَم في هذه المسابقة.',
  ballot:'ورقتي',ballotTie:'ورقة الترجيح: رتّب كل المتسابقين',rank:'{n}',choose:'اختر…',send:'حفظ ورقتي',sent:'تم حفظ الورقة. يمكنك تعديلها حتى إغلاق التصويت.',dup:'اختر متسابقين مختلفين',
  waiting:'لم يُفتح التصويت بعد.',closedJ:'أُغلق التصويت. شكراً!',yourBallot:'ورقتك محفوظة.',
  places:['المركز الأول','المركز الثاني','المركز الثالث'],certTitle:'شهادة',certPart:'شهادة مشاركة',awarded:'تُمنح إلى',forPart:'لمشاركته في',none:'لا توجد مسابقات بعد.'}};
const CPL=()=>CPT[LANG]||CPT.en;

// ---------- counting ----------
function cproTally(c){
  const ballots=CP.ballots[c.id]||[];const dq=c.dq||[];
  const rows=(c.contestants||[]).map(x=>({...x,p:[0,0,0],pts:0,tie:999,dq:dq.includes(x.id)}));
  const tie=ballots.find(b=>b.tie);
  ballots.filter(b=>!b.tie).forEach(b=>(b.rank||[]).slice(0,3).forEach((id,i)=>{const r=rows.find(x=>x.id===id);if(r){r.p[i]++;r.pts+=3-i}}));
  if(tie)(tie.rank||[]).forEach((id,i)=>{const r=rows.find(x=>x.id===id);if(r)r.tie=i});
  const ranked=rows.filter(r=>!r.dq).sort((a,b)=>b.pts-a.pts||a.tie-b.tie);
  ranked.forEach((r,i)=>r.place=i+1);
  return {rows:[...ranked,...rows.filter(r=>r.dq)],tie,count:ballots.filter(b=>!b.tie).length};
}

// ---------- views ----------
const cproLink=()=>{const u=new URL(shareLink());u.hash='cpro';return u.toString()};
const cpType=c=>{const L=CTL();return L.types[c.type]||c.type};
function contestHead(c){
  const L=CPL();const i=CP_STEPS.indexOf(c.status);
  return `<div class="phead"><div><h3>${esc(c.title)}</h3><p class="muted" style="margin:0">${esc(cpType(c))} · ${esc(L.lv[c.level]||'')} · ${esc(c.date?fmtDate(c.date):'')}</p></div>
    <span class="chip ${c.status==='voting'?'warn':c.status==='published'?'ok':''}">${esc(L.st[c.status]||c.status)}</span></div>
    <ol class="steps">${CP_STEPS.map((s,j)=>`<li class="${j<i?'done':j===i?'cur':''}">${esc(L.st[s])}</li>`).join('')}</ol>`;
}
function officerContest(c){
  const L=CPL();const k=CP.keys[c.id];const T=cproTally(c);const judges=CP.judges[c.id]||[];
  const tieJ=judges.some(j=>j.tie);
  const act=(a,label,cls='')=>`<button class="small ${cls}" data-act="${a}" data-id="${esc(c.id)}" ${CP.busy?'disabled':''}>${esc(label)}</button>`;
  const codes=['setup','voting'].includes(c.status)&&k?`<div class="kv"><div><span class="label">${esc(L.judgeCode)}</span><b class="codebig">${esc(k.judge)}</b></div><div><span class="label">${esc(L.tieCode)}</span><b class="codebig">${esc(k.tie)}</b></div></div>
    <div class="btns">${act('cp-qr',L.showQr)}${act('cp-copy',L.copyLink,'ghost')}</div>`:'';
  const tallyTable=['closed','published'].includes(c.status)?`<div class="tablewrap"><table><thead><tr><th>${esc(L.place)}</th><th></th><th class="num">${esc(L.first)}</th><th class="num">${esc(L.second)}</th><th class="num">${esc(L.third)}</th><th class="num">${esc(L.points)}</th><th class="num">${esc(L.tieRank)}</th><th>${esc(L.dq)}</th></tr></thead><tbody>
    ${T.rows.map(r=>`<tr class="${r.dq?'dqrow':''}"><td>${r.dq?'–':r.place}</td><td><bdi>${esc(r.name)}</bdi>${r.club?` <span class="muted">· ${esc(r.club)}</span>`:''}</td>${r.p.map(n=>`<td class="num">${n||''}</td>`).join('')}<td class="num"><b>${r.pts}</b></td><td class="num">${r.tie<999?r.tie+1:''}</td>
      <td><input type="checkbox" data-cpdq="${esc(c.id)}" data-v="${esc(r.id)}" ${r.dq?'checked':''} ${c.status==='published'?'disabled':''} aria-label="${esc(L.dq+' – '+r.name)}"></td></tr>`).join('')}</tbody></table></div>`:'';
  return `<div class="box cpbox">${contestHead(c)}
    <p class="muted" style="margin:0">${esc(L.received.replace('{j}',judges.length).replace('{b}',T.count))} · ${esc(T.tie?L.tieIn:L.tieMissing)}${tieJ?'':''}</p>
    ${codes}${tallyTable}
    <div class="btns">${c.status==='setup'?act('cp-status',L.open,'primary').replace('data-act','data-v="voting" data-act'):''}
      ${c.status==='voting'?act('cp-status',L.close,'primary').replace('data-act','data-v="closed" data-act'):''}
      ${c.status==='closed'?act('cp-publish',L.publish,'primary')+act('cp-status',L.reopen,'ghost').replace('data-act','data-v="voting" data-act'):''}
      ${c.status==='published'?act('cp-certs',L.certs,'primary')+act('cp-status',L.unpublish,'ghost').replace('data-act','data-v="closed" data-act'):''}
      ${CP.open===c.id?`<span class="muted" style="align-self:center">${esc(L.delAsk)}</span>${act('cp-del',L.del,'danger')}<button class="small ghost" data-act="cp-del-cancel">${esc(t('common.cancel'))}</button>`:act('cp-del-ask',L.del,'ghost')}</div></div>`;
}
function judgeBallot(c){
  const L=CPL();const me=CP.mine[c.id];if(!me)return '';
  const mine=CP.mine[c.id+':b'];const n=me.tie?(c.contestants||[]).length:Math.min(3,(c.contestants||[]).length);
  const sel=CP.sel[c.id]||(CP.sel[c.id]=(mine&&mine.rank)||[]);
  if(c.status==='setup')return `<div class="box">${contestHead(c)}<p>${esc(L.judgeOk)}</p><p class="muted">${esc(L.waiting)}</p></div>`;
  if(c.status!=='voting')return `<div class="box">${contestHead(c)}<p>${esc(L.closedJ)}</p></div>`;
  return `<form class="box" data-form="cp-ballot" data-id="${esc(c.id)}" novalidate>${contestHead(c)}
    <h3>${esc(me.tie?L.ballotTie:L.ballot)}</h3>${mine?`<p class="chip ok" style="align-self:flex-start">${esc(L.yourBallot)}</p>`:''}
    ${Array.from({length:n},(_,i)=>`<div class="field"><label class="label" for="cp-r${i}">${esc(i<3?L.places[i]:(i+1)+'.')}</label><select id="cp-r${i}" data-cprank="${esc(c.id)}" data-i="${i}"><option value="">${esc(L.choose)}</option>${(c.contestants||[]).map(x=>`<option value="${esc(x.id)}" ${sel[i]===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div>`).join('')}
    <div class="btns"><button type="submit" class="primary" ${CP.busy?'disabled':''}>${esc(L.send)}</button></div></form>`;
}
function cproView(){
  const L=CPL();const head=`<div class="phead"><div><h2>${esc(L.title)}</h2><p class="muted">${esc(L.intro)}</p></div><span class="chip ok">${esc(STL().premium)}</span></div>`;
  if(!SH.on)return `<section class="panel">${head}${liveBox()}</section>`;
  const off=SH.officer===true;
  const myJudging=CP.list.filter(c=>CP.mine[c.id]);
  const published=CP.list.filter(c=>c.status==='published'&&Array.isArray(c.results));
  const d=CP.draft||(CP.draft={title:'',type:'intl',date:todayISO(),level:'club',list:''});
  return `<section class="panel">${head}<div class="notice"><span>${esc(L.rule)}</span></div>
    ${myJudging.map(judgeBallot).join('')}
    ${!off||!myJudging.length?`<form class="box" data-form="cp-join" novalidate><h3>${esc(L.judgeTitle)}</h3><p class="muted">${esc(L.judgeIntro)}</p>
      <div class="btns" style="flex-wrap:nowrap"><input id="cp-code" maxlength="12" autocomplete="off" autocapitalize="characters" value="${esc(CP.code)}" aria-label="${esc(L.judgeTitle)}" style="max-width:200px;text-transform:uppercase"><button type="submit" class="primary" ${CP.busy?'disabled':''}>${esc(L.judgeGo)}</button></div></form>`:''}
    ${off?CP.list.map(officerContest).join('')+`<form class="box" data-form="cp-new" novalidate><h3>${esc(L.newTitle)}</h3><div class="fields">
      <div class="field" style="grid-column:1/-1"><label class="label" for="cp-t">${esc(L.ctitle)}</label><input id="cp-t" data-cpd="title" maxlength="100" value="${esc(d.title)}"></div>
      <div class="field"><label class="label" for="cp-ty">${esc(L.type)}</label><select id="cp-ty" data-cpd="type">${CONTEST_TYPES.map(x=>`<option value="${x.id}" ${x.id===d.type?'selected':''}>${esc(CTL().types[x.id])}</option>`).join('')}</select></div>
      <div class="field"><label class="label" for="cp-lv">${esc(L.level)}</label><select id="cp-lv" data-cpd="level">${CP_LEVELS.map(x=>`<option value="${x}" ${x===d.level?'selected':''}>${esc(L.lv[x])}</option>`).join('')}</select></div>
      <div class="field"><label class="label" for="cp-d">${esc(L.date)}</label><input id="cp-d" type="date" data-cpd="date" value="${esc(d.date)}"></div>
      <div class="field" style="grid-column:1/-1"><label class="label" for="cp-l">${esc(L.contestants)}</label><textarea id="cp-l" data-cpd="list" rows="5">${esc(d.list)}</textarea></div></div>
      <div class="btns"><button type="submit" class="primary" ${CP.busy?'disabled':''}>${esc(L.create)}</button></div></form>`:''}
    <div class="box"><h3>${esc(L.results)}</h3>${published.length?published.map(c=>`<div><b>${esc(c.title)}</b> <span class="muted">· ${esc(c.date?fmtDate(c.date):'')}</span>
      <ol class="podiumres">${c.results.map(r=>`<li><span class="medal m${r.place}">${r.place}</span> <bdi>${esc(r.name)}</bdi>${r.club?` <span class="muted">· ${esc(r.club)}</span>`:''}</li>`).join('')}</ol></div>`).join(''):`<p class="empty">${esc(off&&!CP.list.length?L.none:L.noResults)}</p>`}</div>
  </section>`;
}

// ---------- actions ----------
const cpRef=id=>SH.fs.doc(`clubs/${SH.club}/contests/${id}`);
function cpCode(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from({length:6},()=>A[typeof randInt==='function'?randInt(A.length):Math.floor(Math.random()*A.length)]).join('')}
async function cpRun(fn,ok){CP.busy=true;render();try{await fn();if(ok)toast(ok)}catch(e){writeFail(e)}CP.busy=false;render()}
async function cproJoin(code){
  const L=CPL();code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(!code)return;
  let ok=false;
  for(const c of CP.list.filter(x=>['setup','voting'].includes(x.status))){
    for(const tie of [false,true]){
      try{await SH.fs.doc(`clubs/${SH.club}/contests/${c.id}/judges/${SH.uid}`).set({code,tie,at:new Date().toISOString()});ok=true;break}catch(e){}
    }
    if(ok)break;
  }
  CP.code='';toast(ok?L.judgeOk:L.judgeBad);render();
}
// A judging link carries the code (…?club=x&judge=CODE#cpro): join once the contests are loaded.
function cproTryUrl(){
  if(CP.triedUrl||!CP.list.length||!SH.uid)return;const code=new URLSearchParams(location.search).get('judge');if(!code)return;
  CP.triedUrl=true;cproJoin(code);
  try{const u=new URL(location.href);u.searchParams.delete('judge');history.replaceState(null,'',u.toString())}catch(e){}
}
async function cproCerts(c){
  const L=CPL();const lib=await loadJsPdf();
  const doc=new lib.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});if(isRtl())await makeRtl(doc,297);
  const W=297,H=210;const club=(S.agenda&&S.agenda.club)||SH.club;
  const people=(c.contestants||[]).filter(x=>!(c.dq||[]).includes(x.id));
  people.forEach((p,i)=>{
    if(i)doc.addPage();
    const r=(c.results||[]).find(x=>x.id===p.id);
    doc.setDrawColor(20,90,100);doc.setLineWidth(1.2);doc.rect(10,10,W-20,H-20);doc.setLineWidth(.4);doc.rect(14,14,W-28,H-28);
    doc.setFont('helvetica','bold');doc.setFontSize(30);doc.text(pdfText(r?L.certTitle:L.certPart),W/2,52,{align:'center'});
    doc.setFont('helvetica','normal');doc.setFontSize(14);doc.text(pdfText(L.awarded),W/2,72,{align:'center'});
    doc.setFont('helvetica','bold');doc.setFontSize(26);doc.text(pdfText(p.name),W/2,92,{align:'center'});
    doc.setFont('helvetica','normal');doc.setFontSize(16);
    doc.text(pdfText(r?`${L.places[r.place-1]} – ${c.title}`:`${L.forPart} ${c.title}`),W/2,114,{align:'center'});
    doc.setFontSize(12);doc.text(pdfText([cpType(c),c.date?fmtDate(c.date):'',club].filter(Boolean).join(' · ')),W/2,130,{align:'center'});
    doc.setDrawColor(150);doc.line(40,170,110,170);doc.line(W-110,170,W-40,170);
  });
  doc.save(`certificates-${(c.date||todayISO())}.pdf`);
}
document.addEventListener('change',ev=>{
  const el=ev.target;const ds=el.dataset||{};
  if(ds.cpd){CP.draft[ds.cpd]=el.value;return}
  if(ds.cprank){const s=CP.sel[ds.cprank]||(CP.sel[ds.cprank]=[]);s[+ds.i]=el.value;return}
  if(ds.cpdq){const c=CP.list.find(x=>x.id===ds.cpdq);if(!c)return;const dq=new Set(c.dq||[]);el.checked?dq.add(ds.v):dq.delete(ds.v);cpRun(()=>cpRef(c.id).update({dq:[...dq],updatedAt:new Date().toISOString()}));return}
});
document.addEventListener('input',ev=>{const ds=ev.target.dataset||{};if(ds.cpd)CP.draft[ds.cpd]=ev.target.value;if(ev.target.id==='cp-code')CP.code=ev.target.value});
document.addEventListener('submit',ev=>{
  const f=ev.target.dataset.form;if(!f||!f.startsWith('cp-'))return;ev.preventDefault();const L=CPL();
  if(f==='cp-join'){cpRun(()=>cproJoin(document.getElementById('cp-code').value));return}
  if(f==='cp-new'){const d=CP.draft;const title=d.title.trim().slice(0,100);
    const people=d.list.split(/\n/).map(x=>x.trim()).filter(Boolean).slice(0,30).map((x,i)=>{const m=x.split(/\s+[–—-]\s+/);return {id:'c'+(i+1),name:m[0].slice(0,80),club:(m[1]||'').slice(0,80)}});
    if(!title||people.length<2){toast(L.needC);return}
    cpRun(async()=>{const now=new Date().toISOString();
      const r=await SH.fs.collection(`clubs/${SH.club}/contests`).add({title,type:d.type,date:d.date||'',level:d.level,contestants:people,dq:[],status:'setup',results:[],createdBy:SH.user.email,at:now,updatedAt:now});
      let j=cpCode(),tie=cpCode();while(tie===j)tie=cpCode();
      await SH.fs.doc(`clubs/${SH.club}/contests/${r.id}/keys/codes`).set({judge:j,tie});CP.draft=null});return}
  if(f==='cp-ballot'){const id=ev.target.dataset.id;const c=CP.list.find(x=>x.id===id);const me=CP.mine[id];if(!c||!me)return;
    const n=me.tie?c.contestants.length:Math.min(3,c.contestants.length);const rank=(CP.sel[id]||[]).slice(0,n);
    if(rank.length<n||rank.some(x=>!x)||new Set(rank).size!==rank.length){toast(L.dup);return}
    cpRun(()=>SH.fs.doc(`clubs/${SH.club}/contests/${id}/ballots/${SH.uid}`).set({rank,tie:!!me.tie,at:new Date().toISOString()}),L.sent);return}
});
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act^="cp-"]');if(!b)return;const a=b.dataset.act;const L=CPL();
  if(a==='cp-del-cancel'){CP.open=null;render();return}
  const c=CP.list.find(x=>x.id===b.dataset.id);if(!c)return;const now=new Date().toISOString();
  if(a==='cp-status'){const v=b.dataset.v;cpRun(()=>cpRef(c.id).update({status:v,...(v!=='published'?{results:[]}:{}),updatedAt:now}));return}
  if(a==='cp-publish'){const T=cproTally(c);const results=T.rows.filter(r=>!r.dq&&r.place<=3).map(r=>({id:r.id,place:r.place,name:r.name,club:r.club||''}));
    cpRun(()=>cpRef(c.id).update({status:'published',results,updatedAt:now}));return}
  if(a==='cp-qr'){const k=CP.keys[c.id];QR={title:L.qrJudge,text:L.qrText,url:cproLink()};paintQr();return}
  if(a==='cp-copy'){copyText(cproLink());return}
  if(a==='cp-certs'){cproCerts(c).catch(e=>toast(String(e&&e.message||e)));return}
  if(a==='cp-del-ask'){CP.open=c.id;render();return}
  if(a==='cp-del'){CP.open=null;cpRun(async()=>{
    for(const col of ['ballots','judges']){const q=await SH.fs.collection(`clubs/${SH.club}/contests/${c.id}/${col}`).get();for(const d of q.docs)await d.ref.delete()}
    await SH.fs.doc(`clubs/${SH.club}/contests/${c.id}/keys/codes`).delete().catch(()=>{});await cpRef(c.id).delete()});return}
});
