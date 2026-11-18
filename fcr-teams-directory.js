'use strict';
const FcrTeamsDirectory=(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let teams=[],busy=false,loaded=false,message='',generation=0;
 function reset(){generation++;teams=[];busy=false;loaded=false;message='';}
 function refresh(){if(typeof currentRoute==='function'&&currentRoute()==='equipos')renderRoutes();}
 function render(){if(!FcrCloud.isAdmin())return '<section class="panel"><h2>Acceso restringido</h2><p>Solo Gonzalo puede consultar todos los equipos.</p></section>';return `<section class="team-directory"><div class="executive-heading"><div><h2>Equipos</h2><p>Todos los supervisores y sus agentes asignados.</p></div><button data-teams-refresh ${busy?'disabled':''}>Actualizar</button></div><p role="status">${esc(message)}</p>${!loaded?'<p>Cargando equipos…</p>':teams.length?`<div class="team-directory-grid">${teams.map(t=>`<article class="panel supervisor-card"><h2>${esc(t.name)}</h2><p>${esc(t.email||'Supervisor del archivo \u00b7 Sin cuenta vinculada')}</p><span class="badge s3">${t.members.length} agentes</span>${t.members.length?`<ul>${t.members.slice(0,5).map(a=>`<li><span>${esc(a.agent_name)}</span><small>${esc(a.user_code||a.bms_code||'Sin código')}</small></li>`).join('')}</ul>${t.members.length>5?`<p>Y ${t.members.length-5} agentes más.</p>`:''}`:'<p class="team-card-empty">Todavía no tiene agentes asignados.</p>'}<a class="account-link" href="#/supervisores/${encodeURIComponent(t.supervisor_id)}">Ver y editar equipo</a></article>`).join('')}</div>`:'<section class="panel"><p>Abrí un Excel o CSV para armar los equipos desde la columna Supervisor.</p></section>'}</section>`;}
 async function load(){if(busy||!FcrCloud.isAdmin())return;const current=++generation;busy=true;refresh();try{const rows=await FcrCloud.teams();if(current!==generation)return;teams=rows;loaded=true;}catch(error){if(current===generation){message=error.message;loaded=true;}}finally{if(current===generation){busy=false;refresh();}}}
 function start(){if(!loaded&&!busy)load();}
 function click(e){if(e.target.closest('[data-teams-refresh]')){message='';load();}}
 return {render,start,click,reset};
})();
