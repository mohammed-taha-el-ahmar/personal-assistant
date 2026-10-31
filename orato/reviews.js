// Orato – on the club page: links to the club's social networks, the average rating from meeting feedback,
// and testimonials chosen by the officers.
// Stored in clubs/{club}/public/info with the rest of the page:
//   social:       {facebook, instagram, linkedin, tiktok, youtube, x, whatsapp, meetup}  (https links)
//   reviews:      {show, avg, n, since, at}   a snapshot of the feedback, refreshed when officers save the page
//   testimonials: [{id, text, who, kind, date, fb?}]   comments from the feedback form whose authors agreed to
//                 publication (fb = the feedback id), or testimonials typed in by an officer
// The feedback answers themselves stay readable by officers only.

const SOCIALS=[['facebook','Facebook'],['instagram','Instagram'],['linkedin','LinkedIn'],['tiktok','TikTok'],['youtube','YouTube'],['x','X (Twitter)'],['whatsapp','WhatsApp'],['meetup','Meetup']];
const REVIEW_MONTHS=12, REVIEW_MIN=3, MAX_TESTIMONIALS=12;

// ---------- helpers ----------
function feedbackSince(){const d=new Date();d.setMonth(d.getMonth()-REVIEW_MONTHS);return d.toISOString().slice(0,10)}
// Average of the feedback of the last 12 months (officers only: computed from their live copy of the answers).
function liveReviewStats(){
  const since=feedbackSince();const L=(SH.feedback||[]).filter(f=>(f.date||'')>=since&&f.rating>=1);
  if(!L.length)return {avg:0,n:0,since};
  return {avg:Math.round(L.reduce((s,f)=>s+f.rating,0)/L.length*10)/10,n:L.length,since};
}
// "Camille Martin" → "Camille M."
function shortName(n){const p=String(n||'').trim().split(/\s+/).filter(Boolean);if(!p.length)return '';return p.length>1?`${p[0]} ${p[p.length-1][0].toUpperCase()}.`:p[0]}
const starsHtml=avg=>`<span class="stars-show" role="img" aria-label="${esc(t('rv.starsAria',{avg:fmtAvg(avg)}))}"><span class="bg">★★★★★</span><span class="fg" style="width:${Math.max(0,Math.min(100,avg/5*100))}%">★★★★★</span></span>`;
const fmtAvg=v=>Number(v||0).toLocaleString(locale(),{minimumFractionDigits:1,maximumFractionDigits:1});

// ---------- club page ----------
function socialHtml(social){
  const links=SOCIALS.map(([k,label])=>[k,label,safeUrl(social&&social[k])]).filter(([,,u])=>u);
  if(!links.length)return '';
  return `<div class="box"><h3>${t('rv.followUs')}</h3><div class="btns social">${links.map(([k,label,u])=>`<a class="btn small soc soc-${k}" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>`).join('')}</div></div>`;
}
function reviewsHtml(info){
  const r=info.reviews||{};const T=(info.testimonials||[]).filter(x=>x&&x.text);
  const showAvg=r.show&&r.n>=REVIEW_MIN;
  if(!showAvg&&!T.length)return '';
  return `<div class="box"><h3>${t('rv.title')}</h3>
    ${showAvg?`<div class="avgline">${starsHtml(r.avg)}<b>${esc(fmtAvg(r.avg))}<span class="muted"> / 5</span></b><span class="muted">${esc(t('rv.basedOn',{n:r.n,months:REVIEW_MONTHS}))}</span></div>`:''}
    ${T.length?`<div class="testis">${T.map(x=>`<figure class="testi"><blockquote>${esc(x.text)}</blockquote><figcaption>${x.who?`<b>${esc(x.who)}</b>`:''}${x.kind?`<span class="muted">${x.who?' · ':''}${esc(t(x.kind==='guest'?'rv.guest':'rv.member'))}</span>`:''}</figcaption></figure>`).join('')}</div>`:''}
  </div>`;
}

