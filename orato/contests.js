// Oratia – the Contests section: contest types and timing, contest officials and their tasks, links to the official
// Toastmasters documents (judge's ballots, tally sheet, time record sheet…), a checklist for the contest chair,
// shortcuts to the contest tools (timer, speaking order, agenda), the club's or district's own links, and the winning
// speeches of the World Championship of Public Speaking. Four tabs: contest (Organise), cofficials, cdocs, cvideos.
//
// The official rules are those of the current Speech Contest Rulebook; this page only summarises them and links to
// the documents on toastmasters.org. Links are checked for the 2026–2027 rulebook: update DOCS and CONTEST_TYPES below
// when Toastmasters International publishes new versions.
// Club links and videos are stored in clubs/{club}/public/contest {links:[{title,url}],videos:[{title,url,note}]}:
// everyone reads, officers edit.
// The checklist is kept on each device.

const TM='https://www.toastmasters.org';
const DOCS={
  rulebook:{n:'1171',url:'https://content.toastmasters.org/image/upload/1171-speech-contest-rulebook.pdf'},
  hub:{url:TM+'/resources/speech-contests'},
  faq:{url:TM+'/footer/faq/Speech%20Contests'},
  tutorials:{url:'https://toastmasters.org/resources/speech-contests/speech-contest-tutorials'},
  quality:{url:'https://ccdn.toastmasters.org/medias/files/department-documents/speech-contests-documents/206eg-conducting-quality-speech-contests.pdf'},
  judgeCert:{n:'1170',url:TM+'/resources/judges-certification-of-eligibility-and-code-of-ethics'},
  speakerCert:{n:'1183',url:TM+'/resources/speakers-certification-of-eligibility-and-originality'},
  timeSheet:{n:'1175',url:TM+'/Resources/Speech-Contest-Time-Record-Sheet'},
  tally:{n:'1176',url:'https://toastmasters.org/~/media/f1586830529047b5a2325167b925d4b1.ashx'},
  certificates:{url:TM+'/resources/resource-library?rt=49be8736-3630-4828-b574-4241911e43eb&t=speech'},
  library:{url:TM+'/resources/resource-library?t=speech%20contest'}
};
// Timing in seconds: green, yellow (amber), red, and the qualifying window (lo–hi) of the rulebook.
const CONTEST_TYPES=[
  {id:'intl',preset:'cIntl',time:[300,360,420,270,450],ballot:{n:'1172',url:TM+'/resources/international-speech-contest-judges-guide-and-ballot'},tie:{n:'1188',url:TM+'/resources/tiebreaking-judges-guide-and-ballot'},kit:'https://toastmasters.org/resources/international-speech-contest-kit'},
  {id:'eval',preset:'cEval',time:[120,150,180,90,210],ballot:{n:'1179',url:'https://content.toastmasters.org/image/upload/1179-evaluation-contest-judges-guide-and-ballot.pdf'},tie:{n:'1179A',url:'https://content.toastmasters.org/image/upload/1179a-tiebreaking-evaluation-contest.pdf'},kit:'https://toastmasters.org/resources/evaluation-speech-contest-kit'},
  {id:'humorous',preset:'cIntl',time:[300,360,420,270,450],ballot:{n:'1191',url:'https://content.toastmasters.org/image/upload/1191-humorous-speech-contest-judges-guide-and-ballot.pdf'},tie:null,kit:'https://toastmasters.org/resources/humorous-speech-contest'},
  {id:'tt',preset:'cTT',time:[60,90,120,60,150],ballot:{n:'1180',url:TM+'/resources/table-topics-contest-judges-guide-and-ballot'},tie:{n:'1180A',url:TM+'/resources/table-topics-contest-tiebreaking-guide-ballot'},kit:'https://toastmasters.org/resources/table-topics-speech-contest'},
  {id:'tall',preset:'cTall',time:[180,240,300,150,330],ballot:{n:'1181',url:TM+'/resources/tall-tales-contest-judges-guide-and-ballot'},tie:{n:'1181A',url:'https://content.toastmasters.org/image/upload/1181a-tall-tales-contest-tiebreaking-judges-guide.pdf'},kit:'https://toastmasters.org/resources/tall-tales-speech-contest-kit'},
  {id:'online',preset:'cIntl',time:[300,360,420,270,450],ballot:null,tie:null,kit:'https://toastmasters.org/Resources/Online%20Speech%20Contest%20Kit'}
];
// Which documents each official needs.
const CONTEST_ROLES=[
  ['chair',['rulebook','speakerCert','certificates','kit']],
  ['chief',['rulebook','judgeCert','ballot','tie','tally','timeSheet']],
  ['judge',['judgeCert','ballot']],
  ['tiebreak',['judgeCert','tie']],
  ['counter',['tally']],
  ['timer',['timeSheet']],
  ['saa',[]],
  ['test',[]],
  ['contestant',['speakerCert','rulebook']]
];
const CHECK_COUNT=14;
const CONTEST_TABS=['contest','cofficials','cdocs','cvideos','cpro'];

// World Champions of Public Speaking (International Speech Contest final). yt = YouTube video checked against the
// official Toastmasters pages; without one, the card links to the official page or to a YouTube search.
// Add each new champion at the top after the convention in August.
const WCPS_PLAYLIST='https://www.youtube.com/playlist?list=PLARJuJxGkTBSCTHGXbFcyn2ykRvofpQR9';
const WCPS_PAGE=TM+'/resources/speech-contests/world-champions-of-public-speaking';
const CHAMPS=[
  {y:2026,n:'Dirceu da Silva',from:'Rotterdam, Netherlands',title:'Best Decision Ever',yt:'UBnc5nfl8ow',
    more:[[2,'Gurmeet Singh Gurcharan Singh','Good for Nothing','jidwno7oJv4'],[3,'Aaron Samson','The Chain','qrlz1qexn9Q']]},
  {y:2025,n:'Sabyasachi Sengupta',from:'Amsterdam, Netherlands',title:'Just Nod',yt:'GTc7nbTFxa4',
    more:[[2,'Mas Mahathir Bin Mohamad','','vEjdYdFJZy8'],[3,'Allen Ang Boon Kiat','Keep Dreaming','AtwcTjpkM0E']]},
  {y:2024,n:'Luisa Montalvo',from:'San Juan, Texas, USA',title:'37 Strangers',url:TM+'/events/2024-international-convention/worldchampionshipofpublicspeaking'},
  {y:2023,n:'Jocelyn Tyson',from:'New Jersey, USA',url:TM+'/events/2023-international-convention/world-championship-of-public-speaking'},
  {y:2022,n:'Cyril Junior Dim',from:'Nigeria',title:'Ndini'},
  {y:2021,n:'Verity Price',from:'Cape Town, South Africa'},
  {y:2020,n:'Mike Carr',from:'Austin, Texas, USA'},
  {y:2019,n:'Aaron Beverly',from:'Philadelphia, USA',url:TM+'/Resources/Video-Library/2019-toastmasters-world-champion-of-public-speaking'},
  {y:2018,n:'Ramona J. Smith',from:'Houston, Texas, USA',title:'Still Standing',yt:'7Tev43VNRIc'},
  {y:2017,n:'Manoj Vasudevan',from:'Singapore'},
  {y:2016,n:'Darren Tay',from:'Singapore',title:'Outlaw'},
  {y:2015,n:'Mohammed Qahtani',from:'Saudi Arabia',title:'The Power of Words',yt:'Iqq1roF4C8s'},
  {y:2014,n:'Dananjaya Hettiarachchi',from:'Sri Lanka',title:'I See Something'}
];
const ytWatch=id=>'https://www.youtube.com/watch?v='+id;
const ytSearch=q=>'https://www.youtube.com/results?search_query='+encodeURIComponent(q);

