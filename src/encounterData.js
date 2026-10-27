import {continentRegionAt,continentEcologyAt,CONTINENT_REGIONS} from './continentDefinition.js';
import {echorynRegionAt} from './echorynGeography.js';
import {enemyXPForLevel} from './enemyProgression.js';

export const ENCOUNTER_VERSION='geographic-density-1';
export const ELITE_MODIFIERS=Object.freeze({
 waller:{name:'Waller',symbol:'[]',color:'#c4ad85',counter:'Find the marked gap. Dodge or guard the chamber strike. Only killing the elite collapses its walls early.'},
 shocker:{name:'Shocker',symbol:'Z',color:'#eddf91',counter:'Leave the lightning lane; watch for crossing bolts. Dodge or guard impact; only killing the elite cancels the strike.'},
 freezer:{name:'Freezer',symbol:'*',color:'#add7de',counter:'Leave frost before it builds. Guard reduces chill; a stamina dodge breaks ice. Dodge or guard Shatter.'},
 molten:{name:'Molten',symbol:'!',color:'#ed9668',counter:'Avoid magma trails and leave the corpse eruption. Dodge, cover or guard its blast.'},
 vortex:{name:'Vortex',symbol:'O',color:'#bd98d2',counter:'Dodge the pull or escape before collapse. Guard the collapse; only killing the elite cancels it.'},
 artillery:{name:'Artillery',symbol:'+',color:'#daa878',counter:'Tracking becomes a solid locked marker. Time a dodge, use cover or defenses; expect a follow-up. Only killing the elite cancels bombardment.'},
 bulwark:{name:'Bulwark',symbol:'D',color:'#d2cbaa',counter:'Strike the rear or guard recovery. Repeated frontal hits trigger an announced counterstrike.'},
 regenerator:{name:'Regenerator',symbol:'Y',color:'#a7c795',counter:'Kill the elite before its chant finishes to stop the heal. Hits and crowd control cannot interrupt it; its healing reserve is limited.'}
});
export const FRONTIER_ENCOUNTERS=Object.freeze({
 outpost:{levels:[1,2],count:[0,0],respawn:[480,720]},
 hollowRoad:{levels:[2,5],count:[2,4],respawn:[240,420]},
 ashenOrchard:{levels:[3,7],count:[3,5],respawn:[280,460]},
 caravanRoad:{levels:[3,7],count:[2,4],respawn:[300,480]},
 gravefields:{levels:[5,9],count:[3,6],respawn:[320,520]},
 chapelRuins:{levels:[7,11],count:[3,6],respawn:[360,540]},
 thornwood:{levels:[5,10],count:[3,6],respawn:[300,500]},
 mirrorGrove:{levels:[8,13],count:[3,5],respawn:[340,540]},
 pilgrimBridge:{levels:[6,10],count:[2,4],respawn:[300,500]},
 pilgrimRoad:{levels:[8,13],count:[2,4],respawn:[320,520]},
 hunterReach:{levels:[10,16],count:[3,6],respawn:[340,560]},
 watcherRidge:{levels:[14,20],count:[3,5],respawn:[420,640]},
 riverlands:{levels:[6,11],count:[2,4],respawn:[300,500]},
 lanternMarsh:{levels:[9,14],count:[3,5],respawn:[360,540]},
 ironMire:{levels:[12,18],count:[3,6],respawn:[380,600]},
 oldHollow:{levels:[16,22],count:[3,6],respawn:[420,660]},
 highDanger:{levels:[20,26],count:[3,6],respawn:[480,720]},
 redRoad:{levels:[18,24],count:[2,4],respawn:[420,660]},
 redSeal:{levels:[22,28],count:[3,6],respawn:[480,720]}
});
// Each implemented entrance gets this explicit profile or a theme/tier fallback.
// Fallbacks are geographic content defaults, never player-derived difficulty.
export const DUNGEON_ENCOUNTERS=Object.freeze({
 hollowRootCellar:[3,7],ashenOrchard:[3,8],mirrorGrove:[9,15],pilgrimBridge:[7,13],watcherRidge:[16,24],thornrootHollow:[7,13],oldHollowDungeon:[16,24],
 ironMireDungeon:[12,20],redSealKeep:[22,30],castleVeyr:[20,30],
 dawnspireRoot:[24,34],demonCultLair:[24,34],confessionVaults:[28,38],
 lightBeneathNames:[32,44],shatteredChoir:[35,48],ascensionSpire:[52,65]
});
export function encounterRng(seed){let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619);return()=>{n+=0x6D2B79F5;let t=Math.imul(n^(n>>>15),n|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function geographicEncounterProfile(x,y,hint=null){
 const region=continentRegionAt(x,y),local=x<640&&y<480?(hint&&FRONTIER_ENCOUNTERS[hint]?hint:echorynRegionAt(x,y).id):region.id;
 const frontier=FRONTIER_ENCOUNTERS[local];
 return {id:local,levels:frontier?.levels||region.levels,count:frontier?.count||[3,6],respawn:frontier?.respawn||[420,720],ecology:continentEcologyAt(x,y),eliteChance:local==='hollowRoad'?.06:.12,rareChance:.035,championChance:.008,eventChance:.12};
}
export function dungeonEncounterProfile(world){
 const id=world.dungeonId||world.poiId||world.entranceId||'unknownDungeon';
 const direct=DUNGEON_ENCOUNTERS[id],theme=world.theme||'root',tier=Math.max(1,Number(world.tier)||1);
 const low=theme==='ascension'?42:theme==='aureate'?18:theme==='demon'?18:theme==='thorn'?5:theme==='mire'?10:2+(tier-1)*5;
 let levels=direct||[low,low+8];
 if(id.startsWith('sideZone-')){
  const parts=id.split('-'),regional=CONTINENT_REGIONS.find(r=>r.id===parts[1]),type=parts[2],local={hollowGrove:[5,10],abandonedMine:[7,13],ashenFarmstead:[8,14],graveyardCellar:[9,15],failedPurificationSite:[22,30],confessionVault:[28,38],choirReliquary:[32,42],lightstormScar:[42,52],namelessVault:[46,58],worldrootRift:[52,65]}[type]||levels;
  levels=[Math.max(local[0],regional?.levels[0]||1),Math.max(local[1],(regional?.levels[0]||1)+6)];
 }
 const floor=Math.max(1,Number(world.floor)||1),floors=Math.max(1,Number(world.totalFloors)||1);
 const start=levels[0]+Math.floor((levels[1]-levels[0])*(floor-1)/floors),end=Math.min(levels[1],start+Math.max(3,Math.ceil((levels[1]-levels[0])/floors)));
 return {id,levels:[start,end],count:[3,6],respawn:null,eliteChance:.12,rareChance:.04,championChance:.008,theme,explicit:!!direct};
}
export function compatibleEliteModifiers(a,b){return a!==b&&!(a==='vortex'&&['freezer','waller'].includes(b)||b==='vortex'&&['freezer','waller'].includes(a))&&!(a==='regenerator'&&b==='bulwark'||b==='regenerator'&&a==='bulwark');}
export function chooseEliteModifiers(rng,count=1,{confined=false,early=false}={}){
 const pool=Object.keys(ELITE_MODIFIERS).filter(m=>!(confined&&m==='waller')&&!(early&&['vortex','waller'].includes(m))),out=[];
 while(out.length<Math.min(early?2:3,count)&&pool.length){const m=pool.splice(Math.floor(rng()*pool.length),1)[0];if(out.every(a=>compatibleEliteModifiers(a,m)))out.push(m);}
 return out;
}
const BASE={basicBeast:[54,7,.72],ashWolf:[58,8,.78],stalkerWolf:[68,9,.85],hollowling:[42,6,.65],roadlessBandit:[65,8,.9],archer:[45,7,.9],gravebound:[92,10,1.15],shieldKnight:[105,10,1.2],brute:[140,13,1.4],gravePriest:[72,8,1.2],cultist:[58,8,1],demonCultist:[72,10,1.1],wraith:[65,9,1.1],veyrWraith:[85,11,1.2],exploder:[36,11,.6]};
export function configureEncounterEnemy(enemy,profile,seed=enemy?.id,options={}){
 if(!enemy||enemy.encounterStatsVersion===ENCOUNTER_VERSION||enemy.friendly||enemy.trainingDummy)return enemy;
 const rng=encounterRng(`${seed}:stats`);let level=profile.levels[0]+Math.floor(rng()*(profile.levels[1]-profile.levels[0]+1));
 const boss=!!(enemy.isBoss||enemy.worldBoss||enemy.bossId),unique=boss||enemy.miniBoss||enemy.questCritical||enemy.namedExteriorElite;
 if(unique)level=Math.max(profile.levels[1],enemy.combatLevel>1?enemy.combatLevel:0);
 let rank=options.rank|| (boss?'boss':enemy.miniBoss?'champion':enemy.elite||enemy.isElite||enemy.eliteModifier?'elite':'ordinary');
 if(!unique&&!options.rank){const roll=rng();rank=roll<profile.championChance?'champion':roll<profile.rareChance?'rare':roll<profile.eliteChance?'elite':rank;}
 const base=BASE[enemy.archetype]||BASE[enemy.kind];
 const ratio=Math.max(0,Math.min(1,Number(enemy.hp)/Math.max(1,Number(enemy.maxHp))));
 if(!unique&&base){const hpFactor={ordinary:1,elite:2.5,rare:4.5,champion:6}[rank]||1;
  enemy.maxHp=Math.ceil(base[0]*(1+(level-1)*.14)*1.25*hpFactor);enemy.hp=enemy.dead?0:Math.ceil(enemy.maxHp*ratio);
  enemy.damage=enemy.dmg=Math.ceil(base[1]*(1+(level-1)*.075)*1.25*(rank==='ordinary'?1:1.15));
 }else if(!base&&!unique){enemy.encounterDiagnostic=`Uncatalogued archetype: ${enemy.kind}; retained authored stats`;}
 enemy.combatLevel=enemy.level=level;enemy.encounterRegion=profile.id;enemy.encounterTier=rank;enemy.encounterStatsVersion=ENCOUNTER_VERSION;delete enemy.progressionFallback;
 enemy.elite=enemy.isElite=['elite','rare','champion'].includes(rank);
 enemy.eliteModifiers=boss?[]:chooseEliteModifiers(rng,rank==='champion'&&level>=30&&!enemy.questCritical?3:rank==='rare'||rank==='champion'?2:rank==='elite'?1:0,{confined:options.confined,early:level<=5});
 // Predictable setup, not simultaneous casts: containment precedes control,
 // which precedes bombardment. Other identities retain their seeded order.
 if(enemy.eliteModifiers.includes('waller')&&enemy.eliteModifiers.some(m=>['freezer','artillery'].includes(m)))enemy.eliteModifiers.sort((a,b)=>['waller','freezer','artillery'].indexOf(a)-['waller','freezer','artillery'].indexOf(b));
 enemy.eliteModifier=enemy.eliteModifiers[0]||null;enemy.eliteInitialized=true;
 enemy.baseCombatXp=enemy.xp=enemy.rewardSuppressed||enemy.summonedBy||enemy.summonedByBoss?0:enemyXPForLevel(level,(base?.[2]||1)*({ordinary:1,elite:2,rare:3.5,champion:5,boss:8}[rank]||1));
 enemy.rewardSeed=`${seed}:loot`;enemy.aggroRange=Math.min(enemy.aggroRange||240,options.dungeon?300:360);
 if(!unique){enemy.homeGuard=true;enemy.homeX??=enemy.x;enemy.homeY??=enemy.y;enemy.leashRadius=options.dungeon?320:480;}
 return enemy;
}
