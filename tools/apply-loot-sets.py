from pathlib import Path
def edit(name,changes,imports=''):
 p=Path('src')/name;s=p.read_text(encoding='utf-8')
 for old,new in changes:
  assert old in s,(name,old[:85]);s=s.replace(old,new)
 p.write_text(imports+s,encoding='utf-8')

edit('data.js',[("  ...ENEMY_EQUIPMENT_ITEMS,","  ...ENEMY_EQUIPMENT_ITEMS,\n  ...MYTHICAL_ITEMS,")],"import {MYTHICAL_ITEMS} from './mythicalEquipmentData.js';\n")
edit('setBonusSystem.js',[
 ("export const ARMOUR_SETS = {","export const ARMOUR_SETS = {\n  ...MYTHICAL_SETS,"),
 ("  for (const itemId of Object.values(equipment)) {\n    if (!itemId) continue;", "  const seen=new Set();\n  for (const slot of EQUIPMENT_SLOTS) {\n    const itemId=equipment[slot],item=ITEMS[itemId];\n    if(!item || (item.slot==='jewelry'?'trinket':item.slot)!==slot || seen.has(itemId))continue;seen.add(itemId);"),
 ("          bonus\n", "          bonus,\n          effect:set.effects?.[pieces] || ''\n"),
 ("  return totals;", "  const caps={summonDamage:.5,summonHealth:.6,critChance:.3,critDamage:.6,blockEfficiency:.35,dodgeCostReduction:.3,lifesteal:.12,bossDamage:.3,necroticDamage:.4,holyDamage:.4,natureDamage:.4};\n  for(const [key,cap] of Object.entries(caps))if(totals[key])totals[key]=Math.min(cap,totals[key]);\n  return totals;")
],"import {MYTHICAL_SETS} from './mythicalEquipmentData.js';\nimport {EQUIPMENT_SLOTS} from './equipmentProgressionSystem.js';\n")
edit('gearVisualStyle.js',[("    silhouette: inferSilhouette(text, slot, weaponType, archetype),", "    silhouette: item.visualSilhouette || inferSilhouette(text, slot, weaponType, archetype),"),("    classId: archetype === 'frontier' ? classId : archetype,", "    classId: archetype === 'frontier' ? classId : archetype,\n    ...(item.visualPalette?{...item.visualPalette,faction:'mythical',mythical:true}:{}),")])

