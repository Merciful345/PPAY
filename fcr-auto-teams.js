(function(root){
'use strict';
function supervisorKey(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean).sort().join(' ');}
function prepare(records){const groups=new Map();for(const r of records){if(!groups.has(r.agent))groups.set(r.agent,{agent_key:r.agent,agent_name:r.representative,user_code:r.user||'',bms_code:r.bms||'',supervisors:new Map(),conflict:false});const g=groups.get(r.agent),name=String(r.supervisor||'').trim(),key=supervisorKey(name);if(key)g.supervisors.set(key,name);if(r.supervisorConflict)g.conflict=true;}
 const assignments=[],conflicts=[],missing=[];for(const g of groups.values()){if(g.conflict||g.supervisors.size>1){conflicts.push({agent_key:g.agent_key,agent_name:g.agent_name});continue;}if(!g.supervisors.size){missing.push(g.agent_key);continue;}assignments.push({agent_key:g.agent_key,agent_name:g.agent_name,user_code:g.user_code,bms_code:g.bms_code,supervisor_name:[...g.supervisors.values()][0]});}return {assignments,conflicts,missing};}
const api={supervisorKey,prepare};if(typeof module!=='undefined')module.exports=api;else root.FcrAutoTeams=api;
})(globalThis);
