import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {fixture} from './benchmark-oathkeeper-identity.mjs';
import {ABILITIES} from '../src/data.js';
import {useAbility} from '../src/combat.js';
import {resolveSubclassAbility} from '../src/subclassVariants.js';
import {applyAbilityMastery} from '../src/abilityMasterySystem.js';
import {getSubclassCombatState} from '../src/subclassCombat.js';
import {getSunkenPressureState} from '../src/sunkenPressureSystem.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';

export function waveFixture(id='hydromancerWaterTorrent',family='sunken',count=1,rank='boss') {
 const c=fixture([id],family,count,rank,'waverider');c.p.spiritAwakened=true;
 for(const [i,e]of c.w.enemies.entries()){e.x=472+i%4*18;e.y=400+Math.floor(i/4)*14;}
 c.a=(abilityId=id)=>applyAbilityMastery(c.p,resolveSubclassAbility(c.p,abilityId));
 c.state=()=>getSubclassCombatState(c.p);c.pressure=()=>getSunkenPressureState(c.p);
 c.refresh=()=>{c.p.cooldowns={};c.p.abilityUseCharges={};c.p.spirit=c.p.stamina=10000;};
 c.learn=abilityId=>{unlockActiveAbility(c.p,abilityId,{autoAssignEmpty:false});getAbilityMastery(c.p,abilityId,true).level=20;selectAbilityMorph(c.p,abilityId,family,c.now());};
 c.fire=(abilityId=id)=>useAbility(abilityId,c.p,c.w,()=>{},c.now(),c.input);
 return c;
}
export function benchmarkWave() {
 const casts=[];
 for(const family of ['base','sunken','cryomancer'])for(const a of ABILITIES.filter(a=>a.classId==='waverider'))for(const count of [1,16]){
  const c=waveFixture(a.id,family,count,'normal'),hp=c.p.hp,used=c.fire(),field=c.state()?.fields[0];
  if(field)for(const [i,e]of c.w.enemies.entries()){e.x=field.x+(i%4-1)*14;e.y=field.y+Math.floor(i/4)*14;}
  const timeline=[];let peakEffects=0,freezeSeconds=0;
  for(let i=0;i<480;i++){c.tick();peakEffects=Math.max(peakEffects,c.w.effects.length);freezeSeconds+=c.w.enemies[0].subclassFrozenUntil>c.now()?.025:0;if(i%40===39)timeline.push(Math.round(c.damage()));}
  casts.push({id:a.id,family,enemies:count,used,damage:Math.round(c.damage()),healing:+(c.p.hp-hp).toFixed(2),freezeSeconds:+freezeSeconds.toFixed(2),timeline,peakEffects});
 }
 const fights=[];
 for(const family of ['base','sunken','cryomancer'])for(const rank of ['normal','boss'])for(const rotation of ['torrent','caster']){
  const c=waveFixture('hydromancerWaterTorrent',family,1,rank),ids=rotation==='torrent'?['hydromancerWaterTorrent']:['hydromancerWaterTorrent','waveriderPressureSpear','hydromancerTidalCut','hydromancerDrowningPressure'];
  for(const id of ids.slice(1))c.learn(id);
  const windows=[],depth=[];let prior=0,freeze=0,slowed=0,uses=0;
  for(let i=0;i<1600;i++){
   c.p.x=c.p.y=400;
   c.w.enemies[0].x=472;c.w.enemies[0].y=400;
   for(const id of ids)if(c.fire(id))uses++;c.tick();const e=c.w.enemies[0];
   if(e.subclassFrozenUntil>c.now())freeze+=.025;if(e.slowTimer>0)slowed+=.025;e.slowTimer=Math.max(0,(e.slowTimer||0)-.025);
   if(i%200===199){windows.push(Math.round(c.damage()-prior));prior=c.damage();depth.push(+(c.pressure()?.targets.get(e)?.depth||0).toFixed(3));}
  }
  fights.push({family,rank,rotation,uses,damage:Math.round(c.damage()),fiveSecondWindows:windows,depth,freezeSeconds:+freeze.toFixed(2),slowSeconds:+slowed.toFixed(2)});
 }
 return {note:'Level 33, mastery 20, unchanged starting gear and no passive build. Single casts: 12 s, placed fields populated after casting. Fights: 40 s, target pinned at cast range before each step to isolate damage from displacement, actual cooldowns, abundant Spirit, tap casts. No frame-rate or complete-build claims.',casts,fights};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const label=process.argv[2]||'after',report=benchmarkWave();fs.mkdirSync('docs/waverider-identity',{recursive:true});fs.writeFileSync(`docs/waverider-identity/${label}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({label,casts:report.casts.length,failed:report.casts.filter(c=>!c.used),fights:report.fights}));
}
