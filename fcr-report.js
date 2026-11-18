'use strict';
const FcrReport=(()=>{
 let busy=false;
 async function download(supervisor=null){if(busy)throw Error('Ya hay un reporte en proceso. Esperá a que termine.');const s=FcrImportView.state;if(!s.data)throw Error('Abrí un mes guardado antes de descargar el reporte.');busy=true;const epoch=s.sourceEpoch,importId=s.currentId,records=s.data.records,fileName=s.fileName,period=s.filePeriod,library=s.library.slice(),choices={...s.comparisonChoices};try{
 let team=null;if(supervisor)team=await FcrCloud.team(supervisor);else if(typeof FcrCloud!=='undefined'&&!FcrCloud.isAdmin())team=await FcrCloud.team(FcrCloud.user().id);
 const ids=team?new Set(team.members.map(a=>a.agent_key)):null,scoped=records.filter(r=>!ids||ids.has(r.agent));
 const prior=FcrComparison.previousPeriod(period),candidates=library.filter(e=>e.period===prior&&e.id!==importId),choice=choices[importId||fileName+'|'+period],entry=candidates.find(e=>e.id===choice)||(candidates.length===1?candidates[0]:null);let previous=null,note='';
 if(entry){const value=await FcrLibrary.get(entry.id);if(!value)throw Error('El archivo anterior ya no está disponible.');const parsed=await FcrImportView.parseFile(value.file);previous=parsed.records.filter(r=>!ids||ids.has(r.agent));note='Mes anterior: '+entry.name+'. La variación se expresa en puntos porcentuales.';}
 else note=!prior?'Sin comparación: el archivo no tiene período.':candidates.length?'Sin comparación: hay varias versiones del mes anterior. Elegí una en Comparación mensual y descargá nuevamente.':'Sin comparación: falta el archivo del mes calendario anterior.';
 if(epoch!==s.sourceEpoch||importId!==s.currentId)throw Error('Cambió el archivo o la sesión. Volvé a descargar el reporte.');
 const label=period?new Intl.DateTimeFormat('es-AR',{month:'long',year:'numeric'}).format(new Date(period+'-15T12:00:00')):'Sin período',bytes=FcrPdf.create({title:team?'Equipo de '+team.supervisor.name:'Resultados de todos los asesores',records:scoped,previous,members:team?.members,fileName,periodLabel:label,comparisonNote:note},FcrModel,FcrInsights),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),link=document.createElement('a');link.href=url;link.download='FCR-'+(period||'sin-periodo')+'-'+(team?team.supervisor.name:'todos').replace(/[^a-zA-Z0-9_-]/g,'-')+'.pdf';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }finally{busy=false;}}
 return {download};
})();
