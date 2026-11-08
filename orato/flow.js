// Oratia – meeting flow for the Timer, Ah-Counter and Grammarian.
// - Timer: "Load from the agenda" builds the running order (speakers, Table Topics, evaluators, General Evaluator) with the
//   right timing for each; after "Stop and record" the next speaker is ready, so the Timer only presses Start.
//   Recorded entries stay editable (speaker and type), for a Timer who had no time to type beforehand.
// - Ah-Counter and Grammarian: add the speakers of the agenda in one tap, add an unnamed "next speaker" while someone is
//   already speaking, and rename anyone in the report afterwards.

// The running order follows the agenda (Prepare → Agenda), item by item, with the timing of each item: the one chosen
// in the agenda (⏱ select), or by default the one of its role (speech, evaluation, Table Topics, contest…), or else
// exactly its planned length (red at the end of its minutes). Each line also keeps its planned start time, so the Timer
// sees at a glance whether the meeting runs ahead or behind schedule.
function flowSig(){const a=S.agenda||{};return JSON.stringify([a.start||'',(a.items||[]).map(it=>[it.k||'',it.title||'',it.role||'',+it.dur||0,it.tm||'']),
  (a.customRoles||[]).map(r=>[r.id,r.kind]),['s1','s2','s3','e1','e2','e3','tte','ge','ttm'].map(k=>roleName(k))])}
