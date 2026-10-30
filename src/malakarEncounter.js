// The Act I encounter owns staging and consent; combat owns all damage geometry.
import {TILE} from './data.js';
import {playSfx} from './audioSystem.js';
import {cancelEnemyAttackPresentation} from './enemyAttackPresentation.js';
import {requestPartyEntry,answerPartyEntry,partyEntryPending} from './partyEntrySystem.js';
export const MALAKAR_HEALTH_MULTIPLIER=3;
export const isMalakarDungeon=w=>/^(demonCultLair|dawnspireRoot|emberveil)$/i.test(w?.dungeonId||'');
export const isMalakarSanctum=w=>isMalakarDungeon(w)&&w.floor===w.totalFloors;
export const malakarReturnAllowed=w=>isMalakarSanctum(w)&&w.dungeonState?.cleared&&w.dungeonState?.malakar?.mode==='victory'&&
 !(w.enemies||[]).some(e=>(e.malakarSolo||e.isDungeonMainBoss)&&!e.dead&&!e.remove&&e.alive!==false&&e.hp>0);
export const encounterState=w=>w?.dungeonState?.malakar;
export const partyMembers=p=>[p,...(p?.coop?.players||[]).filter(a=>a.active!==false&&a.joined!==false)];
export function strengthenMalakar(b){
 if(!b||b.malakarHealthVersion===1)return b;
 b.malakarPreviousMaxHp=b.maxHp;b.maxHp*=MALAKAR_HEALTH_MULTIPLIER;b.hp*=MALAKAR_HEALTH_MULTIPLIER;b.malakarHealthVersion=1;b.malakarSolo=true;
 return b;
}
const obj=(id,kind,x,y,extra={})=>({id,kind,x:x*TILE,y:y*TILE,r:20,...extra});
export function installMalakarSanctum(w){
 if(!isMalakarSanctum(w)||w.malakarInstalled)return;
 const boss=w.enemies.find(e=>e.isDungeonMainBoss);if(!boss)return;
 w.malakarInstalled=true;strengthenMalakar(boss);
 const s=w.dungeonState.malakar ||= {mode:'arrival',elapsed:0,phase:1,seenIntro:false};
 if(!boss.dead&&!boss.remove&&boss.alive!==false&&boss.hp>0){
  if(w.dungeonState.cleared||s.mode==='victory'){w.dungeonState.cleared=false;w.dungeonState.finalBossDefeated=false;s.mode='arrival';s.sealed=false;}
 }else if(s.mode!=='dying')s.mode='victory';
 if(s.mode==='active'){s.grace=2;s.attack=null;s.queue=[];cancelEnemyAttackPresentation(boss);}
 w.width=40;w.height=36;
 w.tiles=Array.from({length:36},(_,y)=>Array.from({length:40},(_,x)=>({biome:x>=4&&x<36&&y>=5&&y<32?'stone':'wall',passable:x>=4&&x<36&&y>=5&&y<32})));
 w.spawn={x:20*TILE,y:29*TILE};w.bossRoomCenter={x:20*TILE,y:14*TILE};
 w.rooms=[{id:'royalSanctum',role:'boss',x:4,y:5,w:32,h:27,cx:20,cy:18}];w.halls=[];w.encounterBarriers=[];
 w.enemies=[boss];boss.malakarSolo=true;boss.arenaDormant=s.mode!=='active';boss.name=boss.bossName='Malakar, Sovereign of the Broken Seal';
 if(s.mode==='arrival'||s.mode==='ritual'||s.mode==='introduction'){boss.x=20*TILE;boss.y=14*TILE;}
 boss.homeX=20*TILE;boss.homeY=14*TILE;
 w.objects=[obj('malakarReturnStair','dungeonStairs',20,30,{direction:'up',targetFloor:w.floor-1,arrivalRole:'fromDownstairs',name:'Return to the Sanctum Approach',locked:!['arrival','victory'].includes(s.mode)}),
 obj('malakarRelic','poiInvestigation',20,11,{name:'Recovered Caravan Reliquary',poiId:'malakarRelic',clueId:'recoveredReliquary',message:'The sealed caravan relic lies cracked beside the royal altar. The binding has failed; its surviving cradle and Last Dawn inscriptions are evidence for Mael. The stair at the south end is open.',reviewMessage:'The reliquary is secured. Return to Mael and Mara in Orrakai.',storyFlags:['act1.relicSecured'],interactable:s.mode==='victory',hideLabel:s.mode!=='victory'})];
 const stations=[[12,14],[28,14],[12,22],[28,22]];
 if(['arrival','ritual'].includes(s.mode))for(let i=0;i<4;i++)w.objects.push(obj('malakarCelebrant'+i,'npc',...stations[i],{npcId:'lastDawnCelebrant'+i,name:['First Cantor','Seal-Keeper','Ash Marshal','Last Cantor'][i],factionId:'lastDawn',shirt:'#5e2832',equipment:{weapon:null,helm:'clothHood',chest:'patchedTunic'},interactable:false,hideLabel:true,stationary:true}));
 w.dungeonState.activeEvents={};w.effects=[];w.combatEffects=[];w.arenaBarriers=[];
 if(s.sealed&&!['arrival','victory'].includes(s.mode))seal(w);
}
export function dressMalakarApproach(w){
 if(!isMalakarDungeon(w)||w.floor!==w.totalFloors-1)return;
 const stair=w.objects.find(o=>o.kind==='dungeonStairs'&&o.direction==='down');if(!stair)return;
 stair.name='Descend into the Ritual Sanctum';stair.malakarEntrance=true;stair.talk='Chanting carries through the sealed stair. The stolen reliquary is being opened below. Prepare before entering; the whole party must agree.';
 for(const [i,dx]of [-2,2].entries())if(!w.objects.some(o=>o.id==='malakarApproach'+i))w.objects.push(obj('malakarApproach'+i,'townProp',stair.x/TILE+dx,stair.y/TILE,{propType:'purificationBrazier',decorative:true,interactable:false,hideLabel:true}));
}
export function requestMalakarEntry(game,stairs,commit,initiator=game.player){
 if(game.malakarReady||partyEntryPending(game))return false;
 if(partyMembers(game.player).some(p=>p.hp<=0)){game.log?.('Revive the fallen party members before committing to the sanctum.');return false;}
 if((game.world.enemies||[]).some(e=>e.hp>0&&!e.dead&&Math.hypot(e.x-stairs.x,e.y-stairs.y)<420)){game.log?.('Clear the immediate approach before gathering the party.');return false;}
 game.malakarReady={stairs,commit,initiator:partyMembers(game.player).indexOf(initiator)+1,answers:new Set()};
 requestPartyEntry(game,{key:'malakar-sanctum',title:'the Ritual Sanctum',kind:'boss',initiator,force:true,
  commit:()=>{game.malakarReady=null;removePanel();commit();beginMalakarArrival(game);},
  onCancel:()=>{game.malakarReady=null;removePanel();}});return false;
}
export function answerMalakarReady(game,index,yes){
 return answerPartyEntry(game,partyMembers(game.player)[index],yes);
}
export function beginMalakarArrival(game){
 const w=game.world;if(!isMalakarSanctum(w))return;installMalakarSanctum(w);
 const s=encounterState(w);if(s.mode==='victory')return;
 s.mode=s.seenIntro?'introduction':'ritual';s.elapsed=0;s.phase=1;s.grace=2;s.attack=null;s.queue=[];
 for(const [i,p]of partyMembers(game.player).entries()){p.x=(18.5+i)*TILE;p.y=28*TILE;p.dirX=0;p.dirY=-1;p.summons=[];}
 seal(w);s.sealed=true;
 w.bossArena&&(w.bossArena.phase='dormant');showEncounterPanel(game);
}
export function chooseMalakarIntroduction(game,choice){
 const s=encounterState(game.world);if(!s||s.mode!=='introduction')return;
 s.answer=choice;s.reply={defy:'You stopped their wagons and broke their road cells. Good. Stand by what you have done.',ritual:'They offered their lives knowingly. They mistook a price paid for a debt owed.',relic:'A key cut to fit a prison. Your caravan carried it; their hands turned it. Now it is broken.'}[choice]||'Then let your actions answer.';
 s.mode='handoff';s.elapsed=0;showEncounterPanel(game);playSfx('bossRoar',{volume:.5});
}
export function skipMalakarRitual(game){const s=encounterState(game.world);if(!s||s.mode!=='ritual')return;s.elapsed=18;finishRitual(game);}
function finishRitual(game){const w=game.world,s=encounterState(w);seal(w);s.sealed=true;s.seenIntro=true;s.mode='introduction';s.elapsed=0;w.objects=w.objects.filter(o=>!o.id.startsWith('malakarCelebrant'));showEncounterPanel(game);}
function seal(w){const x=4*TILE,y=5*TILE,width=32*TILE,height=27*TILE;w.arenaBarriers=[{x,y,w:width,h:8},{x,y:y+height-8,w:width,h:8},{x,y,w:8,h:height},{x:x+width-8,y,w:8,h:height}];const stair=w.objects.find(o=>o.id==='malakarReturnStair');if(stair){stair.locked=true;stair.hideLabel=true;}}
export function malakarControlsLocked(game){const s=encounterState(game?.world);return !!game?.malakarReady||['ritual','introduction','handoff','dying'].includes(s?.mode);}
export function handleMalakarKeyboard(game,event){
 if(!malakarControlsLocked(game))return false;
 event.preventDefault();if(event.repeat)return true;
 const key=event.key.toLowerCase(),s=encounterState(game.world);
 if(game.malakarReady){if(key==='escape')answerMalakarReady(game,0,false);else if(key==='enter')answerMalakarReady(game,0,true);}
 else if(s?.mode==='ritual'&&key==='escape')skipMalakarRitual(game);
 else if(s?.mode==='introduction'){
  if(['arrowleft','arrowup','a','w'].includes(key))s.choice=((s.choice||0)+2)%3;
  if(['arrowright','arrowdown','d','s'].includes(key))s.choice=((s.choice||0)+1)%3;
  if(key==='enter')chooseMalakarIntroduction(game,['defy','ritual','relic'][s.choice||0]);
  showEncounterPanel(game);
 }
 return true;
}
export function handleMalakarInput(game){
 if(!malakarControlsLocked(game))return false;
 for(const input of game.getAllControllerInputsForUi?.()||[]){
  const actor=game.getActorForControllerInput?.(input)||game.player,index=partyMembers(game.player).indexOf(actor);
  if(game.malakarReady){if(input.cancelPressed||input.backPressed)answerMalakarReady(game,index,false);else if(input.confirmPressed)answerMalakarReady(game,index,true);}
  else if(actor===game.player){const s=encounterState(game.world);if(s?.mode==='ritual'&&(input.cancelPressed||input.backPressed))skipMalakarRitual(game);else if(s?.mode==='introduction'){if(input.leftPressed)s.choice=((s.choice||0)+2)%3;if(input.rightPressed)s.choice=((s.choice||0)+1)%3;if(input.confirmPressed)chooseMalakarIntroduction(game,['defy','ritual','relic'][s.choice||0]);}}
 }
 return true;
}
export function updateMalakarEncounter(game,dt){
 const w=game.world;
 if(game.malakarReady){showEncounterPanel(game);return true;}
 const entrance=w?.objects?.find(o=>o.malakarEntrance);
 if(entrance&&Math.hypot(game.player.x-entrance.x,game.player.y-entrance.y)<420){game.malakarChantTimer=(game.malakarChantTimer||0)-dt;if(game.malakarChantTimer<=0){game.malakarChantTimer=5;playSfx('malakarChant',{volume:.4});}}
 if(!isMalakarSanctum(w)){removePanel();return false;}
 installMalakarSanctum(w);const s=encounterState(w),boss=w.enemies.find(e=>e.malakarSolo);
 if(s.mode==='arrival')beginMalakarArrival(game);
 if(s.mode==='active'||s.mode==='victory'){removePanel();return false;}
 s.elapsed+=dt;
 if(s.mode==='ritual'){
  if(s.elapsed>=4&&!s.sealed){s.sealed=true;seal(w);playSfx('bossRoar',{volume:.4});game.log?.('The Last Dawn seal burns across the stair. The leaders’ lives feed the binding.');}
  if(s.elapsed>=9&&!s.ignited){s.ignited=true;playSfx('fire',{volume:.7});}
  for(const o of w.objects)if(o.id.startsWith('malakarCelebrant')){o.scale=Math.max(.15,1-Math.max(0,s.elapsed-11)/3);o.depleted=s.elapsed>=14;}
  if(s.elapsed>=18)finishRitual(game);
 }else if(s.mode==='handoff'&&s.elapsed>=3){
  seal(w);s.mode='active';s.grace=2;s.attack=null;s.queue=[];s.recovery=0;boss.x=20*TILE;boss.y=20*TILE;boss.arenaDormant=false;boss.awakened=true;boss.aggro=true;boss.boss={phase:1,type:'demonLord',introShown:true};if(w.bossArena)w.bossArena.phase='active';removePanel();return false;
 }else if(s.mode==='dying'&&s.elapsed>=4){s.mode='victory';s.attack=null;s.queue=[];w.effects=[];w.combatEffects=[];w.arenaBarriers=[];for(const o of w.objects){if(o.id==='malakarRelic'){o.interactable=true;o.hideLabel=false;}if(o.id==='malakarReturnStair'){o.locked=false;o.hideLabel=false;}}removePanel();return false;}
 if(malakarControlsLocked(game)){
  if(boss)boss.arenaDormant=true;
  for(const p of partyMembers(game.player)){p.combatProjectiles=[];}
  if(game.camera&&game.canvas){game.camera.x=20*TILE-game.canvas.width/2;game.camera.y=21*TILE-game.canvas.height/2;}
  showEncounterPanel(game);return true;
 }
 return false;
}
export function resetMalakar(w){const s=encounterState(w);if(!s||s.mode==='victory')return;s.mode='arrival';s.elapsed=0;s.attack=null;s.queue=[];s.phase=1;s.sealed=false;s.ignited=false;s.grace=2;}
function removePanel(){if(typeof document!=='undefined')document.getElementById('malakarEncounterPanel')?.remove();}
function showEncounterPanel(game){
 if(typeof document==='undefined')return;
 if(game.partyEntryReady){removePanel();return;}
 const s=encounterState(game.world),r=game.malakarReady;
 let text='',buttons=[];
 if(r){text=`Player ${r.initiator} proposes descending into the Ritual Sanctum. Prepare first: the whole party enters together.`;buttons=partyMembers(game.player).flatMap((p,i)=>r.answers.has(p)?[['Player '+(i+1)+' ready',()=>{}]]:[['Player '+(i+1)+': Yes',()=>answerMalakarReady(game,i,true)],['Player '+(i+1)+': Not yet',()=>answerMalakarReady(game,i,false)]]);}
 else if(s?.mode==='ritual'){
 const lines=['Seal-Keeper: “The caravan key is seated. The prison answers.”','First Cantor: “Then keep your places. We promised our lives, not another offering.”','Ash Marshal: “The survivor! Shall I—”  First Cantor: “No. The seal is drinking. There is no stopping now.”','Last Cantor: “Let the witness remember who opened the way.”','The leaders burn. Their bodies collapse; four streams of fire converge above the royal dais.','Malakar: “Four lives to turn a key. And they thought that purchased a sovereign.”'];text=lines[Math.min(5,Math.floor(s.elapsed/3))];buttons=[['Skip ritual (Esc / Back)',()=>skipMalakarRitual(game)]];
 }else if(s?.mode==='introduction'){text='Malakar: “You followed the stolen cargo from Orrakai, through the poisoned fields and the ruined chapel. You have undone their work at every turn. Will you finish it here?”';buttons=[['You will hurt no one else.',()=>chooseMalakarIntroduction(game,'defy')],['They died to summon you?',()=>chooseMalakarIntroduction(game,'ritual')],['What was in the caravan?',()=>chooseMalakarIntroduction(game,'relic')]];}
 else if(s?.mode==='handoff')text='Malakar: “'+s.reply+'”  His mantle opens. “Show me what your conviction is worth.”';
 else if(s?.mode==='dying')text='Malakar’s mantle splits. The royal seal fractures, and the chamber’s fire bows inward. “Stay. There is something you must hear.”';
 else return;
 const signature=text+buttons.map(b=>b[0]).join('|')+(s?.choice||0);let el=document.getElementById('malakarEncounterPanel');if(el?.dataset.signature===signature)return;
 if(!el){el=document.createElement('section');el.id='malakarEncounterPanel';el.style.cssText='position:fixed;bottom:5%;left:12%;right:12%;z-index:1900;padding:20px;background:#151018ed;border:2px solid #b78955;color:#f6e7d0;font:19px/1.5 Georgia;text-align:center';document.body.append(el);}
 el.dataset.signature=signature;el.replaceChildren();const p=document.createElement('p');p.textContent=text;el.append(p);
 for(const [index,[label,fn]]of buttons.entries()){const b=document.createElement('button');b.textContent=label;b.style.cssText='margin:5px;padding:9px 14px;color:#f4e7d3;background:#3d2530;border:1px solid #b78955';if(s?.mode==='introduction'&&index===(s.choice||0)){b.style.outline='2px solid #ffe1a3';b.setAttribute('aria-current','true');}b.onclick=fn;el.append(b);}
}
