// Orato – help for new visitors: a welcome banner on the first visit, a "Getting started" guide (the ? button in
// the header), an ⓘ button next to the title of every page, and small ⓘ buttons next to features that need a word
// of explanation. Help texts are kept here, in English and French, apart from the interface strings in i18n.js.

const HELP_SEEN_KEY='gt-welcome-seen';
const HELP={open:null};
const H={
en:{
  ui:{info:'Help about this page',tip:'More information',close:'Got it',guide:'Getting started',guideBtn:'Help',
    welcomeTitle:'Welcome to Orato!',welcomeText:'Free tools to prepare, run and follow up your club meetings. Take one minute to see how it works.',
    welcomeGo:'Discover Orato',welcomeLater:'Not now',what:'What it is for',how:'How to use it',tips:'Good to know',go:'Open'},
  guide:{
    intro:'Orato gathers the tools of a club meeting in one page that works on a phone, a laptop or a projector. No app to install, no account for members.',
    sections:[['club','Club','The club page (presentation, photos, events), the guest book, the officers’ space and the member list.'],
      ['timer','During the meeting','Timer with green/amber/red lights, Ah-Counter, Grammarian, Table Topics questions and live voting.'],
      ['agenda','Before the meeting','Agenda with templates and PDF, role sign-up, random speaking order, role guides and evaluation forms.'],
      ['feedback','After the meeting','A short feedback form for members and guests, with a QR code to show on screen.']],
    levelsTitle:'Who can do what',
    levels:['<b>Without a club link</b>, every tool works on your device only: ideal to try Orato or to time a speech.',
      '<b>With your club link</b> (…?club=your-club), roles, agenda and votes are shared live with everyone who opens it.',
      '<b>Members</b> enter the member code once on their phone to take a role and send their reports.',
      '<b>Officers</b> sign in (Google or password) to edit the agenda, archive meetings and manage the club.'],
    startTitle:'Your club is new to Orato?',
    start:'Open the site with the link of your club (…?club=your-club-name), go to the <b>Club officers</b> tab and send a creation request. The Orato administrator approves it, and you become the first officer of your club space.',
    footer:'Look for the <b>ⓘ</b> buttons next to page titles and features: they explain each tool in a few lines.'},
  tabs:{
    club:['The club’s home page: who you are, practical information, photos and videos, social networks, ratings and testimonials, announcements and events.',['Members and guests open it with the club link.','Officers click “Edit the club page” to fill it in.','“See the agenda” and “Take a role” lead to the next meeting.'],['Share the club link or its QR code: it opens on this page.']],
    guestbook:['Guests sign in when they arrive, so the club can welcome them and keep in touch.',['Show the guest book QR code at the door, or leave a tablet there.','Each guest fills in their name and, if they wish, an email or phone.','After each guest, “Sign in another guest” clears the form.'],['Only officers see the entries. Guests can ask for their details to be deleted at any time.']],
    members:['The member list, dues renewals and the follow-up of guests, for officers only.',['Add members one by one or import a CSV file.','For each dues period, mark members Paid, Pending or Not renewing.','In the guest book list, “Add as member” fills the form for you.'],['“Copy emails of members who haven’t paid” prepares a reminder in one click.']],
    office:['The officers’ space: the roles of the bureau for everyone, and for signed-in officers the tools to run the club.',['Officers sign in: Gmail addresses with Google, any other address with a password.','Close each meeting to archive it in the history.','Set up member access, the sections shown, and the officer list.'],['Not an officer? You can still say you’re interested in a role with the form on this page.']],
    timer:['Times each speech and shows green, amber and red lights at the right moments.',['Choose the type of speech (or custom times) and type the speaker’s name.','Press Start (or the space bar), then “Stop & record”.','Full screen turns the screen into a big light for the room.'],['Press H to hide the time and show colours only. Recorded times build the Timer report.']],
    ah:['Counts filler words (um, uh, so…) for each speaker.',['Add the speakers, pick the one speaking.','Tap a word each time you hear it; “Undo last tap” fixes a mistake.','Copy or send the report at the end.'],['“Edit words” lets you add your club’s own filler words.']],
    gram:['Supports the Grammarian: word of the day, who used it, good expressions and things to improve.',['Fill in the word of the day before the meeting.','Add the speakers and count each use with + and −.','Note good phrases and improvements, then copy or send the report.'],[]],
    topics:['Draws Table Topics questions at random, by theme, without repeats.',['Choose a theme (or all).','Press “Draw a question” for each speaker.','“Time this answer” opens the timer set for Table Topics.'],['Add your own questions: they are kept on this device.']],
    vote:['Live voting from each person’s phone: Best Speaker, Best Evaluator, Best Table Topic…',['The person running the vote types the nominees for each category.','Everyone votes on their phone; they can change their vote until results are shown.','The person who launched the vote (or an officer) shows the results.'],['Results stay hidden until someone presses “Reveal results”. One ballot per phone.']],
    agenda:['Builds the meeting agenda with times, roles and the online link, and downloads it as a PDF.',['Pick a template (2 speeches, 3 speeches, contest…) to start quickly.','Adjust items, durations and roles; times are calculated for you.','Download the PDF or copy the text for your club chat.'],['Names come from the Roles tab automatically. With member access on, only officers edit the agenda.']],
    roles:['Role sign-up for the next meeting.',['Type your name once at the top.','Tap “Take it” next to a free role.','“Copy open roles message” prepares a message for the club chat.'],['You can give up a role you took. Officers can assign roles to anyone.']],
    draw:['Draws a fair random speaking order, for contests or speakers.',['Type or paste the names (one per line), or take them from the Roles tab.','Press “Draw the order”: with a club link, everyone sees the same result.','Project it full screen, or send it to the contest agenda.'],['Each new draw is numbered, so the room knows which one counts.']],
    guides:['A short guide for each meeting role: what to do before, during and after the meeting.',['Open the role you will hold.','Read the three steps.'],['Perfect for a first time in a role, or to brief a guest.']],
    eval:['Evaluation forms for each type: speech, Table Topics, evaluator, Toastmaster of the Evening…',['Add a form and choose its type: the criteria are filled in.','Rename, reorder, remove or add criteria.','Download filled in or blank as a PDF, to print or send to the speaker.'],['Forms stay on your device.']],
    feedback:['A one-minute feedback form about the meeting, for members and guests.',['Show the feedback QR code at the end of the meeting.','Each person answers once from their phone.','Officers read the results in their space.'],['Guests can leave an email if they want the club to contact them.']]},
  tips:{
    live:'This link is your club space. Everyone who opens it shares the same roles, agenda and votes, live. Share it in your club chat or show its QR code.',
    memberCode:'The member code is given by your officers. Enter it once on your phone: you can then take a role and send your reports. Guests don’t need it.',
    access:'Member access protects your club space: visitors with only the link can read and vote, members (with the code) take roles, officers edit everything. Change the code at the start of each club year.',
    voteOwner:'Typing the nominees launches a vote. Until its results are shown, only you and the officers can show them or start another vote.',
    templates:'A template fills the agenda with a ready-made running order. Officers can save your club’s own templates for everyone.',
    timerDisplay:'“Colors only” hides the time and shows just the green, amber and red lights, as with real timing lights. Press H to switch.',
    renewal:'Toastmasters dues are paid twice a year: for October–March and for April–September. Each period keeps its own status, so past ones stay visible.',
    modules:'If your club already uses another tool for some jobs, hide those tabs here. It applies to everyone, and you can undo it at any time.',
    draw:'One name per line. Duplicates are removed. The draw uses your device’s secure random generator.',
    request:'Each club space is checked by the Orato administrator before it opens. After approval, you become the first officer and add the others.'}},
fr:{
  ui:{info:'Aide sur cette page',tip:'Plus d’informations',close:'J’ai compris',guide:'Bien démarrer',guideBtn:'Aide',
    welcomeTitle:'Bienvenue sur Orato !',welcomeText:'Des outils gratuits pour préparer, animer et suivre les réunions de votre club. Prenez une minute pour découvrir comment ça marche.',
    welcomeGo:'Découvrir Orato',welcomeLater:'Plus tard',what:'À quoi ça sert',how:'Comment l’utiliser',tips:'Bon à savoir',go:'Ouvrir'},
  guide:{
    intro:'Orato réunit les outils d’une réunion de club sur une seule page, qui fonctionne sur téléphone, ordinateur ou vidéoprojecteur. Rien à installer, aucun compte pour les membres.',
    sections:[['club','Club','La page du club (présentation, photos, événements), le livre d’accueil, l’espace bureau et la liste des membres.'],
      ['timer','Pendant la réunion','Chrono avec feux vert/orange/rouge, compteur d’hésitations, grammairien, questions d’improvisation et votes en direct.'],
      ['agenda','Avant la réunion','Ordre du jour avec modèles et PDF, inscription aux rôles, tirage au sort de l’ordre de passage, guides des rôles et fiches d’évaluation.'],
      ['feedback','Après la réunion','Un court formulaire d’avis pour les membres et les invités, avec un QR code à afficher à l’écran.']],
    levelsTitle:'Qui peut faire quoi',
    levels:['<b>Sans lien de club</b>, chaque outil fonctionne uniquement sur votre appareil : idéal pour essayer Orato ou chronométrer un discours.',
      '<b>Avec le lien de votre club</b> (…?club=votre-club), les rôles, l’ordre du jour et les votes sont partagés en direct avec tous ceux qui l’ouvrent.',
      '<b>Les membres</b> saisissent une fois le code membre sur leur téléphone pour prendre un rôle et envoyer leurs rapports.',
      '<b>Les membres du bureau</b> se connectent (Google ou mot de passe) pour modifier l’ordre du jour, archiver les réunions et gérer le club.'],
    startTitle:'Votre club découvre Orato ?',
    start:'Ouvrez le site avec le lien de votre club (…?club=nom-de-votre-club), allez dans l’onglet <b>Bureau</b> et envoyez une demande de création. L’administrateur d’Orato l’approuve, et vous devenez le premier membre du bureau de l’espace de votre club.',
    footer:'Repérez les boutons <b>ⓘ</b> à côté des titres et des fonctionnalités : ils expliquent chaque outil en quelques lignes.'},
  tabs:{
    club:['La page d’accueil du club : qui vous êtes, les infos pratiques, les photos et vidéos, les réseaux sociaux, la note et les témoignages, les annonces et les événements.',['Membres et invités l’ouvrent avec le lien du club.','Le bureau clique sur « Modifier la page du club » pour la remplir.','« Voir l’ordre du jour » et « Prendre un rôle » mènent à la prochaine réunion.'],['Partagez le lien du club ou son QR code : il s’ouvre sur cette page.']],
    guestbook:['Les invités s’inscrivent à leur arrivée, pour que le club puisse les accueillir et garder le contact.',['Affichez le QR code du livre d’accueil à l’entrée, ou laissez-y une tablette.','Chaque invité indique son nom et, s’il le souhaite, un e-mail ou un téléphone.','Après chaque invité, « Inscrire un autre invité » vide le formulaire.'],['Seul le bureau voit les inscriptions. Les invités peuvent demander leur suppression à tout moment.']],
    members:['La liste des membres, les renouvellements de cotisation et le suivi des invités, réservés au bureau.',['Ajoutez les membres un par un ou importez un fichier CSV.','Pour chaque période, indiquez Payé, En attente ou Ne renouvelle pas.','Dans la liste des invités, « Ajouter comme membre » remplit le formulaire pour vous.'],['« Copier les e-mails des membres qui n’ont pas payé » prépare une relance en un clic.']],
    office:['L’espace du bureau : les rôles du bureau pour tous, et pour les membres du bureau connectés, les outils de gestion du club.',['Les membres du bureau se connectent : adresse Gmail avec Google, toute autre adresse avec un mot de passe.','Clôturez chaque réunion pour l’archiver dans l’historique.','Réglez l’accès membres, les sections affichées et la liste du bureau.'],['Pas encore au bureau ? Vous pouvez manifester votre intérêt pour un rôle avec le formulaire de cette page.']],
    timer:['Chronomètre chaque intervention et affiche les feux vert, orange et rouge au bon moment.',['Choisissez le type d’intervention (ou des temps personnalisés) et saisissez le nom de l’orateur.','Appuyez sur Démarrer (ou la barre d’espace), puis « Arrêter et noter ».','Le plein écran transforme l’écran en grand feu visible de toute la salle.'],['Appuyez sur H pour masquer le temps et n’afficher que les couleurs. Les temps enregistrés forment le rapport du chronométreur.']],
    ah:['Compte les mots parasites (euh, donc, en fait…) de chaque orateur.',['Ajoutez les orateurs et sélectionnez celui qui parle.','Touchez un mot à chaque fois que vous l’entendez ; « Annuler le dernier » corrige une erreur.','Copiez ou envoyez le rapport à la fin.'],['« Modifier les mots » permet d’ajouter les tics de langage propres à votre club.']],
    gram:['Accompagne le grammairien : mot du jour, qui l’a utilisé, belles expressions et points d’amélioration.',['Renseignez le mot du jour avant la réunion.','Ajoutez les orateurs et comptez chaque utilisation avec + et −.','Notez les belles formules et les améliorations, puis copiez ou envoyez le rapport.'],[]],
    topics:['Tire au sort des questions d’improvisation, par thème, sans répétition.',['Choisissez un thème (ou tous).','Appuyez sur « Tirer une question » pour chaque orateur.','« Chronométrer la réponse » ouvre le chrono réglé pour les improvisations.'],['Ajoutez vos propres questions : elles restent sur cet appareil.']],
    vote:['Les votes en direct depuis le téléphone de chacun : meilleur orateur, meilleur évaluateur, meilleure improvisation…',['La personne qui organise le vote saisit les nominés de chaque catégorie.','Chacun vote sur son téléphone et peut changer d’avis jusqu’à l’affichage des résultats.','La personne qui a lancé le vote (ou un membre du bureau) affiche les résultats.'],['Les résultats restent cachés jusqu’à ce que quelqu’un appuie sur « Afficher les résultats ». Un bulletin par téléphone.']],
    agenda:['Construit l’ordre du jour avec les horaires, les rôles et le lien de visio, et le télécharge en PDF.',['Choisissez un modèle (2 discours, 3 discours, concours…) pour démarrer vite.','Ajustez les points, les durées et les rôles : les horaires se calculent seuls.','Téléchargez le PDF ou copiez le texte pour le groupe du club.'],['Les noms viennent automatiquement de l’onglet Rôles. Avec l’accès membres activé, seul le bureau modifie l’ordre du jour.']],
    roles:['L’inscription aux rôles de la prochaine réunion.',['Saisissez votre nom une fois en haut.','Touchez « Je le prends » à côté d’un rôle libre.','« Copier le message « rôles libres » » prépare un message pour le groupe du club.'],['Vous pouvez libérer un rôle que vous avez pris. Le bureau peut attribuer les rôles à n’importe qui.']],
    draw:['Tire au sort un ordre de passage équitable, pour un concours ou les orateurs.',['Saisissez ou collez les noms (un par ligne), ou reprenez-les de l’onglet Rôles.','Appuyez sur « Lancer le tirage » : avec un lien de club, tout le monde voit le même résultat.','Projetez-le en plein écran, ou envoyez-le dans l’ordre du jour du concours.'],['Chaque nouveau tirage est numéroté, pour que la salle sache lequel compte.']],
    guides:['Un guide court pour chaque rôle de la réunion : quoi faire avant, pendant et après.',['Ouvrez le rôle que vous allez tenir.','Lisez les trois étapes.'],['Idéal pour une première fois dans un rôle, ou pour briefer un invité.']],
    eval:['Des fiches d’évaluation par type : discours, improvisation, évaluateur, animateur…',['Ajoutez une fiche et choisissez son type : les critères sont pré-remplis.','Renommez, réordonnez, supprimez ou ajoutez des critères.','Téléchargez-la remplie ou vierge en PDF, pour l’imprimer ou l’envoyer à l’orateur.'],['Les fiches restent sur votre appareil.']],
    feedback:['Un formulaire d’avis d’une minute sur la réunion, pour les membres et les invités.',['Affichez le QR code des avis à la fin de la réunion.','Chacun répond une fois depuis son téléphone.','Le bureau consulte les résultats dans son espace.'],['Les invités peuvent laisser un e-mail s’ils souhaitent être recontactés.']]},
  tips:{
    live:'Ce lien est l’espace de votre club. Tous ceux qui l’ouvrent partagent en direct les mêmes rôles, ordre du jour et votes. Partagez-le dans le groupe du club ou affichez son QR code.',
    memberCode:'Le code membre vous est donné par votre bureau. Saisissez-le une fois sur votre téléphone : vous pourrez alors prendre un rôle et envoyer vos rapports. Les invités n’en ont pas besoin.',
    access:'L’accès membres protège l’espace de votre club : les visiteurs qui n’ont que le lien peuvent lire et voter, les membres (avec le code) prennent des rôles, le bureau modifie tout. Changez le code à chaque début d’année de club.',
    voteOwner:'Saisir les nominés lance un vote. Tant que ses résultats ne sont pas affichés, seuls vous et le bureau pouvez les afficher ou lancer un autre vote.',
    templates:'Un modèle remplit l’ordre du jour avec un déroulé tout prêt. Le bureau peut enregistrer les modèles propres à votre club pour tout le monde.',
    timerDisplay:'« Couleurs uniquement » masque le temps et n’affiche que les feux vert, orange et rouge, comme de vrais feux de chronométrage. Appuyez sur H pour basculer.',
    renewal:'Les cotisations Toastmasters se paient deux fois par an : pour octobre–mars et pour avril–septembre. Chaque période garde son propre statut, les précédentes restent visibles.',
    modules:'Si votre club utilise déjà un autre outil pour certaines tâches, masquez ici les onglets correspondants. Le choix s’applique à tous et se défait à tout moment.',
    draw:'Un nom par ligne. Les doublons sont retirés. Le tirage utilise le générateur aléatoire sécurisé de votre appareil.',
    request:'Chaque espace de club est vérifié par l’administrateur d’Orato avant son ouverture. Après approbation, vous devenez le premier membre du bureau et ajoutez les autres.'}}};
