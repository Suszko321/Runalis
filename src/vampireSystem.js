import {isVampire,royalActive,vampirePerk,vampireHealthCost} from './vampireRules.js';
import {startAbilityChannel,updateAbilityChannel,stopAbilityChannel} from './abilityChannelSystem.js';
import {hasLineOfSight,moveActorWithCollision} from './world.js';
import {registerBleedPool,isBleeding,consumeBleeding,extendBleeding} from './bleedingSystem.js';
import {addFloatingText} from './floatingText.js';
const states=new WeakMap();
const alive=e=>e&&e.hp>0&&!e.dead&&!e.remove&&!e.friendly&&!e.arenaDormant&&e.veyreignTransform==null;
function state(p,w){let s=states.get(p);if(s?.world!==w){
 const now=performance.now()/1000;
 endVampireForm(p,now);
 if(p.activeChannel?.profile==='vampire')stopAbilityChannel(p,'worldChanged');
 for(const pool of s?.bleeds?.values()||[])pool.bleeds.splice(0);
 if((p.summons||[]).some(a=>a.kind==='vampireBat')){p.cooldowns||={};p.cooldowns.callBatBeast=now;}
 p.summons=(p.summons||[]).filter(a=>a.kind!=='vampireBat');
 s={world:w,bleeds:new Map(),waves:[],budgets:{},nextAppetite:0,hemorrhage:new WeakMap()};states.set(p,s);
 }return s;}
