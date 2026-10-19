// TM Tools – who may do what in a club space.
//
// Three levels:
//   Visitor  – anyone with the club link: reads everything shared, votes (unless the club says members only),
//              sends feedback, fills the "interested in the bureau" form.
//   Member   – a device unlocked once with the club code: also takes or gives up their own role and sends the
//              Timer, Ah-Counter and Grammarian reports.
//   Officer  – signed in with Google or an email link and on the officer list: edits the agenda, nominees, draw,
//              assigns roles to others, and manages the club.
//
// Data (see firestore.rules):
//   clubs/{club}/private/config  {memberCode, v, guestsVote}  officers only; the rules check the code against it
//   clubs/{club}/public/access   {on, v, guestsVote}          everyone reads it, so pages know which level applies
//   clubs/{club}/devices/{uid}   {code, v, name, at}          one per unlocked device; valid while v matches
// Changing the code raises v, so every device unlocked with the old code goes back to visitor.
// A club with no code yet stays open as before: everyone with the link can edit, until an officer turns this on.

const ACC={pub:undefined,dev:undefined,cfg:null,devices:[],unsubPub:null,unsubDev:null,unsubCfg:null,unsubDevices:null,
  busy:false,err:'',confirmNew:false,confirmOff:false,triedKey:false};
const CODE_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
const normCode=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,32);
const fmtCode=c=>c.length===8?c.slice(0,4)+'-'+c.slice(4):c;
function newCode(){
  const a=new Uint32Array(8);try{crypto.getRandomValues(a)}catch(e){for(let i=0;i<8;i++)a[i]=Math.floor(Math.random()*1e9)}
  return [...a].map(x=>CODE_ALPHABET[x%CODE_ALPHABET.length]).join('');
}

// ---------- levels ----------
const accessOn=()=>SH.on&&!!(ACC.pub&&ACC.pub.on);
const deviceOk=()=>!!(ACC.dev&&ACC.pub&&ACC.dev.v===ACC.pub.v);
// Edit the agenda, nominees, draw, other people's roles.
const canManage=()=>!SH.on||!accessOn()||SH.officer===true;
// Take your own role, send reports.
const canAct=()=>canManage()||deviceOk();
// Cast a ballot.
const canBallot=()=>canAct()||!(ACC.pub&&ACC.pub.guestsVote===false);
const accessLevel=()=>!SH.on?'local':SH.officer===true?'officer':!accessOn()?'open':deviceOk()?'member':'visitor';

// ---------- live data ----------
function accessLive(){
  if(ACC.unsubPub)ACC.unsubPub();
  ACC.unsubPub=SH.fs.doc(`clubs/${SH.club}/public/access`).onSnapshot(s=>{
    ACC.pub=s.exists?s.data():null;softRender();tryKeyFromUrl();
  },()=>{ACC.pub=null});
  accessAuthChanged();
}
// The device record follows the signed-in identity (anonymous members, or an officer's account).
function accessAuthChanged(){
  if(ACC.unsubDev){ACC.unsubDev();ACC.unsubDev=null}
  ACC.dev=undefined;
  if(!SH.fs||!SH.club||!SH.uid)return;
  ACC.unsubDev=SH.fs.doc(`clubs/${SH.club}/devices/${SH.uid}`).onSnapshot(s=>{ACC.dev=s.exists?s.data():null;softRender();tryKeyFromUrl()},()=>{ACC.dev=null});
}
// Officers also see the code and the list of unlocked devices.
function accessOfficerSubs(){
  accessStopOfficerSubs();
  ACC.unsubCfg=SH.fs.doc(`clubs/${SH.club}/private/config`).onSnapshot(s=>{ACC.cfg=s.exists?s.data():null;softRender()},()=>{ACC.cfg=null});
  ACC.unsubDevices=SH.fs.collection(`clubs/${SH.club}/devices`).onSnapshot(q=>{ACC.devices=q.docs.map(d=>({id:d.id,...d.data()}));softRender()},()=>{ACC.devices=[]});
}
function accessStopOfficerSubs(){
  if(ACC.unsubCfg){ACC.unsubCfg();ACC.unsubCfg=null}
  if(ACC.unsubDevices){ACC.unsubDevices();ACC.unsubDevices=null}
  ACC.cfg=null;ACC.devices=[];
}

