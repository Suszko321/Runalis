// Presentation milestones use the summoning skill's existing, persistent mastery.
// Existing mastery/progression formulas still own combat power and health.
export const BAT_BEAST_EVOLUTIONS=Object.freeze([
 Object.freeze({id:'fledgling',name:'Fledgling',mastery:1,scale:.75}),
 Object.freeze({id:'bloodwing',name:'Bloodwing',mastery:5,scale:.875}),
 Object.freeze({id:'elder',name:'Elder',mastery:10,scale:1}),
 Object.freeze({id:'royal',name:'Royal',mastery:20,scale:1.125}),
 Object.freeze({id:'ancient',name:'Ancient Royal',mastery:50,scale:1.25})
]);
export function batBeastEvolution(level=1){
 const mastery=Number.isFinite(Number(level))?Math.max(1,Math.floor(Number(level))):1;
 for(let i=BAT_BEAST_EVOLUTIONS.length-1;i>=0;i--)if(mastery>=BAT_BEAST_EVOLUTIONS[i].mastery)return BAT_BEAST_EVOLUTIONS[i];
}
export function synchronizeBatBeastEvolution(summon,owner){
 if(summon.kind!=='vampireBat')return;
 const level=Number(owner?.abilityMastery?.callBatBeast?.level)||1,stage=batBeastEvolution(level);
 summon.vampireMastery=level;summon.vampireEvolution=stage.id;
 const kind=summon.vampireMorph==='dreadwing'?'Dreadwing':summon.vampireMorph==='bloodstalker'?'Bloodstalker':'Bat Beast';
 summon.displayName=`${stage.name} ${kind}`;
}
