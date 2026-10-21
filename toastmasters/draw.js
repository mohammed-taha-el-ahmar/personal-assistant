// Orato – random speaking order (contests, speakers, Table Topics…).
// The draw uses the browser's cryptographic random generator. With a club link, the result is shared live
// through clubs/{club}/meeting/draw so everyone sees the same order, and each redraw is numbered.

const DRAW={shared:null,anim:null,confirmRedraw:false,full:false};
function drawState(){if(!S.draw)S.draw={title:'',names:'',result:[],at:'',n:0};return S.draw}
const drawNames=()=>[...new Set(drawState().names.split(/[\n,;]+/).map(s=>s.trim().replace(/\s+/g,' ')).filter(Boolean))].slice(0,60);
// Unbiased integer in [0, max) from crypto.getRandomValues (falls back to Math.random if unavailable).
function randInt(max){
  try{const a=new Uint32Array(1),lim=Math.floor(0x100000000/max)*max;let x;do{crypto.getRandomValues(a);x=a[0]}while(x>=lim);return x%max}
  catch(e){return Math.floor(Math.random()*max)}
}
function shuffle(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=randInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
// The result on screen: the shared one when the club is live, otherwise the one on this device.
function currentDraw(){const d=SH.on?(DRAW.shared||{}):drawState();return {title:d.title||'',result:d.result||[],at:d.at||'',n:d.n||0}}

function drawLive(){
  if(DRAW.unsub)DRAW.unsub();
  DRAW.unsub=SH.fs.doc(`clubs/${SH.club}/meeting/draw`).onSnapshot(s=>{DRAW.shared=s.exists?s.data():null;if(!DRAW.anim)softRender()},()=>{});
}

function drawView(){
  const d=drawState();const names=drawNames();const r=currentDraw();
  const when=r.at?new Date(r.at).toLocaleString(locale(),{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
  const contestSlots=(S.agenda.items||[]).filter(it=>/^c\d$/.test(it.k||'')).length;
  return `<section class="panel">
  <div class="phead"><div><h2>${t('draw.title')}</h2><p class="muted">${t('draw.intro')}</p></div></div>
  ${liveBox()}${SH.on?officersOnlyNote('acc.what.draw'):''}
  <div class="grid2">
  ${SH.on&&!canManage()?'':`<div class="box">
    <div class="field"><label class="label" for="dr-title">${t('draw.what')}</label><input id="dr-title" data-dr="title" maxlength="80" value="${esc(d.title)}" placeholder="${t('draw.whatPh')}"></div>
    <div class="field"><label class="label" for="dr-names">${t('draw.names')}</label><textarea id="dr-names" data-dr="names" rows="8" placeholder="${t('draw.namesPh')}">${esc(d.names)}</textarea>
      <span class="muted" style="font-size:.85rem" id="dr-count">${tn('draw.count',names.length)}</span></div>
    <div class="btns"><button class="small ghost" data-act="dr-from-roles">${t('draw.fromRoles')}</button><button class="small ghost" data-act="dr-clear">${t('draw.clearNames')}</button></div>
    <div class="btns">${DRAW.confirmRedraw
      ?`<span class="muted" style="align-self:center">${t('draw.confirmRedraw',{n:r.n})}</span><button class="primary" data-act="dr-go">${t('draw.yesRedraw')}</button><button data-act="dr-cancel">${t('common.cancel')}</button>`
      :`<button class="primary" data-act="dr-ask" ${names.length<2||DRAW.anim?'disabled':''}>${r.result.length?t('draw.redraw'):t('draw.go')}</button>`}</div>
  </div>`}
  <div class="box" aria-live="polite">
    <div class="phead"><div><h3>${esc(r.title)||t('draw.result')}</h3>${r.result.length?`<p class="muted" style="font-size:.85rem">${t('draw.meta',{n:r.n,when:esc(when)})}${SH.on?' · '+t('draw.sharedNote'):''}</p>`:''}</div></div>
    ${DRAW.anim?`<ol class="order spinning">${DRAW.anim.map(n=>`<li>${esc(n)}</li>`).join('')}</ol>`
      :r.result.length?`<ol class="order">${r.result.map(n=>`<li>${esc(n)}</li>`).join('')}</ol>`:`<p class="empty">${t('draw.none')}</p>`}
    ${r.result.length&&!DRAW.anim?`<div class="btns"><button class="primary" data-act="dr-full">${t('draw.project')}</button><button data-act="dr-copy">${t('draw.copy')}</button>
      ${contestSlots&&canManage()?`<button data-act="dr-agenda">${t('draw.toAgenda')}</button>`:''}</div>
      ${contestSlots||!canManage()?'':`<p class="muted" style="font-size:.85rem">${t('draw.agendaHint')}</p>`}`:''}
  </div></div></section>`;
}

function drawText(r){return `${r.title||t('draw.result')}\n${r.result.map((n,i)=>`${i+1}. ${n}`).join('\n')}`}
function paintDrawFull(){
  let el=document.getElementById('drawlay');const r=currentDraw();
  if(!DRAW.full||!r.result.length){if(el)el.remove();return}
  if(!el){el=document.createElement('div');el.id='drawlay';el.className='qrlay';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el)}
  el.innerHTML=`<div class="qrcard drawcard"><h2>${esc(r.title)||t('draw.result')}</h2>
    <ol class="order big">${r.result.map(n=>`<li>${esc(n)}</li>`).join('')}</ol>
    <div class="btns" style="justify-content:center"><button class="primary" data-act="dr-close">${t('qr.close')}</button></div></div>`;
  const b=el.querySelector('[data-act=dr-close]');if(b)b.focus();
}

async function runDraw(){
  const names=drawNames();if(names.length<2||!canManage())return;
  const d=drawState();const result=shuffle(names);const prev=currentDraw();
  const rec={title:d.title.trim().slice(0,80),result,at:new Date().toISOString(),n:(prev.n||0)+1};
  DRAW.confirmRedraw=false;
  // A short shuffle on screen so the room sees the draw happen (skipped when reduced motion is preferred).
  const still=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!still){for(let k=0;k<8;k++){DRAW.anim=shuffle(names);render();await new Promise(r=>setTimeout(r,110))}}
  DRAW.anim=null;
  Object.assign(d,{result:rec.result,at:rec.at,n:rec.n});save();
  if(SH.on){DRAW.shared=rec;try{await SH.fs.doc(`clubs/${SH.club}/meeting/draw`).set(rec)}catch(e){writeFail(e)}}
  render();
}
function orderToAgenda(){
  const r=currentDraw();const slots=S.agenda.items.filter(it=>/^c\d$/.test(it.k||''));
  slots.forEach((it,i)=>{const name=r.result[i];it.title=name?`${name} – ${t('agi.'+it.k)}`:null});
  save();pushAgenda();
  toast(r.result.length>slots.length?t('draw.agendaMore',{n:slots.length}):t('draw.agendaDone'));
}

document.addEventListener('input',ev=>{
  const k=ev.target.dataset&&ev.target.dataset.dr;if(!k)return;
  drawState()[k]=ev.target.value;save();
  const c=document.getElementById('dr-count');if(c)c.textContent=tn('draw.count',drawNames().length);
  const go=document.querySelector('[data-act=dr-ask]');if(go)go.disabled=drawNames().length<2;
});
document.addEventListener('keydown',e=>{if(DRAW.full&&e.key==='Escape'){DRAW.full=false;paintDrawFull()}});
document.addEventListener('click',ev=>{
  if(ev.target.id==='drawlay'){DRAW.full=false;paintDrawFull();return}
  const b=ev.target.closest('[data-act]');if(!b||!b.dataset.act.startsWith('dr-'))return;
  switch(b.dataset.act){
  case 'dr-ask':if(currentDraw().result.length){DRAW.confirmRedraw=true;render()}else runDraw();return;
  case 'dr-go':runDraw();return;
  case 'dr-cancel':DRAW.confirmRedraw=false;render();return;
  case 'dr-copy':copyText(drawText(currentDraw()));return;
  case 'dr-full':DRAW.full=true;paintDrawFull();try{document.getElementById('drawlay').requestFullscreen().catch(()=>{})}catch(e){}return;
  case 'dr-close':DRAW.full=false;try{if(document.fullscreenElement)document.exitFullscreen()}catch(e){}paintDrawFull();return;
  case 'dr-agenda':orderToAgenda();return;
  case 'dr-clear':drawState().names='';save();render();return;
  case 'dr-from-roles':{
    // Speakers from the Roles tab, as a starting list.
    const n=['s1','s2','s3'].map(k=>roleName(k)).filter(Boolean);
    if(!n.length){toast(t('draw.noSpeakers'));return}
    const d=drawState();const cur=drawNames();d.names=[...cur,...n.filter(x=>!cur.includes(x))].join('\n');save();render();return}
  }
});
