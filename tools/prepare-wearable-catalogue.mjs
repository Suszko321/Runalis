// Authoring manifest: every existing non-weapon equipment ID has an explicit design.
import fs from 'node:fs';
import {ITEMS} from '../src/data.js';
import {getGearVisualProfile} from '../src/gearVisualStyle.js';
const root='docs/wearable-catalogue';fs.mkdirSync(root,{recursive:true});
const designs={
 drownedConvergenceHelm:'narrow dark teal tidal diadem, silver wave tines, small cyan stone',drownedConvergenceChest:'dark teal fitted vestment, silver wave piping, cyan central clasp',
 beastSovereignHelm:'small brown leather and antique gold antler diadem, wolf fang centre',beastSovereignLegs:'brown hide greaves, pale gold fur knee edging, claw buckles, fitted boots',
 ashenExecutionerChest:'charred brown leather cuirass with diagonal scorched red bands and dull copper clasps',ashenExecutionerLegs:'charcoal fitted greaves, burned copper knee plates, ember orange stitching, dark boots',
 blightedStarHelm:'narrow violet-black star diadem with tiny pale lilac stones, no glow',pilgrimVigilChest:'sage steel fitted breastplate with worn ivory front panel and tiny sun fastening',pilgrimVigilLegs:'sage steel shin guards, linen straps, charcoal trousers and brown boots',
 crownOfTheEndless:'narrow blackened iron crown with three pale bone points and amethyst centre',oathplateOfTheLastDawn:'layered dark silver breastplate, burgundy divided-sun panel and tarnished gold edging',ashboundMantle:'soot grey fitted mantle vest, burnt orange collar edging and charcoal clasp',sunforgedHalo:'small isolated antique gold open ring halo, no rays or glow, transparent centre',
 briarCovenantGreaves:'forest green fitted legwear, thorn-wrapped shin plates, muted red ties and brown boots',blackstarGreaves:'blackened fitted greaves, dark crimson facets and restrained red seam, no glow',
 clothHood:'plain weathered ochre linen hood, patched seam, transparent face aperture',crackedIronCap:'dark worn iron open-face cap, visible crack and brown chin strap',knightHelm:'dark silver open-face knight sallet, narrow antique brass rim',necromancerHood:'deep plum hood, bone edging, small pewter clasp, transparent face',watcherHood:'slate blue hood, pale blue seam and small eye clasp, transparent face',
 patchedTunic:'fitted ochre cloth tunic vest, visible pale patches, simple cord waist',leatherVest:'fitted chestnut leather vest with broad diagonal strap and small iron buckle',wardedChest:'fitted silver breastplate, engraved small ward clasp and brass binding',graveboundChest:'dark violet grey layered iron cuirass with bone centre clasp and restrained purple stitches',knightChest:'layered steel knight breastplate, narrow brass edging and dark leather waist straps',necromancerRobe:'deep plum fitted ceremonial vest, bone fasteners and muted violet panels',thornbinderGarb:'moss green fitted cloth vest, russet leaf embroidery, brown cord fasteners',battleMageCoat:'fitted brown and navy combat coat torso, small bronze rune clasps',rogueLeathers:'asymmetric charcoal leather vest, red brown shoulder strap and steel buckles',cultistMantle:'dark burgundy ceremonial fitted vest with divided-sun symbol and black binding',veyrCourtCoat:'tailored blue grey noble coat torso, silver piping and pale blue clasps',roughLegwraps:'fitted rough dark brown legwraps with ochre binding and worn brown boots',ironGreaves:'fitted weathered steel shin plates over charcoal trousers and dark brown boots',watcherGreaves:'fitted slate blue shin guards, silver binding and charcoal boots',scavengedIronHelm:'open-face dented iron cap with mismatched dark repair plate and small rivets',roadwardenCoat:'fitted brown roadwarden coat torso, olive lapel and simple leather belt',graveclothGreaves:'fitted plum charcoal legwraps, bone cord ties and dark brown boots',brigandMask:'short brown scout hood with lower-face charcoal leather mask, transparent eye aperture',veyrSilkMantle:'fitted slate blue silk vestment with fine silver collar and restrained pale blue brocade',blackbriarCrown:'narrow thornwood circlet, moss leaves and small dark red thorns'
};
const manifest={body:[],accessories:[],prompts:[]};
const factions=['Roadless','EmberVeil','GraveCult','Watcher','Veyr'];
for(const faction of factions){
 const sheet='player-wearables-'+faction.replace(/[A-Z]/g,(c,i)=>(i?'-':'')+c.toLowerCase());
 for(const [row,part]of ['Helm','Chest','Legs','Robe','ScoutHelm','ScoutChest'].entries()){
  const id=`enemy${faction}${part}`,p=getGearVisualProfile(id,ITEMS[id]);manifest.body.push({id,sheet,row,rows:6,part:ITEMS[id].slot==='helm'?0:ITEMS[id].slot==='chest'?1:2,color:p.base,iconColumns:6});
 }
}
const core=Object.values(ITEMS).filter(i=>['helm','chest','legs'].includes(i.slot)&&!i.endgameExclusive&&!i.enemyCollectible&&!['graveboundHelm','patchedRoadLeathers','graveboundGreaves'].includes(i.id));
for(const [n,item]of core.entries()){
 if(!designs[item.id])throw Error('Missing art direction '+item.id);
 const group=Math.floor(n/8),p=getGearVisualProfile(item.id,item),ornament=['crown','halo'].includes(p.silhouette);
 manifest.body.push({id:item.id,sheet:`player-wearables-collection-${group+1}`,row:n%8,rows:8,part:{helm:0,chest:1,legs:2}[item.slot],color:p.base,iconColumns:8,
  ...(ornament?{headOffset:p.silhouette==='halo'?-10:-5,rects:[[20,8,24,p.silhouette==='halo'?7:12],[21,9,22,p.silhouette==='halo'?7:11]]}:{}),design:designs[item.id]});
}
const accessories=Object.values(ITEMS).filter(i=>i.slot==='trinket'&&!i.endgameExclusive);
for(const [n,item]of accessories.entries()){
 const p=getGearVisualProfile(item.id,item),kind=item.visualPart==='trinket'?'cloak':item.visualPart==='guard'||/shield|aegis|bulwark/i.test(item.id)?'shield':/ring|signet/i.test(item.id)?'ring':item.id==='runalisLantern'?'lantern':'charm';
 const details={crackedVowShield:'cracked dark iron kite shield with faded ivory vow cross',ironwoodShield:'round iron-banded brown wooden shield',dawnwardAegis:'silver and brass kite shield, small sun insignia',oathboundBulwark:'heavy dark silver tower shield, antique gold oath emblem',runalisLantern:'small weathered brass lantern with warm pale glass, no surrounding glow',zephyrglassAmulet:'silver pendant with blue grey faceted glass',seraphsBrokenWing:'small ivory broken feather wing relic with gold binding',thornCharm:'thornwood knot charm with one dull red bead',paleRune:'bone rune pendant on dark cord',ironOathRing:'dark steel signet ring with tiny brass oath inset',redSealRing:'dark silver ring with red wax-like stone',watcherGlassCharm:'slate blue glass eye pendant with silver edging',waterSaintCharm:'weathered silver water drop medallion',tideglassHeart:'faceted turquoise glass heart in dark silver prongs',orrakaiFoundersSignet:'antique brass signet ring, dark inset and tiny founder crest',preservedNameCharm:'worn brown cord and small engraved iron name tag',neutralMemorialSeal:'restrained aged silver memorial seal with small open circle inscription'};
 const design=details[item.id]||`${item.name}, ${kind}, ${p.base} main material and ${p.accent} restrained accent; ${item.visualFactionId||item.setId||p.archetype} identity, practical dark fantasy craftsmanship`;
 const ringColors={ironOathRing:['#24262a','#8b8980','#c2a572'],redSealRing:['#292126','#aa4846','#d28a78']};
 manifest.accessories.push({id:item.id,sheet:`player-accessories-collection-${Math.floor(n/7)+1}`,row:n%7,rows:7,part:3,kind,iconColumns:7,design,...(ringColors[item.id]?{ringColors:ringColors[item.id]}:{})});
}
for(const sheet of [...new Set([...manifest.body,...manifest.accessories].map(i=>i.sheet))])manifest.prompts.push({sheet,rows:[...manifest.body,...manifest.accessories].filter(i=>i.sheet===sheet).map(i=>({id:i.id,design:i.design}))});
fs.writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
const art=Object.fromEntries([...manifest.body,...manifest.accessories].map(({id,design,...fit})=>[id,fit]));
fs.writeFileSync('src/playerWearableCatalogue.js','// Explicit authored catalogue registrations. Generated by tools/prepare-wearable-catalogue.mjs.\nexport const WEARABLE_CATALOGUE_ART='+JSON.stringify(art,null,2)+';\n');
console.log(JSON.stringify({body:manifest.body.length,accessories:manifest.accessories.length,core:core.length,sheets:manifest.prompts.length}));

