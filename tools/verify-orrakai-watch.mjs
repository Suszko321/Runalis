import assert from 'node:assert/strict';
import {createCapitalHubWorld} from '../src/hubSystem.js';
import {createPlayer} from '../src/player.js';
import {ORRAKAI_WATCH_POSTS,ensureOrrakaiWatchPosts} from '../src/orrakaiLayout.js';
import {createDialogueState,openDialogue,chooseDialogueOption,closeDialogue,startQuest,npcHasQuestInteraction} from '../src/dialogueSystem.js';
import {getQuest} from '../src/worldContent.js';
import {isActorPositionPassable} from '../src/world.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
const world=createCapitalHubWorld(),count=world.objects.length;
ensureOrrakaiWatchPosts(world);ensureOrrakaiWatchPosts(world);assert.equal(world.objects.length,count);
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const occluders=[...world.buildings.map(b=>({x:b.x*32-12,y:b.y*32-66,w:b.w*32+24,h:b.h*32+8})),...[6,44].map(y=>({x:32*32,y:y*32-190,w:9*32,h:190}))];
for(const post of ORRAKAI_WATCH_POSTS){
 const guard=world.objects.find(o=>o.id===post.id);assert(guard);assert(guard.forceLabel&&!guard.hideLabel&&!guard.hideOnRadar);assert(guard.stationary&&!guard.ambientWander);assert(isActorPositionPassable(world,guard.x,guard.y,14));
 assert(!occluders.some(b=>overlaps({x:guard.x-18,y:guard.y-58,w:36,h:62},b)),`${post.name} overlaps a roof or gate`);
 const p=createPlayer('Watch report'),g={player:p,world,dialogue:createDialogueState(),canvas:{width:1280,height:800},camera:{x:0,y:0},log(){}};
 startQuest(p,'mercy_in_orrakai');const q=p.quests.active.mercy_in_orrakai,def=getQuest(q.id),i=def.stages.findIndex(s=>s.id==='aidPlagueTents');Object.assign(q,{stageIndex:i,currentStageId:def.stages[i].id,objectives:def.stages[i].objectives.map(o=>({...o,current:0}))});
 assert(npcHasQuestInteraction(p,guard));assert(openDialogue(g.dialogue,guard,p,world));let index=g.dialogue.options.findIndex(o=>o.id==='record'&&!o.disabled);assert(index>=0);assert(chooseDialogueOption(g.dialogue,p,world,index));closeDialogue(g.dialogue,{immediate:true});
 assert(p.story.flags.mercy.guardReportHeard);assert.equal(q.objectives.find(o=>o.npcId==='orrakaiLowerGateGuard').current,1);
 for(const other of world.objects.filter(o=>o.orrakaiWatch))assert(!npcHasQuestInteraction(p,other),'No stale report markers');
 const saved=JSON.parse(JSON.stringify(createSaveState(g)));assert(applySaveToGame(g,saved));assert.equal(g.world.objects.filter(o=>o.orrakaiWatch).length,ORRAKAI_WATCH_POSTS.length);assert(g.player.story.flags.mercy.guardReportHeard);
 console.log(`PASS ${post.name}: visible placement, labels, report, shared markers and save/load`);
}
const early=createPlayer('Early visitor'),dialogue=createDialogueState(),guard=world.objects.find(o=>o.orrakaiWatch);startQuest(early,'mercy_in_orrakai');assert(openDialogue(dialogue,guard,early,world));assert(!dialogue.options.some(o=>o.id==='record'&&!o.disabled));assert(!early.story.flags.mercy?.guardReportHeard);console.log('PASS early visits cannot consume the quest report');
