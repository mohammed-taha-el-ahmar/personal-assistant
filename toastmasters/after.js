// TM Tools – QR codes and the "After the meeting" feedback form.
// Feedback is stored in clubs/{club}/feedback/{date}_{uid}: anyone with the club link can send one per device and meeting,
// only club officers can read it (see firestore.rules and office.js).

// ---------- QR codes ----------
// The generator ships with the site (qrcode.js). If that file is missing from the published copy,
// load the same library from a CDN instead.
let qrLibPromise=null;
function ensureQrLib(){
  if(typeof qrcode==='function')return Promise.resolve();
  if(!qrLibPromise)qrLibPromise=new Promise((resolve,reject)=>{
    const sc=document.createElement('script');
    sc.src='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
    sc.onload=()=>typeof qrcode==='function'?resolve():reject(new Error('qrcode'));
    sc.onerror=()=>{qrLibPromise=null;reject(new Error('qrcode'))};
    document.head.appendChild(sc);
  });
  return qrLibPromise;
}
function qrSvg(text){
  if(typeof qrcode!=='function')return '';
  try{const q=qrcode(0,'M');q.addData(text);q.make();return q.createSvgTag({cellSize:8,margin:4,scalable:true})}
  catch(e){return ''}
}
const feedbackLink=()=>{const u=new URL(shareLink());u.hash='feedback';return u.toString()};
let QR=null; // {title, text, url}
function openQr(kind){
  QR=kind==='feedback'?{title:t('qr.feedbackTitle'),text:t('qr.feedbackText'),url:feedbackLink()}
    :kind==='member'?{title:t('acc.qrTitle'),text:t('acc.qrText'),url:memberLink()}
    :{title:t('qr.clubTitle'),text:t('qr.clubText'),url:shareLink()};
  paintQr();
}
function closeQr(){QR=null;paintQr()}
function paintQr(){
  let el=document.getElementById('qrlay');
  if(!QR){if(el)el.remove();return}
  if(!el){el=document.createElement('div');el.id='qrlay';el.className='qrlay';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el)}
  el.setAttribute('aria-label',QR.title);
  el.innerHTML=`<div class="qrcard">
    <h2>${esc(QR.title)}</h2><p class="muted">${esc(QR.text)}</p>
    <div class="qrimg" id="qrimg"><p class="muted" style="padding:40px 8px;margin:0">${t('qr.loading')}</p></div>
    <p class="qrurl">${esc(QR.url)}</p>
    <div class="btns" style="justify-content:center"><button data-act="qr-copy">${t('qr.copy')}</button><button class="primary" data-act="qr-close">${t('qr.close')}</button></div>
  </div>`;
  const b=el.querySelector('[data-act=qr-close]');if(b)b.focus();
  const want=QR.url;
  ensureQrLib().then(()=>{
    const box=document.getElementById('qrimg');if(!box||!QR||QR.url!==want)return;
    const svg=qrSvg(want);
    box.innerHTML=svg||`<p class="muted" style="padding:40px 8px;margin:0">${t('qr.fail')}</p>`;
  },()=>{const box=document.getElementById('qrimg');if(box)box.innerHTML=`<p class="muted" style="padding:40px 8px;margin:0">${t('qr.fail')}</p>`});
}
document.addEventListener('keydown',e=>{if(QR&&e.key==='Escape')closeQr()});
document.addEventListener('click',e=>{
  if(!QR)return;
  if(e.target.id==='qrlay'){closeQr();return}
  const b=e.target.closest('[data-act]');if(!b)return;
  if(b.dataset.act==='qr-close')closeQr();
  if(b.dataset.act==='qr-copy')copyText(QR.url);
});

