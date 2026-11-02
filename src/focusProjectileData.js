// One authored silhouette per currently supported focus. This identity is
// latched on the attack move, not read from a later equipment selection.
import {LEGENDARY_FOCUS_STYLES} from './legendaryWeaponData.js';
import {COMMON_FOCUS_STYLES} from './commonWeaponData.js';
export const FOCUS_PROJECTILE_STYLES=Object.freeze({...Object.fromEntries([
 ['crackedDawnlens','Sun splinter','#e8d293'],['pilgrimsFocus','Spirit wisp','#b58bd6'],
 ['sealglassPrism','Prism shard','#75dce5'],['moonlitReliquary','Moon crescent','#d7dfed'],
 ['veyrGraveLens','Graveglass comet','#a5cce8'],['redSealConductor','Wax-seal disc','#c45053'],
 ['sunfractureGauntlet','Sunburst','#efca77'],['uncrownedPrism','Broken halo','#f0e6c8'],
 ['spiritwoodFocus','Leaf spear','#78b684'],['dawncarverLens','Dawn blade','#e7bd6c'],
 ['everdawnCarver','Twin dawn rays','#f6dea0'],['roseboundCodex','Rosebud','#b84d62'],
 ['mortuaryGrimoire','Rib-bone lance','#d9d2bd'],['ashenScripture','Ember quill','#e69054'],
 ['dawnLitany','Vellum page','#efdfb5']
].map(([id,name,color],index)=>[id,Object.freeze({index,name,color})])),...LEGENDARY_FOCUS_STYLES,...COMMON_FOCUS_STYLES});
