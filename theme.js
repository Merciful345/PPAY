(function(root){
'use strict';
const key='ppay-theme',doc=root.document;
let theme='light';
try{const saved=root.localStorage.getItem(key);if(saved==='dark'||saved==='light')theme=saved;}catch(error){}
function controls(){if(!doc)return;for(const button of doc.querySelectorAll('[data-theme-toggle]')){const dark=theme==='dark',label=dark?'Tema claro':'Tema oscuro';button.setAttribute('aria-label','Activar '+label.toLowerCase());button.setAttribute('aria-pressed',String(dark));button.title=label;button.innerHTML=`<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7">${dark?'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>':'<path d="M20.7 13.2A8.5 8.5 0 0 1 10.8 3.3 8.5 8.5 0 1 0 20.7 13.2Z"/>'}</svg><span>${label}</span>`;}}
function apply(value,persist=true){if(value!=='dark'&&value!=='light')return;theme=value;if(doc){doc.documentElement.dataset.theme=value;doc.documentElement.style.colorScheme=value;}if(persist){try{root.localStorage.setItem(key,value);}catch(error){}}controls();}
apply(theme,false);
if(doc){doc.addEventListener('DOMContentLoaded',controls);doc.addEventListener('click',event=>{if(event.target.closest?.('[data-theme-toggle]'))apply(theme==='dark'?'light':'dark');});}
if(root.addEventListener)root.addEventListener('storage',event=>{if(event.key===key)apply(event.newValue==='dark'?'dark':'light',false);});
root.PpayTheme={apply,current:()=>theme};
})(globalThis);