const toMin=hm=>{const [h,m]=String(hm||'0:0').split(':').map(Number);return (h||0)*60+(m||0)};
function flowPeople(){
  const out=[];let items=(S.agenda&&S.agenda.items)||[];let times=items.length?agendaTimes():[];
  // An empty agenda: fall back to the usual order of a meeting, with the roles filled in.
  if(!items.length){items=[['speech1','s1',7],['speech2','s2',7],['speech3','s3',7],['tt','ttm',20],['evals','ge',9],['ttEval','tte',4],['ge','ge',6]].map(([k,role,dur])=>({k,role,dur}))
    .filter(it=>!['s1','s2','s3'].includes(it.role)||roleName(it.role));times=[]}
  const push=(x,tm,at)=>{if(!tm)return;out.push({...x,preset:tm.preset,...(tm.preset==='custom'?{cg:tm.cg,ca:tm.ca,cr:tm.cr,seg:!!tm.seg}:{}),at:at??null})};
  items.forEach((it,idx)=>{
    if(it.k==='doors')return; // before the meeting starts
    const title=itemTitle(it);const at=times[idx]?toMin(times[idx]):null;const tm=itemTiming(it);if(!tm)return;
    if(it.k==='tt'){const n=ttSlots(it);for(let i=1;i<=n;i++)push({name:'',label:t('flow.tt',{n:i})},tm,i===1?at:null);return}
    if(it.k==='evals'){const ev=[...['e1','e2','e3'],...customKeys().filter(k=>customKind(k)==='eval'&&!items.some(x=>x.role===k))].filter(k=>roleName(k));
      (ev.length?ev:['e1','e2','e3']).forEach((k,i)=>push({name:roleName(k)||'',label:roleLabel(k)},tm,i===0?at:null));return}
    if(it.k==='ttEval'){push({name:roleName('tte')||'',label:title},tm,at);return}
    if(it.k==='ge'){push({name:roleName('ge')||'',label:title},tm,at);return}
    push({name:it.role?roleName(it.role)||'':'',label:title},tm,at);
  });
  return out;
}
const flowSpeakerNames=()=>[...new Set(['toastmaster','s1','s2','s3',...customKeys(),'ttm','e1','e2','e3','tte','ge','timer','ah','gram'].map(k=>roleName(k)).filter(Boolean))];
function flowApply(i){
  const q=S.timer.queue||[];const it=q[i];if(!it)return;
  S.timer.qi=i;S.timer.name=it.name||it.label;
  if(it.preset==='custom'&&it.cr!=null){S.timer.preset='custom';S.timer.cg=it.cg;S.timer.ca=it.ca;S.timer.cr=it.cr;S.timer.cseg=!!it.seg}
  else if(PRESETS.some(p=>p.id===it.preset)){S.timer.preset=it.preset;S.timer.cseg=false}
}
function flowLoad(keepDone){
  const old=S.timer.queue||[];const q=flowPeople();
  if(keepDone){const done=old.filter(x=>x.done).map(x=>x.label+'|'+x.name);q.forEach(x=>{const j=done.indexOf(x.label+'|'+x.name);if(j>=0){x.done=true;done.splice(j,1)}})}
  S.timer.queue=q;S.timer.qsig=flowSig();S.timer.qi=-1;const first=q.findIndex(x=>!x.done);if(first>=0)flowApply(first);else S.timer.qi=null;
  return q.length;
}
// Ahead or behind schedule: compares now with the planned start of the current line (meetings of today only).
function flowSchedule(){
  const q=S.timer.queue||[];const qi=S.timer.qi;if(qi==null||qi<0||!q[qi])return '';
  let at=null;for(let j=qi;j>=0;j--){if(q[j].at!=null){at=q[j].at;break}}if(at==null)return '';
  const d=S.agenda&&S.agenda.date;if(d&&d!==todayISO())return '';
  const now=new Date();const diff=now.getHours()*60+now.getMinutes()-at;const L=AGL();
  if(Math.abs(diff)>180)return '';
  return Math.abs(diff)<=1?`<span class="chip ok">${esc(L.onTime)}</span>`:diff>0?`<span class="chip warn">${esc(L.late.replace('{n}',diff))}</span>`:`<span class="chip ok">${esc(L.early.replace('{n}',-diff))}</span>`;
}
const flowTypeLabel=it=>it.preset==='custom'&&it.cr!=null?AGL().minN.replace('{a}',fmtMin(it.cg)).replace('{b}',fmtMin(it.cr)):t('preset.'+it.preset);
function flowBox(){
  const q=S.timer.queue||[];const qi=S.timer.qi??-1;
  const changed=q.length&&S.timer.qsig&&S.timer.qsig!==flowSig();const sch=q.length?flowSchedule():'';
  return `<div class="box flow"><div class="phead"><div><h3>${t('flow.title')}</h3><p class="muted">${t('flow.intro')}</p></div>
      <div class="btns">${sch}<button class="small ${q.length?'':'primary'}" data-act="fl-load">${t('flow.load')}</button>${q.length?`<button class="small ghost" data-act="fl-clear">${t('flow.clear')}</button>`:''}</div></div>
    ${changed?`<div class="notice"><span>${esc(AGL().changed)}</span><button class="small primary" data-act="fl-update">${esc(AGL().update)}</button></div>`:''}
    ${q.length?`<ol class="flowlist">${q.map((it,i)=>`<li class="${i===qi?'cur':''} ${it.done?'done':''}">
        <button type="button" class="flowpick" data-act="fl-pick" data-i="${i}" aria-current="${i===qi}">${it.at!=null?`<span class="when">${hhmm(it.at)}</span>`:''}<span class="muted">${esc(it.label)}</span> · ${esc(flowTypeLabel(it))}</button>
        <input data-flname="${i}" value="${esc(it.name)}" placeholder="${esc(t('timer.speakerPh'))}" aria-label="${esc(t('common.speaker')+' – '+it.label)}">${it.done?' <span class="chip ok">✓</span>':''}</li>`).join('')}</ol>`
      :`<p class="empty" style="margin:0">${t('flow.empty')}</p>`}</div>`;
}
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act^="fl-"],[data-act="ah-next"],[data-act="ah-agenda"],[data-act="g-next"],[data-act="g-agenda"]');if(!b)return;
  const a=b.dataset.act;
  if(a==='fl-load'){if(T.running)return;const n=flowLoad(false);save();render();toast(t('flow.loaded',{n}));return}
  if(a==='fl-update'){if(T.running)return;flowLoad(true);save();render();toast(AGL().updated);return}
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