edit('combat.js',[
 ("  const ability = applyEquippedChargeBonuses(player, applyAbilityMastery(player, applyAbilityCharge(getBalancedAbility(baseAbility), charge)));", "  const ability = applyMythicalAbilityModifiers(player,applyEquippedChargeBonuses(player, applyAbilityMastery(player, applyAbilityCharge(getBalancedAbility(baseAbility), charge))));"),
 ("  const width = 32 * Number(ability._charge?.radiusMultiplier || 1)", "  const width = 32 * (ability._mythWidth || 1) * Number(ability._charge?.radiusMultiplier || 1)"),
 ("  return applyThornbeastSummonRole(\n", "  applyMythicalWolf(player,summon);\n  if(kind==='miniDemon')summon.requiredEquipmentId='demonseedScythe';\n  return applyThornbeastSummonRole(\n"),
 ("    updateSummon(summon, player, world, dt, now, log);", "    if(summon.kind==='wolf' && (summon.mythicalSetPieces||0)!==(getMythicalSetCounts(player).beastSovereign||0)){summon.alive=false;summon.dismissed=true;continue;}\n    updateSummon(summon, player, world, dt, now, log);"),
 ("  target.hitFlash = 0.12;\n  target.aggro", "  if(summon.kind==='wolf' && summon.mythicalSetPieces>=2)target.staggerTimer=Math.max(target.staggerTimer||0,.12);\n  if(summon.direWolf){\n    summon.direBites=(summon.direBites||0)+1;\n    target.targetSummonId=summon.id;target.summonThreatUntil=performance.now()/1000+2.5;\n    if(summon.direBites%3===0){\n      for(const foe of (world.enemies||[]).filter(e=>e!==target && e.hp>0 && !e.friendly && Math.hypot(e.x-target.x,e.y-target.y)<64 && hasLineOfSight(world,summon.x,summon.y,e.x,e.y)).slice(0,4))damageEnemyDirect(player,world,foe,damage*.45,'summoning',log,{source:'summon',sourceAbilityId:'summonWolf',summonKind:'wolf',aoe:true,quiet:true});\n      spawnWorldEffect(world,{kind:'slash',x:target.x,y:target.y-6,dirX:target.x-summon.x,dirY:target.y-summon.y,radius:64,ttl:.25,color:'#edcf87'});\n    }\n  }\n  target.hitFlash = 0.12;\n  target.aggro")
],"import {applyMythicalAbilityModifiers,applyMythicalWolf,getMythicalSetCounts} from './mythicalEquipmentSystem.js';\n")
edit('combatMoves.js',[
 ("  move = applyCombinationFinisher(move,weaponType,sequence);", "  move = applyMythicalMeleeModifiers(player,applyCombinationFinisher(move,weaponType,sequence),weaponType);"),
 ("(treeBonuses.power || 0) + primaryMultiplier*.55", "(treeBonuses.power || 0) + (weapon.id===player.equipment?.weapon?getEquipmentTierBonus(player,'weapon'):0) + primaryMultiplier*.55"),
 ("  player.lastTargetHpPct = enemy.maxHp", "  if(move.mythicalAsh && state.mythicalAshAttackId!==state.attackId){\n    state.mythicalAshAttackId=state.attackId;\n    spawnWorldEffect(world,{kind:'slash',x:enemy.x,y:enemy.y-6,radius:72,ttl:.35,color:'#f49b58',dirX:state.attackDirX,dirY:state.attackDirY});\n    for(const foe of (world.enemies||[]).filter(e=>e.hp>0&&!e.dead&&!e.friendly&&Math.hypot(e.x-enemy.x,e.y-enemy.y)<72&&hasLineOfSight(world,enemy.x,enemy.y,e.x,e.y)).slice(0,8)){\n      const aftershock=Math.min(foe.hp,Math.ceil(damage*.25));foe.hp-=aftershock;\n      recordEnemyCombatContribution(foe,player,damagePacket.skillId,aftershock,{source:'weapon',comboType:'heavy',weaponType:damagePacket.weaponType});\n      if(foe.hp<=0)foe.dead=true;foe.hitFlash=.12;\n    }\n  }\n  player.lastTargetHpPct = enemy.maxHp")
],"import {applyMythicalMeleeModifiers} from './mythicalEquipmentSystem.js';\nimport {getEquipmentTierBonus} from './equipmentProgressionSystem.js';\n")
edit('companionSpriteArt.js',[
 ("  miniDemon: Object.freeze", "  sovereignWolf:Object.freeze({sheet:'enemies-core',row:1,width:80,height:96,pivot:90,ramp:['#2e2932','#80603f','#c8ad72','#fff0bd'],accent:'#f4d984'}),\n  miniDemon: Object.freeze"),
 ("  const config=COMPANION_SPRITES[summon.kind];", "  const artKind=summon.artVariant || summon.kind;\n  const config=COMPANION_SPRITES[artKind];"),
 ("companionVariant(summon.kind,loaded.image)","companionVariant(artKind,loaded.image)"),
 ("scale=summon.kind==='miniDemon'?.75:1;", "scale=summon.direWolf?1.25:summon.kind==='miniDemon'?.75:1;")
])

