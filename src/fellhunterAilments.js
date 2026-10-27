// Independent lifetimes prevent a weak hit from preserving a whole rack of
// powerful old wounds. One bounded pool per owner/enemy, shared across skills.
export const BLOODHOUND_BALANCE=Object.freeze({interval:1,cadence:.4,
 bleed:Object.freeze({duration:10,max:8,ratio:.10}),poison:Object.freeze({duration:14,max:6,ratio:.12})});
function recount(entry){
 entry.stacks=entry.bleeds.length;entry.poisonStacks=entry.venoms.length;
 const layers=[...entry.bleeds,...entry.venoms];entry.until=Math.max(0,...layers.map(s=>s.until));
 entry.damage=entry.bleeds.reduce((n,s)=>n+s.power*BLOODHOUND_BALANCE.bleed.ratio,0)+entry.venoms.reduce((n,s)=>n+s.power*BLOODHOUND_BALANCE.poison.ratio,0);
 if(layers.length)entry.ability=layers[0].a;
}
export function applyBloodhoundAilments(entry,a,power,now,empowered=false){
 if(!a.hunterAilment)return;
 entry.bleeds=(entry.bleeds||[]).filter(s=>s.until>now);entry.venoms=(entry.venoms||[]).filter(s=>s.until>now);
 entry.bloodhoundAilments=true;entry.dot=true;
 if(!entry.nextAilmentTick||!entry.bleeds.length&&!entry.venoms.length)entry.nextAilmentTick=now+BLOODHOUND_BALANCE.interval;
 for(const [type,key] of [['bleed','bleeds'],['poison','venoms']]){
  if(a.hunterAilment!==type&&a.hunterAilment!=='both')continue;
  const cadence='next_'+type;if(now<(entry[cadence]||0))continue;
  entry[cadence]=now+BLOODHOUND_BALANCE.cadence;
  const c=BLOODHOUND_BALANCE[type],count=a.hunterLayers||1;
  for(let i=0;i<count;i++){
   if(entry[key].length>=c.max)entry[key].shift();
   entry[key].push({a,power:power*(empowered?1.25:1),born:now,until:now+c.duration});
  }
 }
 recount(entry);
}
export function updateBloodhoundAilments(p,entry,now,tick){
 // Morph changes/respec must revoke only that skill's wounds, not another
 // skill's stacks on the same enemy. No timers or world objects are saved.
 const valid=s=>p.active!==false&&p.knownAbilities?.includes(s.a.id)&&p.abilityMorphs?.[s.a.id]==='bloodhound';
 entry.bleeds=entry.bleeds.filter(valid);entry.venoms=entry.venoms.filter(valid);
 let steps=0;
 while(entry.nextAilmentTick<=now+1e-8&&steps++<16){
  const at=entry.nextAilmentTick;entry.nextAilmentTick+=BLOODHOUND_BALANCE.interval;
  for(const [type,key] of [['bleed','bleeds'],['poison','venoms']]){
   const groups=new Map();
   for(const stack of entry[key])if(stack.until+1e-8>=at&&stack.born+BLOODHOUND_BALANCE.interval<=at+1e-8){
    const g=groups.get(stack.a.id)||{a:stack.a,power:0};g.power+=stack.power*BLOODHOUND_BALANCE[type].ratio;groups.set(stack.a.id,g);
   }
   for(const g of groups.values())tick(g.a,g.power,type);
  }
 }
 entry.bleeds=entry.bleeds.filter(s=>s.until>now);entry.venoms=entry.venoms.filter(s=>s.until>now);recount(entry);
 return entry.bleeds.length+entry.venoms.length>0;
}
export function removeBloodhoundSource(entry,id){
 entry.bleeds=entry.bleeds.filter(s=>s.a.id!==id);entry.venoms=entry.venoms.filter(s=>s.a.id!==id);recount(entry);
 return entry.bleeds.length+entry.venoms.length>0;
}
