import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {createPlayer} from '../src/player.js';
import {updateBasicAttackInput,updateWeaponCombat,getProjectiles} from '../src/combatMoves.js';
import {drawCombatProjectiles,drawAttackVisual,drawWorldEffects} from '../src/combatVisualsRenderer.js';
const {createCanvas}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
const ctx=createCanvas(800,800).getContext('2d');let samples=0;
// Image intentionally unavailable: the prism fallback that caused the crash
// must also render safely while assets load or fail.
for(const [dirX,dirY] of [[1,0],[-1,0],[0,1],[0,-1]])for(const automatic of [false,true]){
 const player=createPlayer('Lightbringer');Object.assign(player,{classId:'lightbringer',x:400,y:400,dirX,dirY});player.equipment.weapon='crackedDawnlens';
 const world={width:60,height:60,effects:[],enemies:[],combatEffects:[],tiles:Array.from({length:60},()=>Array.from({length:60},()=>({biome:'grass',passable:true})))};
 const aim={combatAimX:dirX,combatAimY:dirY};let elapsed=0;
 updateBasicAttackInput(player,world,{...aim,attackPressed:true,attackHeld:true},.016,elapsed);
 const frames=automatic?80:40;
 for(let i=0;i<frames&&!player.combatState.attacking;i++){elapsed+=.016;updateBasicAttackInput(player,world,{...aim,attackHeld:true},.016,elapsed);}
 if(!automatic)updateBasicAttackInput(player,world,{...aim,attackReleased:true,attackHeld:false},.016,elapsed);
 assert(player.combatState.attacking);assert(player.combatState.attackMove.universalHeavy);assert.equal(player.combatState.attackMove.projectileKind,'focusLance');
 let fired=false,drawn=false;const fill=ctx.fill.bind(ctx);ctx.fill=(...args)=>{drawn=true;return fill(...args);};
 for(let i=0;i<120;i++){
  elapsed+=.016;updateWeaponCombat(player,world,aim,.016,elapsed);fired ||=getProjectiles(player).some(p=>p.kind==='focusLance');
  drawCombatProjectiles(ctx,player,{x:0,y:0});drawAttackVisual(ctx,player,{x:0,y:0});drawWorldEffects(ctx,world,{x:0,y:0},'front');
 }
 ctx.fill=fill;assert(fired&&drawn);assert(!player.combatState.attacking);assert(!player.combatState.heavyChargeActive);samples++;
}
console.log(`PASS: ${samples} Lightbringer heavy attacks; manual and automatic release in four directions; prism projectile fallback renders through recovery.`);
