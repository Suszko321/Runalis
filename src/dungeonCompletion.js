import {TILE} from './data.js';
import {findNearestActorPassablePoint} from './world.js';

const PORTAL_ID='dungeonBossReturnPortal';
const alive=enemy=>enemy&&!enemy.dead&&!enemy.remove&&enemy.alive!==false&&Number(enemy.hp)>0;
const finalFloor=world=>Number(world.floor||1)>=Number(world.totalFloors||world.dungeonState?.totalFloors||1);

// One identity belongs to the dungeon's final encounter. Minibosses, floor
// guardians and summoned bosses cannot complete the run or activate its exits.
export function syncDungeonCompletion(world){
  if(world?.mode!=='dungeon')return;
  const state=world.dungeonState||(world.dungeonState={cleared:false});
  const encounterEnemies=finalFloor(world)?world.enemies||[]
    :state.floorStates?.[world.totalFloors||state.totalFloors]?.enemies||[];
  {
    const boss=encounterEnemies.find(e=>e.isDungeonMainBoss)
      ||encounterEnemies.find(e=>e.isBoss&&!e.miniBoss&&(!state.mainBossEnemyId||e.id===state.mainBossEnemyId));
    if(boss){
      state.mainBossEnemyId=boss.id;
      const required=encounterEnemies.filter(e=>e.isDungeonMainBoss&&!e.summonedBy&&!e.summonedByBoss);
      state.requiredBossIds=[...new Set([...(state.requiredBossIds||[]),...(required.length?required:[boss]).map(e=>e.id)])];
      if(encounterEnemies.some(e=>state.requiredBossIds.includes(e.id)&&alive(e))){state.cleared=false;state.finalBossDefeated=false;}
    }
  }
  for(const object of world.objects||[]){
    if(object.kind==='dungeonExit'){
      object.locked=!state.cleared;
      if(state.cleared)object.name=object.returnPortal?'Return to Overworld':'Return to Surface';
    }
    if(object.unlockOnDungeonClear||object.kind==='dungeonChest'&&object.chestType==='boss')object.locked=!state.cleared;
  }
  if(!state.cleared){
    world.objects=(world.objects||[]).filter(o=>!o.returnPortal);
    return;
  }
  if(!finalFloor(world))return;
  const portal=(world.objects||[]).find(o=>o.id===PORTAL_ID);
  if(portal)return;
  const center=state.returnPortalPoint||world.bossRoomCenter
    ||(world.enemies||[]).find(e=>e.id===state.mainBossEnemyId)
    ||(world.objects||[]).find(o=>String(o.id).startsWith('dungeonBossMarker'))||world.exit||world.spawn;
  if(!center)return;
  const point=state.returnPortalPoint||findNearestActorPassablePoint(world,center.x,center.y+TILE*2,12);
  state.returnPortalPoint={x:point.x,y:point.y};
  world.objects=world.objects||[];
  world.objects.push({id:PORTAL_ID,kind:'dungeonExit',name:'Return to Overworld',...point,
    r:24,locked:false,returnPortal:true,forceLabel:true,labelPriority:8});
}

export function completeDungeonAfterBoss(world,enemy){
  if(world?.mode!=='dungeon'||!finalFloor(world)||!enemy?.isBoss||enemy.miniBoss||alive(enemy))return false;
  syncDungeonCompletion(world);
  const state=world.dungeonState;
  if(!(state.requiredBossIds||[state.mainBossEnemyId]).includes(enemy.id)||state.cleared||(world.enemies||[]).some(e=>(state.requiredBossIds||[]).includes(e.id)&&alive(e)))return false;
  state.finalBossDefeated=true;
  state.cleared=true;
  const center=world.bossRoomCenter||{x:enemy.homeX??enemy.x,y:enemy.homeY??enemy.y};
  state.returnPortalPoint=findNearestActorPassablePoint(world,center.x,center.y+TILE*2,12);
  syncDungeonCompletion(world);
  world.effects=world.effects||[];
  world.effects.push({kind:'enemyPulse',layer:'front',...state.returnPortalPoint,color:'#73d18a',radius:54,ttl:.8,age:0});
  return true;
}