Object.assign(H,window.HELP_EXTRA||{}); // other languages (i18n-nl.js, i18n-ar.js…)
const HL=()=>H[LANG]||H.en;

// Where the small ⓘ buttons go: [tip key, element they follow]. Only placed when that element is on screen.
const HELP_SPOTS=[
  ['live','#main .notice:has([data-act=copy-link]) > span'],
  ['memberCode','label[for=acc-code]'],
  ['access','#main .box:has(.codebig) h3, #main .warn-box h3'],
  ['voteOwner','label[for=v-cands]'],
  ['templates','label[for=tpl-pick]'],
  ['timerDisplay','label[for=t-display]'],
  ['renewal','label[for=mem-period]'],
  ['modules','#main .box:has(.modgrid) h3'],
  ['draw','label[for=dr-names]'],
  ['request','form[data-form=req] h3']];

const infoBtn=(act,key,label)=>`<button type="button" class="infobtn" data-act="${act}" data-help="${key}" aria-label="${esc(label)}" title="${esc(label)}">i</button>`;
// Called after every render: adds the page ⓘ next to the first title, the feature ⓘ buttons, and the welcome banner.
function decorateHelp(){
  if(SH.adminMode)return;
  const L=HL();
  const h2=document.querySelector('#main .phead h2');
  if(h2&&L.tabs[tab]&&!h2.querySelector('.infobtn'))h2.insertAdjacentHTML('beforeend',' '+infoBtn('help-tab',tab,L.ui.info));
  for(const [key,sel] of HELP_SPOTS){
    let els=[];try{els=document.querySelectorAll(sel)}catch(e){continue}
    els.forEach(el=>{if(!el.querySelector('.infobtn'))el.insertAdjacentHTML('beforeend',' '+infoBtn('help-tip',key,L.ui.tip))});
  }
  let seen=false;try{seen=localStorage.getItem(HELP_SEEN_KEY)==='1'}catch(e){seen=true}
  const main=document.getElementById('main');
  if(!seen&&main&&!main.querySelector('.welcome'))main.insertAdjacentHTML('afterbegin',`<div class="welcome"><div><b>${L.ui.welcomeTitle}</b><p>${L.ui.welcomeText}</p></div>
    <div class="btns"><button class="primary small" data-act="help-guide">${L.ui.welcomeGo}</button><button class="small ghost" data-act="help-dismiss">${L.ui.welcomeLater}</button></div></div>`);
  const hb=document.getElementById('helpbtn');if(hb){hb.setAttribute('aria-label',L.ui.guide);hb.title=L.ui.guide;const s=hb.querySelector('.themelabel');if(s)s.textContent=L.ui.guideBtn}
}
function markSeen(){try{localStorage.setItem(HELP_SEEN_KEY,'1')}catch(e){}const w=document.querySelector('#main .welcome');if(w)w.remove()}

