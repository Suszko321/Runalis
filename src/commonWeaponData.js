// Plain, class-open practice gear sold from the beginning of Orrakai.
const definitions=[
 ['wornIronShortsword','Worn Iron Shortsword','sword','blade',2,6,'martial-a',0,80,.56,[48,100],[.5,.82]],
 ['dullUtilityDagger','Dull Utility Dagger','dagger','blade',2,4,'martial-a',1,52,.5,[48,100],[.5,.78]],
 ['ironPracticeMace','Iron Practice Mace','mace','blunt',3,6,'martial-a',3,80,.56,[48,100],[.5,.79]],
 ['wornIronMallet','Worn Iron Mallet','hammer','blunt',3,8,'martial-b',0,90,.58,[48,100],[.5,.80]],
 ['plainAshSpear','Plain Ash Spear','spear','warding',2,8,'martial-b',1,112,.66,[48,80],[.5,.65]],
 ['farmhandScythe','Farmhand Scythe','scythe','scythe',2,8,'martial-b',2,110,.66,[28,82],[.1,.68]],
 ['roughYewBow','Rough Yew Bow','bow','archery',2,8,'martial-b',3,104,.60,[32,64],[.15,.5]],
 ['bareWoodStaff','Bare Wood Staff','staff','warding',2,4,'magic',0,112,.66,[48,82],[.5,.66]],
 ['threadbarePrimer','Threadbare Primer','grimoire','grimoire',2,8,'magic',1,72,.34,[48,100],[.5,.70]],
 ['smokeglassFocus','Smokeglass Focus','spiritFocus','spirit',2,6,'magic',2,64,.34,[48,100],[.5,.80]],
 ['inertStoneConduit','Inert Stone Conduit','eldritch','spirit',2,6,'magic',3,64,.42,[48,100],[.5,.78]]
];
export const COMMON_WEAPON_ITEMS={};
export const COMMON_WEAPON_ART={};
export const COMMON_WEAPON_EXPORTS={};
export const ORRAKAI_PRACTICE_OFFERS={blacksmith:[],alchemist:[]};
for(const [id,name,weaponType,skill,baseDamage,price,master,column,height,scale,grip,fraction]of definitions){
 const merchant=['staff','spiritFocus','grimoire','eldritch'].includes(weaponType)?'alchemist':'blacksmith',sheet='common-weapon-'+id;
 COMMON_WEAPON_ITEMS[id]={id,name,type:'weapon',slot:'weapon',weaponType,skill,primarySkill:skill,primaryMultiplier:1,secondarySkill:null,secondaryMultiplier:0,baseDamage,power:0,rarity:'common',stack:false,value:Math.max(1,Math.floor(price/2)),noRandomDrop:true,
  ...(weaponType==='grimoire'?{focusPower:0,spiritCost:8,range:260,projectileSpeed:400}:weaponType==='spiritFocus'?{focusPower:0,staminaCost:8,range:260,projectileSpeed:400}:{}),traits:['Practice Gear',...(id==='threadbarePrimer'?['Bound Grimoire']:[])],
  desc:`Plain, worn practice equipment. Common quality, no level or class requirement. Trains ${skill==='scythe'?'Scythe':skill==='blunt'?'Blunt Weapons':skill[0].toUpperCase()+skill.slice(1)}. This is the weakest shop option for this weapon family; the same copy can be upgraded at a smith.`};
 COMMON_WEAPON_ART[id]={sheet,width:96,height:128,gripX:grip[0],gripY:grip[1],scale,iconSheet:sheet+'-icon'};
 COMMON_WEAPON_EXPORTS[id]={master,column,height,fraction};
 ORRAKAI_PRACTICE_OFFERS[merchant].push({id,qty:1,price,label:name,detail:COMMON_WEAPON_ITEMS[id].desc,gearRarity:'common'});
}
export const COMMON_FOCUS_STYLES={threadbarePrimer:{sheet:'common-focus-projectiles',columns:2,index:0,name:'Practice vellum sliver',color:'#d9ceb7'},smokeglassFocus:{sheet:'common-focus-projectiles',columns:2,index:1,name:'Smokeglass dart',color:'#b8bdc1'}};
export function practiceMerchantKind(merchant){return merchant?.workshopService==='blacksmith'?'blacksmith':merchant?.apothecaryService?'alchemist':null;}
