'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('theme.js','utf8');
function session(saved,blocked=false){const listeners={},globalEvents={},values=new Map(saved?[['ppay-theme',saved]]:[]),button={attributes:{},innerHTML:'',setAttribute(k,v){this.attributes[k]=v;}};
 const document={documentElement:{dataset:{},style:{}},querySelectorAll:()=>[button],addEventListener:(name,fn)=>listeners[name]=fn};
 const ctx=vm.createContext({document,localStorage:{getItem(key){if(blocked)throw Error('Bloqueado');return values.get(key)||null;},setItem(key,value){if(blocked)throw Error('Bloqueado');values.set(key,value);}},addEventListener:(name,fn)=>globalEvents[name]=fn});vm.runInContext(source,ctx);return {ctx,document,listeners,globalEvents,values,button};}
const a=session('dark');assert.equal(a.document.documentElement.dataset.theme,'dark');assert.equal(a.document.documentElement.style.colorScheme,'dark');assert.equal(a.button.attributes['aria-pressed'],'true');assert(a.button.innerHTML.includes('Tema claro'));
a.listeners.click({target:{closest:selector=>selector==='[data-theme-toggle]'?a.button:null}});assert.equal(a.values.get('ppay-theme'),'light');assert.equal(a.document.documentElement.dataset.theme,'light');assert.equal(a.button.attributes['aria-pressed'],'false');assert.equal(session(a.values.get('ppay-theme')).ctx.PpayTheme.current(),'light');
a.globalEvents.storage({key:'ppay-theme',newValue:'dark'});assert.equal(a.ctx.PpayTheme.current(),'dark');a.ctx.PpayTheme.apply('inválido');assert.equal(a.ctx.PpayTheme.current(),'dark');assert.equal(session('otro').ctx.PpayTheme.current(),'light');
const restricted=session(null,true);restricted.ctx.PpayTheme.apply('dark');assert.equal(restricted.ctx.PpayTheme.current(),'dark');
const html=fs.readFileSync('index.html','utf8');assert(html.indexOf('src="theme.js"')<html.indexOf('href="style.css"'));assert(html.indexOf('href="appearance.css"')>html.indexOf('href="style.css"'));assert(html.includes('data-theme-toggle'));
console.log('OK: temas claro/oscuro, persistencia antes del primer dibujo, controles accesibles, otras pestañas y almacenamiento bloqueado.');
