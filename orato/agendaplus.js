// Oratia – agenda extras: custom meeting roles, the timing of each agenda item for the Timer, and the number of
// contestants on a contest agenda (up to 8).
// Custom roles live in the agenda of each meeting (agenda.customRoles), so a planned meeting keeps its own, and club
// templates carry them too. They appear in the Roles tab like the usual roles: members take them, officers assign them.

const CR_MAX=12;
const AGT={
en:{title:'Meeting roles',intro:'Add the roles of this meeting that are not in the usual list: joke of the day, quiz master, a fourth speaker… They appear in the Roles tab, where members can take them.',
  add:'Add',namePh:'Role name',kinds:{other:'Other role',speech:'Speech',eval:'Evaluation'},kindL:'Type',alsoAgenda:'Also add it to the agenda',ideas:'Ideas:',
  none:'No extra role for this meeting.',max:'Up to 12 extra roles per meeting.',dup:'This role already exists.',added:'Role “{r}” added',removed:'Role removed',
  remove:'Remove the role {r}',
  sugg:[['Joke of the day','other',3],['Quiz master','other',5],['Thought of the day','other',2],['Speaker 4','speech',7],['Evaluator 4','eval',3],['Online host','other',0],['Photographer','other',0],['Greeter','other',0]],
  tm:'Timer',auto:'Auto · {x}',autoSlots:'Auto · {n} × {x}',autoNone:'Auto',notTimed:'Not timed',minN:'{a}–{b} min',
  cands:'Contestants on the agenda',candsHint:'Up to 8 contestants. The Roles tab lists 8 judges (judges 6 to 8 are optional) and the tiebreaking judge.',
  planned:'planned {t}',late:'{n} min behind schedule',early:'{n} min ahead of schedule',onTime:'On schedule',
  changed:'The agenda has changed since the running order was loaded.',update:'Update the running order',updated:'Running order updated'},
fr:{title:'Rôles de la réunion',intro:'Ajoutez les rôles de cette réunion qui ne sont pas dans la liste habituelle : blague du jour, maître du quiz, quatrième orateur… Ils apparaissent dans l’onglet Rôles, où les membres peuvent les prendre.',
  add:'Ajouter',namePh:'Nom du rôle',kinds:{other:'Autre rôle',speech:'Discours',eval:'Évaluation'},kindL:'Type',alsoAgenda:'L’ajouter aussi au déroulé',ideas:'Idées :',
  none:'Aucun rôle supplémentaire pour cette réunion.',max:'Jusqu’à 12 rôles supplémentaires par réunion.',dup:'Ce rôle existe déjà.',added:'Rôle « {r} » ajouté',removed:'Rôle retiré',
  remove:'Retirer le rôle {r}',
  sugg:[['Blague du jour','other',3],['Maître du quiz','other',5],['Pensée du jour','other',2],['Orateur 4','speech',7],['Évaluateur 4','eval',3],['Hôte en ligne','other',0],['Photographe','other',0],['Accueil','other',0]],
  tm:'Chrono',auto:'Auto · {x}',autoSlots:'Auto · {n} × {x}',autoNone:'Auto',notTimed:'Non chronométré',minN:'{a} à {b} min',
  cands:'Candidats au programme',candsHint:'Jusqu’à 8 candidats. L’onglet Rôles liste 8 juges (les juges 6 à 8 sont facultatifs) et le juge de départage.',
  planned:'prévu {t}',late:'{n} min de retard sur le programme',early:'{n} min d’avance sur le programme',onTime:'Dans les temps',
  changed:'L’ordre du jour a changé depuis le chargement de l’ordre de passage.',update:'Mettre à jour l’ordre de passage',updated:'Ordre de passage mis à jour'},
nl:{title:'Rollen van de bijeenkomst',intro:'Voeg rollen toe die niet in de gewone lijst staan: mop van de dag, quizmaster, een vierde spreker… Ze verschijnen in het tabblad Rollen, waar leden ze kunnen opnemen.',
  add:'Toevoegen',namePh:'Naam van de rol',kinds:{other:'Andere rol',speech:'Speech',eval:'Evaluatie'},kindL:'Soort',alsoAgenda:'Ook aan de agenda toevoegen',ideas:'Ideeën:',
  none:'Geen extra rol voor deze bijeenkomst.',max:'Maximaal 12 extra rollen per bijeenkomst.',dup:'Deze rol bestaat al.',added:'Rol “{r}” toegevoegd',removed:'Rol verwijderd',
  remove:'Rol {r} verwijderen',
  sugg:[['Mop van de dag','other',3],['Quizmaster','other',5],['Gedachte van de dag','other',2],['Spreker 4','speech',7],['Evaluator 4','eval',3],['Online host','other',0],['Fotograaf','other',0],['Ontvangst','other',0]],
  tm:'Timer',auto:'Auto · {x}',autoSlots:'Auto · {n} × {x}',autoNone:'Auto',notTimed:'Niet getimed',minN:'{a}–{b} min',
  cands:'Deelnemers op de agenda',candsHint:'Maximaal 8 deelnemers. Het tabblad Rollen toont 8 juryleden (jurylid 6 tot 8 zijn optioneel) en het tiebreak-jurylid.',
  planned:'gepland {t}',late:'{n} min achter op schema',early:'{n} min voor op schema',onTime:'Op schema',
  changed:'De agenda is gewijzigd sinds de volgorde werd geladen.',update:'Volgorde bijwerken',updated:'Volgorde bijgewerkt'},
ar:{title:'أدوار الاجتماع',intro:'أضف أدوار هذا الاجتماع غير الموجودة في القائمة المعتادة: نكتة اليوم، مدير المسابقة الثقافية، متحدث رابع… تظهر في تبويب الأدوار حيث يمكن للأعضاء أخذها.',
  add:'إضافة',namePh:'اسم الدور',kinds:{other:'دور آخر',speech:'خطاب',eval:'تقييم'},kindL:'النوع',alsoAgenda:'إضافته أيضًا إلى جدول الأعمال',ideas:'أفكار:',
  none:'لا يوجد دور إضافي لهذا الاجتماع.',max:'حتى 12 دورًا إضافيًا لكل اجتماع.',dup:'هذا الدور موجود بالفعل.',added:'تمت إضافة الدور «{r}»',removed:'تمت إزالة الدور',
  remove:'إزالة الدور {r}',
  sugg:[['نكتة اليوم','other',3],['مدير المسابقة الثقافية','other',5],['فكرة اليوم','other',2],['المتحدث 4','speech',7],['المقيّم 4','eval',3],['مضيف الاجتماع عبر الإنترنت','other',0],['المصوّر','other',0],['الاستقبال','other',0]],
  tm:'المؤقت',auto:'تلقائي · {x}',autoSlots:'تلقائي · {n} × {x}',autoNone:'تلقائي',notTimed:'بدون توقيت',minN:'{a}–{b} د',
  cands:'المتسابقون في جدول الأعمال',candsHint:'حتى 8 متسابقين. يعرض تبويب الأدوار 8 حكّام (الحكّام 6 إلى 8 اختياريون) وحَكَم الترجيح.',
  planned:'مقرر {t}',late:'تأخير {n} د عن البرنامج',early:'تقدّم {n} د عن البرنامج',onTime:'في الوقت المحدد',
  changed:'تغيّر جدول الأعمال منذ تحميل ترتيب المتحدثين.',update:'تحديث ترتيب المتحدثين',updated:'تم تحديث ترتيب المتحدثين'}
};
const AGL=()=>AGT[LANG]||AGT.en;
const CRD={name:'',kind:'other',agenda:true};

