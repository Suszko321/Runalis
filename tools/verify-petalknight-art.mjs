import assert from 'node:assert/strict';
import fs from 'node:fs';
import {beginPetalSummonMotion,finishPetalSummonMotion,petalSummonPose,PETAL_SUMMON_ART} from '../src/petalknightSummonArt.js';
import {configureGardenSummon} from '../src/gardenRecovery.js';
const oldRecovery=await import('data:text/javascript;base64,'+fs.readFileSync('backups/petalknight-creatures-2026-10-13/src/gardenRecovery.js').toString('base64'));
const report={checks:[],stages:[]},test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
test('four independent production sheets have twelve source poses, one scale and a consistent pivot',()=>{
 for(const [stage,p] of Object.entries(PETAL_SUMMON_ART)){
  const m=JSON.parse(fs.readFileSync(`assets/art/sprites/${p.sheet}.json`,'utf8'));assert.equal(m.frames,12);assert.equal(m.cellWidth,p.width);assert.equal(m.cellHeight,p.height);assert.deepEqual(m.pivot,[p.width/2,p.height-6]);assert.equal(m.frameOrder.filter(x=>x.startsWith('walk')).length,6);assert(m.source.startsWith('assets/art/source/petalknight-'));assert(!m.source.includes('summons-core'));
  for(const [x,y,w,h] of m.spriteRects){assert(x>=2&&x+w<=p.width-2);assert(y>=2);assert.equal(y+h,p.height-6);}
  report.stages.push({stage,sheet:p.sheet,frames:12});
 }
});
test('all six travel poses advance with simulated distance, and redraws leave state untouched',()=>{
 for(const stage of Object.keys(PETAL_SUMMON_ART)){
  const s={kind:'thornbeast',summonMorph:'petalknight',evolutionStage:stage,x:0,y:0,dirX:1,dirY:0},frames=new Set();
  for(let i=0;i<120;i++){const b=beginPetalSummonMotion(s);s.x+=4;finishPetalSummonMotion(s,b,1/60);const pose=petalSummonPose(s);frames.add(pose.frame);for(let j=0;j<10;j++)assert.deepEqual(petalSummonPose(s),pose);}
  assert.deepEqual([...frames].sort((a,b)=>a-b),[2,3,4,5,6,7]);
  for(let i=0;i<10;i++)finishPetalSummonMotion(s,beginPetalSummonMotion(s),1/60);assert(!petalSummonPose(s).moving);assert(petalSummonPose(s).frame<2);
 }
});
test('attack is four authored poses, teleports do not race the gait, and vertical aim does not flip the creature',()=>{
 const s={kind:'thornbeast',summonMorph:'petalknight',evolutionStage:'elderThornbeast',x:0,y:0,dirX:1,dirY:0,attackCooldown:0},b=beginPetalSummonMotion(s);s.attackCooldown=1.5;finishPetalSummonMotion(s,b,.025);const frames=new Set();
 for(let i=0;i<12;i++){frames.add(petalSummonPose(s).frame);finishPetalSummonMotion(s,beginPetalSummonMotion(s),.025);}assert([8,9,10,11].every(f=>frames.has(f)));
 const old=petalSummonPose(s).phase,teleport=beginPetalSummonMotion(s);s.x+=2500;finishPetalSummonMotion(s,teleport,.025);assert.equal(petalSummonPose(s).phase,0);assert(!petalSummonPose(s).moving);
 for(let i=0;i<20;i++){s.dirX=i%2?.12:-.12;s.dirY=1;finishPetalSummonMotion(s,beginPetalSummonMotion(s),.025);assert.equal(petalSummonPose(s).facing,1);}
 s.dirX=-1;for(let i=0;i<5;i++)finishPetalSummonMotion(s,beginPetalSummonMotion(s),.025);assert.equal(petalSummonPose(s).facing,-1);
 const other={kind:'thornbeast',summonMorph:'fae'};assert.equal(beginPetalSummonMotion(other),null);
});
test('the visual rebuild preserves summon health, damage, armour, movement and attack statistics',()=>{
 for(const stage of Object.keys(PETAL_SUMMON_ART))for(const subclassId of ['petalknight']){
  const a={gardenSummon:true,subclassId},seed={evolutionStage:stage,displayName:stage,maxHp:200,hp:200,damage:37,armour:11,speed:210,attackRate:1.6,attackRange:44,radius:12},old=oldRecovery.configureGardenSummon({...seed},a),current=configureGardenSummon({...seed},a);
  for(const key of ['maxHp','hp','damage','armour','speed','attackRate','attackRange','radius'])assert.equal(current[key],old[key]);
 }
});
fs.writeFileSync('docs/garden-grave-morphs/petalknight-art-verification.json',JSON.stringify(report,null,2));