// ---------- club page editor (officers) ----------
function socialEditBox(){
  const s=CL.draft.social;
  return `<div class="box"><div><h3>${t('rv.socialTitle')}</h3><p class="muted">${t('rv.socialIntro')}</p></div><div class="fields">
    ${SOCIALS.map(([k,label])=>{const v=s[k]||'';const bad=v&&!safeUrl(v);
      return `<div class="field"><label class="label" for="cl-s-${k}">${esc(label)}</label><input id="cl-s-${k}" type="url" inputmode="url" data-cl="social.${k}" maxlength="300" value="${esc(v)}" placeholder="https://…">${bad?`<span class="chip bad" style="align-self:flex-start">${t('on.badUrl')}</span>`:''}</div>`}).join('')}
  </div></div>`;
}
function reviewsEditBox(){
  const d=CL.draft;const st=liveReviewStats();const T=d.testimonials;
  const used=new Set(T.map(x=>x.fb).filter(Boolean));
  const since=feedbackSince();
  const comments=(SH.feedback||[]).filter(f=>f.comment&&f.comment.trim());
  const ok=comments.filter(f=>f.publishOk&&!used.has(f.id)).slice(0,30);
  const noConsent=comments.filter(f=>!f.publishOk).length;
  return `<div class="box"><div><h3>${t('rv.title')}</h3><p class="muted">${t('rv.editIntro')}</p></div>
    <label class="check" for="cl-rv-show"><input type="checkbox" id="cl-rv-show" data-rv="show" ${d.reviews.show?'checked':''}><span>${t('rv.showAvg')}</span></label>
    <p class="muted" style="font-size:.9rem;margin-top:-4px">${st.n?t('rv.current',{avg:fmtAvg(st.avg),n:st.n,months:REVIEW_MONTHS}):t('rv.noneYet')}${st.n&&st.n<REVIEW_MIN?' '+t('rv.tooFew',{min:REVIEW_MIN}):''}</p>
    <div style="border-top:1px solid var(--line);padding-top:12px;display:flex;flex-direction:column;gap:10px">
      <div class="phead"><h3>${t('rv.testiTitle')} <span class="muted" style="font-weight:400">${T.length} / ${MAX_TESTIMONIALS}</span></h3>
        <button class="small" data-act="rv-add" ${T.length>=MAX_TESTIMONIALS?'disabled':''}>${t('rv.addManual')}</button></div>
      ${T.length?T.map((x,i)=>`<div class="editrow">
        <div class="field"><label class="label" for="rv-t${i}">${t('rv.text')}</label><textarea id="rv-t${i}" data-rvt="${i}" data-k="text" maxlength="400" rows="2">${esc(x.text)}</textarea></div>
        <div class="fields">
          <div class="field"><label class="label" for="rv-w${i}">${t('rv.who')}</label><input id="rv-w${i}" data-rvt="${i}" data-k="who" maxlength="60" value="${esc(x.who||'')}" placeholder="${t('rv.whoPh')}"></div>
          <div class="field"><label class="label" for="rv-k${i}">${t('rv.kind')}</label><select id="rv-k${i}" data-rvt="${i}" data-k="kind">${['member','guest'].map(k=>`<option value="${k}" ${x.kind===k?'selected':''}>${t('rv.'+k)}</option>`).join('')}</select></div>
        </div>
        <div class="btns"><button class="ghost small" data-act="rv-up" data-i="${i}" aria-label="${t('ag.up')}">↑</button><button class="ghost small" data-act="rv-down" data-i="${i}" aria-label="${t('ag.down')}">↓</button><button class="small ghost" data-act="rv-del" data-i="${i}">${t('hist.delete')}</button>${x.fb?`<span class="muted" style="align-self:center;font-size:.85rem">${t('rv.fromFeedback')}</span>`:''}</div>
      </div>`).join(''):`<p class="muted">${t('rv.noTesti')}</p>`}
      <div><span class="label">${t('rv.pickTitle')}</span>
        ${ok.length?`<ul class="picklist">${ok.map(f=>`<li><span>“${esc(f.comment)}”<br><span class="muted" style="font-size:.85rem">${esc([f.name?shortName(f.name):t('rv.anonymous'),t(f.kind==='guest'?'rv.guest':'rv.member'),f.rating?f.rating+'★':'',fmtDate(f.date)].filter(Boolean).join(' · '))}</span></span>
          <button class="small" data-act="rv-pick" data-id="${esc(f.id)}" ${T.length>=MAX_TESTIMONIALS?'disabled':''}>${t('rv.publish')}</button></li>`).join('')}</ul>`:`<p class="muted" style="font-size:.9rem">${t('rv.noConsented')}</p>`}
        ${noConsent?`<p class="muted" style="font-size:.85rem">${t('rv.noConsent',{n:noConsent})}</p>`:''}
      </div>
    </div>
  </div>`;
}
// Called when the page is saved: keeps valid links, refreshes the rating snapshot, cleans testimonials.
function prepareReviewsForSave(d){
  // "facebook.com/club" is accepted and becomes "https://facebook.com/club"; links that still aren't valid are reported.
  const social={},bad=[];
  SOCIALS.forEach(([k,label])=>{let v=String(d.social[k]||'').trim();if(!v)return;
    if(!/^[a-z]+:/i.test(v)&&/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(v))v='https://'+v.replace(/^\/+/,'');
    const u=safeUrl(v);if(u)social[k]=u;else bad.push(label)});
  d.social=social;if(bad.length)setTimeout(()=>toast(t('rv.badLinks',{list:bad.join(', ')})),1200);
  const st=liveReviewStats();
  d.reviews={show:!!d.reviews.show,avg:st.avg,n:st.n,since:st.since,at:new Date().toISOString()};
  d.testimonials=d.testimonials.map(x=>({id:x.id,text:String(x.text||'').trim().slice(0,400),who:String(x.who||'').trim().slice(0,60),kind:x.kind==='guest'?'guest':'member',date:x.date||'',...(x.fb?{fb:x.fb}:{})}))
    .filter(x=>x.text).slice(0,MAX_TESTIMONIALS);
}

