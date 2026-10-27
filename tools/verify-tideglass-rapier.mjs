import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {asset,spriteArtStatus}=await import('../src/spriteArt.js');
const {createPlayer}=await import('../src/player.js');
const {ensureCombatState,WEAPON_MOVESETS}=await import('../src/combatMoves.js');
const {equipmentIconMarkup}=await import('../src/artIcons.js');
const {getGearVisualProfile}=await import('../src/gearVisualStyle.js');
const {ITEMS}=await import('../src/data.js');
const {drawSheathedWeapon}=await import('../src/sheathedWeaponArt.js');
const actor=createPlayer('Rapier review');ensureCombatState(actor);
Object.assign(actor,{x:100,y:140,skin:'#ffd1bd',hair:'#643a22',shirt:'#326e72',pants:'#394354'});
actor.equipment.weapon='tideglassRapier';
const c=createCanvas(800,1100),ctx=c.getContext('2d');drawHumanActor(ctx,actor,{x:0,y:0});
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
assert(asset('tideglass-rapier').ready);ctx.fillStyle='#27332e';ctx.fillRect(0,0,800,1100);
const original=ctx.drawImage.bind(ctx);let uses=0;
ctx.drawImage=(...args)=>{if(args[0]===asset('tideglass-rapier').image)uses++;return original(...args);};
for(const [body,bodyType] of ['male','female'].entries())for(let pose=0;pose<3;pose++)for(const [direction,[dirX,dirY]] of [[0,1],[1,0],[0,-1],[-1,0]].entries()){
 Object.assign(actor,{bodyType,hairStyle:bodyType==='female'?'ponytail':'short',dirX,dirY,x:100+direction*200,y:140+(body*3+pose)*180,isMoving:pose===1,walkTime:2});
 actor.combatState.attacking=pose===2;actor.combatState.attackMove=WEAPON_MOVESETS.sword.moves[0];actor.combatState.attackElapsed=actor.combatState.attackMove.duration*.45;
 const before=JSON.stringify(actor),previousUses=uses;drawHumanActor(ctx,actor,{x:0,y:0},{scale:2.1,animationTime:0});assert(uses>previousUses,'Held weapon must use the dedicated model');assert.equal(JSON.stringify(actor),before);
 ctx.fillStyle='#e1d5b6';ctx.font='13px sans-serif';ctx.fillText(`${bodyType} · ${['Idle','Walk','Attack'][pose]}`,actor.x-75,actor.y+60);
}
for(const facing of ['down','right','up','left']){const previousUses=uses;drawSheathedWeapon(ctx,actor,facing);assert(uses>previousUses,'Sheathed weapon must use the dedicated model');}
assert(equipmentIconMarkup(ITEMS.tideglassRapier,getGearVisualProfile('tideglassRapier',ITEMS.tideglassRapier)).includes('tideglass-rapier.png'));
fs.writeFileSync(new URL('../docs/visual-production/tideglass-rapier-review.png',import.meta.url),c.toBuffer('image/png'));
console.log('PASS: dedicated rapier art in 24 male/female direction/pose combinations, all sheathed directions, and inventory icon; actors unchanged.');
