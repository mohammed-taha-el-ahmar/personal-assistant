// Orato – premium features, switched on per club by the Orato administrator.
// Stored in clubs/{club}/public/plan as {features:{<id>:{until:'YYYY-MM-DD'|null,untilMs:number|null,since:'YYYY-MM-DD'}},
// updatedAt,updatedBy}: everyone reads it (so members see the premium tools), only the administrator writes it.
// A feature without an end date stays active until it is switched off; with one, it stops at the end of that day.
// The Firestore rules enforce the same thing on premium data with planFeature(club, id): hiding a tab is not protection.
//
// To make a tab or an option premium, add it to PREMIUM_KEYS with the feature that unlocks it: isOn() (modules.js)
// then hides it in clubs without that feature.

const FEATURES=[
  {id:'contestsPro',status:'soon'},  // judges' ballots on phones, secret counting, tiebreak, certificates, area/division/district contests
  {id:'officerKit',status:'soon'},   // officer training, events, participation, action plan, announcements to members
  {id:'stats',status:'soon'}         // club statistics and DCP progress
];
const FEATURE_IDS=FEATURES.map(f=>f.id);
const PREMIUM_KEYS={};               // tab or option key -> feature id, e.g. {cballots:'contestsPro'}
const PLAN={features:{},loaded:false,unsub:null};

const endOfDayMs=d=>{const [y,m,dd]=d.split('-').map(Number);return new Date(y,m-1,dd,23,59,59,999).getTime()};
function featureState(id,plan=PLAN.features){
  const f=plan&&plan[id];if(!f)return 'off';
  return f.untilMs&&f.untilMs<Date.now()?'expired':'on';
}
const hasFeature=id=>featureState(id)==='on';
const premiumLocked=key=>PREMIUM_KEYS[key]&&!hasFeature(PREMIUM_KEYS[key]);

function planLive(){
  if(PLAN.unsub)PLAN.unsub();
  PLAN.unsub=SH.fs.doc(`clubs/${SH.club}/public/plan`).onSnapshot(s=>{
    const d=s.exists?s.data():{};PLAN.features=d.features&&typeof d.features==='object'?d.features:{};PLAN.loaded=true;render();
  },()=>{PLAN.loaded=true});
}

const featureChip=(st,f)=>st==='on'?`<span class="chip ok">${t('plan.active')}${f&&f.until?' · '+t('plan.until',{d:esc(fmtDate(f.until))}):''}</span>`
  :st==='expired'?`<span class="chip warn">${t('plan.expired',{d:esc(fmtDate(f.until))})}</span>`:`<span class="chip">${t('plan.inactive')}</span>`;

// Club officers' page: what the club has, and how to ask for more.
function planBox(){
  const any=FEATURE_IDS.some(id=>featureState(id)!=='off');
  const contact=typeof REQ!=='undefined'&&REQ.contact||'';
  return `<div class="box"><div class="phead"><div><h3>${t('plan.title')}</h3><p class="muted">${t('plan.intro')}</p></div>
    <span class="chip ${any?'ok':''}">${any?t('plan.premium'):t('plan.free')}</span></div>
    <ul class="planlist">${FEATURES.map(f=>{const st=featureState(f.id);return `<li><div><b>${t('feat.'+f.id)}</b>${f.status==='soon'?` <span class="chip">${t('plan.soon')}</span>`:''}<br><span class="muted">${t('feat.'+f.id+'.d')}</span></div>${featureChip(st,PLAN.features[f.id])}</li>`}).join('')}</ul>
    <p class="muted" style="font-size:.85rem;margin:0">${contact?t('plan.ask',{contact:esc(contact)}):t('plan.askNoContact')}</p></div>`;
}

