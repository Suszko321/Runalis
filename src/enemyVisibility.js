// Runtime camera bounds stay out of world/save data.
const combatViews=new WeakMap();
// Acquisition stays at the existing 80px fringe; pursuit gets room to escape.
export const ENEMY_PURSUIT_MARGIN=160;
export function setEnemyCombatViews(world,game){
  if(!world||!game?.canvas)return;
  const members=game.getSplitScreenMembers?.();
  const views=members?members.map((actor,i)=>{
    const viewport=game.getSplitViewportsForMemberCount(members.length)[i];
    return {actor,...game.buildCameraForActor(actor,viewport.width,viewport.height),width:viewport.width,height:viewport.height};
  }):[{actor:game.player,...(game.renderCamera||game.camera),width:game.canvas.width/(game.coopCameraZoom||1),height:game.canvas.height/(game.coopCameraZoom||1),shared:true}];
  combatViews.set(world,views);
}
export function enemyWithinTargetView(enemy,target,world,margin=0){
  const views=combatViews.get(world)||[{actor:target,x:target.x-480,y:target.y-270,width:960,height:540,shared:true}];
  const belongs=view=>view.shared||view.actor===target||(view.actor?.summons||[]).includes(target)||target?.simulatedPlayer&&target.x>=view.x&&target.x<=view.x+view.width&&target.y>=view.y&&target.y<=view.y+view.height;
  return views.some(view=>belongs(view)&&enemy.x>=view.x-margin&&enemy.x<=view.x+view.width+margin&&enemy.y>=view.y-margin&&enemy.y<=view.y+view.height+margin);
}