// ---------- timing of an agenda item ----------
// An item without a chosen timing gets one from its role, or from its length: the red card at the end of the
// planned minutes, yellow one minute before, green two minutes before (for short items: at half and three quarters).
function segTiming(d){d=Math.max(0,Number(d)||0);if(!d)return null;let g,a;
  if(d>=5){g=d-2;a=d-1}else if(d>=2){g=d-1;a=d-.5}else{g=d/2;a=d*.75}return {cg:+g.toFixed(2),ca:+a.toFixed(2),cr:d}}
const isSpeechRole=k=>['s1','s2','s3'].includes(k)||customKind(k)==='speech';
const isEvalRole=k=>['e1','e2','e3'].includes(k)||customKind(k)==='eval';
const contestPreset=()=>typeof ctType==='function'&&ctType().preset||'cIntl';
const ttSlots=it=>Math.max(1,Math.min(10,Math.floor((Number(it.dur)||20)/4)));
// What the Timer uses for one agenda item: {preset} or {preset:'custom',cg,ca,cr,seg:true}, or null (not timed).
function itemTiming(it){
  if(it.tm==='none')return null;
  if(it.tm&&PRESETS.some(p=>p.id===it.tm&&p.id!=='custom'))return {preset:it.tm};
  if(it.k==='tt')return {preset:'tt'};
  if(it.k==='evals'||isEvalRole(it.role)||it.k==='ttEval')return {preset:'eval'};
  if(it.k==='ge')return {preset:'ge'};
  if(isSpeechRole(it.role)){const sp=['s1','s2','s3'].includes(it.role)&&typeof speechForSlot==='function'?speechForSlot(it.role):null;return {preset:sp&&sp.preset||'std'}}
  if(CONTESTANT_KEYS.includes(it.role))return {preset:contestPreset()};
  const s=segTiming(it.dur);return s?{preset:'custom',...s,seg:true}:null;
}
const fmtMin=x=>String(+(+x).toFixed(2)).replace('.',LANG==='en'||LANG==='nl'?'.':',');
function timingLabel(x){if(!x)return AGL().notTimed;if(x.preset==='custom')return AGL().minN.replace('{a}',fmtMin(x.cg)).replace('{b}',fmtMin(x.cr));return t('preset.'+x.preset)}
function timingSelect(it,i){
  const L=AGL();const auto=itemTiming({...it,tm:''});
  const autoL=!auto?L.autoNone:it.k==='tt'?L.autoSlots.replace('{n}',ttSlots(it)).replace('{x}',timingLabel(auto)):L.auto.replace('{x}',timingLabel(auto));
  const opts=PRESETS.filter(p=>p.id!=='custom').map(p=>`<option value="${p.id}" ${it.tm===p.id?'selected':''}>${esc(t('preset.'+p.id))}</option>`).join('');
  return `<select class="tmsel" id="ai-m${i}" aria-label="${esc(L.tm)}" title="${esc(L.tm)}" data-item="${i}" data-k="tm"><option value="" ${!it.tm?'selected':''}>⏱ ${esc(autoL)}</option>${opts}<option value="none" ${it.tm==='none'?'selected':''}>${esc(L.notTimed)}</option></select>`;
}

