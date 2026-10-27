import {TILE} from './data.js';

// Small discoveries are composed around retained content IDs, so their scenery
// follows the content anchor rather than creating another coordinate inventory.
export const ECHORYN_DISCOVERIES=[
 {marker:'poi-hollow-elk-grove',name:'Blighted Elk Grove',clearing:{offset:[-7,-4],rx:9,ry:8},scene:[
  ['forestKit',-9,-4,12,115,100],['forestKit',8,-6,12,130,110],['forestKit',-8,6,11,180,85],['forestKit',9,5,10,175,150],
  ['deadLivestock',-4,-3],['deadLivestock',4,4],['weaponRack',-6,1],['avarranOathStone',5,-5]]},
 {marker:'poi-briar-den',name:'Briar Den',scene:[
  ['forestKit',-8,-5,13,170,100],['forestKit',7,-4,13,150,92],['forestKit',8,7,13,160,95],['forestKit',-7,6,11,145,80],['deadLivestock',3,2],['forestKit',-4,-7,12,95,85]]},
 {marker:'poi-abandoned-caravan',name:'Abandoned Caravan',scene:[
  ['sickWagon',-5,0],['harvestCart',3,3],['deadLivestock',-2,3],['medicineCrates',4,-3],['woodPile',-6,3],['crate',2,-4]]},
 {marker:'poi-pilgrim-ambush',family:'pilgrimRoadAmbush',name:'Pilgrim Road Ambush',scene:[
  ['sickWagon',-5,5],['forestKit',5,-4,11,180,85],['prayerRibbons',-6,-3],['medicineCrates',-3,6],['deadLivestock',1,4]]},
 {marker:'poi-bandit-road-camp',name:'Bandit Road Camp',scene:[
  ['quarantineTent',-7,-5],['quarantineTent',6,6],['weaponRack',-5,4],['banner',5,-6],['woodPile',-8,3],['crate',6,-3]]},
 {marker:'poi-grave-mound',name:'Grave Mound',scene:[
  ['memorialStone',-6,0],['memorialStone',6,1],['ruinWall',-4,5],['freshGrave',0,-4],['freshGrave',3,-3],['prayerRibbons',-3,-3]]},
 {marker:'poi-mire-watchpost',name:'Mire Watchpost',scene:[
  ['column',-6,-5],['ruinWall',-5,3],['forestKit',7,2,15,140,125],['cable',-3,-4],['crate',4,-4],['lantern',-4,4]]},
 {marker:'poi-old-hollow-den',name:'Old Blighted Den',scene:[
  ['forestKit',-8,-5,12,135,115],['forestKit',9,-4,12,145,125],['forestKit',8,7,11,195,95],['deadLivestock',-3,-2],['memorialStone',4,-6],['deadRoot',-5,6]]},
 {marker:'poi-red-seal-ritual',name:'Last Dawn Ritual Site',scene:[
  ['sealEngine',-5,-5],['altar',3,-5],['burnPit',-3,3],['deadRoot',-7,2],['weaponRack',6,-2],['banner',-8,-4],['banner',8,4],['cable',3,4]]}
];
export function composeEchorynDiscoveries(world){
 const protectedContent=world.objects.filter(o=>!o.decorative&&o.interactable!==false&&o.kind!=='poiMarker');
 for(const discovery of ECHORYN_DISCOVERIES){
  const marker=world.objects.find(o=>o.id===discovery.marker);if(!marker)continue;
  if(discovery.clearing){
   const old=marker.echorynOrigin||={x:marker.x,y:marker.y},q=discovery.clearing;marker.x=old.x+q.offset[0]*TILE;marker.y=old.y+q.offset[1]*TILE;
   for(const boss of world.enemies.filter(e=>e.majorPoiId==='hollowElkGrove'))Object.assign(boss,{x:marker.x,y:marker.y});
   const offering=world.objects.find(o=>o.id==='hollow-elk-offering');if(offering)Object.assign(offering,{x:marker.x+3*TILE,y:marker.y+3*TILE});
   const cx=Math.floor(marker.x/TILE),cy=Math.floor(marker.y/TILE);
   for(let y=cy-q.ry;y<=cy+q.ry;y++)for(let x=cx-q.rx;x<=cx+q.rx;x++){
    const t=world.tiles[y]?.[x];if(t&&t.passable!==false&&((x-cx)/q.rx)**2+((y-cy)/q.ry)**2<1)t.echorynClearing=discovery.marker;
   }
   // An unobtrusive game trail leaves the through-road for the root/stone arena.
   const points=[[old.x+2*TILE,old.y],[old.x-2*TILE,old.y],[marker.x,marker.y]];
   for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    for(let s=0;s<=length;s+=12){const x=Math.floor((a[0]+(b[0]-a[0])*s/length)/TILE),y=Math.floor((a[1]+(b[1]-a[1])*s/length)/TILE);
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const t=world.tiles[y+dy]?.[x+dx];if(t&&t.passable!==false&&!['cliff','water','wall'].includes(t.biome))Object.assign(t,{biome:'path',roadId:'elk-game-trail'});}
    }
   }
   world.terrainFeatures.localRoutes.push({id:'elk-game-trail',width:2*TILE,points});
   (world.terrainFeatures.clearings||=[]).push({id:discovery.marker,x:marker.x,y:marker.y,rx:q.rx*TILE,ry:q.ry*TILE});
  }
  if(discovery.family){const actors=world.enemies.filter(e=>e.majorPoiId===discovery.family);if(actors.length){marker.x=actors.reduce((s,e)=>s+e.x,0)/actors.length;marker.y=actors.reduce((s,e)=>s+e.y,0)/actors.length;}}
  for(const [i,[type,dx,dy,index,w,h]] of discovery.scene.entries()){
   const x=marker.x+dx*TILE,y=marker.y+dy*TILE,t=world.tiles[Math.floor(y/TILE)]?.[Math.floor(x/TILE)];
   if(!t||t.passable===false||['water','cliff','wall'].includes(t.biome)||protectedContent.some(o=>Math.hypot(o.x-x,o.y-y)<45))continue;
   world.objects.push({id:`echoryn-discovery-${discovery.marker}-${i}`,kind:'worldDressing',discoveryId:discovery.marker,propType:type,x,y,scale:type==='deadLivestock'?1.2:1,kitIndex:index,artWidth:w,artHeight:h,color:'#803f35',decorative:true,interactable:false,hideLabel:true});
  }
 }
 return world;
}
