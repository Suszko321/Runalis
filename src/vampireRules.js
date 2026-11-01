// Rules shared by combat, mitigation, UI and movement. No alternate game clock.
export const isVampire=p=>(p?.bloodline?.id||p?.raceId)==='vampire';
export const royalActive=p=>isVampire(p)&&p.hp>0&&(!p.lifeState||p.lifeState==='alive')&&p.vampireForm?.active===true;
export const vampirePerk=(p,key)=>isVampire(p)&&Number(p.skillTree?.spent?.['vampire_'+key])>0;
export function vampireHealthCost(p,a){return Math.max(0,Number(p.maxHp)||0)*Number(a.hpCostPct||0)/100*(vampirePerk(p,'chalice')?.9:1);}
export function vampireEnvironment(world){
 if(world?.mode==='dungeon'&&!world.safeZone)return 1.15;
 const outdoor=['overworld','region','route','continent'].includes(world?.mode)&&world.worldAtmosphere?.weather!=='indoor';
 return outdoor?(world.worldAtmosphere?.night?1.15:.85):1;
}
export function vampireAbilityMultiplier(p,a,world){
 if(!isVampire(p))return 1;
 if(!a?.vampire)return royalActive(p)?.75:1;
 let power=vampireEnvironment(world)*(royalActive(p)?1.2:1);
 if(royalActive(p)){
  const melee=['strike','execution','step'].includes(a.vampireMode),morph=p.vampireForm.morph;
  if(morph==='sovereignBlood')power*=melee?.85:1.1;
  if(morph==='elderPredator')power*=melee?1.15:.85;
 }
 return power;
}
export function vampireOutsideHealing(p,value){return value*(isVampire(p)?.9:1)*(royalActive(p)?.8:1);}
export function vampireIncoming(p,value,element){return value*(isVampire(p)&&['fire','holy'].includes(element)?1.1:1);}
export function vampireMeleeSpeed(p,now){return isVampire(p)&&p.vampireFrenzyUntil>now?1.15:1;}
export function vampireMeleeReach(p){return royalActive(p)?1.1:1;}
