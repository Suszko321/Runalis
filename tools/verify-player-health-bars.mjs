import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {createCanvas}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1),addEventListener(){},querySelector(){return null;},body:{classList:{contains(){return false;}}}};
const {draw}=await import('../src/render.js');
const {createPlayer}=await import('../src/player.js');
const {createWorld}=await import('../src/world.js');
const world=createWorld({skipPublishedOverride:true});
const p=createPlayer('Viewer');
Object.assign(p,{x:world.spawn.x,y:world.spawn.y,hp:50,maxHp:100});
const canvas=createCanvas(960,600),ctx=canvas.getContext('2d');
const camera={x:p.x-480,y:p.y-300};
const bars=[],fillRect=ctx.fillRect.bind(ctx);
ctx.fillRect=(x,y,w,h)=>{
 if(w===38 && h===7)bars.push({x,y});
 fillRect(x,y,w,h);
};
function render(allies,options={}) {
 p.coop={players:allies};
 bars.length=0;
 draw(ctx,world,p,camera,options);
 return bars.length;
}
function ally(name,slot,remote,hp=50) {
 return Object.assign(createPlayer(name),{x:p.x+slot*45,y:p.y,hp,maxHp:100,slot,playerNumber:slot,networkRemote:remote,active:true});
}
const local=ally('Local',2,false),remote=ally('Remote',3,true);
assert.equal(render([]),0,'injured solo player');
assert.equal(render([local]),0,'local co-op');
assert.equal(render([local],{hideHud:true,viewport:{x:0,y:0,width:480,height:300}}),0,'split-screen viewport');
assert.equal(render([remote]),1,'host sees injured online guest');
remote.hp=100;assert.equal(render([remote]),0,'full remote health');
remote.hp=99;assert.equal(render([remote]),1,'below full remote health');
remote.hp=0;assert.equal(render([remote]),0,'downed remote player');
remote.hp=50;remote.active=false;assert.equal(render([remote]),0,'inactive remote player');
remote.active=true;remote.networkId='host';assert.equal(render([remote]),1,'guest sees injured online host');
const remote2=ally('Remote two',4,true,25);
assert.equal(render([local,remote,remote2]),2,'local ally excluded while online peers show bars');
p.networkRemote=true;assert.equal(render([]),0,'viewer never draws own overhead bar');
console.log('PASS solo, local co-op, split-screen, online host/guest, injured/full/downed peers and local viewer health bars.');
