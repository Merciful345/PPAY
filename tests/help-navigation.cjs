const assert=require('node:assert/strict'),help=require('../fcr-help'),nav=require('../navigation');
assert(help.topicsFor().every(t=>t.public));
assert(help.topicsFor({authorized:true}).some(t=>t.id==='pdf'));
assert(!help.topicsFor({authorized:true}).some(t=>t.admin));
assert(help.topicsFor({authorized:true,admin:true}).some(t=>t.id==='historial'));
nav.visit('#/fcr','one');nav.visit('#/fcr/asesores','one');nav.visit('#/fcr/asesores','one');nav.visit('#/fcr/usuario/teco%3A001','one');
assert.equal(nav.previous(),'#/fcr/asesores');nav.visit('#/fcr/asesores','one');assert.equal(nav.previous(),'#/fcr');assert.equal(nav.previous(),'#/fcr');
nav.visit('#/historial','one');nav.visit('#/fcr','two');assert.equal(nav.previous(),'#/fcr');
console.log('OK: ayuda según acceso y rol; volver sin duplicados ni historial de otra sesión.');
