// Authored safe landing bays protect both travel's 600px check and its approach.
// Enemy identities, health, rewards and death ledgers are preserved when relocated.
export function navSanctuaryAt(w,x,y,margin=0){return (w.navStones||[]).find(s=>s.navSafeRadius&&Math.hypot(x-s.x,y-s.y)<s.navSafeRadius+margin);}
function footOpen(w,x,y,r=14){
 for(const [dx,dy]of [[0,0],[-r,0],[r,0],[0,-r],[0,r]]){const t=w.tiles[Math.floor((y+dy)/32)]?.[Math.floor((x+dx)/32)];if(!t||t.passable===false||['wall','water','cliff'].includes(t.biome))return false;}
 const trees=w.echorynTreeBuckets?.get(`${Math.floor(x/512)},${Math.floor(y/512)}`)||[];
 return !trees.some(t=>Math.hypot(t.x-x,t.y-y)<r+9*t.size);
}
export function protectNavSanctuary(w,e,peers=w.continentRuntime?.allEnemies||w.enemies||[]){
 if(!e||e.dead||e.remove||e.hp<=0||e.friendly||e.trainingDummy||e.disposition==='friendly')return false;
 const stone=navSanctuaryAt(w,e.x,e.y);if(!stone)return false;
 const home={x:e.homeX??e.x,y:e.homeY??e.y};let target=!navSanctuaryAt(w,home.x,home.y,128)&&footOpen(w,home.x,home.y,e.r||14)?home:null;
 if(!target){const start=Math.atan2(home.y-stone.y,home.x-stone.x);for(let ring=0;ring<8&&!target;ring++)for(let i=0;i<48&&!target;i++){
  const angle=start+i*Math.PI*2/48,r=stone.navSafeRadius+192+ring*64,x=(Math.floor((stone.x+Math.cos(angle)*r)/32)+.5)*32,y=(Math.floor((stone.y+Math.sin(angle)*r)/32)+.5)*32;
  if(!navSanctuaryAt(w,x,y,128)&&footOpen(w,x,y,e.r||14)&&!peers.some(a=>a!==e&&!a.dead&&a.hp>0&&Math.hypot(a.x-x,a.y-y)<52))target={x,y};
 }
 if(target){e.homeX=target.x;e.homeY=target.y;e.patrolRoute=null;}}
 if(!target)return false;
 Object.assign(e,target);e.aggro=false;e.awakened=e.alerted=e.hasDetectedPlayer=e.returningHome=e.isInCombat=e.inCombat=false;delete e.combatTargetId;delete e.combatTarget;delete e.target;return true;
}
export function protectNavSanctuaries(w,enemies=w.enemies||[]){for(const e of enemies)protectNavSanctuary(w,e);}
