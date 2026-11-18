import {addItem,countItem,removeItem} from './player.js';
import {applyStoryFlags,getStoryFlag,setStoryFlag} from './storyProgress.js';
import {startQuest,updateQuestStageCompletion} from './dialogueSystem.js';
import {initializeDungeonArena} from './dungeonArenaSystem.js';
import {addQuestText,addStatusText} from './floatingText.js';
import {tuneDungeonBoss} from './dungeonBossDifficulty.js';
import {ACT2_QUESTS,ACT2_FLAGS as F,ACT2_FINALE,LEGACY_ACT2,SERAPH_DOMAINS,ZARYNTH_CAPITAL,ACT2_BEHEMOTH,domainFlag,isAct2Instance} from './act2CampaignData.js';
import {ACT2_ROOT_HEARTS,summonAct2Guardian} from './act2World.js';
import {SERAPH_TRIALS,SERAPH_PROOFS,SERAPH_RESOLUTION_LINES} from './seraphTrialData.js';

const domains=Object.values(SERAPH_DOMAINS);
const has=(player,flag)=>!!getStoryFlag(player,flag);
const completed=(player,id)=>!!player.quests?.completed?.[id];
const entitled=(player)=>completed(player,'act1HearthmereAshes')||has(player,'act1Complete')||
  !!player.questState?.completed?.act1HearthmereAshes||completed(player,LEGACY_ACT2);
const allRelics=(player)=>domains.every(d=>has(player,domainFlag(d.id,'relic')));
const living=e=>e.hp>0&&!e.dead&&!e.remove;
const guardClear=(world,group)=>!world.enemies.some(e=>e.act2Group===group&&living(e));
const inCapital=(world,floor)=>world?.dungeonId===ZARYNTH_CAPITAL&&world.floor===floor;
const ownerOf=player=>player?.questOwner||player;
const relicId=id=>`concordantRelic_${id}`;

export function act2CommissionDialogue(player,world) {
  const owner=ownerOf(player);
  return owner&&world?.mode==='capital'&&entitled(owner)&&!has(owner,F.commission)?'act2MaelCommission':null;
}

export function ensureAct2Campaign(player) {
  if (!player||!entitled(player)) return false;
  if (!has(player,'act2Started')&&!has(player,'act3Started')) applyStoryFlags(player,['story.act2Started']);
  if (!has(player,'act2.legacyMigrated')) {
    // Preserve the completed legacy record and all earned rewards. Retire only
    // the obsolete active path and its journal pointers.
    for (const log of [player.quests,player.questState]) {
      if (log?.active?.[LEGACY_ACT2]) delete log.active[LEGACY_ACT2];
      if (log?.activeQuestId===LEGACY_ACT2) log.activeQuestId=null;
      if (log?.trackedQuestId===LEGACY_ACT2) log.trackedQuestId=null;
    }
    setStoryFlag(player,'act2.legacyMigrated');
  }
  if (!has(player,F.commission)&&!player.quests?.active?.act2AshesAfterDawn) startQuest(player,'act2AshesAfterDawn');
  return true;
}

function syncQuests(player) {
  if (!entitled(player)) return;
  ensureAct2Campaign(player);
  const activate=id=>{
    if (!player.quests?.active?.[id]&&!completed(player,id)) startQuest(player,id);
    const record=player.quests?.active?.[id];
    if (!record) return;
    for (const obj of record.objectives) obj.current=has(player,obj.flag)?obj.required:0;
    updateQuestStageCompletion(player,id);
  };
  const path=[
    ['act2AshesAfterDawn',true],
    ['act2ThreeWitnesses',has(player,F.commission)],
    ['act2ThreeSeraphs',has(player,F.ward)],
    ['act2ConcordantGate',allRelics(player)],
    ['act2LivingSaint',has(player,F.admitted)],
    ['act2HandBeneath',has(player,F.miracle)],
    ['act2EmperorsBurden',has(player,F.seraphel)],
    ['act2BloomBeneath',has(player,F.cassian)],
    ['act2RootCrowned',has(player,F.response)],
    [ACT2_FINALE,has(player,F.behemoth)]
  ];
  for (const [id,available] of path) if (available) activate(id);
  for (const domain of domains) {
    if (!has(player,domainFlag(domain.id,'visited'))||!has(player,F.ward)) continue;
    activate(domain.quest);
  }
  const current=path.find(([id,available])=>available&&!completed(player,id))?.[0];
  if (current&&!has(player,'act3Started')) player.story.mainQuestline=current;
  if (completed(player,ACT2_FINALE)&&!has(player,'act2.finaleReward')) {
    applyStoryFlags(player,['story.act2Complete','travel.severedCauseway.unlocked']);
    setStoryFlag(player,'act2.finaleReward');
    addItem(player,'severedCausewayChart');
    addItem(player,'lightstormWard',3);
    addItem(player,'ashCoin',750);
    addQuestText(player,'Act II Complete · The Three Seraphs',{color:'#f5cb86',ttl:2.4,size:18});
  }
}