// ---------- unlocking a device ----------
async function unlockDevice(raw){
  const code=normCode(raw);ACC.err='';
  if(code.length<6){ACC.err=t('acc.short');render();return false}
  if(!accessOn()){render();return false}
  ACC.busy=true;render();let ok=false;
  try{
    await SH.fs.doc(`clubs/${SH.club}/devices/${SH.uid}`).set({code,v:ACC.pub.v,name:(myName()||'').trim().slice(0,60),at:new Date().toISOString()});
    ACC.dev={code,v:ACC.pub.v};ok=true;toast(t('acc.unlocked'));
  }catch(e){ACC.err=e&&e.code==='permission-denied'?t('acc.wrong'):t('live.saveFail')}
  ACC.busy=false;render();return ok;
}
async function forgetDevice(){
  try{await SH.fs.doc(`clubs/${SH.club}/devices/${SH.uid}`).delete();ACC.dev=null;toast(t('acc.forgotten'))}catch(e){writeFail(e)}
  render();
}
// A member link (…?club=x&key=CODE) unlocks the device on arrival, then the code is removed from the address bar.
function keyFromUrl(){try{return normCode(new URLSearchParams(location.search).get('key'))}catch(e){return ''}}
function tryKeyFromUrl(){
  const k=keyFromUrl();if(!k||ACC.triedKey||ACC.pub===undefined||ACC.dev===undefined||SH.officer===undefined&&SH.user&&!SH.user.anon)return;
  ACC.triedKey=true;setQuery({key:''});
  if(!accessOn()||canAct())return;
  unlockDevice(k);
}
function memberLink(){const u=new URL(shareLink());if(ACC.cfg)u.searchParams.set('key',ACC.cfg.memberCode);return u.toString()}

// ---------- what visitors and members see ----------
// Shown inside the "live" notice on shared pages (roles, agenda, voting, draw).
function accessStrip(){
  if(!accessOn()||SH.officer===true)return '';
  if(deviceOk())return `<div class="notice"><span>${t('acc.isMember')}</span><button class="small ghost" data-act="acc-forget">${t('acc.forget')}</button></div>`;
  return unlockForm();
}
function unlockForm(){
  return `<form class="notice" data-form="acc-unlock" novalidate>
    <span style="flex-basis:100%">${t(ACC.dev&&ACC.dev.v!==ACC.pub.v?'acc.expired':'acc.visitor')}</span>
    <label class="label" for="acc-code" style="flex-basis:100%;margin:0">${t('acc.codeLabel')}</label>
    <input id="acc-code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" placeholder="ABCD-EFGH" style="max-width:200px;font-family:var(--mono)">
    <button type="submit" class="small primary" ${ACC.busy?'disabled':''}>${t('acc.unlock')}</button>
    ${ACC.err?`<span class="chip bad" style="white-space:normal">${esc(ACC.err)}</span>`:''}
  </form>`;
}
// A one-line note where editing is reserved to officers.
function officersOnlyNote(what){
  if(canManage())return '';
  return `<div class="notice"><span>${t('acc.officersOnly',{what:t(what)})}</span><button class="small" data-act="acc-officer">${t('office.signIn')}</button></div>`;
}

// ---------- officers' settings ----------
function accessBox(){
  const on=accessOn();
  if(!on){
    return `<div class="box warn-box"><div><h3>${t('acc.title')}</h3><p>${t('acc.offText')}</p><p class="muted">${t('acc.levels')}</p></div>
      <div class="btns"><button class="primary" data-act="acc-enable" ${ACC.busy?'disabled':''}>${t('acc.enable')}</button></div></div>`;
  }
  const c=ACC.cfg;const v=ACC.pub.v;
  const valid=ACC.devices.filter(d=>d.v===v);
  return `<div class="box"><div><h3>${t('acc.title')}</h3><p class="muted">${t('acc.onText')}</p></div>
    <div class="kv">
      <div><span class="label">${t('acc.code')}</span><b class="codebig">${c?esc(fmtCode(c.memberCode)):'…'}</b></div>
      <div><span class="label">${t('acc.devices')}</span><b>${valid.length}</b></div>
    </div>
    <div class="btns">
      <button class="small primary" data-act="acc-copy-msg" ${c?'':'disabled'}>${t('acc.copyMsg')}</button>
      <button class="small" data-act="acc-copy-link" ${c?'':'disabled'}>${t('acc.copyLink')}</button>
      <button class="small" data-act="acc-qr" ${c?'':'disabled'}>${t('acc.qr')}</button>
    </div>
    <p class="muted" style="font-size:.85rem;margin-top:-4px">${t('acc.linkWarn')}</p>
    <label class="check" for="acc-guests"><input type="checkbox" id="acc-guests" data-act="acc-guests" ${ACC.pub.guestsVote!==false?'checked':''} ${ACC.busy||!c?'disabled':''}><span>${t('acc.guestsVote')}</span></label>
    ${valid.length?`<details><summary class="muted">${t('acc.deviceList')}</summary><div class="wchips" style="margin-top:8px">${valid.map(d=>`<span class="wchip">${esc(d.name||t('acc.noName'))}<button class="ghost small" data-act="acc-revoke" data-id="${esc(d.id)}" aria-label="${esc(t('acc.revoke',{name:d.name||t('acc.noName')}))}">×</button></span>`).join('')}</div></details>`:''}
    <div class="btns" style="border-top:1px solid var(--line);padding-top:12px">
      ${ACC.confirmNew?`<span class="muted" style="align-self:center">${t('acc.newConfirm')}</span><button class="small primary" data-act="acc-new" ${ACC.busy?'disabled':''}>${t('acc.newYes')}</button><button class="small" data-act="acc-new-cancel">${t('common.cancel')}</button>`
        :ACC.confirmOff?`<span class="muted" style="align-self:center">${t('acc.offConfirm')}</span><button class="small" data-act="acc-disable" ${ACC.busy?'disabled':''}>${t('acc.offYes')}</button><button class="small" data-act="acc-off-cancel">${t('common.cancel')}</button>`
        :`<button class="small" data-act="acc-new-ask">${t('acc.new')}</button><button class="small ghost" data-act="acc-off-ask">${t('acc.disable')}</button>`}
    </div>
  </div>`;
}

