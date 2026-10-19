// Toastmasters Tools – meeting templates for the agenda.
// Built-in templates ship with the site. Club templates are shared through Firestore (clubs/{club}/templates/{id}):
// everyone with the club link can use them, signed-in club officers create, update, rename and delete them.
// Anyone else can keep their own templates on this device.

const TPL_LOCAL_KEY='gt-templates';
const TPL={club:[],local:[],sel:'b:3',confirm:false,confirmDel:false,renaming:false,unsub:null};
try{const l=JSON.parse(localStorage.getItem(TPL_LOCAL_KEY));if(Array.isArray(l))TPL.local=l}catch(e){}
const saveLocalTemplates=()=>{try{localStorage.setItem(TPL_LOCAL_KEY,JSON.stringify(TPL.local))}catch(e){}};

// [key, role, minutes]. Keys are translated through i18n ("agi.<key>"), so built-in templates follow the reader's language.
const BUILTIN_TEMPLATES={
  '2':[['doors','saa',10],['welcome','pres',3],['intro','toastmaster',4],['roles','ge',5],['speech1','s1',7],['speech2','s2',7],
       ['tt','ttm',20],['break','',10],['evals','ge',9],['ttEval','tte',4],['reports','timer',6],['ge','ge',6],['close','toastmaster',4]],
  '3':[['doors','saa',10],['welcome','pres',3],['intro','toastmaster',4],['roles','ge',5],['speech1','s1',7],['speech2','s2',7],['speech3','s3',7],
       ['tt','ttm',20],['break','',10],['evals','ge',12],['ttEval','tte',4],['reports','timer',6],['ge','ge',6],['close','toastmaster',4]],
  'contest':[['doors','saa',15],['welcome','pres',3],['cOpen','toastmaster',5],['cRules','',5],
       ['c1','',8],['c2','',8],['c3','',8],['c4','',8],['cTally','',15],['cResults','',5],['close','pres',3]]
};
const builtinItems=id=>BUILTIN_TEMPLATES[id].map(([k,role,dur])=>({k,role,dur}));

function templateList(){
  return [
    ...Object.keys(BUILTIN_TEMPLATES).map(id=>({id:'b:'+id,group:'builtin',name:t('tpl.b.'+id),items:builtinItems(id)})),
    ...TPL.club.map(x=>({id:'c:'+x.id,group:'club',docId:x.id,name:x.name,items:x.items||[],start:x.start||''})),
    ...TPL.local.map(x=>({id:'d:'+x.id,group:'local',localId:x.id,name:x.name,items:x.items||[],start:x.start||''}))
  ];
}
const findTemplate=id=>templateList().find(x=>x.id===id);
const canEditTemplate=tp=>tp&&(tp.group==='local'||(tp.group==='club'&&SH.on&&SH.officer));
const savesToClub=()=>SH.on&&SH.officer===true;
const totalMinutes=items=>items.reduce((s,it)=>s+(Number(it.dur)||0),0);
const fmtDuration=m=>{const h=Math.floor(m/60),mm=m%60;return h?`${h} h ${String(mm).padStart(2,'0')}`:`${mm} min`};
// What gets stored: the running order only. Club name, date, theme, venue and online link stay with each meeting.
const itemsForSave=items=>items.map(it=>({k:it.k||null,title:it.title||null,role:it.role||'',dur:Math.max(0,Number(it.dur)||0)})).slice(0,40);

// ---------- live club templates ----------
function templatesLive(){
  if(TPL.unsub)TPL.unsub();
  TPL.unsub=SH.fs.collection(`clubs/${SH.club}/templates`).onSnapshot(q=>{
    TPL.club=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    softRender();
  },()=>{});
}

// ---------- view (inside the Agenda tab) ----------
function templatesBox(){
  if(!isOn('agenda.templates'))return '';
  const L=templateList();
  // A template deleted elsewhere falls back to a built-in one.
  if(!findTemplate(TPL.sel))TPL.sel='b:3';
  const cur=findTemplate(TPL.sel);
  const group=(g,label)=>{const xs=L.filter(x=>x.group===g);return xs.length?`<optgroup label="${esc(label)}">${xs.map(x=>`<option value="${esc(x.id)}" ${x.id===TPL.sel?'selected':''}>${esc(x.name)}</option>`).join('')}</optgroup>`:''};
  const editable=canEditTemplate(cur);
  return `<div class="box">
    <div><h3>${t('tpl.title')}</h3><p class="muted">${t('tpl.intro')}</p></div>
    <div class="btns" style="align-items:center">
      <label class="label" for="tpl-pick" style="flex-basis:100%">${t('tpl.choose')}</label>
      <select id="tpl-pick" data-act="tpl-pick" style="width:auto;flex:1;min-width:200px">${group('builtin',t('tpl.g.builtin'))}${group('club',t('tpl.g.club'))}${group('local',t('tpl.g.local'))}</select>
      ${TPL.confirm?'':`<button class="primary" data-act="tpl-apply-ask">${t('tpl.use')}</button>`}
    </div>
    <p class="muted" style="font-size:.9rem">${t('tpl.summary',{n:cur.items.length,d:fmtDuration(totalMinutes(cur.items))})}${cur.group==='club'?' · '+t('tpl.sharedNote'):cur.group==='local'?' · '+t('tpl.localNote'):''}</p>
    ${TPL.confirm?`<div class="notice"><span>${t('tpl.confirm',{name:esc(cur.name)})}</span><div class="btns"><button class="small primary" data-act="tpl-apply">${t('tpl.yesUse')}</button><button class="small" data-act="tpl-cancel">${t('common.cancel')}</button></div></div>`:''}
    ${editable?(TPL.renaming
      ?`<form class="btns" data-form="tpl-rename" style="flex-wrap:nowrap"><input id="tpl-rename" maxlength="60" value="${esc(cur.name)}" aria-label="${t('tpl.name')}"><button type="submit" class="small primary">${t('cl.save')}</button><button type="button" class="small" data-act="tpl-rename-cancel">${t('common.cancel')}</button></form>`
      :`<div class="btns">
        <button class="small" data-act="tpl-update">${t('tpl.update')}</button>
        <button class="small ghost" data-act="tpl-rename">${t('tpl.rename')}</button>
        ${TPL.confirmDel?`<span class="muted" style="align-self:center">${t('tpl.confirmDel',{name:esc(cur.name)})}</span><button class="small" data-act="tpl-del">${t('hist.yesDelete')}</button><button class="small ghost" data-act="tpl-del-cancel">${t('common.cancel')}</button>`
          :`<button class="small ghost" data-act="tpl-del-ask">${t('hist.delete')}</button>`}
      </div>`):''}
    <form class="btns" data-form="tpl-save" style="flex-wrap:nowrap;border-top:1px solid var(--line);padding-top:12px">
      <input id="tpl-name" maxlength="60" placeholder="${t('tpl.namePh')}" aria-label="${t('tpl.name')}">
      <button type="submit">${t('tpl.save')}</button>
    </form>
    <p class="muted" style="font-size:.85rem;margin-top:-6px">${savesToClub()?t('tpl.whereClub'):SH.on?t('tpl.whereLocalLive'):t('tpl.whereLocal')}</p>
  </div>`;
}