function grantRelic(player,id,resolution,method) {
  const flag=key=>domainFlag(id,key);
  if (has(player,flag('relic'))) return false;
  if (!addItem(player,relicId(id))) return false;
  setStoryFlag(player,flag('relic'));
  setStoryFlag(player,flag(method));
  setStoryFlag(player,flag('resolution'),resolution);
  player.factionReputation ||= {};
  player.factionReputation[id]=(player.factionReputation[id]||0)+(method==='accord'?12:-5);
  addQuestText(player,SERAPH_DOMAINS[id].relic,{color:SERAPH_DOMAINS[id].color,ttl:1.8});
  return true;
}

export function checkAct2Entrance(player,id) {
  if (!isAct2Instance(id)) return null;
  if (id===ZARYNTH_CAPITAL&&has(player,F.admitted)) return null;
  if (!has(player,F.ward)) return 'The Concordant Ward has no testimony for you. Speak to Mael in Orrakai and to Examiner Sera.';
  if (id===ZARYNTH_CAPITAL) {
    const missing=domains.filter(d=>!has(player,domainFlag(d.id,'relic'))||countItem(player,relicId(d.id))<1);
    if (missing.length) return 'The Concordant Ward bars passage. Missing: '+missing.map(d=>d.relic).join(', ')+'.';
  }
  return null;
}

export function recordAct2Entrance(game) {
  const {player,world}=game;
  if (!isAct2Instance(world.dungeonId)) return;
  if (world.dungeonId!==ZARYNTH_CAPITAL) {
    setStoryFlag(player,domainFlag(world.dungeonId,'visited'));
  } else if (!has(player,F.admitted)) {
    setStoryFlag(player,F.admitted);
    for (const domain of domains) {
      const id=relicId(domain.id),qty=countItem(player,id);
      if (qty) removeItem(player,id,qty);
    }
    world.effects.push({kind:'bossFlourish',layer:'front',...world.spawn,radius:170,color:'#efca79',ttl:2.2,age:0});
    game.log?.('The Ward lights in answer to the three witnesses. Each relic returns to its custodian. Zarynth is open.');
    addQuestText(player,'Zarynth · City of a Thousand Banners',{color:'#f5cb86',ttl:2.4,size:18});
  }
  syncQuests(player);
  updateAct2Instance(world,player,game.log);
}

function outcome(player) {
  const choice=getStoryFlag(player,'act2.responsePlan');
  if (choice!=='divert') return choice;
  return ['westValve','eastValve'].every(id=>has(player,`act2.aqueduct.${id}`))?'divert':null;
}

function prepareBoss(world,player) {
  const id=world.dungeonId;
  if (inCapital(world,2)) {
    if (has(player,F.behemoth)||!has(player,F.response)||!ACT2_ROOT_HEARTS.every(key=>has(player,`act2.aqueduct.${key}`))) return;
  } else if (!SERAPH_DOMAINS[id]||!has(player,domainFlag(id,'challenged'))||has(player,domainFlag(id,'relic'))) return;
  if (!world.enemies.some(e=>e.act2Boss)) {
    const boss=summonAct2Guardian(world);
    tuneDungeonBoss(boss,world.dungeonState.coopPlayerCount||1);
    world.dungeonState.mainBossEnemyId=boss.id;
    world.dungeonState.requiredBossIds=[boss.id];
    initializeDungeonArena(world);
  }
}