// ---------- custom roles ----------
const crId=()=>'x'+Math.random().toString(36).slice(2,8).replace(/[^a-z0-9]/g,'0').padEnd(6,'0');
function crInsertAt(kind){
  const its=S.agenda.items;let at=-1;
  if(kind==='speech')its.forEach((it,i)=>{if(isSpeechRole(it.role))at=i+1});
  if(kind==='eval')its.forEach((it,i)=>{if(it.k==='evals'||isEvalRole(it.role))at=i+1});
  if(at<0){const c=its.findIndex(it=>it.k==='close');at=c>=0?c:its.length}
  return at;
}
function addCustomRole(name,kind,dur,toAgenda){
  const L=AGL();name=String(name||'').trim().replace(/\s+/g,' ').slice(0,40);if(!name)return false;
  const list=customRoles();if(list.length>=CR_MAX){toast(L.max);return false}
  const low=name.toLocaleLowerCase(locale());
  if(list.some(r=>String(r.name).toLocaleLowerCase(locale())===low)||ROLE_KEYS.some(k=>roleLabel(k).toLocaleLowerCase(locale())===low)){toast(L.dup);return false}
  const id=crId();S.agenda.customRoles=[...list,{id,name,kind:['speech','eval'].includes(kind)?kind:'other'}];
  if(toAgenda&&dur>0)S.agenda.items.splice(crInsertAt(kind),0,{title:name,role:id,dur});
  save();pushAgenda();toast(L.added.replace('{r}',name));return true;
}
function removeCustomRole(id){
  S.agenda.customRoles=customRoles().filter(r=>r.id!==id);
  S.agenda.items.forEach(it=>{if(it.role===id)it.role=''});
  if(SH.on){if(SH.roles[id]){delete SH.roles[id];(typeof rolesTarget==='function'?rolesTarget():SH.ref.roles).set({roles:{[id]:firebase.firestore.FieldValue.delete()},edit:id},{merge:true}).catch(()=>{})}}
  else delete S.roles[id];
  save();pushAgenda();toast(AGL().removed);
}
function customRolesBox(){
  const L=AGL();const list=customRoles();
  return `<div class="box crbox"><h3>${esc(L.title)}</h3><p class="muted">${esc(L.intro)}</p>
    ${list.length?`<ul class="crlist">${list.map((r,i)=>`<li><input data-crname="${r.id}" value="${esc(r.name)}" maxlength="40" aria-label="${esc(L.namePh)}">
      <select data-crkind="${r.id}" aria-label="${esc(L.kindL)}">${['other','speech','eval'].map(k=>`<option value="${k}" ${(r.kind||'other')===k?'selected':''}>${esc(L.kinds[k])}</option>`).join('')}</select>
      <button class="ghost small" data-act="cr-del" data-id="${r.id}" aria-label="${esc(L.remove.replace('{r}',r.name))}">×</button></li>`).join('')}</ul>`:`<p class="empty" style="margin:0 0 8px">${esc(L.none)}</p>`}
    ${list.length<CR_MAX?`<form class="crform" data-form="cr-add">
      <input id="cr-name" maxlength="40" placeholder="${esc(L.namePh)}" aria-label="${esc(L.namePh)}" value="${esc(CRD.name)}">
      <select id="cr-kind" aria-label="${esc(L.kindL)}">${['other','speech','eval'].map(k=>`<option value="${k}" ${CRD.kind===k?'selected':''}>${esc(L.kinds[k])}</option>`).join('')}</select>
      <button type="submit" class="small primary">${esc(L.add)}</button>
      <label class="check"><input type="checkbox" id="cr-ag" ${CRD.agenda?'checked':''}> ${esc(L.alsoAgenda)}</label></form>
    <div class="speakers crsugg"><span class="muted">${esc(L.ideas)}</span>${L.sugg.filter(s=>!list.some(r=>r.name===s[0])).map((s,i)=>`<button type="button" class="chip" data-act="cr-sugg" data-i="${L.sugg.indexOf(s)}">+ ${esc(s[0])}</button>`).join('')}</div>`:`<p class="muted">${esc(L.max)}</p>`}
  </div>`;
}

