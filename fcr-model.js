(function(root){
'use strict';
const windows=[{key:'7d',label:'7 días',flag:'recontacto_7d',rate:'fcr7d'},{key:'24h',label:'24 horas',flag:'recontacto_24h',rate:'fcr24h'},{key:'12h',label:'12 horas',flag:'recontacto_12h',rate:'fcr12h'}];
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/^suma\s+de\s+/,'').replace(/\s+/g,'');
const text=v=>v==null?'':String(v).trim();
function flag(v){if(typeof v==='boolean'||v==null||text(v)==='')return null;const n=Number(text(v).replace(',','.'));return n===0||n===1?n:null;}
function percentage(v){if(v==null||text(v)==='')return null;const s=text(v),n=Number(s.replace('%','').replace(',','.'));if(!Number.isFinite(n))return null;return s.includes('%')?n/100:n;}
function compareTabulations(record){
 const clean=v=>text(v).normalize('NFC').replace(/\s+/g,' ').toLocaleUpperCase('es');
 const levels=[0,1,2,3].map(i=>{const original=text(record.tabs?.[i]),recontact=text(record.recontactTabs?.[i]),a=clean(original),b=clean(recontact);return {level:i+1,original,recontact,result:!a&&!b?'empty':!a||!b?'missing':a===b?'match':'different'};});
 const matched=levels.filter(v=>v.result==='match').length,different=levels.filter(v=>v.result==='different').map(v=>v.level),missing=levels.filter(v=>v.result==='missing').map(v=>v.level),hasRecontact=windows.some(w=>record.flags?.[w.key]===1);
 let status,reason;
 if(!hasRecontact){status=windows.every(w=>record.flags?.[w.key]===0)?'no_recontact':'not_evaluable';reason=status==='no_recontact'?'Los indicadores no informan recontacto en ninguna ventana.':'No hay un indicador válido que confirme recontacto.';}
 else if(record.tabulationConflict){status='not_evaluable';reason='Las filas duplicadas del registro traen tabulaciones contradictorias.';}
 else if(different.length){status='different';reason='Hay diferencias en los niveles '+different.join(', ')+'.';}
 else if(missing.length){status='not_evaluable';reason='Faltan datos para comparar los niveles '+missing.join(', ')+'.';}
 else if(!matched){status='not_evaluable';reason='No hay niveles informados para comparar. Los vacíos no prueban coincidencia.';}
 else{status='match';reason='Coinciden los '+matched+' niveles informados. Los niveles vacíos en ambos lados no se cuentan como coincidencia.';}
 return {status,reason,levels,matchedLevels:matched,differentLevels:different,missingLevels:missing};
}
function fromRows(rows,{sheet='Hoja',rowOffset=0}={}){
 const required=['representante','codigo_llamada','atendidas',...windows.map(w=>w.flag)];let headerAt=-1,headers,ix;
 for(let i=0;i<Math.min(rows.length,50);i++){const keys=rows[i].map(norm);if(required.every(k=>keys.includes(k))){headerAt=i;headers=rows[i].map(text);ix=Object.fromEntries(keys.map((k,j)=>[k,j]));break;}}
 if(headerAt<0)throw Error('No se encontraron los encabezados Representante, CODIGO_LLAMADA y RECONTACTO_7D / 24H / 12H. Se admiten los prefijos Suma de.');
 const records=[],byKey=new Map(),skipped=[];let duplicates=0,conflicts=0,percentageMismatches=0;
 for(let i=headerAt+1;i<rows.length;i++){const source=rows[i];if(!source.some(v=>text(v)!==''))continue;const get=k=>ix[k]===undefined?'':source[ix[k]],code=text(get('codigo_llamada')),representative=text(get('representante')),user=text(get('usuarioteco')),bms=text(get('bmsid'));
 if(!code||!representative){skipped.push({row:i+rowOffset+1,reason:'Sin CODIGO_LLAMADA o Representante'});continue;}
 const agent=user?'teco:'+user:bms?'bms:'+bms:'nombre:'+representative,attendanceRaw=get('atendidas'),attended=text(attendanceRaw)===''?null:Number(text(attendanceRaw).replace(',','.')),attendanceValid=attended===1;
 const r={key:JSON.stringify([agent,code]),code,agent,representative,user,bms,supervisor:text(get('supervisor')),accm:text(get('accm')),queue:text(get('vq')),attended,attendanceValid,flags:{},reported:{},issues:[],sourceRows:[i+rowOffset+1],sourceValues:source.map(v=>v==null?'':v),tabs:[1,2,3,4].map(n=>text(get('tab'+n))),recontactTabs:[1,2,3,4].map(n=>text(get('tab'+n+'_recontacto')))};
 if(!attendanceValid)r.issues.push('ATENDIDAS debe ser 1 para un indicador binario por llamada.');
 for(const w of windows){const v=flag(get(w.flag));r.flags[w.key]=attendanceValid?v:null;r.reported[w.key]=percentage(get(w.rate));if(v==null)r.issues.push(w.label+': indicador faltante o distinto de 0/1.');if(v!=null&&r.reported[w.key]!=null&&Math.abs(r.reported[w.key]-(1-v))>1e-8){percentageMismatches++;r.issues.push(w.label+': el porcentaje exportado no coincide con el indicador. Se usa RECONTACTO.');}}
 const old=byKey.get(r.key);if(old){const supervisorKey=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean).sort().join(' ');if(supervisorKey(old.supervisor)!==supervisorKey(r.supervisor))old.supervisorConflict=true;duplicates++;old.sourceRows.push(...r.sourceRows);const normalized=v=>text(v).normalize('NFC').replace(/\s+/g,' ').toLocaleUpperCase('es');if([...old.tabs,...old.recontactTabs].map(normalized).join('\u0000')!==[...r.tabs,...r.recontactTabs].map(normalized).join('\u0000'))old.tabulationConflict=true;for(const w of windows)if(old.flags[w.key]!==r.flags[w.key]){old.flags[w.key]=null;old.issues.push(w.label+': filas duplicadas con indicadores contradictorios.');conflicts++;}continue;}byKey.set(r.key,r);records.push(r);
 }
 for(const r of records)r.tabulation=compareTabulations(r);
 const metadata=rows.slice(0,headerAt).flat().map(text).filter(Boolean).join('\n');return {records,headers,metadata,sheet,headerRow:headerAt+rowOffset+1,sourceCount:records.length+duplicates,skipped,duplicates,conflicts,percentageMismatches};
}
function fromWorkbook(workbook,XLSX){const errors=[];for(const name of workbook.SheetNames){const sheet=workbook.Sheets[name],rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true,blankrows:true});try{return fromRows(rows,{sheet:name});}catch(error){errors.push(name+': '+error.message);}}throw Error('Ninguna hoja tiene el formato FCR esperado. '+errors.join(' '));}
function fromCsv(text,parseCSV){if(typeof parseCSV!=='function')throw Error('El lector CSV no está disponible.');let error;for(const delimiter of [undefined,';',',','\t']){try{return fromRows(parseCSV(text,delimiter),{sheet:'CSV'});}catch(e){error=e;}}throw Error('CSV FCR inválido: '+error.message);}
function inferPeriod(name,metadata=''){const source=String(name||'')+' '+String(metadata||''),iso=source.match(/(?:^|[^0-9])((?:19|20)\d{2})[-_. ](0[1-9]|1[0-2])(?:[^0-9]|$)/);if(iso)return iso[1]+'-'+iso[2];const years=[...new Set(Array.from(source.matchAll(/(?:^|[^0-9])((?:19|20)\d{2})(?!\d)/g),m=>m[1]))],months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],plain=source.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),found=months.map((m,i)=>new RegExp('(?:^|[^a-z])'+m+'(?:[^a-z]|$)').test(plain)?i+1:0).filter(Boolean);return years.length===1&&found.length===1?years[0]+'-'+String(found[0]).padStart(2,'0'):'';}
function summary(records){const result={total:records.length,windows:{}};for(const w of windows){let yes=0,no=0;for(const r of records){if(r.flags[w.key]===1)yes++;if(r.flags[w.key]===0)no++;}const valid=yes+no;result.windows[w.key]={recontacts:yes,noRecontacts:no,valid,invalid:records.length-valid,percent:valid?no/valid*100:null};}return result;}
function filter(records,f={}){const query=text(f.query).toLocaleLowerCase();return records.filter(r=>(!query||[r.representative,r.user,r.bms,r.code].some(v=>v.toLocaleLowerCase().includes(query)))&&(!f.supervisor||(f.supervisor==='__missing'?!r.supervisor:r.supervisor===f.supervisor))&&(!f.queue||(f.queue==='__missing'?!r.queue:r.queue===f.queue))&&(!f.window||f.status===''||f.status==null||(f.status==='invalid'?r.flags[f.window]==null:r.flags[f.window]===Number(f.status)))&&(!f.tabulation||(r.tabulation||compareTabulations(r)).status===f.tabulation));}
function agents(records){const map=new Map();for(const r of records){if(!map.has(r.agent))map.set(r.agent,{agent:r.agent,name:r.representative,user:r.user,bms:r.bms,records:[]});map.get(r.agent).records.push(r);}return [...map.values()].map(v=>({...v,summary:summary(v.records)})).sort((a,b)=>b.records.length-a.records.length||a.name.localeCompare(b.name));}
const api={windows,norm,flag,fromRows,fromWorkbook,fromCsv,inferPeriod,summary,filter,agents,compareTabulations};if(typeof module!=='undefined')module.exports=api;else root.FcrModel=api;
})(globalThis);
