import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{createCanvas,Image:CanvasImage}=require(process.env.RUNALIS_CANVAS_MODULE||'@napi-rs/canvas');
globalThis.document={createElement(){return createCanvas(1,1);}};
globalThis.Image=class extends CanvasImage{set src(value){super.src=fs.readFileSync(fileURLToPath(value));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {drawWorldEffects}=await import('../src/combatVisualsRenderer.js');
const {spriteArtStatus}=await import('../src/spriteArt.js');
const {GROUND_EFFECT_ROWS}=await import('../src/persistentGroundArt.js');
const {cloakClothOffset}=await import('../src/creatorAccessoryArt.js');
const {createPlayer}=await import('../src/player.js');
const canvas=createCanvas(900,760),ctx=canvas.getContext('2d');
const actor=createPlayer('Facial hair review');Object.assign(actor,{hair:'#714122',skin:'#eeb883',shirt:'#75502d',pants:'#484347',boots:'#654326',hairStyle:'short',isMoving:false});actor.equipment={};
drawHumanActor(ctx,actor,{x:0,y:0});
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,20));
assert.equal(spriteArtStatus().filter(a=>a.failed).length,0);
ctx.fillStyle='#263025';ctx.fillRect(0,0,900,760);
for(const [row,facialHair] of ['none','stubble','shortBeard','fullBeard'].entries())for(const [col,[dirX,dirY]] of [[0,1],[1,0],[-1,0]].entries()){
 Object.assign(actor,{x:150+col*300,y:120+row*180,facialHair,dirX,dirY});
 drawHumanActor(ctx,actor,{x:0,y:0},{scale:2,isPlayer:true});
 ctx.fillStyle='#e4d3b0';ctx.font='16px sans-serif';ctx.fillText(facialHair,actor.x-50,actor.y+58);
}
const dest=fileURLToPath(new URL('../docs/visual-production/',import.meta.url));
fs.writeFileSync(dest+'facial-hair-review.png',canvas.toBuffer('image/png'));
const effects=createCanvas(1000,800),c=effects.getContext('2d');c.fillStyle='#263025';c.fillRect(0,0,1000,800);
for(const [row,kind] of ['oathkeeperConsecratedGround','thornbinderBramblePatch','cursedGround','wellspring'].entries())for(let col=0;col<4;col++){
 const fx={kind,x:125+col*250,y:105+row*195,radius:82,age:col/7,ttl:4,layer:row===1?'ground':'front'},world={effects:[fx]};
 const before=JSON.stringify(world);drawWorldEffects(c,world,{x:0,y:0},'behind');assert.equal(JSON.stringify(world),before);
 const pixels=c.getImageData(fx.x-50,fx.y-50,100,100).data;
 assert.ok(pixels.some((v,i)=>i%4===0&&v!==38),`${kind} not rendered on ground`);
 const snapshot=effects.toBuffer('image/png');drawWorldEffects(c,world,{x:0,y:0},'front');assert.deepEqual(effects.toBuffer('image/png'),snapshot,`${kind} rendered twice`);
}
assert.equal(Object.keys(GROUND_EFFECT_ROWS).length,5);
fs.writeFileSync(dest+'persistent-ground-review.png',effects.toBuffer('image/png'));
const cloaks=createCanvas(960,660),cc=cloaks.getContext('2d');cc.fillStyle='#263025';cc.fillRect(0,0,960,660);
for(const [row,cloak] of ['shortCape','shoulderMantle','travelCloak'].entries())for(let col=0;col<4;col++){
 Object.assign(actor,{x:120+col*240,y:150+row*210,dirX:0,dirY:-1,cloak,isMoving:true,walkTime:col/.72});actor.actionState={sprinting:true};
 drawHumanActor(cc,actor,{x:0,y:0},{scale:2,isPlayer:true});
}
for(let i=0;i<=400;i++){
 const pose={state:'run',gaitPhase:i/100,cloakSway:3};
 assert.equal(cloakClothOffset(pose,0),0);assert.equal(cloakClothOffset(pose,.24),0);assert.ok(Math.abs(cloakClothOffset(pose,1))<=4);
}
assert.ok(Math.abs(cloakClothOffset({state:'run',gaitPhase:0},1)-cloakClothOffset({state:'run',gaitPhase:4},1))<1e-9);
fs.writeFileSync(dest+'cloak-cloth-review.png',cloaks.toBuffer('image/png'));
console.log('Passed production rendering: 12 facial hair views; 16 ground-effect frames; behind-layer visibility, no front-layer duplicates, and unchanged effect data.');
