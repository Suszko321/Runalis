import {tuneDungeonBoss} from './dungeonBossDifficulty.js';
import {cancelEnemyAttackPresentation} from './enemyAttackPresentation.js';
import {playSfx} from './audioSystem.js';
export const VEYREIGN_TRANSFORM_SECONDS=4;
export function prepareVeyreignTransformation(w,e){
 if(e?.veyreignTransform!=null){e.hp=1;e.dead=e.remove=false;e.alive=true;return true;}
 if(!e?.veyreignLord||e.veyreignFeral||e.deathHandled||e.hp>0||w.dungeonState?.cleared||w.dungeonState?.veyreign?.defeated)return false;
 e.dead=false;e.remove=false;e.alive=true;delete e.removeTimer;
 e.veyreignHumanName=e.name;e.veyreignFeral=true;e.veyreignTransform=0;e.veyreignAttack=null;e.veyreignTurn=0;e.veyreignPhase=1;e.veyreignRecovery=1.1;e.hp=e.maxHp;
 tuneDungeonBoss(e,e.dungeonBossPartySize||w.dungeonState?.coopPlayerCount||1);e.hp=1;e.r=e.radius=34;e.arenaDormant=true;e.hitFlash=0;e.staggerTimer=0;
 e.name=e.bossName=w.dungeonState?.veyreign?.firstVisit?'Alistair Veyreign, the Crimson Sovereign':'Greater Vampire, Royal Blood Beast';
 cancelEnemyAttackPresentation(e);e.bossTell=e.telegraph=null;
 w.effects=(w.effects||[]).filter(f=>!f.bossHazard);w.combatEffects=[];playSfx('bossRoar',{volume:.8});return true;
}
export function resetVeyreignTransformation(e){
 e.veyreignFeral=false;delete e.veyreignTransform;e.name=e.veyreignHumanName||e.name;e.bossName=e.name;e.r=e.radius=18;e.hp=e.maxHp;
 tuneDungeonBoss(e,e.dungeonBossPartySize||1);e.veyreignAttack=null;e.veyreignRecovery=2;e.veyreignTurn=0;e.veyreignPhase=1;
}
export function frameVeyreignCamera(w,focus,width,height){
 if(w?.bossArena?.phase!=='active')return;const e=w.enemies?.find(e=>e.veyreignLord&&e.veyreignFeral&&!e.dead&&e.hp>0);if(!e)return;
 const clamp=(v,r)=>Math.max(-r,Math.min(r,v));focus.x+=clamp((e.x-focus.x)/2,width*.18);focus.y+=clamp((e.y-230-focus.y)/2,height*.27);
}
