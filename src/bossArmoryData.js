// Boss finds are class-open weapons, using the existing family proficiencies,
// equipment tiers and ordinary stat budget. Traits below describe materials.
const weapon=definition=>({type:'weapon',slot:'weapon',rarity:'rare',stack:false,...definition});
const book=definition=>{const {staminaCost,...book}=definition;return weapon({weaponType:'grimoire',skill:'grimoire',primarySkill:'grimoire',secondarySkill:'warding',secondaryMultiplier:.6,...book,spiritCost:staminaCost});};
export const BOSS_ARMORY_ITEMS=Object.freeze({
 roseReaper:weapon({id:'roseReaper',name:'Rose Reaper',weaponType:'scythe',skill:'scythe',primarySkill:'scythe',primaryMultiplier:3.9,secondarySkill:'warding',secondaryMultiplier:.85,baseDamage:11,power:5,spirit:3,armour:2,value:145,traits:['Thornwood Haft','Rose Steel'],desc:'A thorn-knight’s scythe recovered from the Mother of Briars. Its rose-steel crescent and warded haft suit a Petalknight, but any class may wield it. Trains Scythe.'}),
 gravebellMaul:weapon({id:'gravebellMaul',name:'Gravebell Maul',weaponType:'hammer',skill:'blunt',primarySkill:'blunt',primaryMultiplier:4.1,secondarySkill:'summoning',secondaryMultiplier:.6,baseDamage:12,power:6,spirit:2,value:165,traits:['Funerary Iron','Bone Inlay'],desc:'A Veyreign burial hammer with a muffled bell for a head. Heavy blunt blows and a reserve of Spirit invite wardens and summoners alike. Any class may wield it.'}),
 cindervowBow:weapon({id:'cindervowBow',name:'Cindervow Longbow',weaponType:'bow',skill:'archery',primarySkill:'archery',primaryMultiplier:4,secondarySkill:'spirit',secondaryMultiplier:.65,baseDamage:11,power:5,spirit:3,value:155,traits:['Charred Yew','Copper Binding'],desc:'A Last Dawn bow tempered beside Malakar’s prison. The ember-veined limbs carry the patience of a hunter and the reserves of a spellworker. Any class may wield it.'}),
 dawnwardSpear:weapon({id:'dawnwardSpear',name:'Dawnward Spear',weaponType:'spear',skill:'warding',primarySkill:'warding',primaryMultiplier:3.8,secondarySkill:'blade',secondaryMultiplier:.8,baseDamage:10,power:5,armour:3,spirit:2,value:150,traits:['Ashwood Haft','Dawn Brass'],desc:'A pilgrim-knight’s long spear from Seraphel’s ward. Reach and armour support a warding-trained fighter of any class. Trains Warding with its existing spear moves.'}),
 roseboundCodex:book({id:'roseboundCodex',name:'Rosebound Codex',primaryMultiplier:3.7,baseDamage:10,power:5,spirit:3,focusPower:3,armour:1,staminaCost:7,range:294,projectileSpeed:420,value:135,traits:['Bound Grimoire','Thornwood Cover'],desc:'A green-leather field codex clasped in living rosework. Fires a crimson rosebud with a thorn-leaf tail. Any class may wield this grimoire.'}),
 mortuaryGrimoire:book({id:'mortuaryGrimoire',name:'Veyreign Mortuary Grimoire',primaryMultiplier:4.2,baseDamage:12,power:6,spirit:4,focusPower:4,staminaCost:8,range:315,projectileSpeed:440,value:165,traits:['Bound Grimoire','Graveglass Clasp'],desc:'The Veyreign house’s funerary rites, locked in dark leather and ribbed silver. Fires an ivory rib-bone lance. Any class may wield this grimoire.'}),
 ashenScripture:book({id:'ashenScripture',name:'Ashen Scripture',primaryMultiplier:4.1,baseDamage:12,power:6,spirit:3,focusPower:4,staminaCost:8,range:300,projectileSpeed:475,value:160,traits:['Bound Grimoire','Scorched Vellum'],desc:'A Last Dawn scripture sealed under cracked wax. Fires an ember quill; its fast shot trades reach and mana for pressure. Any class may wield this grimoire.'}),
 dawnLitany:book({id:'dawnLitany',name:'Litany of the Last Dawn',primaryMultiplier:3.95,baseDamage:11,power:5,spirit:3,focusPower:4,armour:2,staminaCost:6,range:302,projectileSpeed:405,value:155,traits:['Bound Grimoire','Ivory Binding'],desc:'A campaign-worn litany bound in ivory leather. Fires a folded vellum page of pale light. An economical grimoire for any class, with a slower projectile.'})
});
export const BOSS_ARMORY_POOLS=Object.freeze({
 grove:Object.freeze(['roseReaper','roseboundCodex']),
 veyreign:Object.freeze(['gravebellMaul','mortuaryGrimoire']),
 malakar:Object.freeze(['cindervowBow','ashenScripture']),
 seraphel:Object.freeze(['dawnwardSpear','dawnLitany'])
});
export const BOSS_ARMORY_DROP_CHANCE=.16;
export function bossArmoryPool(enemy){
 if(!enemy||!(enemy.isBoss||enemy.worldBoss)||enemy.rewardSuppressed||enemy.summonedBy||enemy.summonedByBoss)return null;
 const ids=[enemy.bossId,enemy.bossType,enemy.id,enemy.kind].filter(Boolean).map(v=>String(v).toLowerCase());
 if(enemy.groveMother||ids.includes('motherofbriars')||ids.includes('grovemother')||ids.includes('briartitan'))return 'grove';
 if(enemy.veyreignLord||ids.includes('alistairveyreign')||ids.includes('veyrwarden')||ids.includes('theveyrwarden'))return 'veyreign';
 if(ids.includes('malakar')||ids.includes('demonlord')||ids.includes('malakarsolgatedemonlord'))return 'malakar';
 if(ids.includes('seraphel'))return 'seraphel';
 return null;
}
// One extra themed item at most, using the owning encounter's deterministic RNG.
export function rollBossArmoryLoot(enemy,rng=Math.random){
 const pool=BOSS_ARMORY_POOLS[bossArmoryPool(enemy)];if(!pool||rng()>=BOSS_ARMORY_DROP_CHANCE)return null;
 return {item:pool[Math.min(pool.length-1,Math.floor(Math.max(0,rng())*pool.length))],qty:1,upgradeTier:1};
}
