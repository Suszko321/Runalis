// Offline production-renderer check; no browser, profile, or simulation writes.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {usesMeleeRig} from '../src/meleeRig.js';
const require=createRequire(import.meta.url);
const canvasPath=process.env.RUNALIS_CANVAS_MODULE||'@napi-rs/canvas';
const {createCanvas,Image:CanvasImage}=require(canvasPath);
globalThis.document={createElement(name){if(name!=='canvas')throw Error(name);return createCanvas(1,1);}};
globalThis.Image=class extends CanvasImage {
 set src(value){super.src=fs.readFileSync(fileURLToPath(value));}
};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {canSheatheWeapon}=await import('../src/weaponStance.js');
const {createPlayer}=await import('../src/player.js');
const {WEAPON_MOVESETS,ensureCombatState}=await import('../src/combatMoves.js');
const {spriteArtStatus}=await import('../src/spriteArt.js');
const {ITEMS}=await import('../src/data.js');
const {getGearVisualProfile}=await import('../src/gearVisualStyle.js');
const {armorMotionFamily}=await import('../src/armorMotionArt.js');
const destination=fileURLToPath(new URL('../docs/visual-production/',import.meta.url));
const actors=[];
for(const [bodyType,family] of [['male','leather'],['female','plate'],['male','cloth']])for(const [dirX,dirY] of [[0,1],[1,0],[0,-1],[-1,0]]){
 const actor=createPlayer('Melee review');ensureCombatState(actor);actor.actionState={};
 Object.assign(actor,{bodyType,hairStyle:bodyType==='female'?'ponytail':'short',dirX,dirY,isMoving:false,skin:'#eeb883',hair:'#714122',shirt:'#75502d',pants:'#484347',boots:'#654326'});
 for(const slot of ['chest','legs'])actor.equipment[slot]=Object.entries(ITEMS).find(([id,item])=>item.slot===slot&&armorMotionFamily(getGearVisualProfile(id,item),slot)===family)?.[0]||null;
 actor.equipment.weapon='noviceBlade';actors.push(actor);
}
const sheet=createCanvas(1260,1320),ctx=sheet.getContext('2d');
const times=[0,.18,.33,.47,.64,.82,1],move=WEAPON_MOVESETS.sword.moves.find(m=>m.comboType==='light');
// Warm caches, then allow native image decoding to complete.
for(const actor of actors)drawHumanActor(ctx,actor,{x:0,y:0});
for(let attempt=0;attempt<50&&spriteArtStatus().some(a=>!a.ready&&!a.failed);attempt++)await new Promise(r=>setTimeout(r,20));
ctx.fillStyle='#263025';ctx.fillRect(0,0,sheet.width,sheet.height);
for(let row=0;row<actors.length;row++)for(let col=0;col<times.length;col++){
 const actor=actors[row];actor.x=80+col*180;actor.y=85+row*105;
 Object.assign(actor.combatState,{attacking:true,attackMove:move,attackElapsed:times[col]*move.duration,attackDirX:actor.dirX,attackDirY:actor.dirY});
 const before=JSON.stringify(actor);drawHumanActor(ctx,actor,{x:0,y:0},{scale:1.3,isPlayer:true});
 if(before!==JSON.stringify(actor))throw Error('Renderer mutated review actor');
}
fs.writeFileSync(path.join(destination,'melee-swing-contact-sheet.png'),sheet.toBuffer('image/png'));
const restSheet=createCanvas(720,1440),restContext=restSheet.getContext('2d');
restContext.fillStyle='#263025';restContext.fillRect(0,0,720,1440);
for(let row=0;row<actors.length;row++)for(let col=0;col<3;col++){
 const actor=actors[row];actor.x=110+col*240;actor.y=100+row*112;
 actor.combatState.attacking=false;actor.isMoving=col>0;actor.walkTime=.8;actor.actionState.sprinting=col===2;
 drawHumanActor(restContext,actor,{x:0,y:0},{scale:1.6,isPlayer:true});
 if(row===0){restContext.fillStyle='#e4d3b0';restContext.font='18px sans-serif';restContext.fillText(['Standing','Walking','Running'][col],actor.x-45,20);}
}
fs.writeFileSync(path.join(destination,'restored-relaxed-arms.png'),restSheet.toBuffer('image/png'));
const gripSheet=createCanvas(880,1000),gripContext=gripSheet.getContext('2d');
gripContext.fillStyle='#263025';gripContext.fillRect(0,0,880,1000);
for(let row=0;row<8;row++)for(let phase=0;phase<4;phase++){
 const actor=actors[row];actor.x=110+phase*220;actor.y=100+row*120;
 actor.combatState.attacking=false;actor.isMoving=phase>0;actor.actionState.sprinting=false;actor.walkTime=(phase-1)*2+.01;
 drawHumanActor(gripContext,actor,{x:0,y:0},{scale:1.8,isPlayer:true});
}
fs.writeFileSync(path.join(destination,'held-weapon-grips-review.png'),gripSheet.toBuffer('image/png'));
for(const actor of actors){actor.combatState.attacking=true;actor.isMoving=false;actor.actionState.sprinting=false;}
// Animation frames are rendered by the exact same production function.
const frameDir=path.join(destination,'melee-review-frames');fs.mkdirSync(frameDir,{recursive:true});
const animation=createCanvas(720,430),a=animation.getContext('2d');
for(let frame=0;frame<48;frame++){
 a.fillStyle='#263025';a.fillRect(0,0,720,430);
 for(let i=0;i<4;i++){
  const actor=actors[i];actor.x=100+i*175;actor.y=260;
  actor.combatState.attackElapsed=frame/47*move.duration;
  drawHumanActor(a,actor,{x:0,y:0},{scale:2.6,isPlayer:true});
 }
 fs.writeFileSync(path.join(frameDir,`${String(frame).padStart(2,'0')}.png`),animation.toBuffer('image/png'));
}
console.log(JSON.stringify({actors:actors.length,poses:actors.length*times.length,animationFrames:48,loaded:spriteArtStatus().filter(a=>a.ready).length,failed:spriteArtStatus().filter(a=>a.failed),actorsUnchanged:true}));
const backSheet=createCanvas(880,580),backContext=backSheet.getContext('2d');
backContext.fillStyle='#263025';backContext.fillRect(0,0,880,580);
for(const [row,type] of ['sword','staff','scythe'].entries())for(let direction=0;direction<4;direction++){
 const actor=actors[direction];actor.equipment.weapon=Object.entries(ITEMS).find(([id,item])=>item.slot==='weapon'&&getGearVisualProfile(id,item).weaponType===type)[0];
 actor.x=100+direction*220;actor.y=135+row*180;actor.combatState.attacking=false;
 drawHumanActor(backContext,actor,{x:0,y:0},{scale:2,weaponSheathed:true,isPlayer:true});
 backContext.fillStyle='#e4d3b0';backContext.font='16px sans-serif';backContext.fillText(type,actor.x-20,actor.y+55);
}
fs.writeFileSync(path.join(destination,'sheathed-weapons-review.png'),backSheet.toBuffer('image/png'));
const heldWeapons=Object.entries(ITEMS).filter(([id,item])=>item.slot==='weapon'&&canSheatheWeapon({equipment:{weapon:id}}));
for(let page=0;page<Math.ceil(heldWeapons.length/9);page++){
 const selection=heldWeapons.slice(page*9,page*9+9),canvas=createCanvas(900,selection.length*145),c=canvas.getContext('2d');
 c.fillStyle='#263025';c.fillRect(0,0,canvas.width,canvas.height);
 for(const [row,[id,item]] of selection.entries())for(let direction=0;direction<4;direction++){
  const actor=actors[direction];actor.equipment.weapon=id;actor.x=110+direction*225;actor.y=100+row*145;actor.combatState.attacking=false;actor.isMoving=false;
  const before=JSON.stringify(actor);drawHumanActor(c,actor,{x:0,y:0},{scale:1.8,isPlayer:true});
  if(before!==JSON.stringify(actor))throw Error(`Held weapon render changed actor: ${id}`);
  if(direction===0){c.fillStyle='#e4d3b0';c.font='13px sans-serif';c.fillText(item.name||id,10,row*145+15);}
 }
 fs.writeFileSync(path.join(destination,`held-weapons-page-${page+1}.png`),canvas.toBuffer('image/png'));
}
console.log(`Reviewed renderer coverage: ${heldWeapons.length} drawn weapon models in four directions.`);
// Every equipped weapon family, both body types, both side facings, and guard.
const representatives=new Map();
for(const [id,item] of Object.entries(ITEMS))if(item.slot==='weapon')representatives.set(getGearVisualProfile(id,item).weaponType,id);
const handed=createCanvas(1280,representatives.size*160),hc=handed.getContext('2d');
hc.fillStyle='#263025';hc.fillRect(0,0,handed.width,handed.height);
let handRow=0;
for(const [type,id] of representatives){
 for(let cell=0;cell<8;cell++){
  const actor=actors[(cell>=4?4:0)+(cell%2?3:1)];
  actor.equipment.weapon=id;actor.x=80+(cell%8)*160;actor.y=handRow*160+112;
  actor.combatState.attacking=false;actor.isMoving=false;actor.actionState.blocking=cell%4>=2;
  const before=JSON.stringify(actor);drawHumanActor(hc,actor,{x:0,y:0},{scale:1.65,isPlayer:true});
  if(before!==JSON.stringify(actor))throw Error('Handedness review mutated actor');
 }
 hc.fillStyle='#e4d3b0';hc.font='14px sans-serif';hc.fillText(type,8,handRow*160+16);handRow++;
}
fs.writeFileSync(path.join(destination,'weapon-handedness-review.png'),handed.toBuffer('image/png'));
for(const actor of actors)actor.actionState.blocking=false;
const {drawHumanSprite}=await import('../src/spriteArt.js');
const {drawCodeGear}=await import('../src/codeAssets.js');
const {weaponBehindBody}=await import('../src/handedness.js');
for(const type of ['staff','bow']){
 const canvas=createCanvas(880,1120),c=canvas.getContext('2d');c.fillStyle='#263025';c.fillRect(0,0,880,1120);
 for(let row=0;row<8;row++)for(let phase=0;phase<4;phase++){
  const actor=actors[row],facing=['down','right','up','left'][row%4];actor.equipment.weapon=representatives.get(type);
  const pose=type==='staff'?{weaponType:type,state:'cast',castProgress:[0,.2,.5,.95][phase]}:{weaponType:type,state:'attack',attacking:true,phase:['anticipation','draw','release','recover'][phase],phaseProgress:phase===0?0:.5,attackProgress:phase===3?.95:.3};
  c.save();c.translate(100+phase*220,100+row*140);c.scale(1.8,1.8);
  const gear=()=>drawCodeGear(c,actor,{x:0,y:0},{local:true,facing,bob:0,animationPose:pose,layer:'weapon'});
  if(weaponBehindBody(facing))gear();
  drawHumanSprite(c,{...actor,facing,bob:0,animationPose:pose});
  if(!weaponBehindBody(facing))gear();c.restore();
 }
 fs.writeFileSync(path.join(destination,`handedness-${type}-actions.png`),canvas.toBuffer('image/png'));
}
for(const [type,set] of Object.entries(WEAPON_MOVESETS)){
 if(!usesMeleeRig({weaponType:type,state:'attack'}))continue;
 const weapon=Object.entries(ITEMS).find(([id,item])=>item.slot==='weapon'&&getGearVisualProfile(id,item).weaponType===type)?.[0];
 if(!weapon)throw Error(`No weapon for ${type}`);
 const canvas=createCanvas(1260,set.moves.length*480),c=canvas.getContext('2d');
 c.fillStyle='#263025';c.fillRect(0,0,canvas.width,canvas.height);
 for(const [m,attack] of set.moves.entries())for(let row=0;row<4;row++)for(let col=0;col<times.length;col++){
  const actor=actors[row];actor.equipment.weapon=weapon;actor.x=80+col*180;actor.y=100+m*480+row*112;
  Object.assign(actor.combatState,{attacking:true,attackMove:attack,attackElapsed:times[col]*attack.duration});
  drawHumanActor(c,actor,{x:0,y:0},{scale:1.45,isPlayer:true});
  if(row===0&&col===0){c.fillStyle='#e4d3b0';c.font='16px sans-serif';c.fillText(attack.id,16,m*480+18);}
 }
 fs.writeFileSync(path.join(destination,`melee-${type}-moves.png`),canvas.toBuffer('image/png'));
}
