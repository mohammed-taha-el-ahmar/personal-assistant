// Toastmasters Tools – club-level choice of which sections, tabs and features members see.
// Useful when a club already uses another tool (easy-Speak, for example) for some of these jobs.
// Stored in clubs/{club}/public/modules as {disabled:[keys]}; everyone reads it, officers change it.
// Without a club link every tool stays visible. The Club officers tab is always visible so officers can undo a choice.

const MODULE_SECTIONS=[
  {id:'club',    label:'nav.club',   tabs:['club'],                                    subs:[['office.roles','mod.sub.officeRoles']]},
  {id:'during',  label:'nav.during', tabs:['timer','ah','gram','topics','vote'],        subs:[['reports','mod.sub.reports']]},
  {id:'before',  label:'nav.before', tabs:['agenda','roles','draw','guides','eval'],    subs:[['agenda.templates','mod.sub.templates']]},
  {id:'after',   label:'nav.after',  tabs:['feedback'],                                 subs:[]}
];
const ALWAYS_ON=['office'];
const MODS={disabled:[],unsub:null,saving:false};

function modulesLive(){
  if(MODS.unsub)MODS.unsub();
  MODS.unsub=SH.fs.doc(`clubs/${SH.club}/public/modules`).onSnapshot(s=>{
    MODS.disabled=s.exists&&Array.isArray(s.data().disabled)?s.data().disabled:[];
    render();
  },()=>{});
}
// Is this tab or feature shown? Everything is shown without a club link.
function isOn(key){return !SH.on||ALWAYS_ON.includes(key)||!MODS.disabled.includes(key)}
const firstOnTab=()=>TABS.find(isOn)||'office';

// Hide disabled tabs, and whole sections when none of their tabs is left. Called on every render.
function applyModules(){
  document.querySelectorAll('.tab[data-tab]').forEach(b=>{b.hidden=!isOn(b.dataset.tab)});
  document.querySelectorAll('nav.tabs .group').forEach(g=>{g.hidden=![...g.querySelectorAll('.tab')].some(b=>!b.hidden)});
  if(!isOn(tab)){tab=firstOnTab();try{history.replaceState(null,'',location.pathname+location.search+'#'+tab)}catch(e){}}
}

// ---------- officers' settings ----------
function modulesBox(){
  const off=k=>MODS.disabled.includes(k);
  const box=(key,label,cls='')=>`<label class="check ${cls}" for="mod-${key.replace('.','-')}"><input type="checkbox" id="mod-${key.replace('.','-')}" data-mod="${key}" ${off(key)?'':'checked'} ${MODS.saving?'disabled':''}><span>${label}</span></label>`;
  return `<div class="box"><div><h3>${t('mod.title')}</h3><p class="muted">${t('mod.intro')}</p></div>
    <div class="modgrid">${MODULE_SECTIONS.map(sec=>{
      const allOff=sec.tabs.every(off);
      return `<fieldset class="modsec"><legend>
          <label class="check" for="mod-sec-${sec.id}"><input type="checkbox" id="mod-sec-${sec.id}" data-modsec="${sec.id}" ${allOff?'':'checked'} ${MODS.saving?'disabled':''}><b>${t(sec.label)}</b></label></legend>
        ${sec.tabs.map(k=>box(k,t('tab.'+k))).join('')}
        ${sec.subs.map(([k,l])=>box(k,t(l),'sub')).join('')}
        ${sec.id==='club'?`<p class="muted" style="font-size:.85rem;margin:4px 0 0">${t('mod.officeAlways')}</p>`:''}
      </fieldset>`}).join('')}</div>
    <p class="muted" style="font-size:.85rem">${t('mod.note')}</p>
  </div>`;
}
async function saveModules(disabled){
  MODS.disabled=[...new Set(disabled)].filter(k=>!ALWAYS_ON.includes(k));MODS.saving=true;render();
  try{await SH.fs.doc(`clubs/${SH.club}/public/modules`).set({disabled:MODS.disabled,updatedAt:new Date().toISOString(),updatedBy:SH.user.email})}
  catch(e){writeFail(e)}
  MODS.saving=false;render();
}
document.addEventListener('change',ev=>{
  const el=ev.target;const k=el.dataset&&el.dataset.mod,sec=el.dataset&&el.dataset.modsec;
  if(!k&&!sec)return;
  let d=[...MODS.disabled];
  if(k)d=el.checked?d.filter(x=>x!==k):[...d,k];
  if(sec){const s=MODULE_SECTIONS.find(x=>x.id===sec);const keys=[...s.tabs,...s.subs.map(x=>x[0])];d=el.checked?d.filter(x=>!keys.includes(x)):[...d,...keys]}
  saveModules(d);
});
