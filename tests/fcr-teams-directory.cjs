'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let admin=true,calls=0;
const cloud={isAdmin:()=>admin,async teams(){calls++;return [{supervisor_id:'11111111-1111-4111-8111-111111111111',name:'Supervisor <prueba>',email:'supervisor@example.invalid',members:Array.from({length:7},(_,i)=>({agent_name:'Agente '+i,user_code:'00'+i}))}];}};
const ctx=vm.createContext({FcrCloud:cloud,String,currentRoute:()=> 'equipos',renderRoutes(){}});vm.runInContext(fs.readFileSync('fcr-teams-directory.js','utf8'),ctx);const view=vm.runInContext('FcrTeamsDirectory',ctx);
(async()=>{view.start();await new Promise(resolve=>setTimeout(resolve,0));const html=view.render();assert(html.includes('Supervisor &lt;prueba&gt;'));assert(html.includes('7 agentes'));assert(html.includes('Agente 0'));assert(html.includes('2 agentes más'));assert(html.includes('#/supervisores/11111111-1111-4111-8111-111111111111'));
admin=false;assert(!view.render().includes('supervisor@example.invalid'));const before=calls;view.start();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls,before);
console.log('OK: directorio de supervisores con agentes, enlace al perfil completo y consulta restringida a Gonzalo.');
})().catch(error=>{console.error(error);process.exitCode=1;});
