// Effective stats after the global enemy multiplier. Locked per attempt so a
// downed/disconnected ally cannot reduce a boss's remaining health pool.
export const DUNGEON_BOSS_DIFFICULTY={mother:{hp:5250,damage:45},custodian:{hp:7000,damage:50},veyreign:{hp:14000,damage:68}};
export const DUNGEON_BOSS_PARTY_HP=[1,2,3.1,4.2];
export function tuneDungeonBoss(e,count=1){
 if(!e?.groveMother&&!e?.orchardCustodian&&!e?.veyreignLord)return e;
 const n=Math.max(1,Math.min(4,Math.floor(count||1))),size=e.dungeonBossPartyLocked?Math.max(n,e.dungeonBossPartySize||1):n,base=DUNGEON_BOSS_DIFFICULTY[e.veyreignLord?'veyreign':e.groveMother?'mother':'custodian'];
 const hp=Math.round(base.hp*DUNGEON_BOSS_PARTY_HP[size-1]),ratio=Math.max(0,Math.min(1,(e.hp??e.maxHp)/Math.max(1,e.maxHp)));
 if(e.dungeonBossTuningVersion!==2||e.maxHp!==hp){e.hp=e.hp<=0?0:Math.max(1,Math.round(hp*ratio));e.maxHp=hp;}
 e.damage=e.dmg=Math.round(base.damage*(1+(size-1)*.05));e.dungeonBossPartySize=size;e.dungeonBossTuningVersion=2;
 e.runalisCoopBossPlayerCount=size;e.runalisCoopBossHealthMultiplier=DUNGEON_BOSS_PARTY_HP[size-1];return e;
}
