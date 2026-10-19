// Toastmasters Tools – evaluation forms: several forms per meeting, one type each, with pre-filled criteria
// that can be renamed, reordered, removed or added to. Kept on this device; each form can be copied or saved as a PDF.

const EV_TYPES={
  speech:['open','struct','voice','body','eye','lang','close','obj'],
  tt:['answer','struct','voice','body','confidence','time'],
  evaluator:['commendations','recommendations','structEval','objectives','tone','time'],
  toastmaster:['prep','intros','transitions','timekeep','energy','welcome'],
  ttm:['questions','explain','selection','timekeep','energy'],
  ge:['overview','meetingFlow','functionaries','evaluators','tone','time'],
  functionary:['clarity','accuracy','concise','useful','time'],
  custom:[]
};
const EV_ORDER=Object.keys(EV_TYPES);
const evId=()=>'e'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const critLabel=c=>c.label||t('crit.'+c.k);
let EVconfirmDel=false;

function newEval(type){
  const prev=evCur(true);
  return {id:evId(),type,person:'',evaluator:prev?prev.evaluator:'',date:(S.agenda&&S.agenda.date)||todayISO(),project:'',goals:'',role:'',
    crit:EV_TYPES[type].map(k=>({k,r:0,note:''})),commend:'',recommend:'',encourage:''};
}
// Older versions kept a single speech evaluation in S.eval; turn it into the first form of the list.
function evStore(){
  if(S.evals&&Array.isArray(S.evals.list))return S.evals;
  const e=S.eval||{};const r=e.r||{};
  const first={id:evId(),type:'speech',person:e.speaker||'',evaluator:e.evaluator||'',date:(S.agenda&&S.agenda.date)||todayISO(),
    project:e.project||'',goals:e.goals||'',role:'',crit:EV_TYPES.speech.map(k=>({k,r:r[k]||0,note:''})),
    commend:e.commend||'',recommend:e.recommend||'',encourage:e.encourage||''};
  S.evals={list:[first],cur:first.id};
  return S.evals;
}
function evCur(noCreate){
  const st=S.evals&&Array.isArray(S.evals.list)?S.evals:(noCreate?null:evStore());
  if(!st)return null;
  let e=st.list.find(x=>x.id===st.cur)||st.list[0];
  if(!e&&!noCreate){e=newEval('speech');st.list.push(e)}
  if(e)st.cur=e.id;
  return e;
}
const evTypeName=ty=>t('evt.'+ty);
const evChipLabel=e=>`${e.person||t('ev.unnamed')} · ${evTypeName(e.type)}`;

function evalText(e=evCur()){
  const lines=[`${t('ev.formHead')} – ${evTypeName(e.type).toUpperCase()}`,
    `${t('evp.'+e.type)}: ${e.person}`,`${t('ev.evaluator')}: ${e.evaluator}`];
  if(e.date)lines.push(`${t('ev.date')}: ${fmtDate(e.date)}`);
  if(e.type==='functionary'&&e.role)lines.push(`${t('ev.role')}: ${e.role}`);
  if(e.type==='speech'){if(e.project)lines.push(`${t('ev.project')}: ${e.project}`);if(e.goals)lines.push(`${t('ev.repObjectives')}: ${e.goals}`)}
  lines.push('',t('ev.repRatings'));
  e.crit.forEach(c=>lines.push(`${critLabel(c)}: ${c.r?c.r+'/5 ('+t('scale.'+c.r)+')':t('ev.notRated')}${c.note?' – '+c.note:''}`));
  lines.push('',t('ev.repWell'),e.commend,'',t('ev.repTry'),e.recommend,'',t('ev.repKeep'),e.encourage);
  return lines.join('\n');
}

