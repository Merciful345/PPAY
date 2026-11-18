const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const pdf=require('../fcr-pdf'),model=require('../fcr-model'),insights=require('../fcr-insights');
const headers=['Representante','Usuario Teco','Supervisor','ATENDIDAS','CODIGO_LLAMADA','RECONTACTO_7D','RECONTACTO_24H','RECONTACTO_12H','TAB1','TAB2'];
const rows=Array.from({length:90},(_,i)=>['María José Núñez '+i,'00'+i,'Supervisor de prueba',1,'contacto-'+i,i%2,0,0,'Consulta con una descripción larga para comprobar el ajuste de texto y que no se superpongan las líneas','Pagos']);
const data=model.fromRows([headers,...rows]),bytes=pdf.create({title:'Equipo de Silvia Marcela Nieva',periodLabel:'noviembre de 2026',fileName:'archivo-ficticio.csv',records:data.records,previous:data.records,generatedAt:'2026-11-18T14:00:00Z'},model,insights),text=Buffer.from(bytes).toString('latin1');
assert(text.startsWith('%PDF-1.4'));assert(text.endsWith('%%EOF'));assert(text.includes('María José Núñez 89'));assert(text.includes('50,00 %'));assert(text.includes('0,00 p.p.'));assert((text.match(/\/Type \/Page /g)||[]).length>=3);
const xref=Number(text.match(/startxref\n(\d+)/)[1]);assert.equal(text.slice(xref,xref+4),'xref');
const dest=path.join(os.tmpdir(),'ppay-report-test.pdf');fs.writeFileSync(dest,bytes);console.log('OK PDF multipágina: todos los asesores, porcentajes, acentos y referencias PDF válidas.');