const CT={
en:{
  pages:{contest:'Organise',cofficials:'Officials',cdocs:'Documents',cvideos:'Watch & learn'},
  officialsIntro:'Who does what on contest day, and the documents each official needs. Choose the contest type to get the right ballots.',
  docsByType:'Ballots and kits by contest type',colType:'Contest',colBallot:'Judge’s ballot',colTie:'Tiebreaking ballot',colKit:'Kit',inKit:'in the kit',
  vTitle:'Watch & learn',vIntro:'The winning speeches of the World Championship of Public Speaking, the final of the International Speech Contest. Watch them with your club, then talk about what made them work.',
  vStudyTitle:'How to learn from a champion’s speech',
  vStudy:['Watch it once just to enjoy it, then a second time with a pen.','Note the opening: how quickly does the speaker get you into the story?','Find the message: can you say it in one sentence? How often does it come back?','Watch the stage: where the speaker stands, moves and stays still, and why.','Listen to the pauses, the changes of pace and the callbacks to earlier lines.','Time it: see how the speech uses the 5 to 7 minutes.'],
  vChampion:'World Champion {y}',vPlaces:{2:'2nd place',3:'3rd place'},vPlay:'Play the speech of {n}',vOpenYt:'Open on YouTube',vOfficial:'Official page',vSearch:'Find the video on YouTube',
  vPlaylist:'Official playlist of the winning speeches',vAll:'All World Champions since 1938',vNote:'Videos are played from YouTube (privacy-enhanced mode). Some videos can only be watched on YouTube.',
  vClubTitle:'Our club’s picks',vClubIntro:'Speeches from your club, your district contests or other speakers worth watching.',vNone:'No videos yet.',vNoneOfficer:'No videos yet. Add a YouTube or Vimeo link: your district final, a member’s contest speech…',
  vFTitle:'Title',vFUrl:'YouTube or Vimeo link',vFNote:'What to watch for (optional)',vAdd:'Add the video',vSaved:'Video added',vRemoved:'Video removed',vBad:'Enter a title and a YouTube or Vimeo link',vMax:'Up to 30 videos',
  title:'Speech contests',intro:'Everything to organise a club speech contest: contest types and timing, the officials and their tasks, the official documents and the tools you need on the day.',
  rulesNote:'This page summarises the rules. The reference is always the current Speech Contest Rulebook (2026–2027 edition at the time of writing): read it, and check the documents on toastmasters.org before printing.',
  typeTitle:'Contest type',timing:'Timing',length:'Speaking time',green:'Green',yellow:'Yellow',red:'Red',window:'Qualifying window',windowText:'{lo} to {hi}. Outside this window the contestant is disqualified.',
  ballot:'Judge’s Guide and Ballot',tie:'Tiebreaking Judge’s Guide and Ballot',kit:'Contest kit (all forms)',tieInKit:'Tiebreaking ballot: in the contest kit',noBallot:'Ballots: in the contest kit',
  useTimer:'Time with these settings',
  types:{intl:'International',eval:'Evaluation',humorous:'Humorous',tt:'Table Topics',tall:'Tall Tales',online:'Online'},
  notes:{intl:['The speech must be original and mostly the contestant’s own work.','Contestants need Levels 1 and 2 of any Pathways path completed (or a DTM); charter members of a club chartered less than a year before the contest are exempt.'],
    eval:['A test speaker gives a 5–7 minute speech; every contestant evaluates the same speech.','After the test speech, contestants leave the room with the Sergeant at Arms and have 5 minutes to prepare notes.','The test speaker cannot be a contestant.'],
    humorous:['The speech must be humorous, original and mostly the contestant’s own work.'],
    tt:['Every contestant answers the same question.','All contestants except the first wait outside the room with the Sergeant at Arms, and come in one at a time.'],
    tall:['A story of exaggeration and imagination, original and mostly the contestant’s own work.'],
    online:['Held on a video platform; contestants speak live on camera.','A backup timer is required in addition to the two timers.']},
  toolsTitle:'Tools for the day',toolDraw:'Draw the speaking order',toolTimer:'Contest timer',toolAgenda:'Contest agenda',toolEval:'Evaluation forms',
  checkTitle:'Contest chair’s checklist',checkIntro:'Saved on this device.',checkDone:'{n} of {total} done',checkReset:'Clear the checklist',
  check:['Date, room (or online link) and contest type(s) agreed with the club officers and the Area Director','Contestants registered and their eligibility checked (paid member of a club in good standing; Levels 1 and 2 of Pathways for the International contest)','Each contestant has signed the Speaker’s Certification of Eligibility and Originality (1183)','Chief judge appointed','At least five voting judges and one tiebreaking judge recruited; each signs the Judge’s Certification (1170)','Two counters and two timers recruited (plus a backup timer online)','Sergeant at Arms recruited, and a test speaker for the Evaluation contest','Latest ballots, tally sheets and time record sheets printed (or the online versions ready)','Timing lights (or this timer) tested, contest agenda ready','Certificates and awards ready','Speaking order drawn in front of the contestants','Briefings done: contestants by the contest chair; judges, counters and timers by the chief judge','Results sent to the next level (Notification of Contest Winner, in the contest kit)','Officials and volunteers thanked'],
  rolesTitle:'Contest officials',rolesIntro:'At club level the rulebook asks, unless impractical, for a contest chair, a chief judge, at least five voting judges, one tiebreaking judge, two counters and two timers.',
  needs:'Documents',
  roles:{chair:['Contest chair','Organises the contest and runs it on the day.',['Plans the date, room and officials with the club officers','Checks contestants’ eligibility forms and briefs the contestants','Introduces each contestant, holds the interviews and announces the winners']],
    chief:['Chief judge','Makes sure the judging is fair and follows the rules. Does not vote.',['Recruits and briefs the judges, counters and timers','Appoints the tiebreaking judge, whose identity stays secret','Collects the ballots and time records and gives the results to the contest chair']],
    judge:['Voting judges','Rank the three best contestants on the official ballot.',['Sign the Judge’s Certification of Eligibility and Code of Ethics','Judge each speech independently, using the guide on the ballot','Hand the signed ballot to the counters; stay anonymous when possible']],
    tiebreak:['Tiebreaking judge','Ranks every contestant, so that a tie can be resolved.',['Is chosen by the chief judge and stays anonymous','Ranks all contestants in order on the tiebreaking ballot','The ballot is only used if there is a tie']],
    counter:['Counters','Count the ballot points with the chief judge.',['Collect the judges’ ballots','Tally the points on the Counter’s Tally Sheet','Check the totals and hand the results to the chief judge']],
    timer:['Timers','Time each contestant and report any time violation.',['One operates the green, yellow and red signals; the other runs the stopwatch','Record each time on the Time Record Sheet','Report times and qualification to the chief judge']],
    saa:['Sergeant at Arms','Prepares the room and looks after the contestants.',['Sets up the room, lectern, lights and microphones','Supervises the contestants outside the room during the Evaluation and Table Topics contests','Keeps the room quiet and the doors closed during speeches']],
    test:['Test speaker (Evaluation contest)','Gives the speech that all contestants evaluate.',['Prepares a 5–7 minute speech that leaves room for evaluation','Is not a contestant in that contest']],
    contestant:['Contestants','Compete for the right to represent the club at the next level.',['Sign the Speaker’s Certification of Eligibility and Originality','Take part in the draw and the briefing','Speak within the time and wait for the minute of silence between speakers']]},
  docsTitle:'Official documents',docsIntro:'On toastmasters.org. Most documents also exist in other languages in the resource library.',
  docs:{rulebook:'Speech Contest Rulebook',hub:'Speech contests on toastmasters.org (all contest kits)',faq:'Speech contest FAQ',tutorials:'Speech contest tutorials (online training)',quality:'Conducting Quality Speech Contests (guide)',judgeCert:'Judge’s Certification of Eligibility and Code of Ethics',speakerCert:'Speaker’s Certification of Eligibility and Originality',timeSheet:'Speech Contest Time Record Sheet and Instructions for Timers',tally:'Counter’s Tally Sheet',certificates:'Speech contest certificates',library:'All speech contest materials (resource library)',ballot:'Judge’s Guide and Ballot (for the chosen contest)',tie:'Tiebreaking Judge’s Guide and Ballot (for the chosen contest)',kit:'Contest kit (for the chosen contest)'},
  item:'Item {n}',
  linksTitle:'Our club and district links',linksIntro:'Contest calendar, registration forms, district instructions…',linksNone:'No links yet.',linksNoneOfficer:'No links yet. Add your district’s contest page or your own documents.',
  linkTitle:'Title',linkUrl:'Link (https://…)',linkAdd:'Add the link',linkSaved:'Link added',linkRemoved:'Link removed',linkBad:'Enter a title and a link starting with https://',linkMax:'Up to 20 links'},
fr:{
  pages:{contest:'Organiser',cofficials:'Officiels',cdocs:'Documents',cvideos:'Voir et apprendre'},
  officialsIntro:'Qui fait quoi le jour du concours, et les documents dont chaque officiel a besoin. Choisissez le type de concours pour obtenir les bons bulletins.',
  docsByType:'Bulletins et kits par type de concours',colType:'Concours',colBallot:'Bulletin du juge',colTie:'Bulletin de départage',colKit:'Kit',inKit:'dans le kit',
  vTitle:'Voir et apprendre',vIntro:'Les discours gagnants du championnat du monde de prise de parole en public (World Championship of Public Speaking), la finale du concours International. Regardez-les en club, puis discutez de ce qui les rend efficaces.',
  vStudyTitle:'Comment apprendre d’un discours de champion',
  vStudy:['Regardez-le une première fois pour le plaisir, puis une seconde fois crayon en main.','Observez l’ouverture : en combien de temps l’orateur vous fait-il entrer dans l’histoire ?','Trouvez le message : pouvez-vous le dire en une phrase ? Combien de fois revient-il ?','Regardez la scène : où l’orateur se place, se déplace, s’immobilise, et pourquoi.','Écoutez les pauses, les changements de rythme et les rappels de phrases entendues plus tôt.','Chronométrez-le : voyez comment le discours utilise ses 5 à 7 minutes.'],
  vChampion:'Champion du monde {y}',vPlaces:{2:'2e place',3:'3e place'},vPlay:'Lire le discours de {n}',vOpenYt:'Ouvrir sur YouTube',vOfficial:'Page officielle',vSearch:'Trouver la vidéo sur YouTube',
  vPlaylist:'Playlist officielle des discours gagnants',vAll:'Tous les champions du monde depuis 1938',vNote:'Les vidéos sont lues depuis YouTube (mode confidentialité renforcée). Certaines ne peuvent être vues que sur YouTube.',
  vClubTitle:'La sélection du club',vClubIntro:'Des discours de votre club, des concours de votre district ou d’autres orateurs à voir.',vNone:'Aucune vidéo pour l’instant.',vNoneOfficer:'Aucune vidéo pour l’instant. Ajoutez un lien YouTube ou Vimeo : la finale de votre district, le discours de concours d’un membre…',
  vFTitle:'Titre',vFUrl:'Lien YouTube ou Vimeo',vFNote:'À quoi faire attention (facultatif)',vAdd:'Ajouter la vidéo',vSaved:'Vidéo ajoutée',vRemoved:'Vidéo supprimée',vBad:'Saisissez un titre et un lien YouTube ou Vimeo',vMax:'30 vidéos maximum',
  title:'Concours de discours',intro:'Tout pour organiser un concours de club : types de concours et chronométrage, rôles et missions des officiels, documents officiels et outils pour le jour J.',
  rulesNote:'Cette page résume les règles. La référence reste toujours le règlement des concours en vigueur (Speech Contest Rulebook, édition 2026–2027 au moment de la rédaction) : lisez-le, et vérifiez les documents sur toastmasters.org avant de les imprimer.',
  typeTitle:'Type de concours',timing:'Chronométrage',length:'Temps de parole',green:'Vert',yellow:'Jaune',red:'Rouge',window:'Plage de qualification',windowText:'De {lo} à {hi}. En dehors de cette plage, le candidat est disqualifié.',
  ballot:'Guide et bulletin du juge',tie:'Guide et bulletin du juge de départage',kit:'Kit du concours (tous les formulaires)',tieInKit:'Bulletin de départage : dans le kit du concours',noBallot:'Bulletins : dans le kit du concours',
  useTimer:'Chronométrer avec ces réglages',
  types:{intl:'International',eval:'Évaluation',humorous:'Humoristique',tt:'Improvisation (Table Topics)',tall:'Histoires extraordinaires (Tall Tales)',online:'En ligne'},
  notes:{intl:['Le discours doit être original et, pour l’essentiel, l’œuvre du candidat.','Les candidats doivent avoir terminé les niveaux 1 et 2 d’un parcours Pathways (ou être DTM) ; les membres fondateurs d’un club créé moins d’un an avant le concours en sont dispensés.'],
    eval:['Un orateur test prononce un discours de 5 à 7 minutes ; tous les candidats évaluent le même discours.','Après le discours test, les candidats sortent de la salle avec le Sergent d’armes et disposent de 5 minutes pour préparer leurs notes.','L’orateur test ne peut pas être candidat.'],
    humorous:['Le discours doit être humoristique, original et, pour l’essentiel, l’œuvre du candidat.'],
    tt:['Tous les candidats répondent à la même question.','Tous les candidats sauf le premier attendent hors de la salle avec le Sergent d’armes et entrent un par un.'],
    tall:['Une histoire d’exagération et d’imagination, originale et, pour l’essentiel, l’œuvre du candidat.'],
    online:['Se déroule sur une plateforme vidéo ; les candidats parlent en direct, caméra allumée.','Un chronométreur de secours est obligatoire en plus des deux chronométreurs.']},
  toolsTitle:'Outils pour le jour J',toolDraw:'Tirer l’ordre de passage',toolTimer:'Chrono du concours',toolAgenda:'Ordre du jour du concours',toolEval:'Fiches d’évaluation',
  checkTitle:'Check-list du président du concours',checkIntro:'Enregistrée sur cet appareil.',checkDone:'{n} sur {total} fait(s)',checkReset:'Vider la check-list',
  check:['Date, salle (ou lien en ligne) et type(s) de concours fixés avec le bureau et le directeur de l’Area','Candidats inscrits et éligibilité vérifiée (membre à jour d’un club en règle ; niveaux 1 et 2 de Pathways pour le concours International)','Chaque candidat a signé la certification d’éligibilité et d’originalité (1183)','Juge en chef désigné','Au moins cinq juges votants et un juge de départage recrutés ; chacun signe la certification des juges (1170)','Deux compteurs et deux chronométreurs recrutés (plus un chronométreur de secours en ligne)','Sergent d’armes recruté, et un orateur test pour le concours d’évaluation','Dernières versions des bulletins, feuilles de dépouillement et de chronométrage imprimées (ou versions en ligne prêtes)','Feux de chronométrage (ou ce chrono) testés, ordre du jour du concours prêt','Certificats et récompenses prêts','Ordre de passage tiré au sort devant les candidats','Briefings faits : les candidats par le président du concours ; juges, compteurs et chronométreurs par le juge en chef','Résultats transmis au niveau suivant (Notification of Contest Winner, dans le kit du concours)','Officiels et bénévoles remerciés'],
  rolesTitle:'Les officiels du concours',rolesIntro:'Au niveau du club, le règlement demande, sauf impossibilité, un président du concours, un juge en chef, au moins cinq juges votants, un juge de départage, deux compteurs et deux chronométreurs.',
  needs:'Documents',
  roles:{chair:['Président du concours','Organise le concours et l’anime le jour J.',['Planifie la date, la salle et les officiels avec le bureau','Vérifie les formulaires d’éligibilité et briefe les candidats','Présente chaque candidat, mène les interviews et annonce les gagnants']],
    chief:['Juge en chef','Veille à un jugement équitable et conforme au règlement. Ne vote pas.',['Recrute et briefe les juges, compteurs et chronométreurs','Désigne le juge de départage, dont l’identité reste secrète','Recueille les bulletins et les relevés de temps et remet les résultats au président du concours']],
    judge:['Juges votants','Classent les trois meilleurs candidats sur le bulletin officiel.',['Signent la certification d’éligibilité et le code d’éthique des juges','Jugent chaque discours en toute indépendance, avec le guide du bulletin','Remettent leur bulletin signé aux compteurs ; restent anonymes si possible']],
    tiebreak:['Juge de départage','Classe tous les candidats, pour départager une égalité.',['Est choisi par le juge en chef et reste anonyme','Classe tous les candidats dans l’ordre sur le bulletin de départage','Son bulletin ne sert qu’en cas d’égalité']],
    counter:['Compteurs','Comptent les points des bulletins avec le juge en chef.',['Recueillent les bulletins des juges','Additionnent les points sur la feuille de dépouillement','Vérifient les totaux et remettent les résultats au juge en chef']],
    timer:['Chronométreurs','Chronomètrent chaque candidat et signalent les dépassements.',['L’un manie les signaux vert, jaune et rouge ; l’autre tient le chronomètre','Notent chaque temps sur la feuille de chronométrage','Transmettent les temps et la qualification au juge en chef']],
    saa:['Sergent d’armes','Prépare la salle et s’occupe des candidats.',['Installe la salle, le pupitre, les feux et les micros','Surveille les candidats hors de la salle pendant les concours d’évaluation et d’improvisation','Garde la salle calme et les portes fermées pendant les discours']],
    test:['Orateur test (concours d’évaluation)','Prononce le discours que tous les candidats évaluent.',['Prépare un discours de 5 à 7 minutes qui laisse matière à évaluation','N’est pas candidat à ce concours']],
    contestant:['Candidats','Concourent pour représenter le club au niveau suivant.',['Signent la certification d’éligibilité et d’originalité','Participent au tirage au sort et au briefing','Parlent dans le temps imparti et attendent la minute de silence entre les orateurs']]},
  docsTitle:'Documents officiels',docsIntro:'Sur toastmasters.org. La plupart des documents existent aussi en français dans la bibliothèque de ressources.',
  docs:{rulebook:'Règlement des concours (Speech Contest Rulebook)',hub:'Les concours sur toastmasters.org (tous les kits)',faq:'FAQ des concours',tutorials:'Tutoriels des concours (formation en ligne)',quality:'Conducting Quality Speech Contests (guide)',judgeCert:'Certification d’éligibilité et code d’éthique des juges',speakerCert:'Certification d’éligibilité et d’originalité du candidat',timeSheet:'Feuille de chronométrage et instructions aux chronométreurs',tally:'Feuille de dépouillement des compteurs',certificates:'Certificats de concours',library:'Tous les documents de concours (bibliothèque de ressources)',ballot:'Guide et bulletin du juge (pour le concours choisi)',tie:'Bulletin du juge de départage (pour le concours choisi)',kit:'Kit du concours (pour le concours choisi)'},
  item:'Réf. {n}',
  linksTitle:'Liens du club et du district',linksIntro:'Calendrier des concours, formulaires d’inscription, consignes du district…',linksNone:'Aucun lien pour l’instant.',linksNoneOfficer:'Aucun lien pour l’instant. Ajoutez la page concours de votre district ou vos propres documents.',
  linkTitle:'Titre',linkUrl:'Lien (https://…)',linkAdd:'Ajouter le lien',linkSaved:'Lien ajouté',linkRemoved:'Lien supprimé',linkBad:'Saisissez un titre et un lien commençant par https://',linkMax:'20 liens maximum'},
nl:{
  pages:{contest:'Organiseren',cofficials:'Officials',cdocs:'Documenten',cvideos:'Kijken en leren'},
  officialsIntro:'Wie doet wat op de wedstrijddag, en welke documenten elke official nodig heeft. Kies de soort wedstrijd voor de juiste stembiljetten.',
  docsByType:'Stembiljetten en pakketten per soort wedstrijd',colType:'Wedstrijd',colBallot:'Stembiljet jury',colTie:'Tiebreak-stembiljet',colKit:'Pakket',inKit:'in het pakket',
  vTitle:'Kijken en leren',vIntro:'De winnende speeches van het World Championship of Public Speaking, de finale van de International Speech Contest. Bekijk ze met je club en praat daarna over wat ze zo sterk maakt.',
  vStudyTitle:'Zo leer je van de speech van een kampioen',
  vStudy:['Kijk één keer om ervan te genieten, en een tweede keer met pen en papier.','Let op de opening: hoe snel trekt de spreker je het verhaal in?','Zoek de boodschap: kun je die in één zin zeggen? Hoe vaak komt ze terug?','Kijk naar het podium: waar de spreker staat, beweegt en stilstaat, en waarom.','Luister naar de pauzes, de tempowisselingen en de verwijzingen naar eerdere zinnen.','Klok de speech: zie hoe hij de 5 tot 7 minuten gebruikt.'],
  vChampion:'Wereldkampioen {y}',vPlaces:{2:'2e plaats',3:'3e plaats'},vPlay:'Speech van {n} afspelen',vOpenYt:'Openen op YouTube',vOfficial:'Officiële pagina',vSearch:'De video zoeken op YouTube',
  vPlaylist:'Officiële playlist van de winnende speeches',vAll:'Alle wereldkampioenen sinds 1938',vNote:'Video’s worden afgespeeld via YouTube (privacyvriendelijke modus). Sommige video’s zijn alleen op YouTube te bekijken.',
  vClubTitle:'De keuze van onze club',vClubIntro:'Speeches van je club, de wedstrijden van je district of andere sprekers die het bekijken waard zijn.',vNone:'Nog geen video’s.',vNoneOfficer:'Nog geen video’s. Voeg een YouTube- of Vimeo-link toe: de districtsfinale, de wedstrijdspeech van een lid…',
  vFTitle:'Titel',vFUrl:'YouTube- of Vimeo-link',vFNote:'Waar je op moet letten (optioneel)',vAdd:'Video toevoegen',vSaved:'Video toegevoegd',vRemoved:'Video verwijderd',vBad:'Vul een titel en een YouTube- of Vimeo-link in',vMax:'Maximaal 30 video’s',
  title:'Speechwedstrijden',intro:'Alles om een clubwedstrijd te organiseren: soorten wedstrijden en tijden, de officials en hun taken, de officiële documenten en de tools voor de dag zelf.',
  rulesNote:'Deze pagina vat de regels samen. De referentie is altijd het geldende Speech Contest Rulebook (editie 2026–2027 op het moment van schrijven): lees het en controleer de documenten op toastmasters.org voordat je ze afdrukt.',
  typeTitle:'Soort wedstrijd',timing:'Tijden',length:'Spreektijd',green:'Groen',yellow:'Geel',red:'Rood',window:'Kwalificatievenster',windowText:'Van {lo} tot {hi}. Daarbuiten wordt de deelnemer gediskwalificeerd.',
  ballot:'Juryhandleiding en stembiljet',tie:'Handleiding en stembiljet van de tiebreak-jurylid',kit:'Wedstrijdpakket (alle formulieren)',tieInKit:'Tiebreak-stembiljet: in het wedstrijdpakket',noBallot:'Stembiljetten: in het wedstrijdpakket',
  useTimer:'Met deze instellingen timen',
  types:{intl:'International',eval:'Evaluatie',humorous:'Humoristisch',tt:'Table Topics',tall:'Tall Tales',online:'Online'},
  notes:{intl:['De speech moet origineel zijn en grotendeels het eigen werk van de deelnemer.','Deelnemers moeten niveau 1 en 2 van een Pathways-traject hebben afgerond (of DTM zijn); stichtende leden van een club die minder dan een jaar vóór de wedstrijd is opgericht, zijn vrijgesteld.'],
    eval:['Een testspreker houdt een speech van 5–7 minuten; alle deelnemers evalueren dezelfde speech.','Na de testspeech verlaten de deelnemers de zaal met de Sergeant at Arms en hebben ze 5 minuten om notities voor te bereiden.','De testspreker kan geen deelnemer zijn.'],
    humorous:['De speech moet humoristisch en origineel zijn, en grotendeels het eigen werk van de deelnemer.'],
    tt:['Alle deelnemers beantwoorden dezelfde vraag.','Alle deelnemers behalve de eerste wachten buiten de zaal met de Sergeant at Arms en komen één voor één binnen.'],
    tall:['Een verhaal vol overdrijving en fantasie, origineel en grotendeels het eigen werk van de deelnemer.'],
    online:['Vindt plaats op een videoplatform; deelnemers spreken live met de camera aan.','Naast de twee tijdwaarnemers is een reserve-tijdwaarnemer verplicht.']},
  toolsTitle:'Tools voor de dag zelf',toolDraw:'Sprekersvolgorde loten',toolTimer:'Wedstrijdtimer',toolAgenda:'Wedstrijdagenda',toolEval:'Evaluatieformulieren',
  checkTitle:'Checklist van de wedstrijdvoorzitter',checkIntro:'Opgeslagen op dit apparaat.',checkDone:'{n} van {total} gedaan',checkReset:'Checklist leegmaken',
  check:['Datum, zaal (of onlinelink) en soort(en) wedstrijd afgesproken met het bestuur en de Area Director','Deelnemers ingeschreven en hun deelnamerecht gecontroleerd (betalend lid van een club in goede staat; niveau 1 en 2 van Pathways voor de International-wedstrijd)','Elke deelnemer heeft de Speaker’s Certification of Eligibility and Originality (1183) ondertekend','Hoofdjurylid aangesteld','Minstens vijf stemmende juryleden en één tiebreak-jurylid gevonden; elk ondertekent de Judge’s Certification (1170)','Twee tellers en twee tijdwaarnemers gevonden (plus een reserve-tijdwaarnemer online)','Sergeant at Arms gevonden, en een testspreker voor de evaluatiewedstrijd','Nieuwste stembiljetten, telformulieren en tijdregistratieformulieren afgedrukt (of onlineversies klaar)','Tijdslampjes (of deze timer) getest, wedstrijdagenda klaar','Certificaten en prijzen klaar','Sprekersvolgorde geloot in het bijzijn van de deelnemers','Briefings gedaan: deelnemers door de wedstrijdvoorzitter; juryleden, tellers en tijdwaarnemers door het hoofdjurylid','Uitslag doorgegeven aan het volgende niveau (Notification of Contest Winner, in het wedstrijdpakket)','Officials en vrijwilligers bedankt'],
  rolesTitle:'Wedstrijdofficials',rolesIntro:'Op clubniveau vraagt het rulebook, tenzij dat niet haalbaar is, om een wedstrijdvoorzitter, een hoofdjurylid, minstens vijf stemmende juryleden, één tiebreak-jurylid, twee tellers en twee tijdwaarnemers.',
  needs:'Documenten',
  roles:{chair:['Wedstrijdvoorzitter','Organiseert de wedstrijd en leidt haar op de dag zelf.',['Plant datum, zaal en officials met het clubbestuur','Controleert de deelnameformulieren en briefet de deelnemers','Introduceert elke deelnemer, houdt de interviews en maakt de winnaars bekend']],
    chief:['Hoofdjurylid','Zorgt dat de jurering eerlijk en volgens de regels verloopt. Stemt niet.',['Werft en briefet de juryleden, tellers en tijdwaarnemers','Wijst het tiebreak-jurylid aan, wiens identiteit geheim blijft','Verzamelt de stembiljetten en tijdregistraties en geeft de uitslag aan de wedstrijdvoorzitter']],
    judge:['Stemmende juryleden','Rangschikken de drie beste deelnemers op het officiële stembiljet.',['Ondertekenen de Judge’s Certification of Eligibility and Code of Ethics','Beoordelen elke speech onafhankelijk, met de handleiding op het stembiljet','Geven het ondertekende stembiljet aan de tellers; blijven waar mogelijk anoniem']],
    tiebreak:['Tiebreak-jurylid','Rangschikt alle deelnemers, zodat een gelijke stand beslecht kan worden.',['Wordt gekozen door het hoofdjurylid en blijft anoniem','Rangschikt alle deelnemers op volgorde op het tiebreak-stembiljet','Het stembiljet wordt alleen gebruikt bij een gelijke stand']],
    counter:['Tellers','Tellen samen met het hoofdjurylid de punten van de stembiljetten.',['Verzamelen de stembiljetten van de juryleden','Tellen de punten op het Counter’s Tally Sheet','Controleren de totalen en geven de uitslag aan het hoofdjurylid']],
    timer:['Tijdwaarnemers','Klokken elke deelnemer en melden tijdsoverschrijdingen.',['De een bedient de groene, gele en rode signalen; de ander de stopwatch','Noteren elke tijd op het tijdregistratieformulier','Geven de tijden en kwalificatie door aan het hoofdjurylid']],
    saa:['Sergeant at Arms','Bereidt de zaal voor en zorgt voor de deelnemers.',['Richt de zaal, het spreekgestoelte, de lampjes en microfoons in','Begeleidt de deelnemers buiten de zaal tijdens de evaluatie- en Table Topics-wedstrijden','Houdt de zaal stil en de deuren dicht tijdens de speeches']],
    test:['Testspreker (evaluatiewedstrijd)','Houdt de speech die alle deelnemers evalueren.',['Bereidt een speech van 5–7 minuten voor die ruimte laat voor evaluatie','Is geen deelnemer aan die wedstrijd']],
    contestant:['Deelnemers','Strijden om de club te vertegenwoordigen op het volgende niveau.',['Ondertekenen de Speaker’s Certification of Eligibility and Originality','Doen mee aan de loting en de briefing','Spreken binnen de tijd en wachten op de minuut stilte tussen de sprekers']]},
  docsTitle:'Officiële documenten',docsIntro:'Op toastmasters.org. De meeste documenten bestaan in de resource library ook in andere talen.',
  docs:{rulebook:'Speech Contest Rulebook',hub:'Speechwedstrijden op toastmasters.org (alle wedstrijdpakketten)',faq:'Veelgestelde vragen over wedstrijden',tutorials:'Tutorials over wedstrijden (online training)',quality:'Conducting Quality Speech Contests (handleiding)',judgeCert:'Judge’s Certification of Eligibility and Code of Ethics',speakerCert:'Speaker’s Certification of Eligibility and Originality',timeSheet:'Tijdregistratieformulier en instructies voor tijdwaarnemers',tally:'Counter’s Tally Sheet (telformulier)',certificates:'Wedstrijdcertificaten',library:'Alle wedstrijdmaterialen (resource library)',ballot:'Juryhandleiding en stembiljet (voor de gekozen wedstrijd)',tie:'Tiebreak-stembiljet (voor de gekozen wedstrijd)',kit:'Wedstrijdpakket (voor de gekozen wedstrijd)'},
  item:'Item {n}',
  linksTitle:'Links van onze club en ons district',linksIntro:'Wedstrijdkalender, inschrijfformulieren, instructies van het district…',linksNone:'Nog geen links.',linksNoneOfficer:'Nog geen links. Voeg de wedstrijdpagina van je district of je eigen documenten toe.',
  linkTitle:'Titel',linkUrl:'Link (https://…)',linkAdd:'Link toevoegen',linkSaved:'Link toegevoegd',linkRemoved:'Link verwijderd',linkBad:'Vul een titel in en een link die begint met https://',linkMax:'Maximaal 20 links'},
ar:{
  pages:{contest:'التنظيم',cofficials:'المسؤولون',cdocs:'الوثائق',cvideos:'شاهد وتعلّم'},
  officialsIntro:'من يفعل ماذا يوم المسابقة، والوثائق التي يحتاجها كل مسؤول. اختر نوع المسابقة للحصول على أوراق التحكيم المناسبة.',
  docsByType:'أوراق التحكيم والحقائب حسب نوع المسابقة',colType:'المسابقة',colBallot:'ورقة الحَكَم',colTie:'ورقة الترجيح',colKit:'الحقيبة',inKit:'في الحقيبة',
  vTitle:'شاهد وتعلّم',vIntro:'الخطابات الفائزة في بطولة العالم للخطابة (World Championship of Public Speaking)، نهائي المسابقة الدولية. شاهدوها معاً في النادي، ثم ناقشوا ما الذي جعلها مؤثرة.',
  vStudyTitle:'كيف تتعلّم من خطاب بطل',
  vStudy:['شاهده مرة للاستمتاع فقط، ثم مرة ثانية والقلم في يدك.','لاحظ الافتتاحية: كم من الوقت يحتاج المتحدث ليُدخلك في القصة؟','ابحث عن الرسالة: هل يمكنك قولها في جملة واحدة؟ كم مرة تعود؟','راقب المسرح: أين يقف المتحدث، ومتى يتحرك ومتى يثبت، ولماذا.','استمع إلى الوقفات وتغيّر الإيقاع والعودة إلى عبارات سابقة.','وقّته: انظر كيف يستثمر الخطاب الدقائق من 5 إلى 7.'],
  vChampion:'بطل العالم {y}',vPlaces:{2:'المركز الثاني',3:'المركز الثالث'},vPlay:'تشغيل خطاب {n}',vOpenYt:'فتح على YouTube',vOfficial:'الصفحة الرسمية',vSearch:'البحث عن الفيديو على YouTube',
  vPlaylist:'قائمة التشغيل الرسمية للخطابات الفائزة',vAll:'كل أبطال العالم منذ 1938',vNote:'تُشغَّل الفيديوهات من YouTube (وضع الخصوصية المحسّن). بعض الفيديوهات لا تُشاهَد إلا على YouTube.',
  vClubTitle:'اختيارات النادي',vClubIntro:'خطابات من ناديك، أو من مسابقات مقاطعتك، أو لمتحدثين آخرين تستحق المشاهدة.',vNone:'لا توجد فيديوهات بعد.',vNoneOfficer:'لا توجد فيديوهات بعد. أضف رابطاً من YouTube أو Vimeo: نهائي مقاطعتك، خطاب مسابقة لأحد الأعضاء…',
  vFTitle:'العنوان',vFUrl:'رابط YouTube أو Vimeo',vFNote:'ما الذي ينبغي ملاحظته (اختياري)',vAdd:'إضافة الفيديو',vSaved:'تمت إضافة الفيديو',vRemoved:'تم حذف الفيديو',vBad:'أدخل عنواناً ورابطاً من YouTube أو Vimeo',vMax:'30 فيديو كحدّ أقصى',
  title:'مسابقات الخطابة',intro:'كل ما تحتاجه لتنظيم مسابقة خطابة في النادي: أنواع المسابقات وأوقاتها، والمسؤولون ومهامهم، والوثائق الرسمية، والأدوات اللازمة يوم المسابقة.',
  rulesNote:'تلخّص هذه الصفحة القواعد فقط. المرجع دائماً هو دليل قوانين المسابقات الساري (Speech Contest Rulebook، إصدار 2026–2027 وقت كتابة هذه الصفحة): اقرأه، وتحقّق من الوثائق على toastmasters.org قبل طباعتها.',
  typeTitle:'نوع المسابقة',timing:'التوقيت',length:'مدة الخطاب',green:'أخضر',yellow:'أصفر',red:'أحمر',window:'نطاق التأهّل',windowText:'من {lo} إلى {hi}. خارج هذا النطاق يُستبعد المتسابق.',
  ballot:'دليل الحَكَم وورقة التحكيم',tie:'دليل حَكَم الترجيح وورقته',kit:'حقيبة المسابقة (كل الاستمارات)',tieInKit:'ورقة حَكَم الترجيح: في حقيبة المسابقة',noBallot:'أوراق التحكيم: في حقيبة المسابقة',
  useTimer:'التوقيت بهذه الإعدادات',
  types:{intl:'الدولية',eval:'التقييم',humorous:'الفكاهية',tt:'الارتجال (Table Topics)',tall:'الحكايات الخيالية (Tall Tales)',online:'عن بُعد'},
  notes:{intl:['يجب أن يكون الخطاب أصيلاً ومن عمل المتسابق في معظمه.','يجب أن يكون المتسابق قد أنهى المستويين 1 و2 من أحد مسارات Pathways (أو حاصلاً على DTM)؛ ويُستثنى الأعضاء المؤسسون لنادٍ تأسس قبل أقل من سنة من المسابقة.'],
    eval:['يلقي متحدث تجريبي خطاباً مدته 5–7 دقائق، ويقيّم كل المتسابقين الخطاب نفسه.','بعد الخطاب التجريبي، يغادر المتسابقون القاعة مع مسؤول التنظيم ولديهم 5 دقائق لتحضير ملاحظاتهم.','لا يمكن للمتحدث التجريبي أن يكون متسابقاً.'],
    humorous:['يجب أن يكون الخطاب فكاهياً وأصيلاً ومن عمل المتسابق في معظمه.'],
    tt:['يجيب كل المتسابقين عن السؤال نفسه.','ينتظر كل المتسابقين ما عدا الأول خارج القاعة مع مسؤول التنظيم، ويدخلون واحداً تلو الآخر.'],
    tall:['حكاية قائمة على المبالغة والخيال، أصيلة ومن عمل المتسابق في معظمها.'],
    online:['تجري على منصة فيديو، ويتحدث المتسابقون مباشرة والكاميرا مشغّلة.','يلزم ميقاتي احتياطي إضافة إلى الميقاتيَّين.']},
  toolsTitle:'أدوات يوم المسابقة',toolDraw:'قرعة ترتيب المتحدثين',toolTimer:'مؤقّت المسابقة',toolAgenda:'جدول أعمال المسابقة',toolEval:'استمارات التقييم',
  checkTitle:'قائمة مهام رئيس المسابقة',checkIntro:'محفوظة على هذا الجهاز.',checkDone:'أُنجز {n} من {total}',checkReset:'مسح القائمة',
  check:['تحديد التاريخ والقاعة (أو رابط الاتصال) ونوع المسابقة مع مجلس الإدارة ومدير المنطقة (Area Director)','تسجيل المتسابقين والتحقق من أهليتهم (عضو مسدّد الاشتراك في نادٍ بوضع سليم؛ المستويان 1 و2 من Pathways للمسابقة الدولية)','توقيع كل متسابق على شهادة الأهلية والأصالة (1183)','تعيين رئيس الحكّام','تجنيد خمسة حكّام مصوّتين على الأقل وحَكَم ترجيح واحد؛ يوقّع كل منهم شهادة الحكّام (1170)','تجنيد عدّادَين اثنين وميقاتيَّين اثنين (وميقاتي احتياطي عن بُعد)','تجنيد مسؤول التنظيم، ومتحدث تجريبي لمسابقة التقييم','طباعة أحدث أوراق التحكيم وأوراق الفرز وسجلات التوقيت (أو تجهيز النسخ الإلكترونية)','تجربة أضواء التوقيت (أو هذا المؤقّت) وتجهيز جدول أعمال المسابقة','تجهيز الشهادات والجوائز','سحب قرعة ترتيب المتحدثين أمام المتسابقين','إجراء الإحاطات: المتسابقون مع رئيس المسابقة؛ والحكّام والعدّادون والميقاتيون مع رئيس الحكّام','إرسال النتائج إلى المستوى التالي (Notification of Contest Winner، في حقيبة المسابقة)','شكر المسؤولين والمتطوعين'],
  rolesTitle:'مسؤولو المسابقة',rolesIntro:'على مستوى النادي، يطلب الدليل، ما لم يتعذّر ذلك، رئيساً للمسابقة، ورئيساً للحكّام، وخمسة حكّام مصوّتين على الأقل، وحَكَم ترجيح واحداً، وعدّادَين اثنين، وميقاتيَّين اثنين.',
  needs:'الوثائق',
  roles:{chair:['رئيس المسابقة','ينظّم المسابقة ويديرها يوم انعقادها.',['يخطط للتاريخ والقاعة والمسؤولين مع مجلس الإدارة','يتحقق من استمارات أهلية المتسابقين ويقدّم لهم الإحاطة','يقدّم كل متسابق، ويجري المقابلات، ويعلن الفائزين']],
    chief:['رئيس الحكّام','يضمن تحكيماً منصفاً ومطابقاً للقواعد. لا يصوّت.',['يجنّد الحكّام والعدّادين والميقاتيين ويقدّم لهم الإحاطة','يعيّن حَكَم الترجيح، وتبقى هويته سرية','يجمع أوراق التحكيم وسجلات التوقيت ويسلّم النتائج لرئيس المسابقة']],
    judge:['الحكّام المصوّتون','يرتّبون أفضل ثلاثة متسابقين على ورقة التحكيم الرسمية.',['يوقّعون شهادة أهلية الحكّام وميثاق الأخلاقيات','يحكّمون كل خطاب باستقلالية، مستعينين بالدليل المرفق بالورقة','يسلّمون الورقة الموقّعة للعدّادين، ويبقون مجهولي الهوية قدر الإمكان']],
    tiebreak:['حَكَم الترجيح','يرتّب كل المتسابقين لحسم حالات التعادل.',['يختاره رئيس الحكّام ويبقى مجهول الهوية','يرتّب كل المتسابقين حسب الترتيب على ورقة الترجيح','لا تُستخدم ورقته إلا عند التعادل']],
    counter:['العدّادون','يحسبون نقاط أوراق التحكيم مع رئيس الحكّام.',['يجمعون أوراق الحكّام','يجمعون النقاط في ورقة فرز الأصوات','يتحققون من المجاميع ويسلّمون النتائج لرئيس الحكّام']],
    timer:['الميقاتيون','يوقّتون كل متسابق ويبلّغون عن تجاوز الوقت.',['أحدهما يُظهر الإشارات الخضراء والصفراء والحمراء، والآخر يشغّل ساعة الإيقاف','يسجّلون كل وقت في سجل التوقيت','يبلّغون رئيس الحكّام بالأوقات والتأهّل']],
    saa:['مسؤول التنظيم','يجهّز القاعة ويهتم بالمتسابقين.',['يجهّز القاعة والمنصة والأضواء والميكروفونات','يرافق المتسابقين خارج القاعة في مسابقتي التقييم والارتجال','يحافظ على هدوء القاعة وإغلاق الأبواب أثناء الخطابات']],
    test:['المتحدث التجريبي (مسابقة التقييم)','يلقي الخطاب الذي يقيّمه كل المتسابقين.',['يحضّر خطاباً مدته 5–7 دقائق يترك مجالاً للتقييم','لا يشارك متسابقاً في تلك المسابقة']],
    contestant:['المتسابقون','يتنافسون لتمثيل النادي في المستوى التالي.',['يوقّعون شهادة الأهلية والأصالة','يشاركون في القرعة والإحاطة','يتحدثون ضمن الوقت وينتظرون دقيقة الصمت بين المتحدثين']]},
  docsTitle:'الوثائق الرسمية',docsIntro:'على toastmasters.org. توجد معظم الوثائق بلغات أخرى أيضاً في مكتبة الموارد، ومنها العربية.',
  docs:{rulebook:'دليل قوانين مسابقات الخطابة (Speech Contest Rulebook)',hub:'المسابقات على toastmasters.org (كل الحقائب)',faq:'الأسئلة الشائعة حول المسابقات',tutorials:'دروس المسابقات (تدريب عبر الإنترنت)',quality:'Conducting Quality Speech Contests (دليل)',judgeCert:'شهادة أهلية الحكّام وميثاق الأخلاقيات',speakerCert:'شهادة أهلية المتسابق وأصالة خطابه',timeSheet:'سجل التوقيت وتعليمات الميقاتيين',tally:'ورقة فرز الأصوات للعدّادين',certificates:'شهادات المسابقات',library:'كل مواد المسابقات (مكتبة الموارد)',ballot:'دليل الحَكَم وورقة التحكيم (للمسابقة المختارة)',tie:'ورقة حَكَم الترجيح (للمسابقة المختارة)',kit:'حقيبة المسابقة (للمسابقة المختارة)'},
  item:'الرقم {n}',
  linksTitle:'روابط النادي والمقاطعة',linksIntro:'جدول المسابقات، واستمارات التسجيل، وتعليمات المقاطعة…',linksNone:'لا توجد روابط بعد.',linksNoneOfficer:'لا توجد روابط بعد. أضف صفحة مسابقات مقاطعتك أو وثائقك الخاصة.',
  linkTitle:'العنوان',linkUrl:'الرابط (https://…)',linkAdd:'إضافة الرابط',linkSaved:'تمت إضافة الرابط',linkRemoved:'تم حذف الرابط',linkBad:'أدخل عنواناً ورابطاً يبدأ بـ https://',linkMax:'20 رابطاً كحدّ أقصى'}
};
const CTL=()=>CT[LANG]||CT.en;