document.addEventListener('input',ev=>{
  const ds=ev.target.dataset||{};if(ds.rvt===undefined||!CL.draft)return;
  CL.draft.testimonials[+ds.rvt][ds.k]=ev.target.value;
});
document.addEventListener('change',ev=>{
  const ds=ev.target.dataset||{};if(!CL.draft)return;
  if(ds.rv==='show')CL.draft.reviews.show=ev.target.checked;
  if(ds.rvt!==undefined&&ds.k==='kind')CL.draft.testimonials[+ds.rvt].kind=ev.target.value;
});
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act]');if(!b||!b.dataset.act.startsWith('rv-')||!CL.draft)return;
  const T=CL.draft.testimonials,i=+b.dataset.i;
  switch(b.dataset.act){
  case 'rv-add':if(T.length<MAX_TESTIMONIALS)T.push({id:cid(),text:'',who:'',kind:'member',date:todayISO()});break;
  case 'rv-del':T.splice(i,1);break;
  case 'rv-up':if(i>0)[T[i-1],T[i]]=[T[i],T[i-1]];break;
  case 'rv-down':if(i<T.length-1)[T[i+1],T[i]]=[T[i],T[i+1]];break;
  case 'rv-pick':{const f=(SH.feedback||[]).find(x=>x.id===b.dataset.id);if(!f||T.length>=MAX_TESTIMONIALS)return;
    T.push({id:cid(),text:f.comment.trim().slice(0,400),who:shortName(f.name),kind:f.kind==='guest'?'guest':'member',date:f.date||'',fb:f.id});break}
  default:return;
  }
  render();
});
