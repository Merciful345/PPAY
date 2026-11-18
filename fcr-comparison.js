(function(root){
'use strict';
function previousPeriod(period){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period||''))return null;let [year,month]=period.split('-').map(Number);if(year<1)return null;if(--month===0){year--;month=12;}return year>=1?String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0'):null;}
function compare(current,previous,windows){return windows.map(w=>{const a=current.windows[w.key],b=previous.windows[w.key];if(!a?.valid||!b?.valid||a.percent==null||b.percent==null)return {key:w.key,label:w.label,current:a,previous:b,rawDelta:null,delta:null,status:'not_evaluable'};const rawDelta=a.percent-b.percent,delta=Math.round((rawDelta+Number.EPSILON)*100)/100;return {key:w.key,label:w.label,current:a,previous:b,rawDelta,delta:Object.is(delta,-0)?0:delta,status:delta>0?'improved':delta<0?'worsened':'unchanged'};});}
const api={previousPeriod,compare};if(typeof module!=='undefined')module.exports=api;else root.FcrComparison=api;
})(globalThis);
