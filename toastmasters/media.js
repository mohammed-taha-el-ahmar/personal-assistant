// Orato – photos and videos on the club page.
//
// Photos are resized in the browser and stored in Firestore itself (no paid file storage needed):
//   clubs/{club}/media/{id}        small version (about 640 px) shown in the gallery
//   clubs/{club}/media/{id}-full   larger version (about 1600 px) shown when a photo is opened
// Videos are links: YouTube, Vimeo, or a direct link to a video file. They load only when someone presses play,
// so nothing is fetched from YouTube or Vimeo before that.
// The order and captions live in clubs/{club}/public/info → gallery: [{id, type:'photo'|'video', url?, caption}].

const MEDIA_MAX_PHOTOS=24, MEDIA_MAX_VIDEOS=12;
const MEDIA={cache:{},full:{},loading:{},uploaded:[],busy:'',open:null,playing:{}};
const mediaId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const isDataImage=s=>typeof s==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(s);

// ---------- video links ----------
function videoInfo(raw){
  const url=safeUrl(raw);if(!url)return null;
  let u;try{u=new URL(url)}catch(e){return null}
  const host=u.hostname.replace(/^(www|m)\./,'');
  const okId=id=>/^[A-Za-z0-9_-]{6,20}$/.test(id||'')?id:'';
  if(host==='youtu.be'){const id=okId(u.pathname.slice(1).split('/')[0]);return id&&{kind:'youtube',id}}
  if(['youtube.com','youtube-nocookie.com','music.youtube.com'].includes(host)){
    let id=u.searchParams.get('v');
    const m=u.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);if(!id&&m)id=m[2];
    id=okId(id);return id&&{kind:'youtube',id};
  }
  if(host==='vimeo.com'||host==='player.vimeo.com'){const m=u.pathname.match(/(\d{5,12})/);return m&&{kind:'vimeo',id:m[1]}}
  if(/\.(mp4|webm|ogv|mov)$/i.test(u.pathname))return {kind:'file',src:url};
  return null;
}
function videoPlayer(v){
  if(v.kind==='youtube')return `<iframe src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  if(v.kind==='vimeo')return `<iframe src="https://player.vimeo.com/video/${v.id}?autoplay=1&dnt=1" title="Vimeo" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  return `<video src="${esc(v.src)}" controls autoplay playsinline preload="metadata"></video>`;
}
const videoSource=v=>v.kind==='youtube'?'YouTube':v.kind==='vimeo'?'Vimeo':t('media.file');

// ---------- loading photos ----------
function loadThumb(id){
  if(MEDIA.cache[id]||MEDIA.loading[id]||!SH.fs)return;
  MEDIA.loading[id]=true;
  SH.fs.doc(`clubs/${SH.club}/media/${id}`).get().then(s=>{const d=s.exists?s.data().data:'';MEDIA.cache[id]=isDataImage(d)?d:'missing';softRender()})
    .catch(()=>{MEDIA.cache[id]='missing';softRender()});
}
async function loadFull(id){
  if(MEDIA.full[id])return MEDIA.full[id];
  try{const s=await SH.fs.doc(`clubs/${SH.club}/media/${id}-full`).get();const d=s.exists?s.data().data:'';if(isDataImage(d)){MEDIA.full[id]=d;return d}}catch(e){}
  return MEDIA.cache[id];
}

// ---------- club page: gallery ----------
function galleryHtml(items){
  const photos=items.filter(x=>x.type==='photo'),videos=items.filter(x=>x.type==='video'&&videoInfo(x.url));
  if(!photos.length&&!videos.length)return '';
  photos.forEach(p=>loadThumb(p.id));
  return `<div class="box"><h3>${t('media.title')}</h3>
    ${photos.length?`<div class="gallery">${photos.map((p,i)=>{const src=MEDIA.cache[p.id];
      return `<figure><button type="button" class="ph" data-act="media-open" data-i="${i}" aria-label="${esc(p.caption||t('media.photoN',{n:i+1}))}">
        ${src&&src!=='missing'?`<img src="${src}" alt="${esc(p.caption||'')}" loading="lazy">`:`<span class="muted">${src==='missing'?t('media.missing'):'…'}</span>`}</button>
        ${p.caption?`<figcaption>${esc(p.caption)}</figcaption>`:''}</figure>`}).join('')}</div>`:''}
    ${videos.length?`<div class="videos">${videos.map(x=>{const v=videoInfo(x.url);
      return `<figure><div class="vid">${MEDIA.playing[x.id]?videoPlayer(v)
        :`<button type="button" class="play" data-act="media-play" data-id="${esc(x.id)}" aria-label="${esc(t('media.play',{what:x.caption||videoSource(v)}))}"><span class="tri" aria-hidden="true">▶</span><span>${esc(x.caption||t('media.video'))}</span><small>${esc(t('media.from',{src:videoSource(v)}))}</small></button>`}</div>
        ${x.caption&&MEDIA.playing[x.id]?`<figcaption>${esc(x.caption)}</figcaption>`:''}</figure>`}).join('')}</div>`:''}
  </div>`;
}
// Full-screen viewer with previous / next.
function paintLightbox(){
  let el=document.getElementById('lightbox');
  if(!MEDIA.open){if(el)el.remove();return}
  const photos=MEDIA.open.list;const i=MEDIA.open.i;const p=photos[i];
  if(!el){el=document.createElement('div');el.id='lightbox';el.className='qrlay lightbox';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el)}
  const src=MEDIA.full[p.id]||MEDIA.cache[p.id];
  el.innerHTML=`<figure><img src="${isDataImage(src)?src:''}" alt="${esc(p.caption||'')}">${p.caption?`<figcaption>${esc(p.caption)}</figcaption>`:''}</figure>
    <div class="btns lbbar">${photos.length>1?`<button data-act="media-prev" aria-label="${t('media.prev')}">←</button><span>${i+1} / ${photos.length}</span><button data-act="media-next" aria-label="${t('media.next')}">→</button>`:''}<button class="primary" data-act="media-close">${t('qr.close')}</button></div>`;
  el.querySelector('[data-act=media-close]').focus();
  if(!MEDIA.full[p.id])loadFull(p.id).then(()=>{if(MEDIA.open&&MEDIA.open.list[MEDIA.open.i]===p)paintLightbox()});
}
function openPhoto(i){const photos=normInfo(CL.info).gallery.filter(x=>x.type==='photo');if(!photos[i])return;MEDIA.open={list:photos,i};paintLightbox()}
function stepPhoto(n){if(!MEDIA.open)return;const L=MEDIA.open.list.length;MEDIA.open.i=(MEDIA.open.i+n+L)%L;paintLightbox()}