function evalView(){
  const st=evStore();const e=evCur();
  const dots=(c,i)=>[1,2,3,4,5].map(n=>`<button aria-pressed="${c.r===n}" data-act="ev-rate" data-i="${i}" data-n="${n}" aria-label="${esc(t('ev.of5',{c:critLabel(c),n}))}">${n}</button>`).join('');
  return `<section class="panel">
  <div class="phead"><div><h2>${t('ev.title')}</h2><p class="muted">${t('ev.intro')}</p></div></div>
  ${sampleNotice()}
  <div class="box">
    <div class="speakers">${st.list.map(x=>`<button class="spk" aria-pressed="${x.id===e.id}" data-act="ev-pick" data-id="${x.id}">${esc(evChipLabel(x))}</button>`).join('')}</div>
    <div class="btns" style="align-items:center">
      <label class="label" for="ev-newtype">${t('ev.newOfType')}</label>
      <select id="ev-newtype" style="width:auto;flex:1;min-width:180px">${EV_ORDER.map(ty=>`<option value="${ty}">${evTypeName(ty)}</option>`).join('')}</select>
      <button class="primary" data-act="ev-new">${t('ev.newForm')}</button>
      ${st.list.length>1?`<button data-act="ev-pdf-all">${t('ev.pdfAll',{n:st.list.length})}</button>`:''}
    </div>
  </div>
  <div class="grid2">
  <div class="box">
    <div class="fields">
      <div class="field"><label class="label" for="ev-type">${t('ev.type')}</label><select id="ev-type" data-act="ev-type">${EV_ORDER.map(ty=>`<option value="${ty}" ${ty===e.type?'selected':''}>${evTypeName(ty)}</option>`).join('')}</select></div>
      <div class="field"><label class="label" for="ev-date">${t('ev.date')}</label><input id="ev-date" type="date" data-ev="date" value="${esc(e.date)}"></div>
    </div>
    <p class="muted" style="font-size:.9rem">${t('evd.'+e.type)}</p>
    <div class="fields">
      <div class="field"><label class="label" for="ev-person">${t('evp.'+e.type)}</label><input id="ev-person" data-ev="person" value="${esc(e.person)}"></div>
      <div class="field"><label class="label" for="ev-evaluator">${t('ev.evaluator')}</label><input id="ev-evaluator" data-ev="evaluator" value="${esc(e.evaluator)}"></div>
      ${e.type==='functionary'?`<div class="field"><label class="label" for="ev-role">${t('ev.role')}</label><input id="ev-role" data-ev="role" value="${esc(e.role)}" placeholder="${t('ev.rolePh')}"></div>`:''}
    </div>
    ${e.type==='speech'?`<div class="field"><label class="label" for="ev-project">${t('ev.project')}</label><input id="ev-project" data-ev="project" value="${esc(e.project)}"></div>
    <div class="field"><label class="label" for="ev-goals">${t('ev.goals')}</label><input id="ev-goals" data-ev="goals" value="${esc(e.goals)}"></div>`:''}
    <div><span class="label">${t('ev.criteria')}</span>
      ${e.crit.length?e.crit.map((c,i)=>`<div class="crit">
        <div class="crit-top"><input class="crit-name" id="ev-cl${i}" data-evc="${i}" data-k="label" value="${esc(critLabel(c))}" aria-label="${t('ev.critName')}">
          <div class="ctrls"><button class="ghost small" data-act="ev-up" data-i="${i}" aria-label="${t('ag.up')}">↑</button><button class="ghost small" data-act="ev-down" data-i="${i}" aria-label="${t('ag.down')}">↓</button><button class="ghost small" data-act="ev-cdel" data-i="${i}" aria-label="${t('common.remove')}">×</button></div></div>
        <div class="dots">${dots(c,i)}</div>
        <input id="ev-cn${i}" data-evc="${i}" data-k="note" value="${esc(c.note)}" placeholder="${t('ev.notePh')}" aria-label="${esc(t('ev.noteFor',{c:critLabel(c)}))}">
      </div>`).join(''):`<p class="empty">${t('ev.noCrit')}</p>`}
      <form class="btns" data-form="ev-add" style="flex-wrap:nowrap;margin-top:8px"><input id="ev-newcrit" placeholder="${t('ev.addCritPh')}" maxlength="80"><button type="submit">${t('common.add')}</button></form>
      ${e.type!=='custom'?`<button class="small ghost" data-act="ev-resetcrit" style="margin-top:4px">${t('ev.resetCrit')}</button>`:''}
    </div>
    <div class="field"><label class="label" for="ev-c">${t('ev.commend')}</label><textarea id="ev-c" data-ev="commend">${esc(e.commend)}</textarea></div>
    <div class="field"><label class="label" for="ev-r">${t('ev.recommend')}</label><textarea id="ev-r" data-ev="recommend">${esc(e.recommend)}</textarea></div>
    <div class="field"><label class="label" for="ev-e">${t('ev.encourage')}</label><textarea id="ev-e" data-ev="encourage">${esc(e.encourage)}</textarea></div>
  </div>
  <div class="box"><h3>${t('ev.written')}</h3><pre class="out" id="e-out">${esc(evalText(e))}</pre>
    <div class="btns"><button class="primary" data-act="ev-pdf">${t('ev.pdf')}</button><button data-act="ev-pdf-blank">${t('ev.pdfBlank')}</button><button data-act="ev-copy">${t('ev.copy')}</button></div>
    <div class="btns"><button class="small ghost" data-act="ev-dup">${t('ev.duplicate')}</button>
      ${EVconfirmDel?`<span class="muted" style="align-self:center">${t('ev.confirmDel')}</span><button class="small" data-act="ev-del">${t('hist.yesDelete')}</button><button class="small ghost" data-act="ev-del-cancel">${t('common.cancel')}</button>`
        :`<button class="small ghost" data-act="ev-del-ask">${t('hist.delete')}</button>`}</div>
  </div></div></section>`;
}

