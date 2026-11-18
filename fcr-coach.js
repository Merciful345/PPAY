(function(root){
'use strict';
const windows=[{key:'7d',label:'7 días'},{key:'24h',label:'24 horas'},{key:'12h',label:'12 horas'}];
const pct=n=>n==null?'Sin datos':new Intl.NumberFormat('es-AR',{maximumFractionDigits:2,minimumFractionDigits:2}).format(n)+' %';
function build(records,window='7d'){
 const key=windows.some(w=>w.key===window)?window:'7d',groups=new Map();let valid=0,recontacts=0,same=0;
 for(const r of records){const flag=r.flags[key];if(flag!==0&&flag!==1)continue;valid++;const path=(r.tabs||[]).map(v=>String(v||'').trim().replace(/\s+/g,' ')).filter(Boolean),label=r.tabulationConflict?'Tabulación contradictoria':path.join(' › ')||'Sin tabulación informada',id=label.normalize('NFC').toLocaleUpperCase('es');if(!groups.has(id))groups.set(id,{label,total:0,recontacts:0});const g=groups.get(id);g.total++;if(flag===1){g.recontacts++;recontacts++;if(r.tabulation?.status==='match')same++;}}
 return {window:key,label:windows.find(w=>w.key===key).label,total:records.length,valid,invalid:records.length-valid,recontacts,resolved:valid-recontacts,percent:valid?(valid-recontacts)/valid*100:null,same,ranking:[...groups.values()].filter(g=>g.recontacts).sort((a,b)=>b.recontacts-a.recontacts||a.label.localeCompare(b.label)).map(g=>({...g,share:g.recontacts/recontacts*100,rate:g.recontacts/g.total*100}))};
}
function text(name,period,records,window='7d'){
 const s=build(records,window),lines=['📊 TU RESUMEN DE FCR',name,'📅 '+period,'',...windows.map(w=>{const v=build(records,w.key);return '• FCR '+w.label+': '+pct(v.percent)+' ('+v.resolved+' sin recontacto / '+v.valid+' registros válidos)';}),'','🔎 Mirada a '+s.label,s.recontacts+' registros con recontacto de '+s.valid+' evaluables.'];
 if(s.ranking.length){lines.push('','📌 Tabulaciones de la atención original con más recontactos',...s.ranking.slice(0,5).map((g,i)=>(i+1)+'. '+g.label+' — '+g.recontacts+' recontactos de '+g.total+' atenciones ('+pct(g.rate)+').'));}else lines.push(s.valid?'No se informaron recontactos en esta ventana.':'No hay datos válidos para evaluar esta ventana.');
 if(s.same)lines.push('',s.same+(s.same===1?' recontacto tiene':' recontactos tienen')+' la misma tabulación informada.');if(s.invalid)lines.push(s.invalid+(s.invalid===1?' registro sin indicador válido queda':' registros sin indicador válido quedan')+' fuera del cálculo.');lines.push('','FCR indica qué proporción no registra recontacto en la ventana elegida. Los motivos muestran dónde revisar; no demuestran la causa ni responsabilidad del asesor.');return lines.join('\n');
}
function teamText(records,previous,period,previousPeriod,window='7d'){
 const key=windows.some(w=>w.key===window)?window:'7d',groups=new Map(),prior=new Map();
 for(const r of records){if(!groups.has(r.agent))groups.set(r.agent,{name:r.representative,user:r.user||r.bms||'',records:[]});groups.get(r.agent).records.push(r);}
 for(const r of previous||[]){if(!prior.has(r.agent))prior.set(r.agent,[]);prior.get(r.agent).push(r);}
 const lines=['📊 FCR DEL EQUIPO · '+windows.find(w=>w.key===key).label,'📅 '+period,'Comparación con '+(previousPeriod||'mes anterior')];
 for(const [id,g] of [...groups].sort((a,b)=>a[1].name.localeCompare(b[1].name,'es')||a[0].localeCompare(b[0]))){const current=build(g.records,key),before=build(prior.get(id)||[],key),delta=current.percent==null||before.percent==null?null:Math.round((current.percent-before.percent)*100)/100,status=delta==null?'Sin comparación':delta>0?'🟢 Mejoró':delta<0?'🔴 Empeoró':'⚪ Sin cambios visibles';lines.push('','• '+g.name+(g.user?' ('+g.user+')':'')+' — '+pct(current.percent)+' · '+status);}
 return lines.join('\n');
}
const api={build,text,teamText,pct,windows};if(typeof module!=='undefined')module.exports=api;else root.FcrCoach=api;
})(globalThis);
