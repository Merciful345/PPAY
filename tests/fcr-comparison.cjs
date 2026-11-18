const assert=require('node:assert/strict'),C=require('../fcr-comparison.js'),M=require('../fcr-model.js');
assert.equal(C.previousPeriod('2026-11'),'2026-10');assert.equal(C.previousPeriod('2026-01'),'2025-12');
for(const p of ['',null,'2026-13','2026-00','0000-01','2026-1'])assert.equal(C.previousPeriod(p),null);
const summary=(percent,valid=10)=>({windows:Object.fromEntries(M.windows.map(w=>[w.key,{percent,valid}]))});
for(const [a,b,status,delta] of [[90,80,'improved',10],[80,90,'worsened',-10],[80,80,'unchanged',0],[80.001,80,'unchanged',0]]){for(const r of C.compare(summary(a),summary(b),M.windows)){assert.equal(r.status,status);assert.equal(r.delta,delta);}}
assert(C.compare(summary(null,0),summary(100),M.windows).every(r=>r.status==='not_evaluable'&&r.delta===null));
assert(C.compare(summary(0),summary(100),M.windows).every(r=>r.status==='worsened'&&r.delta===-100));
console.log('OK: períodos calendario, cambios en puntos porcentuales, redondeo y ausencia de datos.');