function evPdfName(list){const e=list[0];const base=LANG==='fr'?'evaluation':'evaluation';
  return list.length>1?`${base}s-${(e.date||todayISO())}.pdf`:`${base}-${(e.person||evTypeName(e.type)).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'form'}.pdf`}

document.addEventListener('input',ev=>{
  const el=ev.target;if(tab!=='eval')return;
  const e=evCur();
  if(el.dataset.ev){e[el.dataset.ev]=el.value;save()}
  else if(el.dataset.evc!==undefined){const c=e.crit[+el.dataset.evc];if(!c)return;
    if(el.dataset.k==='label'){const v=el.value.trim();c.label=v&&(!c.k||v!==t('crit.'+c.k))?v:''}else c.note=el.value;save()}
  else return;
  const o=document.getElementById('e-out');if(o)o.textContent=evalText(e);
  const chipEl=document.querySelector(`.spk[data-id="${e.id}"]`);if(chipEl)chipEl.textContent=evChipLabel(e);
});
document.addEventListener('change',ev=>{
  const el=ev.target;
  if(el.dataset.act==='ev-type'){const e=evCur();const old={};e.crit.forEach(c=>{if(c.k)old[c.k]=c});
    const custom=e.crit.filter(c=>!c.k);e.type=el.value;
    e.crit=[...EV_TYPES[e.type].map(k=>old[k]||{k,r:0,note:''}),...custom];save();render()}
});
document.addEventListener('submit',ev=>{
  if(ev.target.dataset.form!=='ev-add')return;ev.preventDefault();
  const inp=document.getElementById('ev-newcrit');const v=inp.value.trim().slice(0,80);if(!v)return;
  evCur().crit.push({k:'',label:v,r:0,note:''});save();render();const n=document.getElementById('ev-newcrit');if(n)n.focus();
});
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act]');if(!b||!b.dataset.act.startsWith('ev-'))return;
  const a=b.dataset.act,i=+b.dataset.i;const st=evStore();const e=evCur();
  switch(a){
  case 'ev-pick':st.cur=b.dataset.id;EVconfirmDel=false;break;
  case 'ev-new':{const ty=(document.getElementById('ev-newtype')||{}).value||'speech';const n=newEval(ty);st.list.push(n);st.cur=n.id;EVconfirmDel=false;break}
  case 'ev-rate':{const c=e.crit[i];c.r=c.r===+b.dataset.n?0:+b.dataset.n;break}
  case 'ev-up':if(i>0)[e.crit[i-1],e.crit[i]]=[e.crit[i],e.crit[i-1]];break;
  case 'ev-down':if(i<e.crit.length-1)[e.crit[i+1],e.crit[i]]=[e.crit[i],e.crit[i+1]];break;
  case 'ev-cdel':e.crit.splice(i,1);break;
  case 'ev-resetcrit':{const old={};e.crit.forEach(c=>{if(c.k)old[c.k]=c});e.crit=EV_TYPES[e.type].map(k=>({k,r:(old[k]||{}).r||0,note:(old[k]||{}).note||''}));break}
  case 'ev-dup':{const d=clone(e);d.id=evId();d.person='';d.crit.forEach(c=>{c.r=0;c.note=''});d.commend=d.recommend=d.encourage='';st.list.push(d);st.cur=d.id;break}
  case 'ev-del-ask':EVconfirmDel=true;break;
  case 'ev-del-cancel':EVconfirmDel=false;break;
  case 'ev-del':st.list=st.list.filter(x=>x.id!==e.id);if(!st.list.length)st.list.push(newEval('speech'));st.cur=st.list[0].id;EVconfirmDel=false;break;
  case 'ev-copy':copyText(evalText(e));return;
  case 'ev-pdf':buildEvalPdf([e],evPdfName([e]),false);return;
  case 'ev-pdf-blank':buildEvalPdf([e],evPdfName([e]).replace('.pdf','-'+(LANG==='fr'?'vierge':'blank')+'.pdf'),true);return;
  case 'ev-pdf-all':buildEvalPdf(st.list,evPdfName(st.list),false);return;
  default:return;
  }
  save();render();
});
