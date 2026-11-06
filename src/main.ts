import './style.css';
import {initDatabase,getStories,saveStory,deleteStory} from './db';
import {readApiKey,writeApiKey} from './secure';
import {generateTurn,listFreeModels,type Model} from './narrative';
import type {Story,Character,Relationship} from './types';
const $=<T extends HTMLElement>(s:string,root:ParentNode=document)=>root.querySelector(s) as T;
const app=$('#app');let stories:Story[]=[];let current:Story|null=null;let models:Model[]=[];
let primary=localStorage.getItem('umbral-model')||'';
let fallbacks=JSON.parse(localStorage.getItem('umbral-fallbacks')||'[]') as string[];
let busy=false;let lastError='';
const uid=()=>crypto.randomUUID();
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const rel=():Relationship=>({trust:50,attraction:20,affinity:40,intimacy:0,tension:20});
function fresh():Story{
 const chars:Character[]=[
 {id:uid(),name:'Lucía',age:34,persona:'Reservada, irónica, observadora. Desconfía de los favores.',goal:'Recuperar algo que perdió hace años.',secret:'Conoce al protagonista de antes y no lo dice.',mood:'cautelosa'},
 {id:uid(),name:'Mateo',age:41,persona:'Cálido pero evasivo. Evita el conflicto y miente por comodidad.',goal:'Que nadie descubra su deuda.',secret:'Debe dinero a gente peligrosa.',mood:'inquieto'}];
 return {id:uid(),name:'Nueva historia',scene:'Un café casi vacío, poco antes de medianoche. Llueve.',time:'Noche',chars,rel:Object.fromEntries(chars.map(c=>[c.id,rel()])),facts:[],summary:'',messages:[],updated:Date.now()};
}
async function save(){if(!current)return;current.updated=Date.now();await saveStory(current);stories=await getStories<Story>();}
function shell(title:string,back='Umbral'){
 app.innerHTML=`<header><button class="quiet" id="back">${esc(back)}</button><strong>${esc(title)}</strong><button class="quiet" id="settings">Ajustes</button></header><main id="view"></main>`;
 $('#settings').onclick=()=>{void settings();};$('#back').onclick=home;return $('#view');
}
function home(){
 const v=shell('Historias');v.innerHTML='<button class="primary" id="new">＋ Nueva historia</button><div id="list"></div>';
 $('#new').onclick=async()=>{current=fresh();await save();story();};
 const list=$('#list');if(!stories.length)list.innerHTML='<p class="muted">Todavía no hay historias. Creá una para comenzar.</p>';
 for(const s of stories){const card=document.createElement('article');card.className='story-card';card.innerHTML=`<div class="story-info"><b>${esc(s.name)}</b><p class="muted">${s.messages.length} mensajes · ${new Date(s.updated).toLocaleDateString()}</p></div><button class="quiet open">Abrir</button><button class="quiet danger del">×</button>`;
 $('.open',card).onclick=()=>{current=s;story();};$('.del',card).onclick=async()=>{if(confirm('¿Eliminar esta historia?')){await deleteStory(s.id);stories=await getStories<Story>();home();}};list.append(card);}
}
function story(){
 if(!current)return home();const s=current;const v=shell(s.name,'‹ Historias');
 v.innerHTML=`<div class="scene">${esc(s.scene)} · ${esc(s.time)}</div><div class="story-tools"><button class="quiet" id="chars">Personajes</button><span class="muted">${s.chars.map(c=>esc(c.name)).join(' · ')}</span></div><div id="messages" class="messages"></div><div id="error" class="error" ${lastError?'':'hidden'}>${esc(lastError)}</div><form id="composer"><textarea id="msg" rows="2" placeholder="¿Qué haces, dices o piensas?" required></textarea><button class="primary send" ${busy?'disabled':''}>${busy?'Escribiendo…':'Enviar'}</button></form>`;
 $('#chars').onclick=characters;const messages=$('#messages');
 for(const m of s.messages){const el=document.createElement('article');el.className='message '+m.role;el.textContent=m.text;messages.append(el);}
 if(!s.messages.length&&!busy){const b=document.createElement('button');b.className='primary';b.textContent='Comenzar escena';b.onclick=()=>{void send('(Comienza la escena con una apertura que sitúe al protagonista y deje algo en movimiento.)');};messages.append(b);}
 $('#composer').onsubmit=e=>{e.preventDefault();const text=($('#msg') as HTMLTextAreaElement).value.trim();if(text)void send(text);};
 messages.scrollTop=messages.scrollHeight;
}
async function send(text:string){
 if(!current||busy)return;lastError='';current.messages.push({id:uid(),role:'user',text,created:Date.now()});await save();busy=true;story();
 try{
  const order=[primary,...fallbacks].filter((x,i,a)=>x&&a.indexOf(x)===i);if(!order.length)throw new Error('Elegí un modelo gratuito en Ajustes.');
  const result=await generateTurn(current,order);current.messages.push({id:uid(),role:'assistant',text:result.narration,created:Date.now()});current.facts.push(...result.facts);
  for(const c of current.chars)if(typeof result.mood[c.name]==='string')c.mood=result.mood[c.name].slice(0,60);
  localStorage.setItem('umbral-last-model',result.model);await save();
 }catch(e){lastError=e instanceof Error?e.message:String(e);await save();}
 finally{busy=false;story();}
}
async function settings(){
 const v=shell('Ajustes','‹ Volver');const key=await readApiKey();
 v.innerHTML=`<section><label>Clave API de OpenRouter</label><input id="key" type="password" autocomplete="off" placeholder="${key?'Clave guardada; escribí para reemplazarla':'sk-or-…'}"><button id="savekey" class="primary">Guardar clave</button></section><section><label>Modelo principal gratuito</label><select id="model"></select><label>Modelos alternativos</label><div id="fallbacks"></div><button id="refresh" class="quiet">Actualizar modelos</button></section><section><label>Diagnóstico</label><p class="muted">Umbral 1.0.0 · SQLite local en Android</p><p class="muted">Último modelo: ${esc(localStorage.getItem('umbral-last-model')||'Ninguno')}</p><p id="diag" class="muted"></p></section>`;
 $('#savekey').onclick=async()=>{const val=($('#key') as HTMLInputElement).value.trim();if(!val){alert('Escribí una clave.');return;}try{await writeApiKey(val);($('#key') as HTMLInputElement).value='';alert('Clave guardada.');}catch(e){$('#diag').textContent=String(e);}};
 const select=$('#model') as HTMLSelectElement;select.innerHTML=models.map(m=>`<option value="${esc(m.id)}">${esc(m.name)} · ${esc(m.id)}</option>`).join('');if(primary)select.value=primary;
 select.onchange=()=>{primary=select.value;localStorage.setItem('umbral-model',primary);};
 const box=$('#fallbacks');for(const m of models){const label=document.createElement('label');label.className='check';label.innerHTML=`<input type="checkbox" ${fallbacks.includes(m.id)?'checked':''}> ${esc(m.id)}`;$('input',label).onchange=e=>{fallbacks=(e.target as HTMLInputElement).checked?[...fallbacks,m.id]:fallbacks.filter(x=>x!==m.id);localStorage.setItem('umbral-fallbacks',JSON.stringify(fallbacks));};box.append(label);}
 $('#refresh').onclick=async()=>{try{models=await listFreeModels();await settings();}catch(e){$('#diag').textContent=String(e);}};
}
function characters(){
 if(!current)return;const v=shell('Personajes','‹ Volver');v.innerHTML='<p class="muted">Editá los personajes presentes en esta historia.</p><div id="charlist"></div><button class="primary" id="add">Añadir personaje</button>';
 const list=$('#charlist');const render=()=>{
  list.innerHTML='';current!.chars.forEach((c,i)=>{const card=document.createElement('section');card.className='character-card';
   card.innerHTML=`<label>Nombre</label><input data-f="name" value="${esc(c.name)}"><label>Edad (adulto)</label><input data-f="age" type="number" min="18" value="${c.age}"><label>Personalidad</label><textarea data-f="persona">${esc(c.persona)}</textarea><label>Objetivo</label><textarea data-f="goal">${esc(c.goal)}</textarea><label>Secreto (solo narrador)</label><textarea data-f="secret">${esc(c.secret)}</textarea><button class="quiet danger remove">Quitar personaje</button>`;
   card.querySelectorAll('[data-f]').forEach(el=>el.addEventListener('change',async e=>{const input=e.target as HTMLInputElement|HTMLTextAreaElement;const f=input.dataset.f as keyof Character;if(f==='age')c.age=Math.max(18,Number(input.value)||18);else if(f!=='id'&&f!=='mood')c[f]=input.value as never;await save();}));
   $('.remove',card).onclick=async()=>{if(current!.chars.length<2){alert('Debe quedar al menos un personaje.');return;}current!.chars.splice(i,1);await save();render();};list.append(card);
  });
 };render();
 $('#add').onclick=async()=>{current!.chars.push({id:uid(),name:'Nuevo personaje',age:30,persona:'',goal:'',secret:'',mood:'neutral'});await save();render();};
}
async function boot(){
 try{
  await initDatabase();stories=await getStories<Story>();
  try{models=await listFreeModels();if(!primary&&models.length){primary=models[0].id;localStorage.setItem('umbral-model',primary);}}catch{/* modo sin conexión */}
  home();
 }catch(e){app.innerHTML=`<main class="fatal"><h1>Umbral</h1><h2>No se pudo iniciar</h2><p>${esc(e instanceof Error?e.message:String(e))}</p><p>Compartí este mensaje para diagnosticarlo.</p></main>`;}
}
void boot();
