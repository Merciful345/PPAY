'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js'),A=require('../advisor.js'),B=require('../bi.js'),V=require('../activity.js');
const base={'Tipo de medios':'mensaje','Fecha':'01/10/26 10:00','Fecha de finalización':'01/10/26 11:00',División:'TELEP',Duración:'99999999','Total de cola':'0',Remoto:'AR.100','Última conclusión':'RESUELTO'};
const source=[
 {...base,'ID de conversación':'ficticio-1','Usuarios - Con interacciones':'u1_Asesor Uno;u2_Asesor Dos','Total de ACW':'30000','Manejo total':'90000'},
 {...base,'ID de conversación':'ficticio-2','Usuarios - Con interacciones':'u1_Asesor Uno','Total de ACW':'60000','Manejo total':'180000','Última conclusión':'CLIENTE NO CONTESTA'},
 {...base,'ID de conversación':'ficticio-3','Usuarios - Con interacciones':'u1_Asesor Uno','Total de ACW':'','Manejo total':'100000'},
 {...base,'ID de conversación':'ficticio-4','Usuarios - Con interacciones':'u3_Asesor Tres','Total de ACW':'0','Manejo total':'0'},
 {...base,'ID de conversación':'ficticio-5','Usuarios - Con interacciones':'u4_Asesor Cuatro','Total de ACW':'-100','Manejo total':'90000'},
 {...base,'ID de conversación':'ficticio-6','Usuarios - Con interacciones':'','Total de ACW':'10000','Manejo total':'90000'}
];
const quote=s=>'"'+String(s??'').replaceAll('"','""')+'"',csv=columns=>[columns,...source.map(row=>columns.map(k=>row[k]??''))].map(row=>row.map(quote).join(',')).join('\n');
const d=E.analyze(csv(E.required)),fcr=new Map(),p=A.primary(d.cases,fcr,'u1');
assert.equal(d.cases[0].acw,30000);assert.equal(d.cases[0].tmoWork,120000);assert.equal(p.tmo,180000);assert.equal(p.tmo/1000,180);assert.equal(p.tmoAcw,90000);assert.equal(p.tmoHandle,270000);assert.equal(p.tmoKnown,2);assert.equal(p.tmoHandled,3);assert.equal(p.tmoMissing,1);
assert.equal(A.primary(d.cases,fcr,'u2').tmo,120000);assert.equal(A.closedBy(d.cases[0],'u1'),false);assert.equal(A.closedBy(d.cases[0],'u2'),true);assert.equal(A.isClosed(d.cases[1]),false);assert.equal(A.primary(d.cases,fcr,'u3').tmo,0);assert.equal(A.primary(d.cases,fcr,'u4').tmo,null);assert.equal(A.primary(d.cases,fcr).tmoHandled,5);
const matrix=B.matrix(d.cases,d.names,'tmo',A,fcr,'u1');assert.equal(matrix.value(matrix.grand),180);assert.equal(matrix.grand.count,2);assert.equal(V.compute(d.cases.filter(c=>c.agents.includes('u1')),'u1',A).validTimes,2);assert(V.matches(d.cases[0],{kind:'matrix',value:{advisor:'u1',day:'2026-10-01',mode:'tmo'}},'u1',A));
const reverse=E.analyze(csv([...E.required].reverse()));assert.deepEqual(reverse.cases.map(c=>c.tmoWork),d.cases.map(c=>c.tmoWork));
const duplicateSource=source[0];source.push(duplicateSource);assert.equal(E.analyze(csv(E.required)).cases.length,6);
console.log('OK: TMO ACW + manejo / atendidas, compartidos, ceros, faltantes, negativos, deduplicación, orden de columnas, matriz y CxH independiente.');
