import {playSfx} from './audioSystem.js';

// Identity is redundant: silhouette/motion, palette and a short audio motif.
// Reaction floors cover low ground cues/foreground occlusion, not player gear.
export const ELITE_CUE_PROFILES=Object.freeze({
 freezer:{symbol:'snowflake',colors:['#172b3d','#64a5b9','#d5fff2'],minimumWarning:1.35,motif:[1040,1560,2080],wave:'sine',noise:4200},
 shatter:{symbol:'ice-crown',colors:['#203649','#a6dde4','#f4fff4'],minimumWarning:1.15,motif:[1560,2080,780],wave:'triangle',noise:5600},
 waller:{symbol:'chains',colors:['#26141a','#d04a2c','#ffb651'],minimumWarning:1.3,motif:[82,123,67],wave:'square',noise:380},
 chamber:{symbol:'infernal-sun',colors:['#2b1018','#ed5530','#ffe19b'],minimumWarning:1.35,motif:[110,165,55],wave:'sawtooth',noise:600},
 artillery:{symbol:'crosshair',colors:['#30212a','#e79854','#ffe4ab'],minimumWarning:1.4,committedWarning:1.05,motif:[170,510,340],wave:'square',noise:1200},
 shocker:{symbol:'lightning',colors:['#252546','#8ab9de','#fff3ac'],minimumWarning:.95,motif:[740,1480,370],wave:'sawtooth',noise:3200},
 vortex:{symbol:'spiral',colors:['#24152e','#9472bd','#e2bcdf'],minimumWarning:1.35,motif:[220,147,98],wave:'sine',noise:240},
 collapse:{symbol:'black-star',colors:['#1c1129','#a178bc','#f1cce9'],minimumWarning:1,motif:[196,98,49],wave:'triangle',noise:180},
 molten:{symbol:'flame',colors:['#301b19','#c74128','#ffa144'],minimumWarning:1.15,motif:[96,128,80],wave:'sawtooth',noise:850},
 moltenDeath:{symbol:'volcanic-crown',colors:['#30131c','#e94826','#ffe38c'],minimumWarning:1.65,motif:[72,108,36],wave:'square',noise:480},
 bulwark:{symbol:'shield',colors:['#252329','#a89468','#f5e2a3'],minimumWarning:1,motif:[360,540,270],wave:'triangle',noise:2400},
 regenerator:{symbol:'branches',colors:['#18291d','#689565','#d4efaa'],minimumWarning:1.8,motif:[294,440,587],wave:'sine',noise:1500}
});
export function eliteCueProfile(kind){return ELITE_CUE_PROFILES[kind]||ELITE_CUE_PROFILES.artillery;}
export function eliteCueRecipe(kind,phase='warning'){
 const p=eliteCueProfile(kind),[a,b,c]=p.motif;
 // Each phase is brief and bounded. Locks are crisp; impacts are low/noisy;
 // acquisition and preparation use the family motif. No per-frame audio.
 if(phase==='cancel')return {tones:[{frequency:b,duration:.09,wave:'triangle',gain:.055,bend:-b*.45,delay:0}],noise:{duration:.04,gain:.04,cutoff:p.noise}};
 if(phase==='guard')return {tones:[{frequency:a,duration:.12,wave:p.wave,gain:.06,delay:0}],noise:{duration:.045,gain:.045,cutoff:p.noise}};
 if(phase==='lock'||phase==='launch')return {tones:[{frequency:b,duration:.08,wave:p.wave,gain:.085,delay:0},{frequency:c,duration:kind==='artillery'?.32:.13,wave:kind==='artillery'?'sine':p.wave,gain:.065,bend:kind==='artillery'?-c*.7:0,delay:.06}],noise:{duration:.045,gain:.075,cutoff:p.noise}};
 if(phase==='impact')return {tones:[{frequency:kind==='freezer'||kind==='shatter'?c:a*.65,duration:.22,wave:p.wave,gain:.08,bend:-a*.18,delay:0},{frequency:c*.5,duration:.14,wave:'triangle',gain:.045,delay:.035}],noise:{duration:['artillery','moltenDeath','chamber'].includes(kind)?.19:.095,gain:.13,cutoff:p.noise}};
 return {tones:[{frequency:a,duration:.15,wave:p.wave,gain:.07,delay:0},{frequency:b,duration:.17,wave:p.wave,gain:.065,delay:.11},{frequency:c,duration:.19,wave:p.wave,gain:.05,delay:.24}],noise:{duration:.08,gain:.025,cutoff:p.noise}};
}
export function playEliteCue(kind,phase='warning',danger='major'){
 playSfx('eliteHazard',{recipe:eliteCueRecipe(kind,phase),throttleKey:'elite:'+kind+':'+phase,throttle:phase==='impact'?.16:.12,volume:danger==='minor'?.45:danger==='execution'?1:.8});
}
