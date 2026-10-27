export function configureGardenSummon(s,a){
 if(!a.gardenSummon)return s;
 if(a.subclassId!=='petalknight')return s;
 s.summonMorph=a.subclassId;s.gardenSummon=true;
 s.displayName=({thornling:'Rose Sentinel',thornbeast:'Rose Stalker',elderThornbeast:'Rose Siegebeast',thornTitan:'Rose Thorn Titan'}[s.evolutionStage]||'Rose '+s.displayName);
 s.maxHp=Math.ceil(s.maxHp*1.25);s.hp=s.maxHp;
 s.damage=Math.ceil(s.damage*.98);s.armour=Math.min(65,(s.armour||0)+8);
 return s;
}
