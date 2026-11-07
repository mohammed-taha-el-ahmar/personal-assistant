// Oratia – meeting flow for the Timer, Ah-Counter and Grammarian.
// - Timer: "Load from the agenda" builds the running order (speakers, Table Topics, evaluators, General Evaluator) with the
//   right timing for each; after "Stop and record" the next speaker is ready, so the Timer only presses Start.
//   Recorded entries stay editable (speaker and type), for a Timer who had no time to type beforehand.
// - Ah-Counter and Grammarian: add the speakers of the agenda in one tap, add an unnamed "next speaker" while someone is
//   already speaking, and rename anyone in the report afterwards.

const FLOW_TT=4; // Table Topics slots added to the running order (names filled in later, or left as "Table Topics n")
function flowPeople(){
  const keys=['s1','s2','s3'];const out=[];
  keys.forEach((k,i)=>{const n=roleName(k);if(!n)return;const sp=typeof speechForSlot==='function'?speechForSlot(k):null;
    out.push({name:n,preset:sp&&sp.preset||'std',label:roleLabel(k)+(sp?` – “${sp.title}”`:'')})});
  for(let i=1;i<=FLOW_TT;i++)out.push({name:'',preset:'tt',label:t('flow.tt',{n:i})});
  ['e1','e2','e3'].forEach(k=>{const n=roleName(k);if(n)out.push({name:n,preset:'eval',label:roleLabel(k)})});
  if(roleName('tte'))out.push({name:roleName('tte'),preset:'eval',label:roleLabel('tte')});
  if(roleName('ge'))out.push({name:roleName('ge'),preset:'ge',label:roleLabel('ge')});
  return out;
}
const flowSpeakerNames=()=>[...new Set(['toastmaster','s1','s2','s3','ttm','e1','e2','e3','tte','ge','timer','ah','gram'].map(k=>roleName(k)).filter(Boolean))];
function flowApply(i){
  const q=S.timer.queue||[];const it=q[i];if(!it)return;
  S.timer.qi=i;S.timer.name=it.name||it.label;if(PRESETS.some(p=>p.id===it.preset))S.timer.preset=it.preset;
}
function flowBox(){
  const q=S.timer.queue||[];const qi=S.timer.qi??-1;
  return `<div class="box flow"><div class="phead"><div><h3>${t('flow.title')}</h3><p class="muted">${t('flow.intro')}</p></div>
      <div class="btns"><button class="small ${q.length?'':'primary'}" data-act="fl-load">${t('flow.load')}</button>${q.length?`<button class="small ghost" data-act="fl-clear">${t('flow.clear')}</button>`:''}</div></div>
    ${q.length?`<ol class="flowlist">${q.map((it,i)=>`<li class="${i===qi?'cur':''} ${it.done?'done':''}">
        <button type="button" class="flowpick" data-act="fl-pick" data-i="${i}" aria-current="${i===qi}"><span class="muted">${esc(it.label)}</span> · ${esc(t('preset.'+it.preset))}</button>
        <input data-flname="${i}" value="${esc(it.name)}" placeholder="${esc(t('timer.speakerPh'))}" aria-label="${esc(t('common.speaker')+' – '+it.label)}">${it.done?' <span class="chip ok">✓</span>':''}</li>`).join('')}</ol>`
      :`<p class="empty" style="margin:0">${t('flow.empty')}</p>`}</div>`;
}
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act^="fl-"],[data-act="ah-next"],[data-act="ah-agenda"],[data-act="g-next"],[data-act="g-agenda"]');if(!b)return;
  const a=b.dataset.act;
  if(a==='fl-load'){S.timer.queue=flowPeople();S.timer.qi=-1;const first=S.timer.queue.findIndex(x=>true);if(first>=0)flowApply(first);save();render();toast(t('flow.loaded',{n:S.timer.queue.length}));return}
  if(a==='fl-clear'){S.timer.queue=[];S.timer.qi=null;save();render();return}
  if(a==='fl-pick'){if(T.running)return;flowApply(+b.dataset.i);save();render();return}
  const addMissing=(list,mk)=>{const have=new Set(list.map(s=>s.name.trim().toLowerCase()));let n=0;flowSpeakerNames().forEach(x=>{if(!have.has(x.toLowerCase())){list.push(mk(x));n++}});return n};
  if(a==='ah-agenda'){const n=addMissing(S.ah.speakers,x=>({name:x,c:{}}));if(S.ah.cur==null)S.ah.cur=0;save();render();toast(n?t('flow.added',{n}):t('flow.none'));return}
  if(a==='g-agenda'){const n=addMissing(S.gram.speakers,x=>({name:x,n:0}));save();render();toast(n?t('flow.added',{n}):t('flow.none'));return}
  if(a==='ah-next'){S.ah.speakers.push({name:t('flow.speakerN',{n:S.ah.speakers.length+1}),c:{}});S.ah.cur=S.ah.speakers.length-1;save();render();return}
  if(a==='g-next'){S.gram.speakers.push({name:t('flow.speakerN',{n:S.gram.speakers.length+1}),n:0});save();render();return}
});
// Renaming and retyping, saved as you type (no re-render, so the field keeps the focus).
document.addEventListener('input',ev=>{
  const el=ev.target;const ds=el.dataset||{};
  if(ds.flname!=null){const it=(S.timer.queue||[])[+ds.flname];if(it){it.name=el.value;if(+ds.flname===S.timer.qi&&!T.running){S.timer.name=el.value;const w=$('.stage .who');if(w)w.textContent=el.value||it.label}save()}return}
  if(ds.tlogname!=null){const l=S.timer.log[+ds.tlogname];if(l){l.name=el.value;save()}return}
  if(ds.ahname!=null){const s=S.ah.speakers[+ds.ahname];if(s){s.name=el.value;save();const c=document.querySelector(`[data-act=ah-pick][data-i="${ds.ahname}"]`);if(c)c.textContent=el.value}return}
  if(ds.gname!=null){const s=S.gram.speakers[+ds.gname];if(s){s.name=el.value;save()}return}
});
document.addEventListener('change',ev=>{
  const el=ev.target;const ds=el.dataset||{};
  if(ds.tlogtype!=null){const l=S.timer.log[+ds.tlogtype];if(!l)return;l.pid=el.value;delete l.type;const p=PRESETS.find(x=>x.id===l.pid);
    if(p&&p.id!=='custom')l.q=qualified(l.secs,p);save();render()}
});
