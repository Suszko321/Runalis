import assert from 'node:assert/strict';
import {createPlayer} from '../src/player.js';
import {createDialogueState,openDialogue,closeDialogue} from '../src/dialogueSystem.js';
import {createBlightedGrove,beginBlightedGrove,updateBlightedGrove} from '../src/blightedGrove.js';
import {createDungeonWorld} from '../src/dungeonSystem.js';
import {beginOrchardDungeon,updateOrchardDungeon} from '../src/ashenOrchardDungeon.js';
import {updateVeyreign,handleVeyreignInteraction} from '../src/veyreignDungeon.js';
import {updateVeyreignCombat} from '../src/veyreignCombat.js';
import {updateDungeonArena} from '../src/dungeonArenaSystem.js';
import {answerPartyEntry} from '../src/partyEntrySystem.js';
import {beginMalakarArrival} from '../src/malakarEncounter.js';
const fixture=world=>({world,player:Object.assign(createPlayer('Explorer'),world.spawn),dialogue:createDialogueState(),canvas:{width:1280,height:800},camera:{x:0,y:0},log(){}});
for(const type of ['grove','orchard']){
 const g=fixture(type==='grove'?createBlightedGrove():createDungeonWorld({dungeonId:'ashenOrchard',floor:1}));
 (type==='grove'?beginBlightedGrove:beginOrchardDungeon)(g);
 for(let i=0;i<5;i++)(type==='grove'?updateBlightedGrove:updateOrchardDungeon)(g);
 assert(!g.dialogue.active,'Entry and idle exploration do not start dialogue');
 const npc=g.world.objects.find(o=>type==='grove'?o.groveSkull:o.npcId==='orchardTamsin');assert(npc);
 assert(openDialogue(g.dialogue,npc,g.player,g.world));assert(g.dialogue.active);
 console.log('PASS '+type+': quiet arrival, physical quest giver opens dialogue');
}
for(let floor=1;floor<5;floor++){
 const g=fixture(createDungeonWorld({dungeonId:'castleVeyr',floor}));for(let i=0;i<5;i++)updateVeyreign(g);
 assert(!g.dialogue.active);const echoes=g.world.objects.filter(o=>o.veyreignChapter===floor);assert.equal(echoes.length,1);
 assert(handleVeyreignInteraction(g,echoes[0]));assert(g.dialogue.active);assert(g.world.dungeonState.veyreign.seen[floor]);
 closeDialogue(g.dialogue,{immediate:true});g.world.dungeonState.veyreign.firstVisit=false;updateVeyreign(g);assert(!g.world.objects.some(o=>o.veyreignChapter),'Repeat floors remove old story actors');
 console.log('PASS Veyreign floor '+floor+': persistent visible echo, explicit interaction');
}
{
 const g=fixture(createDungeonWorld({dungeonId:'castleVeyr',floor:5})),w=g.world,p=g.player;
 const ally=Object.assign(createPlayer('Second player'),w.spawn,{active:true,joined:true});p.coop={players:[ally]};
 updateVeyreign(g);assert(!g.dialogue.active);assert(!w.dungeonState.veyreign.seen[5]);
 const outside={...p},inside={x:w.bossArena.x+100,y:w.bossArena.y+100};Object.assign(p,inside);
 updateDungeonArena(w,p,g);assert(g.partyEntryReady);updateVeyreign(g);assert(!g.dialogue.active);
 answerPartyEntry(g,p,true);updateVeyreign(g);assert(!g.dialogue.active);answerPartyEntry(g,ally,false);assert.equal(w.bossArena.phase,'dormant');
 Object.assign(p,{x:outside.x,y:outside.y});updateDungeonArena(w,p,g);Object.assign(p,inside);updateDungeonArena(w,p,g);
 answerPartyEntry(g,p,true);answerPartyEntry(g,ally,true);assert.equal(w.bossArena.phase,'active');assert(w.arenaBarriers.length);
 updateVeyreign(g);assert(g.dialogue.active);assert.equal(g.dialogue.speakerId,'veyreignChapter5');
 const boss=w.enemies.find(e=>e.veyreignLord);updateVeyreignCombat(boss,w,p,2,10,g);assert(!boss.veyreignAttack,'Boss waits for introduction');
 closeDialogue(g.dialogue,{immediate:true});updateVeyreign(g);assert(!g.dialogue.active,'Introduction plays once');
 w.dungeonState.veyreign.firstVisit=false;w.dungeonState.veyreign.seen={};updateVeyreign(g);assert(!g.dialogue.active,'Repeat boss remains silent');
 console.log('PASS Veyreign boss: unanimous acceptance, sealed arena, then introduction; no attacks during dialogue or repeat intros');
}
{
 const g=fixture(createDungeonWorld({dungeonId:'demonCultLair',floor:4,depth:3,tier:5,theme:'demon'}));g.world.totalFloors=g.world.floor;
 beginMalakarArrival(g);assert(g.world.arenaBarriers.length,'Malakar seals before the ritual or introduction');assert(g.world.dungeonState.malakar.sealed);
 console.log('PASS Malakar locks arena before cinematic');
}
