// Orrakai's surface silhouette uses individual walls, towers and roof masses.
// The established interactive town remains an instance behind its physical gates.
import {TILE} from './data.js';
export function createOrrakaiExterior(){
 const objects=[],structures=[],clearings=[];
 const prop=(id,type,x,y,extra={})=>objects.push({id:`orrakai-exterior-${id}`,kind:'worldDressing',propType:type,x:x*TILE,y:y*TILE,sourceRegionId:'hearthmereFrontier',decorative:true,interactable:false,hideLabel:true,drawRadius:400,...extra});
 // The relief apron stays outside the south wall. Architecture faces the road.
 for(const [id,x,y,w,h] of [['south-west',6,33,9,2],['south-east',20,33,9,2],['south-tower-foot',34,33,8,2],['north',6,9,36,2],['west',6,10,2,23],['east-north',40,10,2,13],['east-south',40,32,2,1]]){
  prop(id,'continentWall',x+w/2,y+h/2,{w:w*TILE,h:h*TILE,wallHeight:105,theme:'orrakai'});structures.push({id:'orrakai-'+id,x,y,w,h});
 }
 prop('tower-lane-gate','continentGate',31.5,34,{w:5*TILE,h:150,theme:'orrakai'});
 prop('east-gate','continentGate',41,25.5,{w:4*TILE,h:150,theme:'orrakai'});
 prop('tower-postern','continentGate',41,30,{w:3*TILE,h:120,theme:'orrakai'});
 for(const [i,[x,y]] of [[7,10],[41,10],[7,33],[41,33],[27,33]].entries()){prop('tower-'+i,'continentTower',x,y,{w:100,h:230,theme:'orrakai'});structures.push({id:`orrakai-tower-${i}`,x:x-1,y:y-1,w:2,h:2});}
 for(const [i,[x,y,index]] of [[13,15,3],[25,14,0],[34,18,2],[23,24,1],[31,28,3]].entries()){prop('roof-'+i,'continentHouse',x,y,{w:160,h:170,roofIndex:index,theme:'orrakai',silhouette:true,fadeBehind:true});structures.push({id:`orrakai-roof-${i}`,x:x-2,y:y-2,w:4,h:2});}
 prop('watchfire-a','campfire',11,34,{scale:1.1});prop('watchfire-b','campfire',25,35,{scale:1.1});
 prop('banner-a','banner',14,33,{color:'#eee0bd',scale:1.3});prop('banner-b','banner',21,33,{color:'#a74543',scale:1.3});
 prop('farm-west','continentFarm',24,44,{w:210,h:130,theme:'orrakai'});prop('farm-east','continentFarm',34,48,{w:250,h:155,theme:'orrakai'});
 prop('lumber','woodPile',41,39,{scale:1.4});prop('drain','continentCausewayPier',29,39,{w:74,h:30,theme:'orrakai'});
 prop('supply','supplyWagon',24,38,{scale:1.2});prop('mill','continentGranary',35,45,{w:125,h:180,theme:'orrakai'});
 for(const [id,x,y,talk] of [['south-watch',15,36,'Orrakai lies through the south arch. The Blighted Road follows the relief wagons east.'],['east-watch',43,26,'The eastern postern joins the old road. The Pilgrim Road is open to anyone willing to risk the pass.']])objects.push({id:'orrakai-exterior-'+id,kind:'npc',name:'Orrakai Gate Watch',x:x*TILE,y:y*TILE,r:14,stationary:true,factionId:'orrakai',visualFactionId:'covenant',disposition:'friendly',shirt:'#d9cead',pants:'#525044',talk,sourceRegionId:'hearthmereFrontier'});
 objects.push({id:'orrakai-east-surface-gate',kind:'capitalGate',name:'Orrakai East Postern',x:41*TILE,y:25.5*TILE,r:24,gateId:'east',sourceRegionId:'hearthmereFrontier'});
 clearings.push({x:17.5,y:36,r:8},{x:41,y:25.5,r:4});
 return {objects,structures,clearings};
}
