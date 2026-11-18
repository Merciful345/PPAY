'use strict';
const FcrCloudView=(()=>{
 const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let pending=false,message='',ready=false,register=false,emailDraft='';
 function busy(){return pending||FcrImportView.state.busy||FcrImportView.state.batchBusy;}
 function syncControls(){for(const button of el('cloudAccess')?.querySelectorAll?.('[data-cloud-signout]')||[])button.disabled=!!busy();}
 function render(){
 const authorized=ready&&FcrCloud.isAuthorized(),user=FcrCloud.user();
 el('appMain').hidden=!authorized;el('appMain').inert=!authorized;el('authScreen').hidden=authorized;document.body.dataset.auth=authorized?'ready':'locked';
 if(!authorized&&ready&&FcrCloud.applicant?.()){
 const rejected=FcrCloud.accessStatus()==='rejected';el('cloudAccess').innerHTML='';el('authScreen').innerHTML=`<div class="login-card"><span class="eyebrow">SOLICITUD DE ACCESO</span><h1>${rejected?'Acceso no aprobado':'Solicitud pendiente'}</h1><p><b>${esc(FcrCloud.applicant().email)}</b></p><p>${rejected?'Gonzalo rechazó esta solicitud. Consultá con él si necesitás revisar la decisión.':'Tu solicitud quedó registrada. Gonzalo tiene que aceptarla antes de que puedas ver el tablero.'}</p><button id="refreshAccess" class="login-submit" ${pending?'disabled':''}>Revisar estado</button><button id="pendingSignOut" class="login-toggle" ${pending?'disabled':''}>Volver al inicio de sesión</button><p role="status">${esc(message)}</p></div>`;
 const run=async action=>{if(pending)return;pending=true;message='';render();try{await action();}catch(error){message=error.message;}finally{pending=false;render();}};
 el('refreshAccess').onclick=()=>run(()=>FcrCloud.refreshAccess());el('pendingSignOut').onclick=()=>run(()=>FcrCloud.signOut());return;
 }
 if(!authorized){el('cloudAccess').innerHTML='';el('authScreen').innerHTML=`<div class="login-card"><span class="eyebrow">PANEL DE ASESORES</span><h1>${register?'Solicitar acceso':'Iniciar sesión'}</h1><p>${register?'Completá tus datos. Gonzalo revisará tu solicitud.':'Ingresá para consultar los resultados de tu equipo.'}</p><form id="cloudLogin">${register?'<label>Nombre y apellido<input name="fullName" autocomplete="name" maxlength="160" required></label>':''}<label>Correo electrónico<input name="email" type="email" autocomplete="username" value="${esc(emailDraft)}" required></label><label>Contraseña<input name="password" type="password" autocomplete="${register?'new-password':'current-password'}" ${register?'minlength="8"':''} required></label><button class="login-submit" type="submit" ${pending||!ready?'disabled':''}>${pending?'Esperá un momento…':register?'Enviar solicitud':'Ingresar'}</button></form><p id="cloudStatus" role="status" aria-live="polite">${esc(message||(!ready?'Verificando sesión…':''))}</p><button class="login-toggle" id="toggleRegistration" ${pending?'disabled':''}>${register?'Ya tengo cuenta · Iniciar sesión':'Primera vez · Solicitar acceso'}</button></div>`;
 const form=el('cloudLogin');form.onsubmit=async e=>{e.preventDefault();if(pending||!ready)return;emailDraft=form.elements.email.value.trim();const password=form.elements.password.value,fullName=form.elements.fullName?.value||'';pending=true;message='';form.elements.password.value='';render();try{if(register){message=await FcrCloud.signUp(emailDraft,password,fullName);register=false;}else{await FcrCloud.signIn(emailDraft,password);message='';}}catch(error){message=error.message;}finally{pending=false;render();}};
 el('toggleRegistration').onclick=()=>{emailDraft=el('cloudLogin').elements.email.value;register=!register;message='';render();};return;
 }
 el('authScreen').innerHTML='';
 el('cloudAccess').innerHTML=`<div class="session-bar"><div><b>${esc(user.email)}</b><span>Archivos compartidos</span></div><div class="cloud-actions"><a href="#/mi-perfil" class="account-link">Mi perfil</a><button data-cloud-signout ${busy()?'disabled':''}>Cerrar sesión</button></div></div><p id="cloudStatus" role="status">${esc(message||FcrCloud.warning||'')}</p>`;
 el('cloudAccess').onclick=async e=>{const out=e.target.closest('[data-cloud-signout]');if(!out)return;if(busy())return;pending=true;message='';render();try{await FcrCloud.signOut();}catch(error){message=error.message;}finally{pending=false;render();}};
 }
 async function changed(){if(typeof FcrAccountView!=='undefined')FcrAccountView.reset();render();await FcrImportView.sourceChanged();render();}
 async function start(){FcrCloud.onChange=changed;render();try{await FcrCloud.init();ready=FcrCloud.configured();if(FcrCloud.isAuthorized())await changed();}catch(error){message=error.message;ready=FcrCloud.configured();}render();}
 return {start,render,syncControls};
})();
FcrCloudView.start();