// ---------- editor (officers) ----------
function galleryEditBox(){
  const g=CL.draft.gallery;const nP=g.filter(x=>x.type==='photo').length,nV=g.filter(x=>x.type==='video').length;
  g.filter(x=>x.type==='photo').forEach(p=>loadThumb(p.id));
  return `<div class="box"><div><h3>${t('media.title')}</h3><p class="muted">${t('media.editIntro')}</p></div>
    <div class="btns">
      <button class="small primary" data-act="media-pick" ${MEDIA.busy||nP>=MEDIA_MAX_PHOTOS?'disabled':''}>${t('media.addPhotos')}</button>
      <input id="media-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic" multiple hidden data-act="media-file">
      <span class="muted" style="align-self:center;font-size:.85rem">${MEDIA.busy?esc(MEDIA.busy):t('media.counts',{p:nP,mp:MEDIA_MAX_PHOTOS,v:nV,mv:MEDIA_MAX_VIDEOS})}</span>
    </div>
    <form class="btns" data-form="media-link" style="flex-wrap:nowrap" novalidate>
      <input id="media-url" type="url" inputmode="url" placeholder="https://www.youtube.com/watch?v=…" aria-label="${t('media.linkLabel')}">
      <button type="submit" ${nV>=MEDIA_MAX_VIDEOS?'disabled':''}>${t('media.addVideo')}</button>
    </form>
    ${g.length?`<div class="medialist">${g.map((x,i)=>{const src=x.type==='photo'?MEDIA.cache[x.id]:'';const v=x.type==='video'&&videoInfo(x.url);
      return `<div class="mrow">
        <div class="mthumb">${x.type==='photo'?(isDataImage(src)?`<img src="${src}" alt="">`:'…'):`<span aria-hidden="true">▶</span>`}</div>
        <div class="field" style="flex:1"><label class="label" for="media-cap-${i}">${x.type==='photo'?t('media.photo'):esc(t('media.from',{src:v?videoSource(v):'?'}))}</label>
          <input id="media-cap-${i}" data-mcap="${i}" maxlength="140" value="${esc(x.caption||'')}" placeholder="${t('media.captionPh')}"></div>
        <div class="ctrls"><button class="ghost small" data-act="media-up" data-i="${i}" aria-label="${t('ag.up')}">↑</button><button class="ghost small" data-act="media-down" data-i="${i}" aria-label="${t('ag.down')}">↓</button><button class="ghost small" data-act="media-del" data-i="${i}" aria-label="${t('common.remove')}">×</button></div>
      </div>`}).join('')}</div>`:`<p class="muted">${t('media.none')}</p>`}
    <p class="muted" style="font-size:.85rem">${t('media.note')}</p>
  </div>`;
}