// ---------- contestants on a contest agenda ----------
const contestItems=()=>S.agenda.items.filter(it=>CONTESTANT_KEYS.includes(it.role));
function contestCountBox(){
  if(rolesMode()!=='contest')return '';const L=AGL();const n=contestItems().length;
  return `<div class="field" style="max-width:340px"><label class="label" for="ag-cands">${esc(L.cands)}</label>
    <select id="ag-cands" data-act="ag-cands">${[1,2,3,4,5,6,7,8].map(x=>`<option value="${x}" ${x===n?'selected':''}>${x}</option>`).join('')}</select>
    <span class="muted" style="font-size:.85rem">${esc(L.candsHint)}</span></div>`;
}
function setContestants(n){
  n=Math.max(1,Math.min(8,n|0));const its=S.agenda.items;const old=contestItems();
  const first=its.findIndex(it=>CONTESTANT_KEYS.includes(it.role));
  const at=first>=0?first:(()=>{const x=its.findIndex(it=>it.k==='cTally');return x>=0?x:its.length})();
  const dur=old.length?Number(old[0].dur)||8:8;
  const keep=its.filter(it=>!CONTESTANT_KEYS.includes(it.role));
  const before=keep.slice(0,its.slice(0,at).filter(it=>!CONTESTANT_KEYS.includes(it.role)).length);
  const after=keep.slice(before.length);
  const made=Array.from({length:n},(_,i)=>{const o=old.find(x=>x.role===CONTESTANT_KEYS[i]);return o?o:{k:'c'+(i+1),role:CONTESTANT_KEYS[i],dur}});
  S.agenda.items=[...before,...made,...after];save();pushAgenda();render();
}

document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act="cr-del"],[data-act="cr-sugg"]');if(!b||!canManage())return;
  if(b.dataset.act==='cr-del'){removeCustomRole(b.dataset.id);render();return}
  const s=AGL().sugg[+b.dataset.i];if(s&&addCustomRole(s[0],s[1],s[2],!!(document.getElementById('cr-ag')||{checked:true}).checked))render();
});
document.addEventListener('submit',ev=>{
  if(ev.target.dataset.form!=='cr-add')return;ev.preventDefault();if(!canManage())return;
  const name=$('#cr-name').value,kind=$('#cr-kind').value,ag=$('#cr-ag').checked;
  const dur=kind==='speech'?7:kind==='eval'?3:3;
  if(addCustomRole(name,kind,dur,ag)){CRD.name='';CRD.kind='other';render();const f=$('#cr-name');if(f)f.focus()}
});
document.addEventListener('input',ev=>{const el=ev.target;if(el.id==='cr-name')CRD.name=el.value;if(el.id==='cr-ag')CRD.agenda=el.checked;if(el.id==='cr-kind')CRD.kind=el.value});
document.addEventListener('change',ev=>{
  const el=ev.target;const ds=el.dataset||{};
  if(ds.act==='ag-cands'){if(canManage())setContestants(+el.value);return}
  if(ds.crname||ds.crkind){if(!canManage())return;const r=customRoles().find(x=>x.id===(ds.crname||ds.crkind));if(!r)return;
    if(ds.crname){const v=el.value.trim().replace(/\s+/g,' ').slice(0,40);if(!v){el.value=r.name;return}
      S.agenda.items.forEach(it=>{if(it.role===r.id&&(!it.title||it.title===r.name))it.title=v});r.name=v}
    else r.kind=['speech','eval'].includes(el.value)?el.value:'other';
    save();pushAgenda();render()}
});
