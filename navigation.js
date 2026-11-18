(function(root){
'use strict';
let stack=[],current=null,session=null;
function visit(hash,user='local'){if(session!==user){stack=[];current=null;session=user;}if(current&&hash!==current)stack.push(current);if(stack.length>50)stack.shift();current=hash;}
function previous(fallback='#/fcr'){const target=stack.pop()||fallback;current=target;return target;}
function markup(){if((location.hash||'#/fcr')==='#/fcr')return '';return '<div class="workspace-back" aria-label="Navegación de regreso"><button type="button" data-workspace-back>← Volver</button><a href="#/fcr">Ir al inicio</a></div>';}
const api={visit,previous,markup};if(typeof module!=='undefined')module.exports=api;else{root.PpayNavigation=api;document.addEventListener('click',e=>{if(e.target.closest('[data-workspace-back]')){const fallback=location.hash.startsWith('#/fcr/usuario/')?'#/fcr/asesores':'#/fcr';location.hash=previous(fallback);}});}
})(globalThis);
