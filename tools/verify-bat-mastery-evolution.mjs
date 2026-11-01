import assert from 'node:assert/strict';
import {createPlayer,chooseClass} from '../src/player.js';
import {applyBloodline} from '../src/bloodlineSystem.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {batBeastEvolution,BAT_BEAST_EVOLUTIONS} from '../src/batBeastEvolution.js';
import {useAbility,updateSummons} from '../src/combat.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {sanitizeForSave} from '../src/gameSave.js';
const world=()=>({mode:'dungeon',width:32,height:24,tiles:Array.from({length:24},()=>Array.from({length:32},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
const now=performance.now()/1000;
function actor(level){const p=createPlayer('Mastery '+level);chooseClass(p,'gravecaller');applyBloodline(p,'vampire');unlockActiveAbility(p,'callBatBeast',{autoAssignEmpty:false});getAbilityMastery(p,'callBatBeast',true).level=level;Object.assign(p,{x:320,y:320,dirX:1,dirY:0});return p;}
for(const [level,id]of [[1,'fledgling'],[4,'fledgling'],[5,'bloodwing'],[9,'bloodwing'],[10,'elder'],[19,'elder'],[20,'royal'],[49,'royal'],[50,'ancient'],[1000,'ancient']])assert.equal(batBeastEvolution(level).id,id);
assert.equal(batBeastEvolution(NaN).id,'fledgling');
const p=actor(1),w=world();assert(useAbility('callBatBeast',p,w,()=>{},now));const summon=p.summons[0],identity=summon.id,health=[summon.hp,summon.maxHp];
for(const stage of BAT_BEAST_EVOLUTIONS){getAbilityMastery(p,'callBatBeast',true).level=stage.mastery;updateSummons(0,p,w,()=>{},now+.1);assert.equal(summon.vampireEvolution,stage.id);assert.equal(summon.vampireMastery,stage.mastery);assert(summon.displayName.startsWith(stage.name));assert.equal(summon.id,identity);assert.deepEqual([summon.hp,summon.maxHp],health);}
console.log('PASS mastery boundaries, bounded final size and live evolution without healing/replacement');
const party=[1,10,20,50].map(actor),partyWorld=world();party.forEach((owner,i)=>{owner.id='owner'+i;owner.slot=i+1;assert(useAbility('callBatBeast',owner,partyWorld,()=>{},now));assert.equal(owner.summons[0].vampireEvolution,batBeastEvolution([1,10,20,50][i]).id);});
party[0].coop={players:party.slice(1)};updateSummons(0,party[3],partyWorld,()=>{},now+.1);assert.equal(party[0].summons[0].vampireEvolution,'fledgling');
const loaded=normalizeProfileSave(sanitizeForSave(p));assert.equal(getAbilityMastery(loaded,'callBatBeast').level,50);loaded.cooldowns={};assert(useAbility('callBatBeast',loaded,world(),()=>{},now+100));assert.equal(loaded.summons[0].vampireEvolution,'ancient');
console.log('PASS all four owners evolve independently; mastery evolution survives save/load and recast');