// Resize and compress in the browser. Returns a JPEG data URL under `limit` characters.
async function decodeImage(file){
  if(window.createImageBitmap){try{return await createImageBitmap(file,{imageOrientation:'from-image'})}catch(e){}}
  const url=URL.createObjectURL(file);
  try{const img=new Image();img.src=url;await img.decode();return img}finally{setTimeout(()=>URL.revokeObjectURL(url),2000)}
}
function encodeImage(img,maxSide,limit){
  const W=img.width,H=img.height;let scale=Math.min(1,maxSide/Math.max(W,H));
  for(let round=0;round<5;round++){
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(W*scale));c.height=Math.max(1,Math.round(H*scale));
    const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
    for(const q of [0.85,0.78,0.7,0.62,0.55]){const s=c.toDataURL('image/jpeg',q);if(s.length<=limit)return {data:s,w:c.width,h:c.height}}
    scale*=0.8;
  }
  throw new Error('too-big');
}
async function addPhotos(files){
  const g=CL.draft.gallery;let room=MEDIA_MAX_PHOTOS-g.filter(x=>x.type==='photo').length;
  const list=[...files].filter(f=>/^image\//.test(f.type)||/\.(heic|jpe?g|png|webp|gif)$/i.test(f.name));
  if(list.length>room)toast(t('media.tooMany',{n:MEDIA_MAX_PHOTOS}));
  let k=0,failed=0;
  for(const f of list.slice(0,Math.max(0,room))){
    k++;MEDIA.busy=t('media.preparing',{i:k,n:Math.min(list.length,room)});render();
    try{
      if(f.size>40e6)throw new Error('size');
      const img=await decodeImage(f);
      const full=encodeImage(img,1600,700000),thumb=encodeImage(img,640,90000);
      if(img.close)img.close();
      const id=mediaId();const now=new Date().toISOString(),by=SH.user.email;
      const b=SH.fs.batch();
      b.set(SH.fs.doc(`clubs/${SH.club}/media/${id}`),{data:thumb.data,w:thumb.w,h:thumb.h,at:now,by});
      b.set(SH.fs.doc(`clubs/${SH.club}/media/${id}-full`),{data:full.data,w:full.w,h:full.h,at:now,by});
      await b.commit();
      MEDIA.cache[id]=thumb.data;MEDIA.full[id]=full.data;MEDIA.uploaded.push(id);
      CL.draft.gallery.push({id,type:'photo',caption:''});
    }catch(e){failed++;if(e&&e.code==='permission-denied'){writeFail(e);break}}
  }
  MEDIA.busy='';render();
  if(failed)toast(t('media.failed',{n:failed}));else if(k)toast(t('media.added',{n:k}));
}
function deleteMediaDocs(ids){
  ids.forEach(id=>{['',"-full"].forEach(s=>SH.fs.doc(`clubs/${SH.club}/media/${id}${s}`).delete().catch(()=>{}));delete MEDIA.cache[id];delete MEDIA.full[id]});
}
// After saving: remove photos that are no longer on the page. After cancelling: remove photos uploaded meanwhile.
function mediaAfterSave(before,after){
  const keep=new Set(after.filter(x=>x.type==='photo').map(x=>x.id));
  const gone=[...new Set([...before.filter(x=>x.type==='photo').map(x=>x.id),...MEDIA.uploaded])].filter(id=>!keep.has(id));
  deleteMediaDocs(gone);MEDIA.uploaded=[];
}
function mediaAfterCancel(){
  const saved=new Set(normInfo(CL.info).gallery.map(x=>x.id));
  deleteMediaDocs(MEDIA.uploaded.filter(id=>!saved.has(id)));MEDIA.uploaded=[];
}

document.addEventListener('input',ev=>{const i=ev.target.dataset&&ev.target.dataset.mcap;if(i===undefined||!CL.draft)return;CL.draft.gallery[+i].caption=ev.target.value});
document.addEventListener('change',ev=>{
  if(ev.target.dataset&&ev.target.dataset.act==='media-file'){const f=ev.target.files;if(f&&f.length)addPhotos(f);ev.target.value=''}
});
document.addEventListener('submit',ev=>{
  if(ev.target.dataset.form!=='media-link')return;ev.preventDefault();
  const inp=document.getElementById('media-url');const url=inp.value.trim();
  if(!videoInfo(url)){toast(t('media.badLink'));inp.focus();return}
  CL.draft.gallery.push({id:mediaId(),type:'video',url:safeUrl(url),caption:''});render();toast(t('media.videoAdded'));
});
document.addEventListener('keydown',e=>{if(!MEDIA.open)return;if(e.key==='Escape'){MEDIA.open=null;paintLightbox()}else if(e.key==='ArrowRight')stepPhoto(1);else if(e.key==='ArrowLeft')stepPhoto(-1)});
document.addEventListener('click',ev=>{
  if(ev.target.id==='lightbox'){MEDIA.open=null;paintLightbox();return}
  const b=ev.target.closest('[data-act]');if(!b||!b.dataset.act.startsWith('media-')||b.tagName==='INPUT')return;const i=+b.dataset.i;
  const g=CL.draft&&CL.draft.gallery;
  switch(b.dataset.act){
  case 'media-open':openPhoto(i);return;
  case 'media-prev':stepPhoto(-1);return;
  case 'media-next':stepPhoto(1);return;
  case 'media-close':MEDIA.open=null;paintLightbox();return;
  case 'media-play':MEDIA.playing[b.dataset.id]=true;render();return;
  case 'media-pick':{const f=document.getElementById('media-file');if(f)f.click();return}
  case 'media-up':if(g&&i>0){[g[i-1],g[i]]=[g[i],g[i-1]];render()}return;
  case 'media-down':if(g&&i<g.length-1){[g[i+1],g[i]]=[g[i],g[i+1]];render()}return;
  case 'media-del':if(g){g.splice(i,1);render()}return;
  }
});
