// Orato – navigation: 5 sections (a bottom bar on phones, a short top row on larger screens), the tabs of the open
// section in a second row, and the officers' pages (Club officers, Members) behind the Bureau button in the header.
// Tabs hidden by the club (modules.js) or reserved to officers are left out; a section with no tab left disappears.
const NAV_SECTIONS=[
  {id:'club',label:'nav.club',short:'navs.club',tabs:['club','guestbook','directory'],icon:'<path d="M3 10l9-6 9 6v10H3z"/><path d="M9 20v-6h6v6"/>'},
  {id:'during',label:'nav.during',short:'navs.during',tabs:['timer','ah','gram','topics','vote'],icon:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>'},
  {id:'before',label:'nav.before',short:'navs.before',tabs:['agenda','roles','draw','guides','eval'],icon:'<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M4 10h16"/>'},
  {id:'learn',label:'nav.learn',short:'navs.learn',tabs:['speeches','pathways'],icon:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>'},
  {id:'contests',label:'nav.contests',short:'navs.contests',tabs:['contest','cofficials','cdocs','cvideos'],icon:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z"/><path d="M7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4"/>'},
  {id:'after',label:'nav.after',short:'navs.after',tabs:['feedback'],icon:'<path d="M4 5h16v11H8l-4 4z"/>'}
];
const NAV_OFFICE=['me','office','members'];
const navVisible=x=>isOn(x)&&!officerOnlyTab(x);
const navSectionOf=x=>NAV_SECTIONS.find(s=>s.tabs.includes(x));
const navIcon=p=>`<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;

function paintNav(){
  const snav=document.getElementById('snav'),sub=document.getElementById('subnav'),off=document.getElementById('offbtn');
  if(!snav)return;
  const hide=!!SH.adminMode;snav.hidden=sub.hidden=hide;if(off)off.hidden=hide;if(hide)return;
  const cur=navSectionOf(tab);
  snav.innerHTML=NAV_SECTIONS.filter(s=>s.tabs.some(navVisible)).map(s=>
    `<button type="button" data-nav="${s.id}" ${cur===s?'aria-current="page"':''} title="${esc(t(s.label))}">${navIcon(s.icon)}<span>${esc(t(s.short))}</span></button>`).join('');
  const tabs=(cur?cur.tabs:NAV_OFFICE).filter(navVisible);
  sub.innerHTML=tabs.length>1?`<div class="subnav" role="tablist" aria-label="${esc(cur?t(cur.label):t('tab.me'))}">${tabs.map(x=>
    `<button type="button" role="tab" data-tab="${x}" aria-selected="${x===tab}">${esc(t('tab.'+x))}</button>`).join('')}</div>`:'';
  if(off){const u=typeof myProfile==='function'&&myProfile();const label=u&&u.name?firstName(u.name):isMember()?t('tab.me'):t('me.signInShort');
    off.setAttribute('aria-pressed',NAV_OFFICE.includes(tab));off.querySelector('.themelabel').textContent=label;off.title=t('tab.me')}
  const a=sub.querySelector('[aria-selected="true"]');if(a&&a.scrollIntoView&&sub.scrollWidth>sub.clientWidth)a.scrollIntoView({block:'nearest',inline:'nearest'});
}
document.addEventListener('click',ev=>{
  const s=ev.target.closest('#snav [data-nav]');
  if(s){const sec=NAV_SECTIONS.find(x=>x.id===s.dataset.nav);const first=sec.tabs.find(navVisible);
    if(first&&!sec.tabs.includes(tab))setTab(first);else if(first)window.scrollTo({top:0});return}
  const b=ev.target.closest('#subnav [data-tab]');if(b){setTab(b.dataset.tab);return}
  if(ev.target.closest('#offbtn'))setTab(NAV_OFFICE.includes(tab)?tab:'me');
});
