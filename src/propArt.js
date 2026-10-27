import {asset} from './spriteArt.js';
export const PLAGUE_PROPS=Object.freeze({quarantineTent:[0,86,72],infirmaryCot:[1,55,44],washBasin:[2,42,40],plagueMarker:[3,34,51],purificationBrazier:[4,44,63],warningBell:[5,45,60],sickWagon:[6,96,84],medicineCrates:[7,48,51],freshGrave:[8,53,43],memorialStone:[9,40,56],burnPit:[10,58,36],diseasedOrchardTree:[11,78,94],rotIrrigation:[12,90,43],harvestCart:[13,68,63],childToy:[14,21,21],prayerRibbons:[15,40,56]});
export const STORY_PROPS=Object.freeze({deadLivestock:[0,50,28],ancientSluice:[1,84,82],brokenBellTower:[2,62,104],brokenStainedGlass:[3,53,80],avarranOathStone:[4,50,68],witnessPlatform:[5,85,63],echoFragment:[6,31,49],rotMemorial:[7,53,67],blockedAlcove:[8,66,72],sealEngine:[9,65,78],mapTable:[10,70,50],altar:[11,66,55],ruinWall:[12,78,49],column:[13,36,75],crate:[14,46,43],cable:[15,43,26]});
export function drawNarrativeProp(ctx,object,x,y){
  const type=object.propType||object.pieceType;
  const config=PLAGUE_PROPS[type]||STORY_PROPS[type];if(!config)return false;
  const name=PLAGUE_PROPS[type]?'plague-props':'story-props',a=asset(name);if(!a?.ready)return false;
  const [index,w,h]=config,s=Number(object.scale||1);
  const bob=type==='echoFragment'?Math.sin(performance.now()/700)*2:0;
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(object.restored||object.lit)ctx.filter='brightness(1.3) saturate(1.15)';
  ctx.drawImage(a.image,index%4*112,Math.floor(index/4)*128,112,128,x-w*s/2,y+12*s-h*s*122/128+bob,w*s,h*s);
  ctx.restore();return true;
}
for(const name of ['plague-props','story-props'])asset(name);

// Object state selects authored artwork; rendering never advances puzzle state.
export function drawDungeonInteractable(ctx,object,x,y){
  const kind=object.kind;
  let index,w,h;
  if(kind==='dungeonStairs'){index=object.direction==='up'?0:1;w=52;h=48;}
  else if(kind==='dungeonDoor'){index=object.locked?2:3;w=52;h=64;}
  else if(kind==='dungeonPuzzle'){index=object.solved?5:4;w=46;h=48;}
  else if(kind==='dungeonKey'){index=6;w=25;h=31;}
  else if(['dungeonExit','sideZoneExit'].includes(kind)){index=object.locked?2:7;w=50;h=61;}
  else if(kind==='dungeonEvent'){index=object.triggered?10:11;w=38;h=51;}
  else return false;
  const a=asset('dungeon-interactables');if(!a?.ready)return false;
  const bob=kind==='dungeonKey'?Math.sin(performance.now()/300)*2:0;
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(kind==='dungeonStairs'&&object.locked)ctx.filter='brightness(.65)';
  ctx.drawImage(a.image,index%4*112,Math.floor(index/4)*128,112,128,x-w/2,y+14-h*122/128+bob,w,h);
  if(kind==='dungeonPuzzle'&&!object.solved){
    const progress=Math.max(0,Math.min(1,Number(object.progress||0)/Math.max(1,Number(object.requiredSteps||3))));
    ctx.fillStyle='#191f22';ctx.fillRect(x-13,y+16,26,3);
    ctx.fillStyle=object.markerColor||'#66f0ff';ctx.fillRect(x-13,y+16,26*progress,3);
  }
  ctx.restore();return true;
}
asset('dungeon-interactables');
