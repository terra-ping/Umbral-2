import type {Story} from './types';
import {readApiKey} from './secure';
const API='https://openrouter.ai/api/v1';
export type Model={id:string;name:string};
export async function listFreeModels():Promise<Model[]>{
 const r=await fetch(API+'/models');if(!r.ok)throw new Error('No se pudo consultar modelos ('+r.status+')');
 const j=await r.json() as {data?:{id:string;name?:string}[]};
 return (j.data||[]).filter(m=>m.id.endsWith(':free')).sort((a,b)=>a.id.localeCompare(b.id)).map(m=>({id:m.id,name:m.name||m.id}));
}
function prompt(s:Story){
 return `Eres narrador y compañero de improvisación de ficción interactiva en español. El protagonista es el usuario: nunca decidas sus acciones, palabras ni pensamientos. Todos los personajes son adultos, tienen deseos propios, contradicciones y pueden rechazar, mentir, discutir o tomar la iniciativa. Cada personaje solo sabe lo que presenció o le contaron. La intimidad es gradual y consensuada. Muestra gestos, silencios y subtexto. Prosa literaria de 120-220 palabras, sin listas ni comentarios fuera de ficción.
ESCENA: ${s.scene} (${s.time})
PERSONAJES: ${s.chars.map(c=>`- ${c.name}, ${c.age}. ${c.persona} Objetivo: ${c.goal}. Secreto (solo narrador): ${c.secret}. Estado: ${c.mood}.`).join('\n')}
HECHOS: ${s.facts.join(' | ')||'(ninguno)'}
RESUMEN: ${s.summary||'(inicio)'}
Devuelve JSON: {"narration":"texto","mood":{"Nombre":"estado breve"},"facts":["hecho importante"]}. Si no puedes producir JSON válido, responde solo con la narración en texto plano.`;
}
function parse(raw:string){
 const match=raw.trim().match(/\{[\s\S]*\}/);
 if(match){try{const o=JSON.parse(match[0]);if(typeof o.narration==='string'&&o.narration.trim())return {narration:o.narration.trim(),facts:Array.isArray(o.facts)?o.facts.filter((x:unknown)=>typeof x==='string'):[],mood:o.mood&&typeof o.mood==='object'?o.mood as Record<string,string>:{}};}catch{/* plain text fallback */}}
 return {narration:raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim(),facts:[],mood:{}};
}
async function call(model:string,messages:{role:string;content:string}[]){
 const key=await readApiKey();if(!key)throw new Error('Falta la clave API. Configúrala en Ajustes.');
 const r=await fetch(API+'/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','X-Title':'Umbral'},body:JSON.stringify({model,messages,temperature:0.9,max_tokens:1000})});
 const j=await r.json().catch(()=>({})) as {error?:{message?:string};choices?:{message?:{content?:string}}[]};
 if(!r.ok)throw new Error(j.error?.message||'OpenRouter HTTP '+r.status);
 const text=j.choices?.[0]?.message?.content;if(!text?.trim())throw new Error('El modelo devolvió una respuesta vacía.');return text;
}
export async function generateTurn(s:Story,ids:string[]){
 const history=s.messages.slice(-12).map(m=>({role:m.role,content:m.text}));
 const messages=[{role:'system',content:prompt(s)},...history];let last:unknown;
 for(const model of ids){try{const result=parse(await call(model,messages));if(!result.narration)throw new Error('Narración vacía');return {...result,model};}catch(e){last=e;}}
 throw last instanceof Error?last:new Error('Ningún modelo respondió.');
}