// ---------- administrator ----------
const PLANADM={plans:{},open:null,draft:null,saving:false,loading:{}};
async function loadClubPlan(id){
  if(PLANADM.loading[id])return;PLANADM.loading[id]=true;
  try{const s=await SH.fs.doc(`clubs/${id}/public/plan`).get();PLANADM.plans[id]=s.exists&&s.data().features||{}}catch(e){PLANADM.plans[id]={}}
  PLANADM.loading[id]=false;render();
}
function planCell(c){
  const p=PLANADM.plans[c.id];
  if(p===undefined){loadClubPlan(c.id);return `<span class="muted">…</span>`}
  const on=FEATURE_IDS.filter(id=>featureState(id,p)==='on'),exp=FEATURE_IDS.filter(id=>featureState(id,p)==='expired');
  return `${on.length?`<span class="chip ok">${t('plan.nOn',{n:on.length})}</span>`:`<span class="chip">${t('plan.free')}</span>`}${exp.length?` <span class="chip warn">${t('plan.nExpired',{n:exp.length})}</span>`:''}
    <button class="small ghost" data-act="plan-edit" data-id="${esc(c.id)}" aria-expanded="${PLANADM.open===c.id}">${t('plan.manage')}</button>`;
}
function planEditor(c){
  if(PLANADM.open!==c.id||!PLANADM.draft)return '';
  const d=PLANADM.draft;
  return `<tr class="planrow"><td colspan="6"><form data-form="plan" data-id="${esc(c.id)}" class="planedit">
    <p class="muted" style="margin:0 0 8px">${t('plan.editIntro',{club:esc(c.name||c.id)})}</p>
    ${FEATURES.map(f=>{const x=d[f.id];return `<div class="planf">
      <label class="check" for="pf-${f.id}"><input type="checkbox" id="pf-${f.id}" data-planf="${f.id}" ${x?'checked':''}><span><b>${t('feat.'+f.id)}</b>${f.status==='soon'?` <span class="chip">${t('plan.soon')}</span>`:''}</span></label>
      <label class="planuntil"><span class="label">${t('plan.untilLabel')}</span><input type="date" data-planu="${f.id}" value="${esc(x&&x.until||'')}" ${x?'':'disabled'}></label></div>`}).join('')}
    <p class="muted" style="font-size:.85rem">${t('plan.untilHint')}</p>
    <div class="btns"><button type="submit" class="primary" ${PLANADM.saving?'disabled':''}>${t('cl.save')}</button><button type="button" class="ghost" data-act="plan-cancel">${t('common.cancel')}</button></div>
  </form></td></tr>`;
}
async function savePlan(id){
  const features={};const today=todayISO();
  Object.entries(PLANADM.draft).forEach(([k,v])=>{if(!v||!FEATURE_IDS.includes(k))return;
    const until=/^\d{4}-\d{2}-\d{2}$/.test(v.until||'')?v.until:null;
    features[k]={since:v.since||today,until,untilMs:until?endOfDayMs(until):null}});
  PLANADM.saving=true;render();
  try{await SH.fs.doc(`clubs/${id}/public/plan`).set({features,updatedAt:new Date().toISOString(),updatedBy:SH.user.email});
    PLANADM.plans[id]=features;PLANADM.open=null;PLANADM.draft=null;toast(t('plan.saved'))}
  catch(e){writeFail(e)}
  PLANADM.saving=false;render();
}
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act^="plan-"]');if(!b)return;
  if(b.dataset.act==='plan-edit'){const id=b.dataset.id;
    if(PLANADM.open===id){PLANADM.open=null;PLANADM.draft=null}else{PLANADM.open=id;PLANADM.draft=clone(PLANADM.plans[id]||{})}render()}
  if(b.dataset.act==='plan-cancel'){PLANADM.open=null;PLANADM.draft=null;render()}
});
document.addEventListener('change',ev=>{
  const el=ev.target;if(!PLANADM.draft)return;
  if(el.dataset.planf){const k=el.dataset.planf;if(el.checked)PLANADM.draft[k]=PLANADM.draft[k]||{until:null};else delete PLANADM.draft[k];
    const u=document.querySelector(`[data-planu="${k}"]`);if(u)u.disabled=!el.checked}
  if(el.dataset.planu){const k=el.dataset.planu;if(PLANADM.draft[k])PLANADM.draft[k].until=el.value||null}
});
document.addEventListener('submit',ev=>{if(ev.target.dataset.form!=='plan')return;ev.preventDefault();savePlan(ev.target.dataset.id)});