edit('abilityChannelSystem.js',[("  c.elapsed = Math.max(0,now-c.startedAt);","  c.elapsed = Math.max(0,now-c.startedAt);\n  if(mythicalChannelGeometry(player,c).invalid){stopAbilityChannel(player,'equipmentChanged',onEnd);return false;}")],"import {mythicalChannelGeometry} from './mythicalEquipmentSystem.js';\n")
edit('combatExpansion.js',[
 ("{damage:h.power,range:a.range,profile:a.effectProfile}","{damage:h.power,range:a.range,profile:a.effectProfile,ability:a,mythicalMode:a._mythChannel}"),
 ("      const end=point(w,p,{x:c.dirX,y:c.dirY},c.range);", "      const shape=mythicalChannelGeometry(p,c);\n      if(shape.mode==='torrentSweep'){fx(h,p,a,'mythicTorrent',p.x,p.y,{dirX:shape.dirX,dirY:shape.dirY,width:shape.width,range:c.range,ttl:.2,phase:'active'});continueMythicalAudio(c,a,h,now);return;}\n      const end=point(w,p,{x:c.dirX,y:c.dirY},c.range);"),
 ("  const a=getAbilityById(c.abilityId),now=h.now;\n  let targets=[];", "  const a=c.ability || getAbilityById(c.abilityId),now=h.now;\n  const shape=mythicalChannelGeometry(p,c);\n  if(shape.mode==='torrentSweep'){\n    for(const e of lineTargets(w,p.x,p.y,shape.dirX,shape.dirY,c.range,shape.width,8)){hit(h,p,a,e,c.damage*shape.damageMultiplier,{channelTick:true});e.soakedUntil=now+2;}return;\n  }\n  if(shape.mode==='starChain'){\n    const primary=lineTargets(w,p.x,p.y,c.dirX,c.dirY,c.range,22,1)[0];\n    if(primary){hit(h,p,a,primary,c.damage*.78,{channelTick:true});for(const e of nearby(w,primary.x,primary.y,120,4).filter(e=>e!==primary).slice(0,2)){hit(h,p,a,e,c.damage*.28,{channelTick:true,proc:true});fx(h,p,a,'conduit',primary.x,primary.y,{endX:e.x,endY:e.y,ttl:.2});}}return;\n  }\n  let targets=[];")
],"import {mythicalChannelGeometry} from './mythicalEquipmentSystem.js';\nfunction continueMythicalAudio(c,a,h,now){if(now>=(c.nextAudioAt||0)){c.nextAudioAt=now+.8;h.audio?.('channelLoop',a);}}\n")
edit('subclassCombat.js',[
 ("profile:'subclass'}", "profile:'subclass',mythicalMode:a._mythChannel}"),
 ("      const a=c.ability,aim={x:c.dirX,y:c.dirY};", "      const a=c.ability,shape=mythicalChannelGeometry(p,c),aim={x:shape.dirX,y:shape.dirY};"),
 ("line(w,p.x,p.y,aim,c.range,22,a.maxHits)", "line(w,p.x,p.y,aim,c.range,shape.width,shape.maxTargets||a.maxHits)"),
 ("hit(p,w,a,e,c.damage,h,{channelTick:true});", "hit(p,w,a,e,c.damage*shape.damageMultiplier,h,{channelTick:true});"),
 ("      if(['heal','blessing','beacon'].includes(a.subclassSecondary))", "      if(shape.mode==='starChain'&&targets[0])for(const e of nearby(w,targets[0].x,targets[0].y,120,4).filter(e=>!targets.includes(e)).slice(0,2)){hit(p,w,a,e,c.damage*.28,h,{channelTick:true,proc:true});emit(h,p,a,'chain',{x:targets[0].x,y:targets[0].y-8,endX:e.x,endY:e.y-8,ttl:.2});}\n      if(['heal','blessing','beacon'].includes(a.subclassSecondary))"),
 ("      emit(h,p,c.ability,c.subclassMode==='beam'?'beam':'aura',{dirX:c.dirX,dirY:c.dirY,range:c.range,ttl:.18});", "      const shape=mythicalChannelGeometry(p,c);\n      if(shape.mode==='torrentSweep')h.effect({kind:'combatTechnique',profile:'mythicTorrent',colors:c.ability.colors,x:p.x,y:p.y,dirX:shape.dirX,dirY:shape.dirY,width:shape.width,range:c.range,ttl:.18,layer:'front'});\n      else emit(h,p,c.ability,c.subclassMode==='beam'?'beam':'aura',{dirX:c.dirX,dirY:c.dirY,range:c.range,ttl:.18});")
],"import {mythicalChannelGeometry} from './mythicalEquipmentSystem.js';\n")
edit('combatVisualsRenderer.js',[("  if(['chain','tether'].includes(profile)) {", "  if(profile==='mythicTorrent'){\n    const dx=fx.dirX||0,dy=fx.dirY??1,reach=fx.range||230,width=fx.width||77;\n    for(let d=4;d<reach;d+=8)for(let side=-width;side<=width;side+=8){\n      ctx.fillStyle=Math.abs(side)<width*.35?light:color;ctx.globalAlpha=alpha*(.35+.2*(1-d/reach));\n      ctx.fillRect(Math.round(x+dx*d-dy*side),Math.round(y+dy*d+dx*side),6,4);\n    }\n  } else if(['chain','tether'].includes(profile)) {")])
print('Mythical sets and combat integration applied.')
