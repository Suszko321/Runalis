// Gravecaller sustain is attached to specific attacks, not every necrotic hit.
// Budgets belong to the recipient, so crowds, summons and co-op owners share
// the same limits. Fractional healing never creates free HP on tiny hits.
export const GRAVECALLER_SUSTAIN=Object.freeze({
 refill:.03,burst:.06,summonRefill:.01,summonBurst:.02,
 bolt:8,meleeBolt:10,summon:4,specter:8,riteBase:.03,ritePerSoul:.01,riteMaximum:.08
});
const accounts=new WeakMap();
export const isGravecallerSustain=p=>p?.classId==='gravecaller'||p?.classId==='necromancer';
export function gravecallerSkillLifesteal(ability,morph=ability?.subclassId){
 const id=typeof ability==='string'?ability:ability?.id;
 if(id==='graveSpark'||id==='necroticBolt')return morph==='deathknight'?GRAVECALLER_SUSTAIN.meleeBolt:GRAVECALLER_SUSTAIN.bolt;
 if(id==='bloodLance')return !morph||morph==='base'?8:morph==='deathknight'?10:0;
 if(id==='soulSiphon')return !morph||morph==='base'?12:morph==='deathknight'?6:0;
 if(id==='gravecallerMurmuringHost'&&morph==='deathknight')return 4;
 return 0;
}
export function restoreGravecallerHealth(p,amount,{source='spell',now=performance.now()/1000}={}){
 const max=Number(p?.maxHp),hp=Number(p?.hp);
 if(!(max>0)||!Number.isFinite(max)||!(hp>0)||p.active===false||(p.lifeState&&p.lifeState!=='alive')||!(amount>0)||!Number.isFinite(amount))return 0;
 let a=accounts.get(p);
 if(!a){a={last:now,total:max*GRAVECALLER_SUSTAIN.burst,summons:max*GRAVECALLER_SUSTAIN.summonBurst};accounts.set(p,a);}
 const elapsed=Math.max(0,Number.isFinite(now)?now-a.last:0);a.last=Math.max(a.last,now);
 a.total=Math.min(max*GRAVECALLER_SUSTAIN.burst,a.total+elapsed*max*GRAVECALLER_SUSTAIN.refill);
 a.summons=Math.min(max*GRAVECALLER_SUSTAIN.summonBurst,a.summons+elapsed*max*GRAVECALLER_SUSTAIN.summonRefill);
 const value=Math.max(0,Math.min(amount,max-hp,a.total,source==='summon'?a.summons:Infinity));
 if(!value)return 0;
 p.hp=Math.min(max,hp+value);a.total-=value;if(source==='summon')a.summons-=value;return value;
}
export function restoreGravecallerLifesteal(p,dealt,rate,{bonusPct=0,healingPct=0,...options}={}){
 if(!(rate>0)||!(dealt>0)||!Number.isFinite(dealt))return 0;
 const fraction=Math.max(0,rate+bonusPct)/100;
 return restoreGravecallerHealth(p,dealt*fraction*Math.max(0,1+healingPct/100),options);
}
