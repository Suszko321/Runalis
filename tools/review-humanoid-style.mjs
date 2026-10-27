import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {spriteArtStatus}=await import('../src/spriteArt.js');
const {enemyOutfitFor}=await import('../src/enemyEquipmentData.js');
const {ensureCombatState,WEAPON_MOVESETS}=await import('../src/combatMoves.js');
const cases=[['Base player',{}],['Leather',{chest:'leatherVest',legs:'leatherLeggings'}],['Steel',{chest:'knightChest',legs:'ironGreaves',helm:'knightHelm'}],['Robe',{chest:'necromancerRobe',legs:'graveclothGreaves',helm:'necromancerHood'}],...['lastDawn','covenant','roadless','graveCult','watcher','veyr','emberVeil'].flatMap(f=>['knight','caster','archer'].map(role=>[`${f} ${role}`,enemyOutfitFor({faction:f,role,variant:0})]))];
const root='docs/humanoid-art-style';fs.mkdirSync(root,{recursive:true});
const suffix=process.argv[2]||'after',cols=4,cellW=190,cellH=145;
const sheet=createCanvas(cols*cellW,cases.length*cellH),ctx=sheet.getContext('2d');
const make=(equipment,bodyType='male')=>{const p={x:95,y:105,hp:100,bodyType,hairStyle:bodyType==='female'?'ponytail':'short',skin:'#e5b18a',hair:'#3b2923',shirt:'#9b7042',pants:'#4c5058',boots:'#78512f',dirX:0,dirY:1,equipment,actionState:{},walkTime:.01,isMoving:false};ensureCombatState(p);return p;};
drawHumanActor(ctx,make(cases[0][1]),{x:0,y:0});
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
Object.defineProperty(globalThis,'performance',{value:{now:()=>5000},configurable:true});
ctx.fillStyle='#354032';ctx.fillRect(0,0,sheet.width,sheet.height);ctx.imageSmoothingEnabled=false;
const hashes=[];
for(const [row,[name,equipment]] of cases.entries())for(const [col,[dirX,dirY]] of [[0,1],[1,0],[0,-1],[-1,0]].entries()){
 const actor=make(equipment);actor.x=col*cellW+95;actor.y=row*cellH+112;actor.dirX=dirX;actor.dirY=dirY;
 const before=JSON.stringify(actor);drawHumanActor(ctx,actor,{x:0,y:0},{scale:1.7,animationTime:0});assert.equal(JSON.stringify(actor),before);
 ctx.fillStyle='#e4d5b4';ctx.font='12px sans-serif';ctx.fillText(name,col*cellW+8,row*cellH+17);
}
fs.writeFileSync(`${root}/${suffix}-all.png`,sheet.toBuffer('image/png'));
const preview=createCanvas(760,870),pc=preview.getContext('2d');for(const [i,row] of [0,1,4,5,7,8].entries())pc.drawImage(sheet,0,row*cellH,760,cellH,0,i*cellH,760,cellH);
fs.writeFileSync(`${root}/${suffix}-preview.png`,preview.toBuffer('image/png'));
const motion=createCanvas(950,8*145),mc=motion.getContext('2d');mc.fillStyle='#354032';mc.fillRect(0,0,motion.width,motion.height);
for(const [row,[name,equipment,bodyType]] of [cases[0],cases[1],cases[4],cases[7]].flatMap(c=>['male','female'].map(b=>[...c,b])).entries())for(let col=0;col<5;col++){
 const actor=make(equipment,bodyType);actor.x=95+col*190;actor.y=112+row*145;actor.dirX=1;actor.dirY=0;actor.isMoving=col>0&&col<4;actor.walkTime=(col-1)*2+.01;
 if(col===4){actor.combatState.attacking=true;actor.combatState.attackMove=WEAPON_MOVESETS.sword.moves[0];actor.combatState.attackElapsed=actor.combatState.attackMove.duration*.5;}
 drawHumanActor(mc,actor,{x:0,y:0},{scale:1.7,animationTime:0});mc.fillStyle='#e4d5b4';mc.font='12px sans-serif';mc.fillText(`${name} / ${actor.bodyType}`,col*190+8,row*145+17);
}
fs.writeFileSync(`${root}/${suffix}-movement.png`,motion.toBuffer('image/png'));
// The unarmoured reference must remain identical after equipment changes.
for(const bodyType of ['male','female'])for(const [dirX,dirY] of [[0,1],[1,0],[0,-1],[-1,0]])for(const moving of [false,true]){
 const c=createCanvas(150,150),p=make({},bodyType);Object.assign(p,{x:75,y:110,dirX,dirY,isMoving:moving,walkTime:.37});drawHumanActor(c.getContext('2d'),p,{x:0,y:0},{animationTime:0});
 let h=2166136261;for(const v of c.getContext('2d').getImageData(0,0,150,150).data)h=Math.imul(h^v,16777619)>>>0;hashes.push(h);
}
fs.writeFileSync(`${root}/${suffix}-base-hashes.json`,JSON.stringify(hashes));
if(suffix!=='before')assert.deepEqual(hashes,JSON.parse(fs.readFileSync(`${root}/before-base-hashes.json`)),'Base player changed');
console.log(JSON.stringify({cases:cases.length,facings:4,baseRenders:hashes.length,baseUnchanged:suffix!=='before',output:`${root}/${suffix}-preview.png`}));