const CON={type:'intl',links:[],videos:[],playing:{},unsub:null,saving:false,
  checks:(()=>{try{const a=JSON.parse(localStorage.getItem('gt-contest-check'));return Array.isArray(a)?a:[]}catch(e){return []}})()};
const saveChecks=()=>{try{localStorage.setItem('gt-contest-check',JSON.stringify(CON.checks))}catch(e){}};
try{const tp=localStorage.getItem('gt-contest-type');if(CONTEST_TYPES.some(x=>x.id===tp))CON.type=tp}catch(e){}

function contestLive(){
  if(CON.unsub)CON.unsub();
  CON.unsub=SH.fs.doc(`clubs/${SH.club}/public/contest`).onSnapshot(s=>{const d=s.exists?s.data():{};
    CON.links=Array.isArray(d.links)?d.links:[];CON.videos=Array.isArray(d.videos)?d.videos:[];softRender()},()=>{});
}

// ---------- views ----------
const ctType=()=>CONTEST_TYPES.find(x=>x.id===CON.type)||CONTEST_TYPES[0];
const ctLink=(label,d)=>{const L=CTL();return d&&safeUrl(d.url)?`<li><a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>${d.n?` <span class="muted">· ${esc(L.item.replace('{n}',d.n))}</span>`:''}</li>`:''};
const ctTypeChips=()=>{const L=CTL();return `<div class="speakers" role="group" aria-label="${esc(L.typeTitle)}">${CONTEST_TYPES.map(x=>chip('ct-type',x.id,x.id===CON.type,esc(L.types[x.id]))).join('')}</div>`};
// Header shared by the four pages (the tabs of the section are in the navigation).
function ctHead(page,title,intro){
  return `<div class="phead"><div><h2>${esc(title)}</h2><p class="muted">${esc(intro)}</p></div></div>`;
}

