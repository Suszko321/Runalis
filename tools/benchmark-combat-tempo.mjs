import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {fixture} from './benchmark-oathkeeper-identity.mjs';
import {ABILITIES} from '../src/data.js';
import {CLASS_SUBCLASSES} from '../src/subclassData.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {applyAbilityMastery} from '../src/abilityMasterySystem.js';
import {beginAbilityCharge} from '../src/chargeSystem.js';
import {getAbilityUseChargeProfile} from '../src/abilityChargeSystem.js';
import {getSubclassCombatState} from '../src/subclassCombat.js';

export function tempoFixture(id,family='base',count=1,type='normal') {
  const base=ABILITIES.find(a=>a.id===id),c=fixture([id],family,count,type,base.classId||'eldritch');
  c.p.spiritAwakened=true;
  c.a=()=>applyAbilityMastery(c.p,resolveAbilityMorph(c.p,base,family));
  return c;
}
export function benchmarkTempo() {
  const profiles=[];
  for(const base of ABILITIES.filter(a=>a.classId))for(const family of ['base',...(CLASS_SUBCLASSES[base.classId]||[])]) {
    const c=tempoFixture(base.id,family),a=c.a(),profile=getAbilityUseChargeProfile(c.p,a);
    const charge=beginAbilityCharge(c.p,0,a,c.now())?c.p.abilityCharge.maxChargeTime:null;
    c.p.abilityCharge=null;
    profiles.push({id:base.id,family,cd:a.cd,charge,maxCharges:profile.maxCharges,recharge:profile.rechargeTime,
      referenceDamage:a.damage,referenceMultiplier:a.damageMultiplier,cost:a.cost,duration:a.duration??null,channel:a.channelProfile||null});
  }
  const samples=[];
  for(const [id,family] of [
    ['thornbinderThornLash','petalknight',true],['thornbinderRosebiteBurst','petalknight',true],
    ['hydromancerWaterTorrent','base',true],['hydromancerWaterTorrent','sunken',true],
    ['oathkeeperJudgmentSmite','holyknight',true],['oathkeeperJudgmentSmite','sinner',true],
    ['fellhunterThrowingDaggers','bloodhound',false],['fellhunterThrowingDaggers','hellstalker',false],
    ['graveSpark','acolyte',false],['bloodLance','base',true],['lightbringerGleamBolt','base',false],
    ['voidstepBurst','base',true],['thornbinderLivingBriar','petalknight',true],
    ['thornbinderThornstorm','petalknight',false],['soulSiphon','acolyte',false],
    ['oathkeeperHallowedBlades','sinner',false],['hydromancerDrowningPressure','base',false]
  ])for(const count of [1,16]) {
    const c=tempoFixture(id,family,count),a=c.a();
    if(a.subclassMode==='burst'||a.roseEruption)for(const [i,e] of c.w.enemies.entries()) {e.x=c.p.x+a.range+(i%4-1)*12;e.y=c.p.y+Math.floor(i/4)*12;}
    const startX=c.w.enemies[0].x,startHp=c.p.hp,used=c.cast(),timeline=[];
    for(let i=1;i<=720;i++) {c.tick();if(i%4===0)timeline.push(Math.round(c.damage()));}
    const state=getSubclassCombatState(c.p),entry=state?.afflictions.get(c.w.enemies[0]);
    samples.push({id,family,enemies:count,used,damage:Math.round(c.damage()),timeline,
      charge:a.canCharge?a.maxChargeTime:null,recovery:c.p.visualAction?.duration||null,
      displacement:+(c.w.enemies[0].x-startX).toFixed(2),health:+(c.p.hp-startHp).toFixed(2),
      ailments:entry?[...entry.effects.keys()]:[]});
  }
  return {note:'Controlled level-33/mastery-20 fixtures; one uncharged cast, fixed gear, stationary targets, 18 seconds. Timelines sampled every 0.1 s. No FPS claims.',profiles,samples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const label=process.argv[2]||'after',report=benchmarkTempo();
  fs.mkdirSync('docs/combat-tempo',{recursive:true});fs.writeFileSync(`docs/combat-tempo/${label}.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({label,profiles:report.profiles.length,samples:report.samples.length,failed:report.samples.filter(s=>!s.used).map(s=>[s.id,s.family])}));
}
