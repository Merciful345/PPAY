'use strict';
const FcrDrop=(()=>{
 let depth=0;
 const files=e=>Array.from(e.dataTransfer?.types||[]).includes('Files')||!!e.dataTransfer?.files?.length;
 function allowed(){return typeof FcrImportView!=='undefined'&&typeof currentRoute==='function'&&currentRoute()==='fcr'&&!(typeof FcrCloud!=='undefined'&&FcrCloud.requiresLogin&&!FcrCloud.isAuthorized())&&!FcrImportView.state.busy&&!FcrImportView.state.batchBusy;}
 function reset(){depth=0;document.getElementById('fcrDropOverlay').hidden=true;}
 function enter(e){if(!files(e))return;e.preventDefault();if(!allowed())return;depth++;document.getElementById('fcrDropOverlay').hidden=false;}
 function over(e){if(!files(e))return;e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect=allowed()?'copy':'none';}
 function leave(e){if(!files(e)&&!depth)return;depth=Math.max(0,depth-1);if(!depth)reset();}
 async function drop(e){if(!files(e))return;e.preventDefault();const canLoad=allowed(),items=Array.from(e.dataTransfer.files||[]);reset();if(canLoad&&items.length)await FcrImportView.importMany(items);}
 document.addEventListener('dragenter',enter);
 document.addEventListener('dragover',over);
 document.addEventListener('dragleave',leave);
 document.addEventListener('drop',drop);
 document.addEventListener('dragend',reset);
 window.addEventListener('blur',reset);
 window.addEventListener('hashchange',reset);
 return {reset};
})();