function contestView(){
  const L=CTL();const ct=ctType();
  const [g,a,r,lo,hi]=ct.time;
  const done=CON.checks.filter(Boolean).length;
  return `<section class="panel">
  ${ctHead('contest',L.title,L.intro)}
  <div class="notice"><span>${esc(L.rulesNote)}</span><a class="btn small" href="${esc(DOCS.rulebook.url)}" target="_blank" rel="noopener noreferrer">${esc(L.docs.rulebook)} ↗</a></div>

  <div class="box">
    <h3>${esc(L.typeTitle)}</h3>
    ${ctTypeChips()}
    <div class="grid2">
      <div>
        <span class="label">${esc(L.timing)}</span>
        <div class="ctime">
          <div><span class="muted">${esc(L.length)}</span><b>${mmss(g)} – ${mmss(r)}</b></div>
          <div class="cg"><span class="dot g"></span>${esc(L.green)} <b>${mmss(g)}</b></div>
          <div class="cg"><span class="dot a"></span>${esc(L.yellow)} <b>${mmss(a)}</b></div>
          <div class="cg"><span class="dot r"></span>${esc(L.red)} <b>${mmss(r)}</b></div>
        </div>
        <p style="margin:8px 0 0"><b>${esc(L.window)}</b><br>${esc(L.windowText.replace('{lo}',mmss(lo)).replace('{hi}',mmss(hi)))}</p>
        <div class="btns" style="margin-top:10px"><button class="small primary" data-act="ct-timer">${esc(L.useTimer)}</button></div>
      </div>
      <div>
        <ul class="ctnotes">${(L.notes[ct.id]||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
        <ul class="ctdocs">
          ${ct.ballot?ctLink(L.ballot,ct.ballot):`<li class="muted">${esc(L.noBallot)}</li>`}
          ${ct.tie?ctLink(L.tie,ct.tie):ct.ballot?`<li class="muted">${esc(L.tieInKit)}</li>`:''}
          ${ctLink(L.kit,{url:ct.kit})}
        </ul>
      </div>
    </div>
  </div>

  <div class="box"><h3>${esc(L.toolsTitle)}</h3>
    <div class="btns">
      ${isOn('draw')?`<button data-act="ct-go" data-v="draw">${esc(L.toolDraw)}</button>`:''}
      ${isOn('timer')?`<button data-act="ct-timer">${esc(L.toolTimer)}</button>`:''}
      ${isOn('agenda')?`<button data-act="ct-agenda">${esc(L.toolAgenda)}</button>`:''}
      ${isOn('eval')?`<button data-act="ct-go" data-v="eval">${esc(L.toolEval)}</button>`:''}
    </div></div>

  <div class="box"><div class="phead"><div><h3>${esc(L.checkTitle)}</h3><p class="muted">${esc(L.checkIntro)} ${esc(L.checkDone.replace('{n}',done).replace('{total}',CHECK_COUNT))}</p></div>
    ${done?`<button class="small ghost" data-act="ct-check-reset">${esc(L.checkReset)}</button>`:''}</div>
    <div class="ctcheck">${L.check.map((x,i)=>`<label class="check" for="ct-c${i}"><input type="checkbox" id="ct-c${i}" data-ctcheck="${i}" ${CON.checks[i]?'checked':''}><span>${esc(x)}</span></label>`).join('')}</div>
  </div>
  </section>`;
}

