(function(root){
'use strict';
const database='telep-local-csv',store='files',key='last-valid-csv';
function open(){return new Promise((resolve,reject)=>{if(!root.indexedDB){reject(Error('Este navegador no permite guardar archivos localmente.'));return;}const req=root.indexedDB.open(database,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(store))req.result.createObjectStore(store);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('No se pudo abrir el almacenamiento local.'));req.onblocked=()=>reject(Error('Cerrá otras pestañas del tablero y volvé a intentar.'));});}
async function transact(mode,operation){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(store,mode);let result;const req=operation(tx.objectStore(store));req.onsuccess=()=>{result=req.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||req.error||Error('No se pudo guardar la copia.'));tx.onabort=()=>reject(tx.error||Error('Se interrumpió el almacenamiento local.'));});}finally{db.close();}}
async function save(file){await transact('readwrite',s=>s.put({blob:file,name:file.name,lastModified:file.lastModified,savedAt:Date.now()},key));}
async function read(){const record=await transact('readonly',s=>s.get(key));if(!record)return null;if(!record.blob||typeof record.blob.arrayBuffer!=='function')throw Error('La copia guardada no se puede leer. Cargá el CSV nuevamente.');return new File([record.blob],record.name||'interacciones-exportadas.csv',{type:'text/csv',lastModified:record.lastModified||0});}
async function remove(){await transact('readwrite',s=>s.delete(key));}
const fcrKey='last-fcr-workbook';
async function saveFcr(file){await transact('readwrite',s=>s.put({blob:file,name:file.name,type:file.type,lastModified:file.lastModified,savedAt:Date.now()},fcrKey));}
async function readFcr(){const record=await transact('readonly',s=>s.get(fcrKey));if(!record)return null;if(!record.blob||typeof record.blob.arrayBuffer!=='function')throw Error('La copia FCR no se puede leer. Cargá el Excel nuevamente.');return new File([record.blob],record.name||'fcr.xlsx',{type:record.type||'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',lastModified:record.lastModified||0});}
async function removeFcr(){await transact('readwrite',s=>s.delete(fcrKey));}
root.CsvStorage={save,read,remove,saveFcr,readFcr,removeFcr};
})(globalThis);
