// Versioned, bounded data shared by the browser transport and its tests.
export const ONLINE_PROTOCOL = 1;
export const ONLINE_BUILD = 'runalis-online-5';
export const MAX_PACKET_BYTES = 6*1024*1024;
const forbidden = new Set(['__proto__','prototype','constructor','questOwner','world','hostGame','actorGameViews','continentalTerrain','continentRuntime','renderCache','canvas','ctx','audio','coop','networkPresentation']);
export function wireClone(value,references=null) {
  const path=new Set();
  function copy(item,key='',depth=0){
    if(forbidden.has(key)||key.startsWith('__')||typeof item==='function'||depth>64)return undefined;
    if(typeof item==='number'&&!Number.isFinite(item))return 0;
    if(!item||typeof item!=='object')return item;
    if(depth&&references?.has(item))return {$ref:references.get(item),id:item.id,x:item.x,y:item.y,hp:item.hp};
    if(path.has(item))return undefined;
    path.add(item);let result;
    if(item instanceof Map)result={$map:[...item].map(([k,v])=>[copy(k,'',depth+1),copy(v,'',depth+1)])};
    else if(item instanceof Set)result={$set:[...item].map(v=>copy(v,'',depth+1))};
    else if(Array.isArray(item))result=item.map(v=>copy(v,'',depth+1)??null);
    else {result={};for(const k of Object.keys(item)){const v=copy(item[k],k,depth+1);if(v!==undefined)result[k]=v;}}
    path.delete(item);return result;
  }
  return copy(value)??null;
}
export function parseWire(text) {
  if(typeof text!=='string'||text.length>MAX_PACKET_BYTES)throw Error('Network packet too large.');
  return JSON.parse(text,(key,value)=>{
    if(['__proto__','prototype','constructor'].includes(key))return undefined;
    if(value?.$map&&Array.isArray(value.$map))return new Map(value.$map);
    if(value?.$set&&Array.isArray(value.$set))return new Set(value.$set);
    return value;
  });
}
const hex=buffer=>[...new Uint8Array(buffer)].map(n=>n.toString(16).padStart(2,'0')).join('');
export async function passwordRoom(password) {
  if(typeof password!=='string'||password.length<8||password.length>128||!password.trim())throw Error('Use a password between 8 and 128 characters.');
  const bytes=new TextEncoder(),key=await crypto.subtle.importKey('raw',bytes.encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:100000,salt:bytes.encode('Runalis shared worlds protocol 1')},key,512);
  return {id:'runalis-world-'+hex(bits.slice(0,32)),key:await crypto.subtle.importKey('raw',bits.slice(32),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])};
}
export async function roomProof(key,challenge) {return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(challenge)));}
export async function checkRoomProof(key,challenge,proof) {
  if(typeof proof!=='string'||!/^[0-9a-f]{64}$/.test(proof))return false;
  return crypto.subtle.verify('HMAC',key,Uint8Array.from(proof.match(/../g),v=>parseInt(v,16)),new TextEncoder().encode(challenge));
}
export function sanitizeOnlineInput(raw={}) {
  const input={connected:true};
  for(const key of ['moveX','moveY','combatAimX','combatAimY','rightStickAimX','rightStickAimY'])input[key]=Math.max(-1,Math.min(1,Number.isFinite(raw[key])?raw[key]:0));
  input.rightStickActive=!!raw.rightStickActive;
  // Transport the resolved aim as the aim stick so desktop, touch and pad share
  // the existing co-op combat path, without accepting positions or damage.
  if(Math.hypot(input.combatAimX,input.combatAimY)>.1){input.rightStickAimX=input.combatAimX;input.rightStickAimY=input.combatAimY;input.rightStickActive=true;}
  for(const key of ['attackPressed','attackHeld','attackReleased','blockHeld','sprintHeld','dashPressed','interactPressed','confirmPressed','confirmHeld','confirmReleased'])input[key]=raw[key]===true;
  for(let i=0;i<5;i++)for(const suffix of ['Pressed','Held','Released'])input[`ability${i}${suffix}`]=raw[`ability${i}${suffix}`]===true;
  input.confirmHeld ||= !!raw.interactHeld;
  input.pointerAimActive=raw.pointerAimActive===true;
  input.pointerAimSource=raw.pointerAimSource==='touch'?'touch':'mouse';
  input.aimDistance=Math.max(0,Math.min(2048,Number.isFinite(raw.aimDistance)?raw.aimDistance:160));
  return input;
}
export function mergeOnlineInput(previous,next) {
  const merged={...next};
  for(const key of Object.keys(previous||{}))if(/Pressed$|Released$/.test(key))merged[key] ||= previous[key]===true;
  return merged;
}
export function clearOnlineEdges(input) {for(const key of Object.keys(input))if(/Pressed$|Released$/.test(key))input[key]=false;}
export function rebaseCharacterClock(player,now){
  const from=Number(player.cooldownClockSeconds),delta=Number.isFinite(from)?now-from:0;
  for(const field of ['cooldowns','summonCooldowns'])for(const [id,value]of Object.entries(player[field]||{}))if(Number.isFinite(value)&&value>0)player[field][id]=value+delta;
  function visit(object){if(!object||typeof object!=='object')return;for(const [key,value]of Object.entries(object)){if(key==='rechargeQueue'&&Array.isArray(value))object[key]=value.map(at=>Number.isFinite(at)&&at>0?at+delta:at);else if(typeof value==='number'&&value>0&&value<1e9&&/(Until|until|At)$/.test(key))object[key]=value+delta;else if(value&&typeof value==='object')visit(value);}}
  for(const field of ['abilityUseCharges','flags','buffs','lightbringer','legendaryState'])visit(player[field]);
  player.cooldownClockSeconds=now;return player;
}
