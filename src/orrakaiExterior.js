// The city continues beyond the north/west map edge; this is only its south apron.
import {TILE} from './data.js';
export const ORRAKAI_SOUTH_ROAD={id:'orrakai-south-approach',name:'Orrakai South Road',roadClass:'rural',width:4,points:[[10.5,2],[10.5,8.5],[14.5,13.5],[20,20],[26.5,28.5],[32,34]]};
export function configureOrrakaiApproach(objects,locations){
 const positions={
  'capital-gate-prototype':[10.5,3.5],'nav-hearthmereFrontier-outpost':[14.5,13.5],
  orrakaiSouthGateGuard:[13.5,6.5],orrakaiRoadScout:[8.5,10.5],outpostCampfire:[7.5,14.5],outpostShrine:[18.5,11.5],
  'signpost-outpost-1':[12.5,8.5],roadCookMira:[7.5,17.5],covenantRoadPhysician:[21.5,15.5],
  act1ReliefWagonNearRoad:[23.5,13.5],act1MedicineNearRoad:[23.5,16.5],act1RoadPurificationBrazier:[21.5,18.5],
  'site-outpost-workyard':[22.5,9.5],'auth-outpost-workyard-0':[23.5,7.5],'auth-outpost-workyard-1':[23.5,9.5],
  'auth-outpost-workyard-3':[25.5,7.5],'auth-outpost-workyard-4':[25.5,10.5],outpostHerb1:[5.5,17.5],outpostHerb2:[23.5,21.5],outpostReed1:[26.5,23.5]
 };
 for(let i=objects.length-1;i>=0;i--){const o=objects[i];if(o.id==='orrakai-east-surface-gate'||/^echoryn-(relief-|field-|town-marker)/.test(o.id)&&o.decorative)objects.splice(i,1);}
 for(const o of [...objects,...locations]){
  const p=positions[o.id];if(p)Object.assign(o,{x:p[0]*TILE,y:p[1]*TILE});
  if(o.id?.startsWith('nav-hearthmereFrontier-outpost-cairn-')){o.x=16.5*TILE;o.y=13.5*TILE;}
  if(o.id==='capital-gate-prototype')Object.assign(o,{name:'Orrakai South Gate',gateId:'south',hideLabel:false,forceLabel:true,labelPriority:12});
  if(o.id==='signpost-outpost-1')Object.assign(o,{name:'South Road — Nav Stone',talk:'Follow the stone road downhill to the glowing Nav Stone. Beyond it, the road opens into Echoryn Forest.'});
  if(o.id==='nav-hearthmereFrontier-outpost')Object.assign(o,{name:'Orrakai South Road Nav Stone',forceLabel:true,labelPriority:12});
 }
}
export function createOrrakaiExterior(){
 const objects=[],structures=[],clearings=[{x:10.5,y:7,r:5},{x:14.5,y:13.5,r:4},{x:22,y:14,r:6}];
 const prop=(id,type,x,y,extra={})=>objects.push({id:'orrakai-exterior-'+id,kind:'worldDressing',propType:type,x:x*TILE,y:y*TILE,sourceRegionId:'hearthmereFrontier',decorative:true,interactable:false,hideLabel:true,drawRadius:300,...extra});
 for(const [id,x,y,w,h]of [['north-west',0,0,9,4],['north-east',13,0,22,4],['west',0,0,3,24]]){
  prop(id,'continentWall',x+w/2,y+h/2,{w:w*TILE,h:h*TILE,wallHeight:115,theme:'orrakai'});structures.push({id:'orrakai-'+id,x,y,w,h});
 }
 structures.push({id:'orrakai-city-boundary',x:0,y:0,w:35,h:2});
 for(const [i,x]of [7,15,29].entries())prop('tower-'+i,'continentTower',x,3,{w:85,h:185,theme:'orrakai'});
 prop('gate-banner','banner',14,5,{color:'#793e3b',accent:'#d9ad4f'});
 prop('watchfire','campfire',7,6);prop('relief-shelter','quarantineTent',23,13,{scale:.8});
 prop('farm','continentFarm',25,21,{w:100,h:65,theme:'orrakai'});
 prop('supply','supplyWagon',24,16,{scale:.75});
 return {objects,structures,clearings};
}
