import {getAbilityById} from './data.js';
import {getSelectedAbilityMorph} from './abilityMorphSystem.js';
import {SUNKEN_PRESSURE} from './sunkenSkills.js';
export {SUNKEN_PRESSURE} from './sunkenSkills.js';

// Encounter-wide Depth; one non-stacking burn per enemy and caster. Each
// contributing skill keeps its own expiry so a weak tick cannot renew a stale
// heavy hit's reference power. No encounter data is stored in player saves.
const states=new WeakMap();
const alive=e=>e&&e.hp>0&&!e.dead&&!e.remove;
const owns=(p,id)=>getSelectedAbilityMorph(p,id)==='sunken'&&(p.knownAbilities?.includes(id)||p.unlockedAbilities?.includes(id));
export function isSunkenDamage(p,options){return !options.sunkenBurn&&options.source!=='summon'&&getAbilityById(options.sourceAbilityId)?.classId==='waverider'&&
 (options.sourceMorph==='sunken'||options.sourceMorph==null&&getSelectedAbilityMorph(p,options.sourceAbilityId)==='sunken')&&owns(p,options.sourceAbilityId);}
function state(p,w){let s=states.get(p);if(!s||s.world!==w){s={world:w,targets:new Map(),startedAt:0,lastHit:-Infinity,depth:0,nextVisual:0};states.set(p,s);}return s;}
export function getSunkenPressureState(p){return states.get(p)||null;}
export function clearSunkenPressure(p){states.delete(p);}
export function clearSunkenPressureSource(p,id){
 const s=states.get(p);if(!s)return;
 for(const [e,entry]of s.targets){entry.contributions.delete(id);if(!entry.contributions.size)s.targets.delete(e);}
 if(!s.targets.size)clearSunkenPressure(p);
}
function encounterDepth(s,now){return s&&now-s.lastHit<=SUNKEN_PRESSURE.encounterGrace?Math.min(1,Math.max(0,(now-s.startedAt)/SUNKEN_PRESSURE.rampSeconds)):0;}
export function sunkenDirectMultiplier(p,w,e,now){const s=states.get(p);return 1+(s?.world===w?encounterDepth(s,now):0)*SUNKEN_PRESSURE.directRamp;}
export function applySunkenPressure(p,w,e,power,skill,options,now){
 if(!e||e.dead||e.remove||e.trainingDummy||e.arenaDormant||!owns(p,options.sourceAbilityId))return;
 const s=state(p,w),a=getAbilityById(options.sourceAbilityId);
 if(now-s.lastHit>SUNKEN_PRESSURE.encounterGrace){s.startedAt=now;s.depth=0;s.targets.clear();}
 s.lastHit=now;s.depth=encounterDepth(s,now);
 // A killing contact carries encounter pressure to the next foe, but never
 // leaves a burn on a corpse. Damage delivery calls this before marking death.
 if(e.hp<=0)return;
 let entry=s.targets.get(e);
 if(!entry){
  if(s.targets.size>=SUNKEN_PRESSURE.cap)s.targets.delete(s.targets.keys().next().value);
  entry={lastHit:now,depth:s.depth,nextTick:now+SUNKEN_PRESSURE.tick,power:0,nextVisual:0,contributions:new Map()};s.targets.set(e,entry);
 }
 entry.depth=s.depth;entry.lastHit=now;
 const cadence=options.channelTick?(options.sunkenCadence||a.channelProfile?.tickInterval||.6):Math.max(1,a.cd||1);
 const latest={lastHit:now,power:power/SUNKEN_PRESSURE.opening*SUNKEN_PRESSURE.tick/cadence,skill,
  options:{...options,sourceMorph:'sunken',element:'water',sunkenBurn:true,dot:true,quiet:true,channelTick:true,proc:true,stagger:false,heavy:false,charged:false,crit:false,knockback:false}};
 const prior=entry.contributions.get(a.id);
 entry.contributions.set(a.id,prior&&prior.referenceUntil>now&&prior.power>latest.power
  ? {...prior,lastHit:now,latest}
  : {...latest,referenceUntil:now+SUNKEN_PRESSURE.grace,latest});
}
export function updateSunkenPressure(p,w,now,damage,effect){
 const s=states.get(p);if(!s)return;
 const sources=new Set([...(p.knownAbilities||[]),...(p.unlockedAbilities||[])].filter(id=>getSelectedAbilityMorph(p,id)==='sunken'));
 if(s.world!==w||!alive(p)||p.active===false||p.lifeState&&p.lifeState!=='alive'||!sources.size){clearSunkenPressure(p);return;}
 if(now-s.lastHit>SUNKEN_PRESSURE.encounterGrace){clearSunkenPressure(p);return;}
 // Only real damage contacts advance stored Depth. A burn cannot build it,
 // and a same-frame volley cannot accelerate the time-based ramp.
 for(const [e,entry]of s.targets){
  if(!alive(e)||!(w.enemies||[]).includes(e)){s.targets.delete(e);continue;}
  let strongest=null;
  for(const [id,oldSource]of entry.contributions){
   let source=oldSource;
   if(now>source.referenceUntil){source={...source.latest,referenceUntil:source.latest.lastHit+SUNKEN_PRESSURE.grace,latest:source.latest};entry.contributions.set(id,source);}
   if(now-source.lastHit>SUNKEN_PRESSURE.grace||!sources.has(id))entry.contributions.delete(id);
   else if(!strongest||source.power>strongest.power)strongest=source;
  }
  if(!strongest){s.targets.delete(e);continue;}
  entry.depth=s.depth;entry.power=strongest.power;entry.skill=strongest.skill;entry.options=strongest.options;
  if(now>=entry.nextTick){entry.nextTick=now+SUNKEN_PRESSURE.tick;damage(e,entry.power*(SUNKEN_PRESSURE.burnOpening+entry.depth*SUNKEN_PRESSURE.burnRamp),entry.skill,entry.options);}
  if(now>=entry.nextVisual){entry.nextVisual=now+.3;effect({kind:'sunkenSkill',profile:'burn',x:e.x,y:e.y-6,radius:18,depth:entry.depth,ttl:.38,layer:'front'});}
 }
 if(now>=s.nextVisual){s.nextVisual=now+.3;effect({kind:'sunkenSkill',profile:'depth',x:p.x,y:p.y,radius:27,depth:s.depth,ttl:.38,layer:'behind'});}
}
