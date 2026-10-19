// Toastmasters Tools – agenda PDF (A4), built in the browser with jsPDF loaded on first use.

let jsPdfPromise=null;
function loadJsPdf(){
  if(window.jspdf)return Promise.resolve(window.jspdf);
  if(!jsPdfPromise)jsPdfPromise=new Promise((resolve,reject)=>{
    const sc=document.createElement('script');
    sc.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    sc.onload=()=>resolve(window.jspdf);
    sc.onerror=()=>{jsPdfPromise=null;reject(new Error('jspdf'))};
    document.head.appendChild(sc);
  });
  return jsPdfPromise;
}

// The built-in PDF fonts cover Latin-1 (é, è, à, ç, «, » are fine). Swap the few typographic marks they lack.
const pdfText=s=>String(s??'').replace(/[‘’ʼ]/g,"'").replace(/[“”]/g,'"')
  .replace(/[–—−]/g,'-').replace(/…/g,'...').replace(/[•●]/g,'-').replace(/[  ]/g,' ');

function timesFor(start,items){
  let [h,m]=(start||'19:00').split(':').map(Number);let x=(h||0)*60+(m||0);
  const out=items.map(it=>{const s=x;x+=Number(it.dur)||0;return hhmm(s)});out.push(hhmm(x));return out;
}

/* meeting: {club,date,venue,theme,start,items,person(it)->string, sections:[{title,lines:[...] }]} */
async function buildAgendaPdf(meeting,filename){
  let lib;
  try{toast(t('pdf.loading'));lib=await loadJsPdf()}catch(e){toast(t('pdf.fail'));return}
  const doc=new lib.jsPDF({unit:'mm',format:'a4'});
  const W=210,H=297,M=18,ACC=[15,94,110],INK=[24,32,43],MUTED=[86,98,117],LINE=[217,222,230];
  const times=timesFor(meeting.start,meeting.items);
  let y=0;

  const header=()=>{
    doc.setFillColor(...ACC);doc.rect(0,0,W,5,'F');
    [[29,143,78],[217,154,6],[200,53,42]].forEach((c,i)=>{doc.setFillColor(...c);doc.circle(W-M-10+i*5,14,1.4,'F')});
  };
  const newPage=()=>{doc.addPage();header();y=22};
  const need=h=>{if(y+h>H-20)newPage()};

  header();
  y=18;
  doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(...MUTED);
  doc.text(pdfText(t('ag.doc')).toUpperCase(),M,y,{charSpace:0.6});
  y+=9;doc.setFontSize(22);doc.setTextColor(...INK);
  const titleLines=doc.splitTextToSize(pdfText(meeting.club||t('ag.yourClub')),W-2*M);
  doc.text(titleLines,M,y);y+=titleLines.length*8;
  doc.setFont('helvetica','normal');doc.setFontSize(11);doc.setTextColor(...MUTED);
  const ol=online(meeting);
  const sub=[fmtDate(meeting.date),ol.format!=='online'?meeting.venue:''].filter(Boolean).map(pdfText).join('  ·  ');
  if(sub){doc.text(doc.splitTextToSize(sub,W-2*M),M,y);y+=6}
  if(meeting.theme){doc.setTextColor(...INK);doc.setFont('helvetica','bold');doc.text(pdfText(t('ag.themeIs')+' '+meeting.theme),M,y);y+=6}
  if(ol.format!=='inperson'){
    const link=safeUrl(ol.url);doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.setTextColor(...ACC);
    const label=pdfText(t('fmt.'+ol.format))+(link?' : ':'');doc.text(label,M,y);
    if(link){const x=M+doc.getTextWidth(label);doc.setFont('helvetica','normal');const shown=doc.splitTextToSize(link,W-M-x)[0];doc.textWithLink(shown,x,y,{url:link})}
    y+=5.5;
    const extra=[ol.id?t('on.idIs',{v:ol.id}):'',ol.pass?t('on.passIs',{v:ol.pass}):''].filter(Boolean).join('  ·  ');
    if(extra){doc.setFont('helvetica','normal');doc.setTextColor(...MUTED);doc.text(pdfText(extra),M,y);y+=5.5}
  }
  y+=2;doc.setDrawColor(...INK);doc.setLineWidth(0.6);doc.line(M,y,W-M,y);y+=7;

  // Rows: time | item (role underneath) | person, right-aligned
  const colT=M,colI=M+20,colP=W-M,itemW=W-2*M-20-52;
  meeting.items.forEach((it,i)=>{
    const title=pdfText(itemTitle(it));const lines=doc.splitTextToSize(title,itemW);
    const role=it.role?pdfText(roleLabel(it.role)):'';
    const h=lines.length*5+(role?4.6:0)+4;
    need(h);
    doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.setTextColor(...ACC);doc.text(times[i],colT,y);
    doc.setTextColor(...INK);doc.text(lines,colI,y);
    if(role){doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...MUTED);doc.text(role,colI,y+lines.length*5-0.6)}
    const who=pdfText(meeting.person(it));
    if(who){doc.setFont('helvetica','normal');doc.setFontSize(10.5);doc.setTextColor(...(who===pdfText(t('ag.open'))?MUTED:INK));
      doc.text(doc.splitTextToSize(who,50)[0],colP,y,{align:'right'})}
    y+=h-1.5;doc.setDrawColor(...LINE);doc.setLineWidth(0.2);doc.line(M,y-2.5,W-M,y-2.5);y+=1.5;
  });
  need(10);
  doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.setTextColor(...ACC);doc.text(times[times.length-1],colT,y);
  doc.setTextColor(...INK);doc.text(pdfText(t('ag.ends')),colI,y);y+=10;

  (meeting.sections||[]).forEach(sec=>{
    if(!sec.lines.length)return;
    need(14);
    doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(...MUTED);doc.text(pdfText(sec.title).toUpperCase(),M,y,{charSpace:0.6});y+=6;
    doc.setFont('helvetica','normal');doc.setFontSize(10.5);doc.setTextColor(...INK);
    sec.lines.forEach(l=>{const ls=doc.splitTextToSize(pdfText(l),W-2*M);need(ls.length*5+1);doc.text(ls,M,y);y+=ls.length*5+1});
    y+=5;
  });

  const n=doc.getNumberOfPages();
  for(let p=1;p<=n;p++){doc.setPage(p);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...MUTED);
    doc.text('Toastmasters Tools',M,H-10);doc.text(pdfText(t('pdf.page',{n:p,total:n})),W-M,H-10,{align:'right'})}
  doc.save(filename);
  return doc;
}

