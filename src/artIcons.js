import {getMythicalVisualStyle} from './mythicalEquipmentData.js';
import {subclassSkillIcon} from './subclassArt.js';
import { techniqueIconMarkup } from './combatTechniqueIcons.js';
import { getAbilityById } from './data.js';
// Raster icon markup; semantic names remain on the containing controls/tooltips.
import {weaponArtIndex} from './equipmentArt.js';
import {FACTION_STYLES} from './enemyVisualProfiles.js';
function factionItemIcon(profile){
 const s=FACTION_STYLES[profile.faction] || getMythicalVisualStyle(profile);if(!s)return null;
 const ink='#17171c',part=profile.visualPart,slot=profile.slot;
 const symbol=s.emblem==='sun'?'<path d="M16 12v8M12 16h8M14 14h4v4h-4z"/>':s.emblem==='chevron'?'<path d="m12 13 4 4 4-4M16 17v3"/>':s.emblem==='eye'?'<path d="m11 16 5-3 5 3-5 3zM16 14v4"/>':s.emblem==='bone'?'<path d="M16 12v8M14 12h4M14 20h4"/>':s.emblem==='flame'?'<path d="m16 11 4 7-4 3-4-3z"/>':s.emblem==='bars'?'<path d="M14 12v8M18 12v8"/>':'<path d="M12 16h8M14 12v8M18 12v8"/>';
 let shape='';
 if(slot==='weapon')shape=profile.weaponType==='bow'?'<path fill="none" d="M11 4q18 12 0 24M11 4l5 12-5 12"/><path d="M5 16h20M23 14l3 2-3 2"/>':profile.weaponType==='staff'?'<path d="M14 10h4v19h-4zM10 3h12v8H10z"/><path d="M13 5h6v4h-6z" fill="'+s.accent+'"/>':'<path d="m16 2 4 5-2 '+(profile.weaponType==='dagger'?12:16)+'h-4L12 7zM9 22h14v3H9zM14 25h4v5h-4z"/>';
 else if(slot==='helm')shape=profile.silhouette==='hood'?'<path fill="'+s.cloth+'" d="m8 27-2-12 4-9 12 0 4 9-2 12h-5V13h-6v14z"/>':'<path d="m6 25 1-15 5-6h8l5 6 1 15-7 3V18h-6v10z"/><path fill="'+ink+'" d="M10 13h12v3H10z"/>'+(s.helm==='crest'?'<path fill="'+s.accent+'" d="M15 1h3v10h-3z"/>':'');
 else if(slot==='chest')shape='<path d="m5 9 7-5h8l7 5-2 9h-5v10H12V18H7z"/><path fill="'+s.cloth+'" d="M12 8h8v20h-8z"/>';
 else if(slot==='legs')shape='<path d="M9 4h14v13l2 11h-8l-1-13-1 13H7l2-11z"/><path fill="'+s.accent+'" d="M9 5h14v3H9z"/>';
 else shape=part==='guard'?'<path d="M6 5h20v13l-10 12L6 18z"/>':'<path fill="'+s.cloth+'" d="m11 3-6 24h22L21 3l-5 4z"/>';
 return `<svg class="inventory-art-icon" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" shape-rendering="crispEdges"><g stroke="${ink}" stroke-width="1" fill="${s.base}">${shape}</g>${slot==='weapon'||slot==='helm'||slot==='legs'?'':`<g fill="none" stroke="${s.accent}" stroke-width="2">${symbol}</g>`}</svg>`;
}
export function sheetIconMarkup(name,index,rows=4,extraClass=''){
  return `<span class="runalis-art-icon ${extraClass}" aria-hidden="true" style="background-image:url('assets/art/sprites/${name}.png');background-size:400% ${rows*100}%;background-position:${index%4*100/3}% ${Math.floor(index/4)*100/(rows-1)}%"></span>`;
}
export function equipmentIconMarkup(item,profile){
  if(profile.faction)return factionItemIcon(profile);
  const text=String(profile.itemId||item?.id||item?.name||'');
  if(text==='tideglassRapier')return `<span class="runalis-art-icon inventory-art-icon" aria-hidden="true" style="background-image:url('assets/art/sprites/tideglass-rapier.png');background-size:contain;background-position:center;background-repeat:no-repeat"></span>`;
  const material=/pickaxe/i.test(text)?0:/rod$/i.test(text)?1:/sickle/i.test(text)?2:/hatchet/i.test(text)?3:/stew|soup|broth|feast|skewer|roast/i.test(text)?4:/ashfruit/i.test(text)?5:/feather/i.test(text)?6:/scrap|plate|steel|silver/i.test(text)&&profile.slot!=='chest'&&profile.slot!=='legs'&&profile.slot!=='helm'&&profile.slot!=='weapon'?7:/dust|ash$|essence|residue/i.test(text)?8:/root|seed/i.test(text)&&item?.type!=='weapon'?9:/resin/i.test(text)?10:/sap|ichor|draught|distillate/i.test(text)?11:/fang|sinew/i.test(text)?12:/eye/i.test(text)?13:/purse|token/i.test(text)?14:/hide/i.test(text)?15:null;
  if(material!==null && !['weapon','chest','helm','legs','trinket'].includes(profile.slot))return sheetIconMarkup('icons-materials',material,4,'inventory-art-icon');
  if(item?.type==='fish')return sheetIconMarkup('icons-extra',9,4,'inventory-art-icon');
  if(item?.type==='reagent')return artIconMarkup(12,'inventory-art-icon');
  if(/shard|quartz|glass|stone|ward/i.test(text)&&['material','loot'].includes(item?.type))return sheetIconMarkup('icons-extra',15,4,'inventory-art-icon');
  if(/bark/i.test(text))return sheetIconMarkup('icons-extra',12,4,'inventory-art-icon');
  if(/fiber/i.test(text))return sheetIconMarkup('icons-extra',13,4,'inventory-art-icon');
  if(['loot','material'].includes(item?.type))return artIconMarkup(15,'inventory-art-icon');
  if(profile.slot==='weapon'){
    const index=weaponArtIndex(text,profile);
    if(index!==null)return sheetIconMarkup(index>=16?'arcane-special':'weapons-equipped',index>=16?index-16:index,4,'inventory-art-icon');
  }
  if(profile.slot==='chest')return sheetIconMarkup('armor-equipped',(profile.silhouette==='plate'?1:profile.silhouette==='robe'?2:0)*4,3,'inventory-art-icon');
  if(profile.slot==='helm')return sheetIconMarkup('headgear-equipped',(/demon|warlord|endless/i.test(text)?3:['crown','halo'].includes(profile.silhouette)?2:profile.silhouette==='hood'?1:0)*4,4,'inventory-art-icon');
  if(profile.slot==='legs')return sheetIconMarkup('accessories-equipped',(/wrap|cloth|grave|robe/i.test(text)?2:/plate|iron|steel|greave|oath/i.test(text)?1:0)*4,4,'inventory-art-icon');
  if(profile.slot==='trinket')return sheetIconMarkup('accessories-equipped',12+(/lantern/i.test(text)?3:/thorn|briar/i.test(text)?2:/grave|lich|void|bone|zephyr|soul/i.test(text)?1:0),4,'inventory-art-icon');
  const other=/mushroom|gravecap/i.test(text)?11:/bread|loaf/i.test(text)?8:/fish|trout|carp|salmon/i.test(text)?9:/meat|steak|ration/i.test(text)?10:/log|wood|timber/i.test(text)?12:/cloth|linen|fabric/i.test(text)?13:/bone|skull/i.test(text)?14:/gem|crystal/i.test(text)?15:null;
  return other===null?null:sheetIconMarkup('icons-extra',other,4,'inventory-art-icon');
}
const WEAPONS=Object.freeze({sword:0,blade:0,dagger:1,axe:2,mace:3,hammer:4,spear:5,bow:6,staff:7,scythe:8,shield:9});
export function artIconMarkup(index,extraClass='') {
  const x=(index%4)*100/3,y=Math.floor(index/4)*100/3;
  return `<span class="runalis-art-icon ${extraClass}" aria-hidden="true" style="background-position:${x}% ${y}%"></span>`;
}
export function weaponIconIndex(type){return WEAPONS[String(type||'').toLowerCase()] ?? null;}
export function itemArtIconIndex(item,profile) {
  if(profile?.slot==='weapon')return weaponIconIndex(profile.weaponType);
  if(item?.type==='currency')return 11;
  if(item?.type==='quest')return /key/i.test(item.name||item.id)?14:15;
  if(/potion|tonic/i.test(item?.name||''))return 10;
  if(/ore|iron chunk|stone chunk/i.test(item?.name||''))return 13;
  if(/herb|flower|petal|sage|moss|poppy/i.test(item?.name||''))return 12;
  return null;
}
export function hudArtIcon(abilityId,fallback,player=null) {
  return subclassSkillIcon(player,baseHudArtIcon(abilityId,fallback),abilityId);
}
function baseHudArtIcon(abilityId,fallback) {
  const technique=techniqueIconMarkup(getAbilityById(abilityId));if(technique)return technique;
  const direct=weaponIconIndex(abilityId);
  if(direct!==null)return artIconMarkup(direct);
  const text=String(abilityId||'');
  if(/dagger/i.test(text))return artIconMarkup(1);
  if(/killzone/i.test(text))return artIconMarkup(6);
  if(/bloodlance|soulsiphon/i.test(text))return sheetIconMarkup('icons-extra',3);
  const extra=/hydro|water|tidal|current|riptide|deluge|wellspring|bubble/i.test(text)?1:/lightbringer|sunrise|gleam|dawn|solar/i.test(text)?2:/eldritch|void|rift|blackstar|crimson/i.test(text)?3:/bomb|flam|hellfire/i.test(text)&&!/smoke/i.test(text)?4:/smoke/i.test(text)?5:/trap|caltrop/i.test(text)?6:/grappl/i.test(text)?7:/guard|oath|bastion|judgment|consecrat|bulwark|lastrite|aegis/i.test(text)?0:null;
  if(extra!==null)return sheetIconMarkup('icons-extra',extra);
  if(/arrow|shot/i.test(text))return artIconMarkup(6);
  if(/slash|cleave|strike/i.test(text))return artIconMarkup(0);
  if(/necro|grave|lich|skeleton/i.test(text))return artIconMarkup(8);
  if(/thorn|briar|vine|root/i.test(text))return artIconMarkup(12);
  return fallback;
}