function contestOfficialsView(){
  const L=CTL();const ct=ctType();
  const resolve=k=>k==='ballot'?ct.ballot:k==='tie'?ct.tie:k==='kit'?{url:ct.kit}:DOCS[k];
  return `<section class="panel">
  ${ctHead('cofficials',L.rolesTitle,L.officialsIntro)}
  <div class="box"><h3>${esc(L.typeTitle)}</h3>${ctTypeChips()}<p class="muted" style="margin:8px 0 0">${esc(L.rolesIntro)}</p>${isOn('roles')?`<div class="btns" style="margin-top:10px"><button class="small primary" data-act="ct-signup">${esc(t('ct.signup'))} →</button></div>`:''}</div>
  ${CONTEST_ROLES.map(([k,docs])=>{const [name,sum,tasks]=L.roles[k];const ds=docs.map(d=>{const v=resolve(d);return v&&v.url?ctLink(L.docs[d],v):''}).join('');
    return `<details class="guide"><summary><h3>${esc(name)}</h3><span class="muted">${esc(sum)}</span></summary>
      <div class="gbody"><div><ul>${tasks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>${ds?`<div><span class="label">${esc(L.needs)}</span><ul class="ctdocs">${ds}</ul></div>`:''}</div></details>`}).join('')}
  </section>`;
}

function contestDocsView(){
  const L=CTL();const canEditLinks=SH.on&&SH.officer===true;
  const cell=d=>d&&safeUrl(d.url)?`<a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">${d.n?esc(d.n):'↗'}</a>`:`<span class="muted">${esc(L.inKit)}</span>`;
  return `<section class="panel">
  ${ctHead('cdocs',L.docsTitle,L.docsIntro)}
  <div class="notice"><span>${esc(L.rulesNote)}</span></div>
  <div class="box"><h3>${esc(L.docsTitle)}</h3>
    <ul class="ctdocs">${['rulebook','judgeCert','speakerCert','timeSheet','tally','certificates','hub','library','faq','tutorials','quality'].map(k=>ctLink(L.docs[k],DOCS[k])).join('')}</ul></div>
  <div class="box"><h3>${esc(L.docsByType)}</h3>
    <div class="tablewrap"><table class="cttable"><thead><tr><th>${esc(L.colType)}</th><th>${esc(L.colBallot)}</th><th>${esc(L.colTie)}</th><th>${esc(L.colKit)}</th></tr></thead>
    <tbody>${CONTEST_TYPES.map(x=>`<tr><td>${esc(L.types[x.id])}</td><td>${cell(x.ballot)}</td><td>${cell(x.tie)}</td><td>${cell({url:x.kit})}</td></tr>`).join('')}</tbody></table></div></div>

  ${SH.on?`<div class="box"><h3>${esc(L.linksTitle)}</h3><p class="muted">${esc(L.linksIntro)}</p>
    ${CON.links.length?`<ul class="ctdocs">${CON.links.map((l,i)=>safeUrl(l.url)?`<li><a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.title)}</a>${canEditLinks?` <button class="ghost small" data-act="ct-link-del" data-i="${i}" aria-label="${esc(t('common.remove')+' '+l.title)}">×</button>`:''}</li>`:'').join('')}</ul>`
      :`<p class="empty">${esc(canEditLinks?L.linksNoneOfficer:L.linksNone)}</p>`}
    ${canEditLinks?`<form class="fields" data-form="ct-link" novalidate>
      <div class="field"><label class="label" for="ct-lt">${esc(L.linkTitle)}</label><input id="ct-lt" maxlength="100"></div>
      <div class="field"><label class="label" for="ct-lu">${esc(L.linkUrl)}</label><input id="ct-lu" type="url" inputmode="url" maxlength="400" placeholder="https://…"></div>
      <div class="btns" style="grid-column:1/-1"><button type="submit" ${CON.saving?'disabled':''}>${esc(L.linkAdd)}</button></div></form>`:''}
  </div>`:''}
  </section>`;
}

