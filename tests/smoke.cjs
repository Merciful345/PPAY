'use strict';
const assert=require('node:assert/strict');
const E=require('../engine.js'),A=require('../advisor.js'),B=require('../bi.js'),V=require('../activity.js');
const headers=['ANI',...E.required];
const rows=[
 {'ID de conversación':'caso-ficticio-1','Usuarios - Con interacciones':'u1_Asesor Uno;u2_Asesor Dos',Remoto:'AR.100','Fecha':'01/10/26 10:00','Fecha de finalización':'01/10/26 11:00',División:'TELEP;APEX',Duración:'3600000','Total de cola':'60000','Última conclusión':'PRUEBA|RESUELTO','Tipo de medios':'mensaje',ANI:'000123'},
 {'ID de conversación':'caso-ficticio-2','Usuarios - Con interacciones':'u1_Asesor Uno',Remoto:'AR.100','Fecha':'03/10/26 10:00','Fecha de finalización':'03/10/26 11:00',División:'TELEP',Duración:'3600000','Total de cola':'120000','Última conclusión':'PRUEBA|CLIENTE NO CONTESTA','Tipo de medios':'mensaje',ANI:'000123'},
 {'ID de conversación':'caso-ficticio-3','Usuarios - Con interacciones':'u2_Asesor Dos',Remoto:'AR.200','Fecha':'20/10/26 10:00','Fecha de finalización':'20/10/26 11:00',División:'TELEP',Duración:'3600000','Total de cola':'0','Última conclusión':'PRUEBA|RESUELTO','Tipo de medios':'voz',ANI:'000456'}
];
for(const row of rows){row['Total de ACW']='30000';row['Manejo total']='120000';}
const q=s=>'"'+String(s??'').replaceAll('"','""')+'"';
const csv=columns=>[columns,...rows.map(r=>columns.map(h=>r[h]??''))].map(r=>r.map(q).join(',')).join('\n');
const d=E.analyze(csv(headers)),reverse=E.analyze(csv([...headers].reverse()));
const clean=({sourceSpans,...c})=>c;
assert.deepEqual(d.cases.map(clean),reverse.cases.map(clean));
assert.equal(d.cases.length,3);
assert.equal(d.cases[0].closingAgent,'u2');
assert.equal(d.cases[0].contactTime,3540000);
assert.equal(d.cases[1].status,'Dentro de 7 días');
assert.equal(A.closedBy(d.cases[0],'u1'),false);
assert.equal(A.closedBy(d.cases[0],'u2'),true);
assert.equal(A.isClosed(d.cases[1]),false);
const fcr=A.fcrIndex(d.cases);
assert.equal(fcr.get('caso-ficticio-1').status,'Con recontacto ≤ 7 días');
assert.equal(fcr.get('caso-ficticio-2').status,'Sin recontacto en 7 días');
assert.equal(fcr.get('caso-ficticio-3').status,'Seguimiento incompleto');
assert.equal(A.primary(d.cases,fcr,'u1').tmoKnown,2);
assert.equal(A.primary(d.cases,fcr,'u2').tmoKnown,2);
assert.equal(d.agentCompanies.u1.company,'TELEP');
assert.equal(B.matrix(d.cases,d.names,'closed',A,fcr).grand.sum,2);
assert.equal(V.compute(d.cases,null,A).total,3);
console.log('OK: lectura por encabezado, tiempos, último asesor, cierres, FCR, empresas y matriz con datos ficticios.');
