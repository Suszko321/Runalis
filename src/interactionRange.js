export const INTERACTION_RANGE=50;
export function objectInInteractionRange(actor,object,range=INTERACTION_RANGE){
  if(!actor||!object||object.depleted||object.interactable===false)return false;
  return Math.hypot(object.x-actor.x,object.y-actor.y)<range+(object.r||object.radius||0);
}