// Writes the secret code (officers only) and the public flag together, so they never disagree.
async function saveAccess({code,guestsVote}){
  ACC.busy=true;render();
  const now=new Date().toISOString();
  // The version only grows (seconds since 1970), so devices unlocked under an older code never become valid again.
  const v=code?Math.max(Math.floor(Date.now()/1000),((ACC.pub&&ACC.pub.v)||0)+1):ACC.pub.v;
  const memberCode=code||ACC.cfg.memberCode;
  try{
    const b=SH.fs.batch();
    b.set(SH.fs.doc(`clubs/${SH.club}/private/config`),{memberCode,v,guestsVote,updatedAt:now,updatedBy:SH.user.email});
    b.set(SH.fs.doc(`clubs/${SH.club}/public/access`),{on:true,v,guestsVote,updatedAt:now});
    await b.commit();
    ACC.pub={on:true,v,guestsVote};ACC.cfg={memberCode,v,guestsVote};
  }catch(e){writeFail(e)}
  ACC.busy=false;ACC.confirmNew=false;render();
}
async function disableAccess(){
  ACC.busy=true;render();
  try{
    const b=SH.fs.batch();
    b.delete(SH.fs.doc(`clubs/${SH.club}/private/config`));
    b.delete(SH.fs.doc(`clubs/${SH.club}/public/access`));
    await b.commit();ACC.pub=null;ACC.cfg=null;toast(t('acc.disabled'));
  }catch(e){writeFail(e)}
  ACC.busy=false;ACC.confirmOff=false;render();
}
function inviteText(){
  return t('acc.msg',{club:(S.agenda&&S.agenda.club)||SH.club,code:fmtCode(ACC.cfg.memberCode),link:shareLink()});
}

document.addEventListener('submit',ev=>{
  if(ev.target.dataset.form!=='acc-unlock')return;ev.preventDefault();
  unlockDevice(document.getElementById('acc-code').value);
});
document.addEventListener('change',ev=>{
  if(ev.target.dataset.act!=='acc-guests')return;
  saveAccess({guestsVote:ev.target.checked}).then(()=>toast(t(ev.target.checked?'acc.guestsOn':'acc.guestsOff')));
});
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act]');if(!b||!b.dataset.act.startsWith('acc-')||b.tagName==='INPUT')return;
  switch(b.dataset.act){
  case 'acc-enable':saveAccess({code:newCode(),guestsVote:true}).then(()=>{if(accessOn())toast(t('acc.enabled'))});return;
  case 'acc-new-ask':ACC.confirmNew=true;ACC.confirmOff=false;break;
  case 'acc-new-cancel':ACC.confirmNew=false;break;
  case 'acc-new':saveAccess({code:newCode(),guestsVote:ACC.pub.guestsVote!==false}).then(()=>toast(t('acc.newDone')));return;
  case 'acc-off-ask':ACC.confirmOff=true;ACC.confirmNew=false;break;
  case 'acc-off-cancel':ACC.confirmOff=false;break;
  case 'acc-disable':disableAccess();return;
  case 'acc-copy-msg':copyText(inviteText());return;
  case 'acc-copy-link':copyText(memberLink());return;
  case 'acc-qr':openQr('member');return;
  case 'acc-revoke':SH.fs.doc(`clubs/${SH.club}/devices/${b.dataset.id}`).delete().then(()=>toast(t('acc.revoked'))).catch(writeFail);return;
  case 'acc-forget':forgetDevice();return;
  case 'acc-officer':setTab('office');return;
  case 'acc-where':setTab('roles');setTimeout(()=>{const i=document.getElementById('acc-code');if(i){i.focus();i.scrollIntoView({block:'center'})}},50);return;
  default:return;
  }
  render();
});