// One video card: click-to-play when we have a video id, a link otherwise.
function ctVideoCard(key,v,heading,sub,links,href){
  const L=CTL();
  const player=v?(CON.playing[key]?videoPlayer(v)
    :`<button type="button" class="play" data-act="ct-play" data-id="${esc(key)}" aria-label="${esc(L.vPlay.replace('{n}',heading))}"><span class="tri" aria-hidden="true">▶</span><span>${esc(heading)}</span><small>${esc(sub)}</small></button>`)
    :`<a class="play" href="${esc(href)}" target="_blank" rel="noopener noreferrer"><span class="tri" aria-hidden="true">↗</span><span>${esc(heading)}</span><small>${esc(sub)}</small></a>`;
  return `<figure class="champ"><div class="vid">${player}</div>${links}</figure>`;
}
function contestVideosView(){
  const L=CTL();const canEdit=SH.on&&SH.officer===true;
  const a=(href,label)=>`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
  const champs=CHAMPS.map(c=>{
    const v=c.yt?{kind:'youtube',id:c.yt}:null;
    const href=c.yt?ytWatch(c.yt):c.url||ytSearch(`${c.y} World Champion of Public Speaking ${c.n}`);
    const link=a(href,c.yt?L.vOpenYt:c.url?L.vOfficial:L.vSearch);
    const more=(c.more||[]).map(([p,n,ti,id])=>`<li>${esc(L.vPlaces[p])} · <bdi>${esc(n)}</bdi>${ti?` · <i><bdi>“${esc(ti)}”</bdi></i>`:''} · ${a(ytWatch(id),'YouTube')}</li>`).join('');
    return ctVideoCard('w'+c.y,v,c.n,c.title?`“${c.title}”`:String(c.y),
      `<figcaption><b>${esc(L.vChampion.replace('{y}',c.y))}</b> · <bdi>${esc(c.n)}</bdi>${c.title?` · <i><bdi>“${esc(c.title)}”</bdi></i>`:''}<br><span class="muted"><bdi>${esc(c.from)}</bdi></span> · ${link}${more?`<ul class="podium">${more}</ul>`:''}</figcaption>`,href);
  }).join('');
  const club=CON.videos.map((x,i)=>{const v=videoInfo(x.url);if(!v)return '';
    return ctVideoCard('c'+i+':'+x.url,v,x.title,videoSource(v),
      `<figcaption><b><bdi>${esc(x.title)}</bdi></b>${x.note?`<br><span class="muted">${esc(x.note)}</span>`:''}${canEdit?` <button class="ghost small" data-act="ct-video-del" data-i="${i}" aria-label="${esc(t('common.remove')+' '+x.title)}">×</button>`:''}</figcaption>`)}).join('');
  return `<section class="panel">
  ${ctHead('cvideos',L.vTitle,L.vIntro)}
  <div class="box"><h3>${esc(L.vStudyTitle)}</h3><ol class="ctnotes">${L.vStudy.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>

  ${SH.on?`<div class="box"><h3>${esc(L.vClubTitle)}</h3><p class="muted">${esc(L.vClubIntro)}</p>
    ${club?`<div class="videos champs">${club}</div>`:`<p class="empty">${esc(canEdit?L.vNoneOfficer:L.vNone)}</p>`}
    ${canEdit?`<form class="fields" data-form="ct-video" novalidate>
      <div class="field"><label class="label" for="ct-vt">${esc(L.vFTitle)}</label><input id="ct-vt" maxlength="100"></div>
      <div class="field"><label class="label" for="ct-vu">${esc(L.vFUrl)}</label><input id="ct-vu" type="url" inputmode="url" maxlength="400" placeholder="https://youtu.be/…"></div>
      <div class="field" style="grid-column:1/-1"><label class="label" for="ct-vn">${esc(L.vFNote)}</label><input id="ct-vn" maxlength="200"></div>
      <div class="btns" style="grid-column:1/-1"><button type="submit" ${CON.saving?'disabled':''}>${esc(L.vAdd)}</button></div></form>`:''}
  </div>`:''}

  <div class="box"><div class="phead"><div><h3>${esc(L.vTitle)}</h3><p class="muted">${esc(L.vNote)}</p></div>
    <div class="btns">${`<a class="btn small" href="${esc(WCPS_PLAYLIST)}" target="_blank" rel="noopener noreferrer">${esc(L.vPlaylist)} ↗</a><a class="btn small ghost" href="${esc(WCPS_PAGE)}" target="_blank" rel="noopener noreferrer">${esc(L.vAll)} ↗</a>`}</div></div>
    <div class="videos champs">${champs}</div></div>
  </section>`;
}

// ---------- actions ----------
function contestTimer(){
  const ct=CONTEST_TYPES.find(x=>x.id===CON.type)||CONTEST_TYPES[0];
  S.timer.preset=ct.preset;save();setTab('timer');
}
async function saveContest(field,list){
  CON.saving=true;render();
  try{await SH.fs.doc(`clubs/${SH.club}/public/contest`).set({[field]:list,updatedAt:new Date().toISOString(),updatedBy:SH.user.email},{merge:true});CON[field]=list;CON.saving=false;return true}
  catch(e){writeFail(e);CON.saving=false;render();return false}
}
document.addEventListener('change',ev=>{
  const i=ev.target.dataset&&ev.target.dataset.ctcheck;if(i===undefined)return;
  CON.checks[+i]=ev.target.checked;saveChecks();render();
});
document.addEventListener('submit',async ev=>{
  if(ev.target.dataset.form!=='ct-link')return;ev.preventDefault();const L=CTL();
  const title=document.getElementById('ct-lt').value.trim().slice(0,100);let url=document.getElementById('ct-lu').value.trim();
  if(url&&!/^[a-z]+:/i.test(url))url='https://'+url;
  if(!title||!safeUrl(url)){toast(L.linkBad);return}
  if(CON.links.length>=20){toast(L.linkMax);return}
  if(await saveContest('links',[...CON.links,{title,url:safeUrl(url)}])){render();toast(L.linkSaved)}
});
document.addEventListener('submit',async ev=>{
  if(ev.target.dataset.form!=='ct-video')return;ev.preventDefault();const L=CTL();
  const title=document.getElementById('ct-vt').value.trim().slice(0,100);let url=document.getElementById('ct-vu').value.trim();
  const note=document.getElementById('ct-vn').value.trim().slice(0,200);
  if(url&&!/^[a-z]+:/i.test(url))url='https://'+url;
  const v=videoInfo(url);
  if(!title||!v||v.kind==='file'){toast(L.vBad);return}
  if(CON.videos.length>=30){toast(L.vMax);return}
  if(await saveContest('videos',[...CON.videos,{title,url:safeUrl(url),note}])){render();toast(L.vSaved)}
});
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-act]');if(!b||!b.dataset.act.startsWith('ct-'))return;const L=CTL();
  switch(b.dataset.act){
  case 'ct-type':CON.type=b.dataset.v;try{localStorage.setItem('gt-contest-type',CON.type)}catch(e){}render();return;
  case 'ct-timer':contestTimer();return;
  case 'ct-signup':if(!(SH.on&&!canEditMeeting())&&rolesMode()!=='contest'){S.agenda.rolesMode='contest';save();pushAgenda()}setTab('roles');return;
  case 'ct-go':setTab(b.dataset.v);return;
  case 'ct-agenda':if(typeof TPL!=='undefined'){TPL.sel='b:contest';TPL.confirm=false}setTab('agenda');setTimeout(()=>{const s=document.getElementById('tpl-pick');if(s)s.scrollIntoView({block:'center'})},50);return;
  case 'ct-check-reset':CON.checks=[];saveChecks();render();return;
  case 'ct-link-del':{const links=CON.links.filter((_,i)=>i!==+b.dataset.i);if(await saveContest('links',links)){render();toast(L.linkRemoved)}return}
  case 'ct-video-del':{const vids=CON.videos.filter((_,i)=>i!==+b.dataset.i);CON.playing={};if(await saveContest('videos',vids)){render();toast(L.vRemoved)}return}
  case 'ct-play':CON.playing={[b.dataset.id]:true};render();return;
  }
});