// ---------- online meeting link (used by the agenda, PDF and copied text) ----------
const safeUrl=u=>/^https:\/\/[^\s<>"'`]+$/i.test(String(u||'').trim())?String(u).trim():'';
function online(a){const o=(a&&a.online)||{};return {format:o.format||'inperson',url:o.url||'',id:o.id||'',pass:o.pass||''}}
function onlineLines(a){
  const o=online(a);if(o.format==='inperson')return [];
  const out=[t('fmt.'+o.format)+(safeUrl(o.url)?' : '+safeUrl(o.url):'')];
  const extra=[o.id?t('on.idIs',{v:o.id}):'',o.pass?t('on.passIs',{v:o.pass}):''].filter(Boolean).join(' · ');
  if(extra)out.push(extra);
  return out;
}

// ---------- feedback form ----------
const LIKES=['speeches','topics','evals','atmosphere','organisation','online'];
let FB={kind:'',rating:0,likes:[],again:'',comment:'',name:'',contact:false,email:''};
let FBsending=false;
const meetingDate=()=>S.agenda&&S.agenda.date?S.agenda.date:todayISO();
const fbKey=()=>'gt-fb-'+SH.club+'-'+meetingDate();
const fbSent=()=>{try{return localStorage.getItem(fbKey())==='1'}catch(e){return false}};
const chip=(act,val,on,label)=>`<button type="button" class="spk" data-act="${act}" data-v="${esc(val)}" aria-pressed="${on}">${label}</button>`;
function feedbackView(){
  const head=`<div class="phead"><div><h2>${t('fb.title')}</h2><p class="muted">${t('fb.intro')}</p></div>
    ${SH.on?`<button class="small" data-act="qr-feedback">${t('fb.showQr')}</button>`:''}</div>`;
  if(!SH.on)return `<section class="panel">${head}${liveBox()}<p class="muted">${t('fb.needLive')}</p></section>`;
  const dateLine=`<p class="label">${t('fb.meetingOf',{date:esc(fmtDate(meetingDate()))})}</p>`;
  if(fbSent())return `<section class="panel">${head}<div class="box" style="text-align:center;align-items:center">${dateLine}<h3>${t('fb.thanks')}</h3><p class="muted">${t('fb.thanksText')}</p></div></section>`;
  const f=FB;const guest=f.kind==='guest';
  const o=online(S.agenda);const likes=LIKES.filter(k=>k!=='online'||o.format!=='inperson');
  return `<section class="panel">${head}
  <form class="box" data-form="feedback" novalidate>
    ${dateLine}
    <div class="field"><span class="label">${t('fb.youAre')} *</span><div class="speakers">${chip('fb-kind','member',f.kind==='member',t('fb.member'))}${chip('fb-kind','guest',guest,t('fb.guest'))}</div></div>
    <div class="field"><span class="label">${t('fb.rating')} *</span><div class="stars">${[1,2,3,4,5].map(n=>`<button type="button" class="star" data-act="fb-rate" data-v="${n}" aria-pressed="${f.rating>=n}" aria-label="${esc(t('fb.starN',{n}))}">★</button>`).join('')}<span class="muted" style="align-self:center">${f.rating?t('fb.r'+f.rating):''}</span></div></div>
    <div class="field"><span class="label">${t('fb.likes')}</span><div class="speakers">${likes.map(k=>chip('fb-like',k,f.likes.includes(k),t('like.'+k))).join('')}</div></div>
    ${guest?`<div class="field"><span class="label">${t('fb.again')}</span><div class="speakers">${['yes','maybe','no'].map(v=>chip('fb-again',v,f.again===v,t('again.'+v))).join('')}</div></div>`:''}
    <div class="field"><label class="label" for="fb-comment">${t('fb.comment')}</label><textarea id="fb-comment" data-fb="comment" maxlength="1000" placeholder="${t('fb.commentPh')}">${esc(f.comment)}</textarea></div>
    <div class="field"><label class="label" for="fb-name">${t('fb.name')}</label><input id="fb-name" data-fb="name" maxlength="80" value="${esc(f.name)}" autocomplete="name"></div>
    ${guest?`<label class="check" for="fb-contact"><input type="checkbox" id="fb-contact" data-fb="contact" ${f.contact?'checked':''}><span>${t('fb.contact')}</span></label>
      ${f.contact?`<div class="field"><label class="label" for="fb-email">${t('fb.email')}</label><input id="fb-email" type="email" data-fb="email" maxlength="120" value="${esc(f.email)}" autocomplete="email"><span class="muted" style="font-size:.85rem">${t('fb.privacy')}</span></div>`:''}`:''}
    <div class="btns"><button type="submit" class="primary" ${FBsending?'disabled':''}>${t('fb.send')}</button></div>
  </form></section>`;
}
async function sendFeedback(){
  const f=FB;
  if(!f.kind||!f.rating){toast(t('fb.missing'));return}
  const email=f.kind==='guest'&&f.contact?f.email.trim():'';
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast(t('off.invalid'));return}
  const date=meetingDate();
  const data={date,kind:f.kind,rating:f.rating,likes:f.likes.slice(0,8),again:f.kind==='guest'?f.again:'',
    comment:f.comment.trim().slice(0,1000),name:f.name.trim().slice(0,80),email,contact:!!email,lang:LANG,at:new Date().toISOString()};
  FBsending=true;render();
  try{
    await SH.fs.doc(`clubs/${SH.club}/feedback/${date}_${SH.uid}`).set(data);
    try{localStorage.setItem(fbKey(),'1')}catch(e){}
    FB={kind:'',rating:0,likes:[],again:'',comment:'',name:'',contact:false,email:''};
  }catch(e){
    // The rules refuse a second answer from the same device for the same meeting.
    if(e&&e.code==='permission-denied'){try{localStorage.setItem(fbKey(),'1')}catch(_){}toast(t('fb.already'))}
    else toast(t('live.saveFail'));
  }
  FBsending=false;render();
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,v=b.dataset.v;
  if(a==='qr-club'){openQr('club');return}
  if(a==='qr-feedback'){openQr('feedback');return}
  if(!a.startsWith('fb-'))return;
  if(a==='fb-kind'){FB.kind=v;if(v!=='guest'){FB.again='';FB.contact=false;FB.email=''}}
  if(a==='fb-rate')FB.rating=+v;
  if(a==='fb-like')FB.likes=FB.likes.includes(v)?FB.likes.filter(x=>x!==v):[...FB.likes,v];
  if(a==='fb-again')FB.again=FB.again===v?'':v;
  render();
});
document.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.fb;if(!k||k==='contact')return;FB[k]=e.target.value});
document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.fb==='contact'){FB.contact=e.target.checked;render()}});
document.addEventListener('submit',e=>{if(e.target.dataset.form!=='feedback')return;e.preventDefault();sendFeedback()});

