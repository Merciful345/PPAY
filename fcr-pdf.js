(function(root){
'use strict';
// PDF 1.4: texto seleccionable, fuentes estándar y gráficos vectoriales, sin servicios externos.
function create(report,model,insights){
 const pages=[];let commands=[],y=0;const width=595,height=842,margin=42;
 const pct=v=>v==null?'Sin datos':v.toFixed(2).replace('.',',')+' %';
 const encode=s=>Array.from(String(s).normalize('NFC'),c=>{const code=c.charCodeAt(0),special={'€':128,'–':150,'—':151,'’':146,'“':147,'”':148,'•':149,'›':155};return code>=32&&code<=255?c:String.fromCharCode(special[c]||63);}).join('');
 const literal=s=>encode(s).replace(/([\\()])/g,'\\$1').replace(/[\r\n]/g,' ');
 function rect(x,top,w,h,color){commands.push(`${color} rg ${x} ${height-top-h} ${w} ${h} re f`);}
 function text(value,x,top,size=10,bold=false,color='0.15 0.14 0.23'){commands.push(`BT /${bold?'F2':'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x} ${height-top-size} Tm (${literal(value)}) Tj ET`);}
 function wrap(value,max=85){const lines=[];for(const para of String(value).split('\n')){let line='';for(const word of para.split(/\s+/)){if((line+' '+word).trim().length>max&&line){lines.push(line);line='';}if(word.length>max){if(line){lines.push(line);line='';}for(let i=0;i<word.length;i+=max)lines.push(word.slice(i,i+max));}else line+=(line?' ':'')+word;}if(line)lines.push(line);}return lines.length?lines:[''];}
 function next(){if(commands.length)pages.push(commands.join('\n'));commands=[];rect(0,0,width,9,'0.39 0.32 0.95');text('TP  /  personal pay',margin,28,13,true,'0.39 0.32 0.95');text('REPORTE DE FCR',400,30,10,true);y=64;}
 function ensure(space){if(y+space>778)next();}
 function paragraph(value,bold=false,size=10,max=90){for(const line of wrap(value,max)){ensure(size+6);text(line,margin,y,size,bold);y+=size+6;}y+=6;}
 function heading(value){ensure(48);y+=12;paragraph(value,true,15,60);}
 next();paragraph(report.title,true,22,42);paragraph(report.periodLabel,true,13);
 const summary=model.summary(report.records),previous=report.previous?model.summary(report.previous):null;
 y+=8;ensure(105);model.windows.forEach((w,i)=>{const x=margin+i*173,v=summary.windows[w.key],old=previous?.windows[w.key],delta=v.percent!=null&&old?.percent!=null?Math.round((v.percent-old.percent)*100)/100:null;rect(x,y,163,95,'0.95 0.94 1');text('FCR '+w.label,x+10,y+10,10,true);text(pct(v.percent),x+10,y+29,23,true,'0.39 0.32 0.95');text(v.valid+' válidos · '+v.recontacts+' recontactos',x+10,y+61,9);text(delta==null?'Sin comparación':(delta>0?'+':'')+delta.toFixed(2).replace('.',',')+' p.p. vs mes anterior',x+10,y+77,8);});y+=110;
 heading('Resultados por asesor');
 const grouped=new Map(model.agents(report.records).map(a=>[a.agent,a])),prior=new Map(model.agents(report.previous||[]).map(a=>[a.agent,a]));
 const members=report.members||[...grouped.values()].map(a=>({agent_key:a.agent,agent_name:a.name}));
 function tableHead(){ensure(35);rect(margin,y,511,25,'0.91 0.90 0.98');['Asesor','Reg.','7 días','24 h','12 h','Var. 7 d.'].forEach((label,i)=>text(label,[margin+7,margin+226,margin+265,margin+328,margin+391,margin+453][i],y+7,9,true));y+=29;}
 tableHead();for(const [index,a] of members.entries()){const g=grouped.get(a.agent_key),old=prior.get(a.agent_key),lines=wrap(a.agent_name,35),rowHeight=Math.max(30,lines.length*13+10);if(y+rowHeight>778){next();tableHead();}if(index%2===0)rect(margin,y,511,rowHeight,'0.97 0.97 0.99');lines.forEach((line,j)=>text(line,margin+7,y+7+j*13,9));text(g?.records.length||0,margin+229,y+7,9);model.windows.forEach((w,i)=>text(pct(g?.summary.windows[w.key]?.percent),margin+265+i*63,y+7,8));const now=g?.summary.windows['7d'].percent,before=old?.summary.windows['7d'].percent,delta=now!=null&&before!=null?Math.round((now-before)*100)/100:null;text(delta==null?'—':(delta>0?'+':'')+delta.toFixed(2).replace('.',','),margin+453,y+7,8);y+=rowHeight;}
 if(!members.length)paragraph('No hay asesores en este equipo.');
 heading('Principales motivos de recontacto · 7 días');const reasons=insights.reasons(report.records,'7d'),total=summary.windows['7d'].recontacts;
 if(!reasons.length)paragraph('No hay recontactos informados para esta ventana.');
 for(const r of reasons){const lines=wrap(r.label,85);ensure(lines.length*15+50);for(const line of lines){text(line,margin,y,10,true);y+=15;}text(`${r.count} recontactos · ${Math.round(r.count/total*100)} % del total · ${r.same} con la misma tabulación`,margin,y,9);y+=18;rect(margin,y,511,6,'0.91 0.90 0.98');rect(margin,y,511*r.count/total,6,'0.39 0.32 0.95');y+=23;}
 pages.push(commands.join('\n'));const objects=[null,'<< /Type /Catalog /Pages 2 0 R >>',null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
 const pageIds=[];pages.forEach((content,i)=>{const pageId=objects.length,streamId=pageId+1;pageIds.push(pageId);const footer=`\nBT /F1 8 Tf 0.45 0.43 0.53 rg 1 0 0 1 42 25 Tm (Uso interno - ${i+1} / ${pages.length}) Tj ET`;content+=footer;objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`,`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);});objects[2]=`<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map(id=>id+' 0 R').join(' ')}] >>`;
 let out='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=out.length;out+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}const xref=out.length;out+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)out+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';out+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return Uint8Array.from(out,c=>c.charCodeAt(0));
}
const api={create};if(typeof module!=='undefined')module.exports=api;else root.FcrPdf=api;
})(globalThis);
