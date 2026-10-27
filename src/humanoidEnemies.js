import {ELITE_MODIFIERS} from './encounterData.js';
import { ITEMS } from './data.js';
import {getEnemyVisualProfile,visualHash,ENEMY_VISUAL_VERSION} from './enemyVisualProfiles.js';
import {enemyOutfitFor} from './enemyEquipmentData.js';
import {sampleEnemyAttackPresentation} from './enemyAttackPresentation.js';

const movementSamples = new WeakMap();
const GEAR = {
  bandit:{weapon:'oldKnife',helm:'brigandMask',chest:'patchedRoadLeathers',legs:'roughLegwraps'},
  archer:{weapon:'hunterBow',helm:'clothHood',chest:'leatherVest',legs:'roughLegwraps'},
  cultist:{weapon:'redSealConductor',helm:'necromancerHood',chest:'cultistMantle',legs:'graveclothGreaves'},
  knight:{weapon:'blackIronSword',helm:'graveboundHelm',chest:'graveboundChest',legs:'graveboundGreaves'},
  priest:{weapon:'walkingStick',helm:'necromancerHood',chest:'necromancerRobe',legs:'graveclothGreaves'},
  hollow:{weapon:'oldKnife',chest:'patchedTunic',legs:'roughLegwraps'},
  dawn:{weapon:'redSealConductor',helm:'watcherHood',chest:'cultistMantle',legs:'graveclothGreaves'},
  divine:{weapon:'crackedDawnlens',helm:'sunforgedHalo',chest:'oathplateOfTheLastDawn',legs:'ironGreaves'}
};

export function renameLastDawn(text) {
  return String(text || '').replace(/Thornroot Hollow/gi,'Thornroot Crypt').replace(/Abandoned Iron Hollow/gi,'Abandoned Iron Vault').replace(/Red Seal/g,'Last Dawn').replace(/red seal keep/gi,'Last Dawn Keep')
    .replace(/hollowlings/gi,'Blighted Corpses').replace(/hollowling/gi,'Blighted Corpse')
    .replace(/hollowed/gi,'Blighted').replace(/\bHollow\b/gi,'Blighted');
}

export function isHumanoidEnemy(enemy) {
  return !!enemy && getEnemyVisualProfile(enemy).family==='human';
}


// Persistent equipment is authoritative for both rendering and corpse loot.
// This also initializes old saves and enemies created outside normal builders.
export function ensureHumanoidEnemyEquipment(enemy) {
  if (!enemy) return enemy;
  const profile=getEnemyVisualProfile(enemy);
  enemy.name=renameLastDawn(enemy.name || enemy.kind);
  if(enemy.bossName)enemy.bossName=renameLastDawn(enemy.bossName);
  if(profile.family!=='human'){
    if(enemy.humanEquipmentVersion===1){delete enemy.equipment;delete enemy.humanEquipmentVersion;}
    enemy.enemyVisualVersion=ENEMY_VISUAL_VERSION;
    enemy.bodyModel=profile.id;
    return enemy;
  }
  const outfitKey=`${profile.faction}:${profile.role}:${profile.variant}`;
  if (enemy.humanEquipmentVersion===ENEMY_VISUAL_VERSION && enemy.enemyVisualOutfitKey===outfitKey) return enemy;
  const inferred=enemy.enemyVisualFactionInferred || !enemy.visualFactionId;
  const legacyDefaults=new Set(Object.values(GEAR).flatMap(s=>Object.values(s)));
  const authored=Object.fromEntries(Object.entries(enemy.equipment || {}).filter(([,id])=>(enemy.humanEquipmentVersion!==1 || !legacyDefaults.has(id)) && (enemy.humanEquipmentVersion!==ENEMY_VISUAL_VERSION || !ITEMS[id]?.enemyCollectible)));
  const equipment = {...enemyOutfitFor(profile),...authored};
  for (const [slot,ref] of Object.entries(equipment)) {
    const id = typeof ref==='string' ? ref : ref?.id || ref?.itemId;
    if (!ITEMS[id] || ITEMS[id].slot !== slot) delete equipment[slot];
    else equipment[slot]=id;
  }
  const hash=visualHash(enemy.id || enemy.name || enemy.kind);
  enemy.equipment=equipment;
  enemy.bodyType=enemy.bodyType || (hash%5===0?'female':'male');
  enemy.skin=enemy.skin || (['gravebound','gravePriest','wraith','veyrWraith','hollowling','exploder'].includes(enemy.kind)?'#aeb4b1':['#e2b99d','#b58162','#805844'][hash%3]);
  enemy.hair=enemy.hair || ['#29211c','#5c4330','#8f8274'][hash%3];
  enemy.hairStyle=enemy.hairStyle || (enemy.bodyType==='female'?'ponytail':'short');
  enemy.shirt=enemy.shirt || '#4c4640';enemy.pants=enemy.pants || '#393732';enemy.boots=enemy.boots || '#302c27';
  enemy.visualFactionId=profile.faction;
  enemy.enemyVisualFactionInferred=inferred;
  enemy.enemyVisualOutfitKey=outfitKey;
  enemy.humanEquipmentVersion=ENEMY_VISUAL_VERSION;
  enemy.enemyVisualVersion=ENEMY_VISUAL_VERSION;
  enemy.bodyModel='human';
  return enemy;
}