// ---------- feedback summary (club officers) ----------
function feedbackStats(list){
  const n=list.length;if(!n)return null;
  const avg=list.reduce((s,f)=>s+(f.rating||0),0)/n;
  const likes={};list.forEach(f=>(f.likes||[]).forEach(k=>likes[k]=(likes[k]||0)+1));
  return {n,avg,members:list.filter(f=>f.kind==='member').length,guests:list.filter(f=>f.kind==='guest').length,
    likes:Object.entries(likes).sort((a,b)=>b[1]-a[1]),
    again:['yes','maybe','no'].map(v=>[v,list.filter(f=>f.again===v).length]).filter(([,c])=>c),
    comments:list.filter(f=>f.comment).map(f=>({text:f.comment,who:f.name,kind:f.kind})),
    contacts:list.filter(f=>f.contact&&f.email).map(f=>({name:f.name,email:f.email}))};
}
function feedbackHtml(list){
  const s=feedbackStats(list);if(!s)return `<p class="muted">${t('fb.none')}</p>`;
  return `<div class="kv">
      <div><span class="label">${t('fb.avg')}</span><b>${s.avg.toLocaleString(locale(),{maximumFractionDigits:1})} / 5</b></div>
      <div><span class="label">${t('fb.answers')}</span><b>${s.n}</b><span class="muted" style="font-size:.85rem">${t('fb.split',{m:s.members,g:s.guests})}</span></div>
    </div>
    ${s.likes.length?`<div><span class="label">${t('fb.likes')}</span><ul>${s.likes.map(([k,c])=>`<li>${esc(t('like.'+k))} : ${c}</li>`).join('')}</ul></div>`:''}
    ${s.again.length?`<div><span class="label">${t('fb.again')}</span><p>${s.again.map(([v,c])=>`${esc(t('again.'+v))} : ${c}`).join(' · ')}</p></div>`:''}
    ${s.comments.length?`<div><span class="label">${t('fb.comments')}</span><ul>${s.comments.map(c=>`<li>${esc(c.text)}${c.who?` <span class="muted">– ${esc(c.who)}</span>`:''}</li>`).join('')}</ul></div>`:''}
    ${s.contacts.length?`<div><span class="label">${t('fb.contacts')}</span><ul>${s.contacts.map(c=>`<li>${esc(c.name||'')} &lt;${esc(c.email)}&gt;</li>`).join('')}</ul></div>`:''}`;
}
function feedbackPdfLines(list){
  const s=feedbackStats(list);if(!s)return [];
  return [t('fb.avg')+' : '+s.avg.toLocaleString(locale(),{maximumFractionDigits:1})+' / 5 ('+s.n+' · '+t('fb.split',{m:s.members,g:s.guests})+')',
    ...(s.likes.length?[t('fb.likes')+' : '+s.likes.map(([k,c])=>t('like.'+k)+' ('+c+')').join(', ')]:[]),
    ...s.comments.map(c=>'- '+c.text+(c.who?' ('+c.who+')':''))];
}
