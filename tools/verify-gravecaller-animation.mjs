import assert from 'node:assert/strict';
import fs from 'node:fs';
import {beginGravecallerMotion,finishGravecallerMotion,gravecallerMotionPose} from '../src/gravecallerSummonMotion.js';
import {createPlayer,chooseClass} from '../src/player.js';
import {configureLichSummon,configureBoundDeadSummon} from '../src/lichSummonSystem.js';
import {updateSummons} from '../src/combat.js';
const checks=[];
function test(name, fn){fn();checks.push(name);console.log('PASS '+name);}
const pet=(kind='lich',morph='base')=>({id:'animation-pet',kind,summonMorph:morph,x:500,y:400,dirX:1,dirY:0,hp:1000,maxHp:1000,armour:0,alive:true,speed:160,damage:5,attackRange:42,attackRate:1});
function travel(s,dx,dy,dt=1/60){const before=beginGravecallerMotion(s);s.x+=dx;s.y+=dy;finishGravecallerMotion(s,before,dt);return gravecallerMotionPose(s);}
test('Equal travel produces equal gait at 30, 60 and 120 updates per second',()=>{
 const poses=[30,60,120].map(hz=>{const s=pet();for(let i=0;i<hz;i++)travel(s,160/hz,0,1/hz);return gravecallerMotionPose(s);});
 for(const pose of poses){assert.ok(Math.abs(pose.phase-poses[0].phase)<1e-10);assert.equal(pose.frame,poses[0].frame);}
});
test('A full stride includes both walking poses and planted foot contacts',()=>{
 const s=pet(),frames=[];for(let i=0;i<88;i++)frames.push(travel(s,1,0).frame);
 assert.deepEqual([...new Set(frames)].sort(),[0,1,2]);assert.equal(frames.filter((f,i)=>i&&f!==frames[i-1]).length,4);
});
test('Stationary, collision-blocked and tiny settling corrections do not walk in place',()=>{
 const s=pet();s.moving=true;for(let i=0;i<120;i++){const pose=travel(s,i%2?.04:-.04,0);assert.equal(pose.frame,0);assert.equal(pose.moving,false);}
});
test('Stopping settles to planted feet, then resumes from contact',()=>{
 const s=pet();for(let i=0;i<20;i++)travel(s,3,0);for(let i=0;i<10;i++)travel(s,0,0);
 assert.equal(gravecallerMotionPose(s).frame,0);assert.equal(travel(s,1,0).frame,0);
});
test('Vertical movement and momentary horizontal noise cannot flicker facing',()=>{
 const s=pet();for(let i=0;i<60;i++){s.dirX=i%2?-.04:.04;s.dirY=1;assert.equal(travel(s,0,3).facing,1);}
 s.dirX=-1;s.dirY=0;for(let i=0;i<6;i++)travel(s,-3,0);assert.equal(gravecallerMotionPose(s).facing,-1);
});
test('Greater specters glide while their lesser melee forms keep foot contacts',()=>{
 const greater=pet('greaterLich','acolyte'),lesser=pet('lich','acolyte'),a=new Set(),b=new Set();
 for(let i=0;i<112;i++){a.add(travel(greater,1,0).frame);b.add(travel(lesser,1,0).frame);}
 assert.deepEqual([...a].sort(),[1,2]);assert.deepEqual([...b].sort(),[0,1,2]);
});
test('Rendering and pausing do not advance gait, floating bob or attack recovery',()=>{
 const s=pet('greaterLich','acolyte');travel(s,8,0);const before=beginGravecallerMotion(s);s.attackCooldown=1;finishGravecallerMotion(s,before,1/60);
 const pose=gravecallerMotionPose(s);assert.equal(pose.frame,3);for(let i=0;i<1000;i++)assert.deepEqual(gravecallerMotionPose(s),pose);
 for(let i=0;i<15;i++)travel(s,0,0);assert.equal(gravecallerMotionPose(s).frame,0);
});
test('Recall teleports never fast-forward the stride',()=>{
 const s=pet();beginGravecallerMotion(s);const pose=travel(s,900,0);assert.equal(pose.phase,0);assert.equal(pose.frame,0);
});
test('Dash-speed catch-up caps the gait instead of producing frantic shuffling',()=>{
 for(const kind of ['lich','greaterLich']){
  const s=pet(kind),max=kind==='lich'?3.2:2.6;
  const pose=travel(s,20,0);assert.ok(Math.abs(pose.phase-max/60)<1e-10);
 }
});
test('Every greater and bound morph receives animation from real following movement',()=>{
 for(const kind of ['lich','greaterLich'])for(const morph of ['base','acolyte','deathknight']){
  const p=createPlayer('Animation review');chooseClass(p,'gravecaller');p.x=850;p.y=400;p.dirX=1;p.dirY=0;
  const s=pet(kind,morph);(kind==='lich'?configureBoundDeadSummon:configureLichSummon)(s,{subclassId:morph});p.summons=[s];
  const w={mode:'dungeon',width:50,height:30,tiles:Array.from({length:30},()=>Array.from({length:50},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]};
  const frames=new Set();for(let i=0;i<75;i++){updateSummons(1/60,p,w,()=>{},i/60);frames.add(gravecallerMotionPose(s).frame);}
  assert.ok(frames.has(1)&&frames.has(2),`${kind} ${morph}: ${[...frames]}`);
  for(let i=0;i<240;i++)updateSummons(1/60,p,w,()=>{},2+i/60);
  assert.equal(gravecallerMotionPose(s).moving,false,kind+' '+morph);
 }
});
fs.mkdirSync('docs/gravecaller-animation',{recursive:true});
fs.writeFileSync('docs/gravecaller-animation/verification.json',JSON.stringify({pass:true,checks},null,2)+'\n');
console.log('Gravecaller animation: '+checks.length+' checks passed.');