export function getHumanoidEnemyActor(enemy, now=performance.now()/1000) {
  ensureHumanoidEnemyEquipment(enemy);
  let sample=movementSamples.get(enemy);
  if (!sample) {sample={x:enemy.x,y:enemy.y,dirX:enemy.dirX ?? 0,dirY:enemy.dirY ?? 1,movingUntil:0,attackCooldown:enemy.attackCooldown || 0,attackUntil:0};movementSamples.set(enemy,sample);}
  sample.attackCooldown=Number(enemy.attackCooldown || 0);
  const tell=enemy.bossTell || enemy.telegraph;
  const dx=enemy.x-sample.x,dy=enemy.y-sample.y,distance=Math.hypot(dx,dy);
  if (distance>.02) {sample.movingUntil=now+.15;sample.dirX=dx/distance;sample.dirY=dy/distance;}
  sample.x=enemy.x;sample.y=enemy.y;
  const targetX=Number(tell?.x)-enemy.x,targetY=Number(tell?.y)-enemy.y;
  const targetDistance=Math.hypot(targetX,targetY);
  const dirX=enemy.reviewAnimation?(enemy.dirX??sample.dirX):targetDistance>0?targetX/targetDistance:sample.dirX;
  const dirY=enemy.reviewAnimation?(enemy.dirY??sample.dirY):targetDistance>0?targetY/targetDistance:sample.dirY;
  const duration=Math.max(.1,Number(tell?.maxTime || .6));
  const presentation=sampleEnemyAttackPresentation(enemy,now);
  const attacking=!!presentation||!!tell && tell.time>0;
  const ranged=enemy.kind==='archer',caster=['cultist','demonCultist'].includes(enemy.kind);
  return {...enemy,name:null,scale:1,walkTime:now,isMoving:!attacking && (now<sample.movingUntil || ['walk','run'].includes(enemy.reviewAnimation)),
    dirX:presentation?.dirX??dirX,dirY:presentation?.dirY??dirY,
    visualAction:attacking&&caster?{kind:'cast',animationFamily:'magic',abilityId:'enemyRitual',duration:presentation?.duration??duration,
      releasePoint:presentation?presentation.windup/presentation.duration:.65,startedAt:now-(presentation?.elapsed??Math.max(0,duration-tell.time))}:undefined,
    combatState:attacking&&!caster?{attacking:true,attackElapsed:presentation?.elapsed??Math.max(0,duration-tell.time),attackDirX:presentation?.dirX??dirX,attackDirY:presentation?.dirY??dirY,
      attackMove:{id:'enemyPrimary',kind:ranged?'projectile':presentation?.technique==='thrust'?'thrust':'arc',comboType:['heavyCleave','overhead','bossSlam'].includes(presentation?.pose)?'heavy':'light',
        attackFamily:presentation?.technique==='thrust'?'thrust':presentation?.faction==='roadless'?'reverseSlash':undefined,
        duration:presentation?.duration??duration,startup:presentation?.activeStart??duration*.25,activeStart:presentation?.activeStart??duration*.65,activeEnd:presentation?.activeEnd??duration*.9,recovery:presentation?.recovery??duration*.1}}:undefined,
    visualHitUntil:enemy.hitFlash>0?now+enemy.hitFlash:0};
}

export function getEnemyNameplate(enemy) {
  const name=renameLastDawn(enemy.bossName || enemy.name || String(enemy.kind || 'Enemy').replace(/([a-z])([A-Z])/g,'$1 $2'));
  const boss=!!(enemy.isBoss || enemy.worldBoss || enemy.bossType);
  const elite=!!(enemy.elite || enemy.eliteModifier || enemy.namedExteriorElite || enemy.isElite || enemy.eliteModifiers?.length || ['elite','rare','champion'].includes(enemy.encounterTier));
  const raw=Number(enemy.combatLevel || enemy.level || enemy.tier || 1);
  const level=Number.isFinite(raw)?Math.max(1,Math.floor(raw)):1;
  const modifiers=(enemy.eliteModifiers||[]).map(m=>`${ELITE_MODIFIERS[m]?.symbol||'?'} ${ELITE_MODIFIERS[m]?.name||m}`).join(' / ');
  const tier=enemy.encounterTier;
  const title=`${tier==='rare'?'RARE ':tier==='champion'?'CHAMPION ':tier==='elite'?'ELITE ':''}${boss?'♛ ':elite?'◆ ':''}${name} · Lv ${level}`;
  return {name,title,modifierText:modifiers,text:`${tier==='rare'?'RARE ':tier==='champion'?'CHAMPION ':''}${boss?'♛ ':elite?'◆ ':''}${name} · Lv ${level}${modifiers?' ['+modifiers+']':''}`,color:enemy.friendly || enemy.disposition==='friendly'?'#a9d7a8':'#ff7777',rank:boss?'boss':elite?'elite':'normal',level};
}

export function getHumanoidEquipmentLoot(enemy) {
  ensureHumanoidEnemyEquipment(enemy);
  return isHumanoidEnemy(enemy)?[...new Set(Object.values(enemy.equipment || {}))].filter(id=>ITEMS[id]?.enemyCollectible).map(item=>({item,qty:1})):[];
}

export function migrateLastDawnDisplayText(value, seen=new WeakSet()) {
  if (!value || typeof value!=='object' || seen.has(value)) return value;
  seen.add(value);
  for (const [key,entry] of Object.entries(value)) {
    if (typeof entry==='string' && /^(name|title|label|text|talk|summary|flavor|description|desc|speaker|role|bossName|worldName|currentZone|discoveredText)$/.test(key)) value[key]=renameLastDawn(entry);
    else if (entry && typeof entry==='object') migrateLastDawnDisplayText(entry,seen);
  }
  return value;
}