function pdfName(date){return (LANG==='fr'?'ordre-du-jour':'agenda')+(date?'-'+date:'')+'.pdf'}
function currentAgendaPdf(){
  const a=S.agenda;
  return buildAgendaPdf({club:a.club,date:a.date,venue:a.venue,theme:a.theme,start:a.start,online:a.online,items:a.items,person:itemPerson},pdfName(a.date));
}

// ---------- evaluation forms ----------
// list: evaluation objects from evals.js. blank=true prints the same form with empty fields, to fill in by hand.
async function buildEvalPdf(list,filename,blank){
  let lib;
  try{toast(t('pdf.loading'));lib=await loadJsPdf()}catch(e){toast(t('pdf.fail'));return}
  const doc=new lib.jsPDF({unit:'mm',format:'a4'});
  const W=210,H=297,M=18,ACC=[15,94,110],INK=[24,32,43],MUTED=[86,98,117],LINE=[217,222,230];
  const BOX=6,GAP=1.6,boxesW=5*BOX+4*GAP,colBox=W-M-boxesW;
  let y=0;
  const header=()=>{doc.setFillColor(...ACC);doc.rect(0,0,W,5,'F');
    [[29,143,78],[217,154,6],[200,53,42]].forEach((c,i)=>{doc.setFillColor(...c);doc.circle(W-M-10+i*5,14,1.4,'F')})};
  const need=h=>{if(y+h>H-20){doc.addPage();header();y=22}};
  const ruled=(n)=>{doc.setDrawColor(...LINE);doc.setLineWidth(0.3);for(let k=0;k<n;k++){need(8);y+=7;doc.line(M,y,W-M,y)}y+=4};

  list.forEach((e,idx)=>{
    if(idx>0)doc.addPage();
    header();y=18;
    doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(...MUTED);
    doc.text(pdfText(t('ev.formHead')).toUpperCase(),M,y,{charSpace:0.6});
    y+=9;doc.setFontSize(20);doc.setTextColor(...INK);doc.text(pdfText(evTypeName(e.type)),M,y);
    if(S.agenda&&S.agenda.club){y+=6;doc.setFont('helvetica','normal');doc.setFontSize(10.5);doc.setTextColor(...MUTED);doc.text(pdfText(S.agenda.club),M,y)}
    y+=9;

    // Who, when
    const info=[[t('evp.'+e.type),e.person],[t('ev.evaluator'),e.evaluator],[t('ev.date'),blank?'':fmtDate(e.date)]];
    if(e.type==='functionary')info.push([t('ev.role'),e.role]);
    if(e.type==='speech'){info.push([t('ev.project'),e.project]);info.push([t('ev.goals'),e.goals])}
    info.forEach(([k,v])=>{
      need(8);doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(...MUTED);doc.text(pdfText(k),M,y);
      const val=blank?'':pdfText(v||'');
      if(val){doc.setFont('helvetica','normal');doc.setFontSize(10.5);doc.setTextColor(...INK);const ls=doc.splitTextToSize(val,W-2*M-48);doc.text(ls,M+48,y);y+=(ls.length-1)*5}
      else{doc.setDrawColor(...LINE);doc.setLineWidth(0.3);doc.line(M+48,y+1,W-M,y+1)}
      y+=7.5;
    });
    y+=2;

    // Criteria: name, five boxes, comment
    need(14);
    doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(...MUTED);
    doc.text(pdfText(t('ev.criteria')).toUpperCase(),M,y,{charSpace:0.6});
    for(let n=1;n<=5;n++)doc.text(String(n),colBox+(n-1)*(BOX+GAP)+BOX/2,y,{align:'center'});
    y+=2;doc.setDrawColor(...INK);doc.setLineWidth(0.5);doc.line(M,y,W-M,y);y+=6;
    e.crit.forEach(c=>{
      const nameLines=doc.splitTextToSize(pdfText(critLabel(c)),colBox-M-6);
      const note=blank?'':pdfText(c.note||'');
      const noteLines=note?doc.splitTextToSize(note,W-2*M-4):[];
      const h=nameLines.length*5+(noteLines.length?noteLines.length*4.6+1:7)+4;
      need(h);
      doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.setTextColor(...INK);doc.text(nameLines,M,y);
      for(let n=1;n<=5;n++){
        const x=colBox+(n-1)*(BOX+GAP);const on=!blank&&c.r===n;
        doc.setDrawColor(...(on?ACC:MUTED));doc.setLineWidth(0.3);
        if(on){doc.setFillColor(...ACC);doc.roundedRect(x,y-4.3,BOX,BOX,1,1,'FD');doc.setTextColor(255,255,255);doc.setFontSize(9);doc.text(String(n),x+BOX/2,y-0.1,{align:'center'})}
        else doc.roundedRect(x,y-4.3,BOX,BOX,1,1,'S');
      }
      y+=nameLines.length*5;
      if(noteLines.length){doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(...MUTED);doc.text(noteLines,M+4,y);y+=noteLines.length*4.6+1}
      else{doc.setDrawColor(...LINE);doc.setLineWidth(0.3);doc.line(M+4,y+1.5,W-M,y+1.5);y+=7}
      y+=2;
    });
    need(8);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...MUTED);
    doc.text(pdfText([1,2,3,4,5].map(n=>n+' '+t('scale.'+n)).join('   ·   ')),M,y);y+=9;

    // Written parts
    [[t('ev.commend'),e.commend],[t('ev.recommend'),e.recommend],[t('ev.encourage'),e.encourage]].forEach(([title,text])=>{
      need(16);doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(...MUTED);doc.text(pdfText(title).toUpperCase(),M,y,{charSpace:0.6});y+=2;
      const body=blank?'':pdfText(text||'');
      if(body){y+=4.5;doc.setFont('helvetica','normal');doc.setFontSize(10.5);doc.setTextColor(...INK);
        doc.splitTextToSize(body,W-2*M).forEach(l=>{need(5.5);doc.text(l,M,y);y+=5.2});y+=5}
      else ruled(3);
    });
  });

  const n=doc.getNumberOfPages();
  for(let p=1;p<=n;p++){doc.setPage(p);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...MUTED);
    doc.text('Toastmasters Tools',M,H-10);doc.text(pdfText(t('pdf.page',{n:p,total:n})),W-M,H-10,{align:'right'})}
  doc.save(filename);
}