export function updateAct2Instance(world,player,log) {
  if (!player||world?.mode!=='dungeon'||!isAct2Instance(world.dungeonId)) return;
  const id=world.dungeonId;
  if (inCapital(world,1)) {
    world.safeZone=true;
    const stairs=world.objects.find(o=>o.kind==='dungeonStairs');
    if (stairs) stairs.locked=!has(player,F.cassian);
    const patient=world.objects.find(o=>o.npcId==='act2-patientA');
    if (patient&&has(player,F.miracle)) {
      patient.name='Recovering Transport Patient';
      patient.talk='Someone brought me broth. I don’t remember the ride here, but I remember you.';
    }
    const refuge=world.objects.find(o=>o.npcId==='act2-refugeSteward');
    if (refuge&&has(player,F.intervention)) refuge.talk=({
      evacuate:'Neve brought all the families up. The refuge lost its ground floor to the spill, but there were no names left below.',
      seal:'The refuge held. There are names on my list I have not crossed off. The arches came down while they were still below.',
      divert:'Both galleries held. We’ve counted every family and the refuge is dry. I can turn the beds back over to the hospital.'
    })[getStoryFlag(player,'act2.outbreakOutcome')]||refuge.talk;
  }
  if (inCapital(world,2)) {
    if (has(player,F.cassian)) setStoryFlag(player,F.entered);
    const response=outcome(player);
    if (response&&!has(player,F.response)) {
      setStoryFlag(player,F.response);
      setStoryFlag(player,'act2.outbreakOutcome',response);
      player.factionReputation ||= {};
      const [imperial,covenant]={evacuate:[-4,8],seal:[8,-6],divert:[10,10]}[response];
      player.factionReputation.zarynth=(player.factionReputation.zarynth||0)+imperial;
      player.factionReputation.covenant=(player.factionReputation.covenant||0)+covenant;
      log?.({evacuate:'The families reach the surface. The lower refuge floods while the arches remain open.',
        seal:'The arches fall and halt the advance on the refuge. Some families cannot be reached.',
        divert:'The bypass carries the Rot away from the refuge. Neve’s crew brings every family out.'}[response]);
    }
    const zephyr=world.objects.find(o=>o.npcId==='act2-aftercare');
    if (zephyr) {
      zephyr.hidden=zephyr.presentationRetired=!has(player,F.behemoth);
      zephyr.interactable=!zephyr.hidden;
    }
  } else if (id==='lastStandBastion'&&guardClear(world,'road')) {
    if (!has(player,domainFlag(id,'road'))) setStoryFlag(player,domainFlag(id,'road'));
  }
  if (!inCapital(world,1)) prepareBoss(world,player);
  if(SERAPH_TRIALS[id]){
    const trial=SERAPH_TRIALS[id],done=has(player,domainFlag(id,trial.result));
    const steps=Number(getStoryFlag(player,domainFlag(id,`${trial.key}Progress`)))||0;
    for(const o of world.objects)if(o.seraphTrial===trial.key)o.seraphLit=done||o.seraphOrder<steps;
    const resolution=getStoryFlag(player,domainFlag(id,'resolution'));
    if(resolution==='freightConvoy'){
      const cartwright=world.objects.find(o=>o.npcId==='act2-refugees');
      if(cartwright)cartwright.talk='Vara has two wagons on the shelf. The children are eating before their turn on the cradle.';
    }else if(resolution==='keeperOfRites'){
      const scribe=world.objects.find(o=>o.npcId==='act2-scribe');
      if(scribe)scribe.dialogueId='act2NinRest';
    }else if(resolution==='anchorReality'){
      const astronomer=world.objects.find(o=>o.npcId==='act2-astronomer');
      if(astronomer)astronomer.dialogueId='act2AstronomerRest';
    }
  }
  for (const o of world.objects) {
    if (o.act2CacheGuard) o.locked=!guardClear(world,o.act2CacheGuard);
  }
}

export function updateAct2Campaign(game,dt=0) {
  game.act2Clock=(game.act2Clock||0)-dt;
  if (game.act2World===game.world&&game.act2Clock>0) return;
  game.act2World=game.world;
  game.act2Clock=.25;
  updateAct2Instance(game.world,game.player,game.log);
  syncQuests(game.player);
}