export function prepareVampireCombat(p,w){if(isVampire(p))state(p,w);}
export function vampireActionCommitted(p){return !!states.get(p)?.pending;}
const visible=(w,p,e)=>!w.tiles?.length||hasLineOfSight(w,p.x,p.y,e.x,e.y,{startSkip:1,endSkip:1});
const targets=(p,w,r)=>w.enemies.filter(e=>alive(e)&&Math.hypot(e.x-p.x,e.y-p.y)<=r+(e.r||12)&&visible(w,p,e));
function aimed(p,w,aim,r,width=24){return targets(p,w,r).filter(e=>{const dx=e.x-p.x,dy=e.y-p.y;return dx*aim.x+dy*aim.y>=0&&Math.abs(dx*aim.y-dy*aim.x)<=width+(e.r||12);}).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));}
function effect(h,p,profile,extra={}){h.effect({kind:'vampire',profile,x:p.x,y:p.y-8,royal:royalActive(p),ttl:.45,layer:'front',...extra});}
export function recoverVampire(p,amount,{cap=Infinity,budget=null,now=performance.now()/1000,world=null}={}){
 if(!isVampire(p)||p.hp<=0||p.active===false||p.lifeState&&p.lifeState!=='alive')return 0;
 let available=cap;
 if(budget){const s=state(p,world),rate=p.maxHp*.01,b=s.budgets[budget]||{at:now,value:rate};b.value=Math.min(rate,b.value+Math.max(0,now-b.at)*rate);b.at=now;s.budgets[budget]=b;available=Math.min(available,b.value);}
 const value=Math.max(0,Math.min(amount,available,p.maxHp-p.hp));p.hp+=value;
 if(budget)states.get(p).budgets[budget].value-=value;
 if(value>.05)addFloatingText(p,`+${Number(value.toFixed(1))} Blood`,{color:'#d65d77',ttl:.5,size:10});
 return value;
}
export function endVampireForm(p,now=performance.now()/1000){if(p.vampireForm?.active){p.cooldowns||={};p.cooldowns.royalBatBeast=now;p.vampireForm={active:false,transitionAt:now,ending:true};}}
function addBleed(p,w,e,power,now){
 if(!alive(e)||e.trainingDummy||e.bleedImmune)return;
 const s=state(p,w);let entry=s.bleeds.get(e);
 if(!entry){if(s.bleeds.size>=64)s.bleeds.delete(s.bleeds.keys().next().value);entry={bleeds:[],next:now+1};s.bleeds.set(e,entry);registerBleedPool(e,p,entry);}
 const old=entry.bleeds.find(b=>b.until>now),limit=old?.extensionLimit??now+8;
 entry.bleeds.splice(0,entry.bleeds.length,{power:Math.max(power*.02,old?.power||0),born:old?.born??now,until:Math.min(limit,now+5+(old&&vampirePerk(p,'lord')?1:0)),extensionLimit:limit});
}
function deliver(p,w,a,e,power,h,cast){
 if(!alive(e))return;const bleeding=isBleeding(e,h.now),before=e.hp;
 h.damage(e,power*(vampirePerk(p,'bloodletting')&&bleeding?1.08:1),a.skill,{sourceAbilityId:a.id,sourceName:a.name,element:'necrotic',magic:true,vampire:true,now:h.now,channelTick:a.vampireMode==='beam',quiet:a.vampireMode==='beam',aoe:['wave','communion','step'].includes(a.vampireMode)});
 const dealt=Math.max(0,before-e.hp);if(!dealt||e.trainingDummy)return;
 const rate=a.recovery*(royalActive(p)?1.15:1),room=Math.max(0,(a.recoveryCap||Infinity)*p.maxHp-cast.healed);
 cast.healed+=recoverVampire(p,dealt*rate,{cap:room,now:h.now,world:w});
 if(vampirePerk(p,'hemorrhage')&&bleeding&&h.now>=(state(p,w).hemorrhage.get(e)||0)){extendBleeding(e,.5,h.now);state(p,w).hemorrhage.set(e,h.now+3);}
 if(a.vampireMorph==='rupturingLance')addBleed(p,w,e,dealt,h.now);
 if(a.vampireMorph==='crimsonTether')e.slowTimer=Math.max(e.slowTimer||0,.5);
 vampireKill(p,e,w,h.now,bleeding);
}
export function vampireKill(p,e,w,now,bleeding=isBleeding(e,now)){
 if(!isVampire(p))return;
 const s=state(p,w);if(e.hp<=0&&bleeding&&vampirePerk(p,'appetite')&&now>=s.nextAppetite){s.nextAppetite=now+5;if(Number.isFinite(p.cooldowns?.nightwingStep))p.cooldowns.nightwingStep=Math.min(now,p.cooldowns.nightwingStep+2);}
}
export function executeVampireAbility(p,w,a,slot,h){
 const s=state(p,w),now=h.now,mode=a.vampireMode,aim=h.aim;
 if(mode==='form'&&royalActive(p)){endVampireForm(p,now);effect(h,p,'transform',{ending:true,ttl:.6});return true;}
 if(mode==='summon'&&(p.summons||[]).some(s=>s.kind==='vampireBat'&&s.alive!==false)){h.log?.('Your Bat Beast is already active.');return false;}
 if(mode==='summon'&&(p.summons||[]).filter(s=>s.alive!==false&&s.hp>0).length>=8)return false;
 const range=a.range*(royalActive(p)&&vampirePerk(p,'elder_wings')?1.1:1),foes=targets(p,w,range);
 if(mode==='communion'&&!foes.some(e=>isBleeding(e,now))){h.log?.('No bleeding enemies within reach.');return false;}
 if(!h.pay(a))return false;
 if(mode!=='form'&&mode!=='beam'&&mode!=='summon')h.cooldown(a);
 const cast={healed:0};
 if(mode==='form'){p.vampireForm={active:true,transitionAt:now,nextPayment:now+3,morph:a.vampireMorph};effect(h,p,'transform',{ttl:.6});return true;}
 if(mode==='frenzy'){p.vampireFrenzyUntil=now+6;effect(h,p,'frenzy',{ttl:6});return true;}
 if(mode==='summon'){h.vampireSummon(a,now);effect(h,p,'summon');return true;}
 if(mode==='beam'){
  startAbilityChannel(p,a,slot,now,aim,{ability:a,damage:h.power,range,profile:'vampire',endCooldown:10,healthPercentPerSecond:1*(vampirePerk(p,'chalice')?.9:1)});
  return true;
 }
 if(mode==='execution'){s.pending={a,aim,at:now+.4,range,power:h.power};effect(h,p,'executionTell',{dirX:aim.x,dirY:aim.y,radius:range,ttl:.4});return true;}
 if(mode==='wave'){
  s.waves.push({a,origin:{x:p.x,y:p.y},startedAt:now,range,power:h.power,cast,hit:new Set()});
  effect(h,p,'wave',{radius:range,ttl:.35});return true;
 }
 if(mode==='step'){
  const origin={x:p.x,y:p.y};moveActorWithCollision(p,w,aim.x*range,aim.y*range);
  const dx=p.x-origin.x,dy=p.y-origin.y,length=Math.hypot(dx,dy),dir={x:dx/(length||1),y:dy/(length||1)};
  for(const e of aimed(origin,w,dir,length,24))deliver(p,w,a,e,h.power,h,cast);
  effect(h,p,'step',{targetX:origin.x,targetY:origin.y,ttl:.4});return true;
 }
 const hit=mode==='strike'?aimed(p,w,aim,range).slice(0,1):foes;
 for(const e of hit){if(mode==='communion'){if(!isBleeding(e,now))continue;consumeBleeding(e,now);}
  deliver(p,w,a,e,h.power,h,cast);
  if(mode==='wave'&&!e.isBoss&&!e.worldBoss&&!e.massive&&!e.elite&&!e.isElite&&!e.eliteModifier){const d=Math.hypot(e.x-p.x,e.y-p.y)||1,sign=a.vampireMorph==='tidalReversal'?-1:1;moveActorWithCollision(e,w,(e.x-p.x)/d*24*sign,(e.y-p.y)/d*24*sign);}
  if(mode==='communion')effect(h,e,'extract',{targetX:p.x,targetY:p.y});
 }
 effect(h,p,mode,{radius:range,dirX:aim.x,dirY:aim.y});return true;
}
export function updateVampire(p,w,input,dt,now,h){
 if(!isVampire(p)&&!states.has(p))return;
 const s=state(p,w);if(!isVampire(p)||p.hp<=0||p.active===false||p.lifeState&&p.lifeState!=='alive'){
  endVampireForm(p,now);s.pending=null;s.waves=[];p.vampireFrenzyUntil=0;p.vampireInstinct=false;
  for(const pool of s.bleeds.values())pool.bleeds.splice(0);s.bleeds.clear();return;
 }
 if(royalActive(p)){
  if(!p.knownAbilities?.includes('royalBatBeast'))endVampireForm(p,now);
  else {let steps=0;while(royalActive(p)&&now>=p.vampireForm.nextPayment&&steps++<32){p.vampireForm.nextPayment+=3;const cost=p.maxHp*.01;if(p.hp-cost<1)endVampireForm(p,now);else p.hp-=cost;}}
 }
 const c=p.activeChannel;
 if(c?.profile==='vampire')updateAbilityChannel(p,input,dt,now,{onTick:channel=>{
  const aim={x:channel.dirX,y:channel.dirY},e=aimed(p,w,aim,channel.range,12)[0];
  if(e)deliver(p,w,channel.ability,e,channel.damage,h,{healed:0});
  effect(h,p,'beam',{targetX:e?.x??p.x+aim.x*channel.range,targetY:e?.y??p.y+aim.y*channel.range,ttl:.28});h.audio?.('channelLoop',channel.ability);
 }});
 for(const wave of s.waves){
  const progress=Math.min(1,Math.max(0,(now-wave.startedAt)/.35));
  for(const e of targets(wave.origin,w,wave.range*progress))if(!wave.hit.has(e)){
   wave.hit.add(e);deliver(p,w,wave.a,e,wave.power,h,wave.cast);
   if(!e.isBoss&&!e.worldBoss&&!e.massive&&!e.elite&&!e.isElite&&!e.eliteModifier){
    const dx=e.x-wave.origin.x,dy=e.y-wave.origin.y,d=Math.hypot(dx,dy)||1,sign=wave.a.vampireMorph==='tidalReversal'?-1:1;
    moveActorWithCollision(e,w,dx/d*24*sign,dy/d*24*sign);
   }
  }
 }
 s.waves=s.waves.filter(wave=>now-wave.startedAt<.35);
 if(s.pending){const q=s.pending;if(input.dashPressed||input.controlLocked||p.stunTimer>0||p.staggerTimer>0||p.visualHitUntil>now)s.pending=null;
  else if(now>=q.at){s.pending=null;const e=aimed(p,w,q.aim,q.range,28)[0];if(e)deliver(p,w,q.a,e,q.power*(e.hp/e.maxHp<.3?1.5:1),h,{healed:0});effect(h,p,'execution',{dirX:q.aim.x,dirY:q.aim.y,radius:q.range});}}
 for(const [e,entry] of s.bleeds){
  if(!alive(e)||!w.enemies.includes(e)){entry.bleeds.splice(0);s.bleeds.delete(e);continue;}
  let steps=0;while(entry.next<=now&&steps++<8){const at=entry.next;entry.next++;for(const b of entry.bleeds)if(b.until>=at){effect(h,e,'bleed',{ttl:.3});h.damage(e,b.power,'spirit',{sourceAbilityId:'crimsonFeast',sourceName:'Crimson Bleed',element:'necrotic',dot:true,proc:true,vampire:true,bleedSnapshot:true,quiet:true});}}
  entry.bleeds=entry.bleeds.filter(b=>b.until>now);if(!entry.bleeds.length)s.bleeds.delete(e);
 }
 p.vampireInstinct=!!(vampirePerk(p,'instinct')&&targets(p,w,220).some(e=>isBleeding(e,now)));
}
export function onVampireMelee(p,w,e,actual,now){
 if(!isVampire(p)||actual<=0||e.trainingDummy||e.friendly||e.invulnerable||e.invulnerableUntil>now)return;
 const bleeding=isBleeding(e,now);
 if(vampirePerk(p,'edge')&&Math.random()<.12)addBleed(p,w,e,actual,now);
 if(p.vampireFrenzyUntil>now&&bleeding)recoverVampire(p,actual*.02,{budget:'frenzy',world:w,now});
 vampireKill(p,e,w,now,bleeding);
}
export function onVampireBatHit(p,w,s,e,actual,now){
 if(!isVampire(p)||actual<=0||e.trainingDummy||e.friendly)return;
 recoverVampire(p,actual*.05*(royalActive(p)?1.15:1),{budget:'bat',world:w,now});
 if(Math.random()<(vampirePerk(p,'winged_hunger')?.15:0)+(s.vampireMorph==='bloodstalker'?.15:0))addBleed(p,w,e,actual,now);
 if(s.vampireMorph==='dreadwing'&&!e.isBoss&&!e.worldBoss){e.targetSummonId=s.id;e.summonThreatUntil=now+1.5;}
}