// ---------- actions ----------
function applyTemplate(tp){
  S.agenda.items=clone(tp.items).map(it=>({k:it.k||undefined,title:it.title||null,role:it.role||'',dur:Number(it.dur)||0}))
    .map(it=>{if(!it.k)delete it.k;return it});
  if(tp.start)S.agenda.start=tp.start;
  save();pushAgenda();TPL.confirm=false;render();toast(t('tpl.applied',{name:tp.name}));
}
async function saveTemplate(name){
  name=name.trim().slice(0,60);if(!name){toast(t('tpl.needName'));return}
  const data={name,items:itemsForSave(S.agenda.items),start:S.agenda.start||'',updatedAt:new Date().toISOString()};
  if(savesToClub()){
    data.updatedBy=SH.user.email;
    try{const ref=await SH.fs.collection(`clubs/${SH.club}/templates`).add(data);
      if(!TPL.club.some(x=>x.id===ref.id))TPL.club.push({id:ref.id,...data});TPL.sel='c:'+ref.id;toast(t('tpl.savedClub',{name}))}
    catch(e){writeFail(e);return}
  }else{
    const id=Date.now().toString(36)+Math.random().toString(36).slice(2,5);
    TPL.local.push({id,...data});saveLocalTemplates();TPL.sel='d:'+id;toast(t('tpl.savedLocal',{name}));
  }
  render();
}
async function updateTemplate(tp,changes){
  if(tp.group==='club'){
    try{await SH.fs.doc(`clubs/${SH.club}/templates/${tp.docId}`).set({name:tp.name,items:itemsForSave(tp.items),start:tp.start||'',...changes,updatedAt:new Date().toISOString(),updatedBy:SH.user.email})}
    catch(e){writeFail(e);return false}
  }else{
    const x=TPL.local.find(x=>x.id===tp.localId);if(!x)return false;Object.assign(x,changes,{updatedAt:new Date().toISOString()});saveLocalTemplates();
  }
  return true;
}
async function deleteTemplate(tp){
  if(tp.group==='club'){try{await SH.fs.doc(`clubs/${SH.club}/templates/${tp.docId}`).delete()}catch(e){writeFail(e);return}}
  else{TPL.local=TPL.local.filter(x=>x.id!==tp.localId);saveLocalTemplates()}
  TPL.sel='b:3';TPL.confirmDel=false;render();toast(t('tpl.deleted'));
}

document.addEventListener('change',ev=>{
  if(ev.target.dataset.act!=='tpl-pick')return;
  TPL.sel=ev.target.value;TPL.confirm=false;TPL.confirmDel=false;TPL.renaming=false;render();
});
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-act]');if(!b||!b.dataset.act.startsWith('tpl-')||b.tagName==='SELECT')return;
  const tp=findTemplate(TPL.sel);if(!tp)return;
  switch(b.dataset.act){
  case 'tpl-apply-ask':TPL.confirm=true;TPL.confirmDel=false;break;
  case 'tpl-cancel':TPL.confirm=false;break;
  case 'tpl-apply':applyTemplate(tp);return;
  case 'tpl-update':if(await updateTemplate(tp,{items:itemsForSave(S.agenda.items),start:S.agenda.start||''}))toast(t('tpl.updated',{name:tp.name}));break;
  case 'tpl-rename':TPL.renaming=true;render();{const i=document.getElementById('tpl-rename');if(i){i.focus();i.select()}}return;
  case 'tpl-rename-cancel':TPL.renaming=false;break;
  case 'tpl-del-ask':TPL.confirmDel=true;break;
  case 'tpl-del-cancel':TPL.confirmDel=false;break;
  case 'tpl-del':deleteTemplate(tp);return;
  default:return;
  }
  render();
});
document.addEventListener('submit',async ev=>{
  const f=ev.target.dataset.form;if(f!=='tpl-save'&&f!=='tpl-rename')return;ev.preventDefault();
  if(f==='tpl-save'){saveTemplate(document.getElementById('tpl-name').value);return}
  const tp=findTemplate(TPL.sel);const name=document.getElementById('tpl-rename').value.trim().slice(0,60);
  if(!name){toast(t('tpl.needName'));return}
  if(await updateTemplate(tp,{name})){TPL.renaming=false;render();toast(t('tpl.renamed'))}
});