export function handleAct2Station(game,station) {
  const world=game.world,player=ownerOf(game.player);
  const key=station.act2Station,id=world.dungeonId;
  if (!key||!isAct2Instance(id)) return false;
  if (station.guard&&!guardClear(world,station.guard)) {
    game.log?.('Clear the nearby defenders first.');
    addStatusText(game.player,'Defenders remain',{color:'#f2b67a'});
    return true;
  }
  const trial=SERAPH_TRIALS[id];
  if(station.seraphTrial&&trial?.key===station.seraphTrial){
    const state=stepSeraphTrial(player,id,trial,station);
    game.log?.(state);
    addStatusText(game.player,station.name,{color:SERAPH_DOMAINS[id].color});
    updateAct2Instance(world,player,game.log);
    return true;
  }
  const flag=id===ZARYNTH_CAPITAL?`act2.aqueduct.${key}`:domainFlag(id,key);
  if (!has(player,flag)) setStoryFlag(player,flag);
  game.log?.(station.message);
  addStatusText(game.player,station.name,{color:'#e6c890'});
  updateAct2Instance(world,player,game.log);
  syncQuests(player);
  return true;
}

function stepSeraphTrial(player,id,trial,station) {
  const result=domainFlag(id,trial.result),progress=domainFlag(id,`${trial.key}Progress`);
  if(has(player,result))return 'The rite is already complete.';
  const index=trial.stages.findIndex(([key])=>key===station.act2Station);
  if(index<0)return trial.hint;
  const expected=Number(getStoryFlag(player,progress))||0;
  if(index!==expected){
    setStoryFlag(player,progress,index===0?1:0);
    return index===0?`${station.message} (1/${trial.stages.length})`:trial.hint;
  }
  const next=index+1;
  setStoryFlag(player,progress,next);
  if(next===trial.stages.length)setStoryFlag(player,result);
  return `${station.message} (${next}/${trial.stages.length})`;
}
const accordReplies = {
  ...SERAPH_RESOLUTION_LINES,
  outerRefuge:'The east cistern will serve the outer refuge. I will see to the gate myself. Take the Iron Vow. You took on a debt and carried it.',
  screenedEscort:'Iria will escort the wagons into the screened court. Denn will keep the cistern separate. Take the Iron Vow. It belongs with someone who understands what a watch is for.',
  publicRecord:'Then we will read both records and keep the original. Here is the Mourning Bell. When you ring it, remember that the dead cannot correct you.',
  sealedRecord:'The families may name their own hour. The original stays. Carry the Mourning Bell to the Ward.',
  keepMyLife:'Very well. Your life comes with you. So does the Mirror, if you can bear to see what else you might become.',
  anotherChance:'An interesting condition. A door that opens only one way has another name. Take the Lucid Mirror.'
};