// ---------- the help window ----------
function helpHtml(kind,key){
  const L=HL();const list=xs=>`<ul>${xs.map(x=>`<li>${x}</li>`).join('')}</ul>`;
  if(kind==='tab'){
    const [what,how,tips]=L.tabs[key];
    return `<h2>${esc(t('tab.'+key))}</h2><p>${esc(what)}</p>
      <h3>${L.ui.how}</h3><ol>${how.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>
      ${tips.length?`<h3>${L.ui.tips}</h3>${list(tips.map(esc))}`:''}`;
  }
  if(kind==='tip')return `<p>${esc(L.tips[key]||'')}</p>`;
  const G=L.guide;
  return `<h2>${L.ui.guide}</h2><p>${G.intro}</p>
    <div class="guidegrid">${G.sections.filter(([k])=>isOn(k)).map(([k,title,text])=>`<div class="gsec"><b>${esc(title)}</b><span>${esc(text)}</span><button class="small" data-act="help-goto" data-tab="${k}">${L.ui.go} ${isRtl()?'←':'→'}</button></div>`).join('')}</div>
    <h3>${G.levelsTitle}</h3>${list(G.levels)}
    ${SH.on&&SH.officer!==true?'':`<h3>${G.startTitle}</h3><p>${G.start}</p>`}
    <p class="muted">${G.footer}</p>`;
}
function openHelp(kind,key){
  HELP.open={kind,key,back:document.activeElement};
  let el=document.getElementById('helplay');
  if(!el){el=document.createElement('div');el.id='helplay';el.className='qrlay';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el)}
  el.setAttribute('aria-label',kind==='guide'?HL().ui.guide:kind==='tab'?t('tab.'+key):HL().ui.tip);
  el.innerHTML=`<div class="qrcard helpcard ${kind==='tip'?'tipcard':''}">${helpHtml(kind,key)}<div class="btns" style="justify-content:flex-end"><button class="primary" data-act="help-close">${HL().ui.close}</button></div></div>`;
  el.querySelector('[data-act=help-close]').focus();
  if(kind==='guide')markSeen();
}
function closeHelp(){const el=document.getElementById('helplay');if(el)el.remove();const b=HELP.open&&HELP.open.back;HELP.open=null;if(b&&b.focus&&document.contains(b))b.focus()}

document.addEventListener('keydown',e=>{if(HELP.open&&e.key==='Escape')closeHelp()});
document.addEventListener('click',ev=>{
  if(ev.target.id==='helplay'){closeHelp();return}
  const b=ev.target.closest('[data-act]');if(!b||!b.dataset.act.startsWith('help-'))return;
  ev.preventDefault();ev.stopPropagation();
  switch(b.dataset.act){
  case 'help-tab':openHelp('tab',b.dataset.help);return;
  case 'help-tip':openHelp('tip',b.dataset.help);return;
  case 'help-guide':openHelp('guide');return;
  case 'help-close':closeHelp();return;
  case 'help-dismiss':markSeen();return;
  case 'help-goto':closeHelp();setTab(b.dataset.tab);return;
  }
},true);
