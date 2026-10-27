import {objectInInteractionRange} from './interactionRange.js';
import {hasLineOfSight} from './world.js';

const sessions=new WeakMap();
export const CAMPFIRE_RECIPES=Object.freeze(['cookedSunfish','fieldRationsPack','silverfinSkewer','bitterStew','ashFruitStew','shrineTonic']);
function present(actor,world,npc){
 return actor&&actor.hp>0&&actor.alive!==false&&!actor.dead&&!['dead','downed','beingRevived','respawning'].includes(actor.lifeState)&&actor.active!==false&&actor.joined!==false&&
  npc&&!npc.dead&&npc.alive!==false&&(npc.hp==null||npc.hp>0)&&!npc.remove&&!npc.depleted&&(world?.objects||[]).includes(npc)&&objectInInteractionRange(actor,npc)&&hasLineOfSight(world,actor.x,actor.y,npc.x,npc.y);
}
export function beginWorkshopSession(game,npc,kind){
 const host=game?.hostGame||game,actor=game?.player;
 if(!host||!['blacksmith','craftsman'].includes(kind)||npc?.workshopService!==kind||host.world!==game.world||!present(actor,game.world,npc))return null;
 if(actor!==host.player&&!(host.player?.coop?.players||[]).includes(actor))return null;
 endWorkshopSession(host.workshopService?.actor);
 const session={active:true,host,actor,world:game.world,npc,kind,category:kind==='blacksmith'?'weapons':'all',selected:null,pending:null,message:''};
 sessions.set(actor,session);host.workshopService=session;return session;
}
export function workshopAccessStatus(player,kind){
 const s=sessions.get(player);
 if(!s||!s.active||s.kind!==kind||s.host.workshopService!==s||s.host.destroyed||s.host.world!==s.world||s.npc.workshopService!==kind||!present(player,s.world,s.npc))
  return {ok:false,reason:kind==='blacksmith'?'Visit a nearby blacksmith to upgrade equipment.':'Visit a nearby craftsman to craft items.'};
 if(player!==s.host.player&&!(s.host.player?.coop?.players||[]).includes(player))return {ok:false,reason:'This service session has ended.'};
 return {ok:true,session:s};
}
export function endWorkshopSession(player){
 const s=player&&sessions.get(player);if(!s)return;
 s.active=false;s.pending=null;sessions.delete(player);if(s.host.workshopService===s)s.host.workshopService=null;
}
export function hasCampfireCraftAccess(player,game,recipe,options){
 const host=game?.hostGame||game,world=game?.world,station=options?.station;
 return options?.source==='campfire'&&CAMPFIRE_RECIPES.includes(recipe?.id)&&game?.player===player&&host?.world===world&&station?.kind==='campfire'&&present(player,world,station);
}