export function resolveAct2Dialogue(action,actor,world,npcId) {
  const player=ownerOf(actor);
  const [verb,id,value]=action.split(':');
  const fail=()=>({ok:false,text:'That choice is no longer available.'});
  if (!player||!entitled(player)) return fail();
  const condition={
    commission:()=>npcId==='wardenMael'&&world.mode==='capital'&&!has(player,F.commission),
    ward:()=>npcId==='act2-examiner'&&world.mode==='overworld'&&has(player,F.commission)&&!has(player,F.ward),
    miracle:()=>npcId==='act2-zephyr'&&inCapital(world,1)&&has(player,F.admitted)&&!has(player,F.miracle),
    audience:()=>npcId==='act2-seraphel'&&inCapital(world,1)&&has(player,F.miracle)&&!has(player,F.seraphel),
    cassian:()=>npcId==='act2-cassian'&&inCapital(world,1)&&has(player,F.seraphel)&&!has(player,F.cassian),
    intervention:()=>npcId==='act2-aftercare'&&inCapital(world,2)&&has(player,F.behemoth)&&!has(player,F.intervention),
    reports:()=>npcId==='act2-maelReports'&&inCapital(world,1)&&has(player,F.intervention)&&!has(player,F.reports)
  }[verb];
  if (condition) {
    if (!condition()) return fail();
    const flag={commission:F.commission,ward:F.ward,miracle:F.miracle,audience:F.seraphel,cassian:F.cassian,intervention:F.intervention,reports:F.reports}[verb];
    setStoryFlag(player,flag);
    if (verb==='commission') {addItem(player,'fieldRations',12);addItem(player,'emberleaf',3);}
    if (verb==='miracle'||verb==='intervention') {
      const speaker=world.objects.find(o=>o.npcId===npcId);
      if (speaker) world.effects.push({kind:'bossFlourish',layer:'front',x:speaker.x,y:speaker.y,radius:145,color:'#ffe2a2',ttl:2.6,age:0});
    }
  } else if (verb==='respond') {
    if (npcId!=='act2-tavia'||!inCapital(world,2)||!has(player,F.entered)||has(player,'act2.responsePlan')||!['evacuate','seal','divert'].includes(id)) return fail();
    setStoryFlag(player,'act2.responsePlan',id);
    updateAct2Instance(world,player);
    syncQuests(player);
    return {ok:true,text:{
      evacuate:'Neve has the first families coming up. We’ll lose some of the lower refuge if the spill reaches us, but the passages will stay open.',
      seal:'Renn’s men have the charges ready. The refuge will hold. I can still hear the people below.',
      divert:'Find the emergency valve in each gallery. Keep the passages open until both valves are set. The evacuees will move when the pressure falls.'
    }[id]};
  } else {
    if (!SERAPH_DOMAINS[id]||world.dungeonId!==id||!has(player,F.ward)) return fail();
    const flag=key=>domainFlag(id,key);
    if(verb==='pledge'&&id==='lastStandBastion'&&npcId==='act2-quartermaster'&&has(player,flag('supplyLine'))&&!has(player,flag('reliefPledge'))&&!has(player,flag('relic'))&&!has(player,flag('challenged'))){
      if(!removeItem(player,'fieldRations',8))return {ok:false,text:'We need eight field rations to stock the freight cradle. The nearby camp has a market.'};
      setStoryFlag(player,flag('reliefPledge'));
    } else if (verb==='order'&&has(player,'order.founded')&&!has(player,flag('relic'))) {
      if (id==='lastStandBastion'&&npcId==='act2-iria'&&value==='water'&&!has(player,flag('water'))) {
        setStoryFlag(player,flag('water'));
      } else if (id==='forgottenOssuary'&&npcId==='act2-keeper'&&value==='archive'&&!has(player,flag('archive'))) {
        setStoryFlag(player,flag('archive'));
      } else return fail();
    } else if (verb==='proof'&&npcId==='act2-iria'&&id==='lastStandBastion'&&value==='watch'&&has(player,flag('road'))&&!has(player,flag('watch'))) {
      setStoryFlag(player,flag('watch'));
    } else if (npcId==='act2-keeper'&&!has(player,flag('relic'))&&!has(player,flag('challenged'))) {
      if (verb==='challenge') {
        setStoryFlag(player,flag('challenged'));
        updateAct2Instance(world,player);
        return {ok:true,text:'Then meet my manifestation in the chamber to the north. I will answer for the relic there.'};
      }
      const evidence=SERAPH_PROOFS[id][value];
      if (verb!=='accord'||!evidence?.every?.(key=>has(player,flag(key)))||!grantRelic(player,id,value,'accord')) return fail();
      updateAct2Instance(world,player);
      syncQuests(player);
      return {ok:true,text:accordReplies[value]};
    } else return fail();
  }
  updateAct2Instance(world,player);
  syncQuests(player);
  return {ok:true};
}

export function recordAct2Kill(player,enemy,world,log) {
  if (!isAct2Instance(world?.dungeonId)) return false;
  const id=world.dungeonId;
  if (enemy.act2Heart&&inCapital(world,2)&&ACT2_ROOT_HEARTS.includes(enemy.act2Heart)) {
    setStoryFlag(player,`act2.aqueduct.${enemy.act2Heart}`);
    log?.('An exposed root heart stops beating.');
    updateAct2Instance(world,player,log);
    return true;
  }
  if (!enemy.act2Boss||!enemy.isDungeonMainBoss||!world.dungeonState?.cleared) return false;
  if (id===ZARYNTH_CAPITAL&&enemy.act2Boss===ACT2_BEHEMOTH&&has(player,F.response)) {
    setStoryFlag(player,F.behemoth);
    log?.('The root network falls still. Find Zephyr at the sluice junction before heading above.');
  } else if (enemy.act2Boss===id&&has(player,domainFlag(id,'challenged'))) {
    if (grantRelic(player,id,'honoredDuel','force')) log?.(`${SERAPH_DOMAINS[id].relic} is yours. The custodian’s manifestation yields.`);
  } else return false;
  updateAct2Instance(world,player,log);
  syncQuests(player);
  return true;
}
