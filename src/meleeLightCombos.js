// Light chains are available at every proficiency level. These timings are
// authored separately from the existing heavy attacks and ranged movesets.
const strike=(type,step,name,kind,family,timing,stats)=>({
 id:`${type}_light_${step}`,name,kind,attackFamily:family,comboType:'light',
 duration:timing[0],startup:timing[1],activeStart:timing[1],activeEnd:timing[2],recovery:timing[0]-timing[2],
 unlockLevel:1,lightCombo:true,lightComboStep:step,finisher:step===3,...stats
});
const chain=(restartDelay,moves)=>({restartDelay,moves:moves.map(move=>Object.freeze({...move,comboRestartDelay:restartDelay}))});

export const MELEE_LIGHT_COMBOS=Object.freeze({
 dagger:chain(.24,[
  strike('dagger',1,'Quick Stab','line','thrust',[.28,.07,.14],{staminaCost:4,range:40,width:18,damageMultiplier:.85,knockback:10,stagger:.04,impact:'slash'}),
  strike('dagger',2,'Returning Cut','arc','reverseSlash',[.32,.08,.17],{staminaCost:5,range:42,arcDegrees:74,damageMultiplier:1,knockback:14,stagger:.06,impact:'slash'}),
  strike('dagger',3,'Crosscut','arc','slash',[.42,.11,.23],{staminaCost:6,range:46,arcDegrees:96,damageMultiplier:1.3,knockback:22,stagger:.14,impact:'slash'})
 ]),
 sword:chain(.32,[
  strike('sword',1,'Rising Cut','arc','reverseSlash',[.38,.10,.23],{staminaCost:6,range:48,arcDegrees:78,damageMultiplier:1,knockback:20,stagger:.08,impact:'slash'}),
  strike('sword',2,'Falling Cut','arc','slash',[.40,.11,.25],{staminaCost:7,range:52,arcDegrees:88,damageMultiplier:1.1,knockback:24,stagger:.10,impact:'slash'}),
  strike('sword',3,'Crossing Cleave','arc','heavySlash',[.52,.14,.31],{staminaCost:8,range:57,arcDegrees:104,damageMultiplier:1.4,knockback:36,stagger:.22,impact:'slash'})
 ]),
 axe:chain(.40,[
  strike('axe',1,'Diagonal Chop','arc','slash',[.46,.14,.29],{staminaCost:7,range:48,arcDegrees:72,damageMultiplier:1.08,knockback:24,stagger:.12,impact:'slash'}),
  strike('axe',2,'Returning Hack','arc','reverseSlash',[.49,.15,.31],{staminaCost:8,range:50,arcDegrees:82,damageMultiplier:1.18,knockback:28,stagger:.16,impact:'slash'}),
  strike('axe',3,'Overhead Cleave','arc','slam',[.64,.20,.40],{staminaCost:10,range:56,arcDegrees:94,damageMultiplier:1.55,knockback:42,stagger:.28,impact:'heavySlash'})
 ]),
 mace:chain(.43,[
  strike('mace',1,'Forehand Blow','arc','maceForehand',[.48,.16,.27],{staminaCost:6,range:44,arcDegrees:76,damageMultiplier:1,knockback:24,stagger:.14,impact:'bluntImpact'}),
  strike('mace',2,'Backhand Blow','arc','maceBackhand',[.52,.18,.30],{staminaCost:7,range:46,arcDegrees:86,damageMultiplier:1.12,knockback:28,stagger:.18,impact:'bluntImpact'}),
  strike('mace',3,'Crushing Blow','arc','maceSlam',[.68,.24,.38],{staminaCost:9,range:50,arcDegrees:96,damageMultiplier:1.45,knockback:42,stagger:.30,impact:'groundSlam'})
 ]),
 hammer:chain(.48,[
  strike('hammer',1,'Low Sweep','arc','maceBackhand',[.55,.18,.34],{staminaCost:8,range:50,arcDegrees:90,damageMultiplier:1.12,knockback:28,stagger:.18,impact:'bluntImpact'}),
  strike('hammer',2,'Overhead Blow','arc','maceSlam',[.60,.20,.36],{staminaCost:9,range:52,arcDegrees:70,damageMultiplier:1.25,knockback:34,stagger:.22,impact:'bluntImpact'}),
  strike('hammer',3,'Crushing Sweep','arc','maceForehand',[.72,.24,.45],{staminaCost:11,range:57,arcDegrees:112,damageMultiplier:1.65,knockback:50,stagger:.34,impact:'groundSlam'})
 ]),
 spear:chain(.32,[
  strike('spear',1,'Short Jab','line','thrust',[.35,.09,.19],{staminaCost:5,range:68,width:20,damageMultiplier:.92,knockback:14,stagger:.08,impact:'staffHit'}),
  strike('spear',2,'Long Thrust','line','thrust',[.40,.10,.22],{staminaCost:6,range:78,width:22,damageMultiplier:1.1,knockback:20,stagger:.12,impact:'staffHit'}),
  strike('spear',3,'Sweeping Cut','arc','slash',[.52,.14,.31],{staminaCost:8,range:70,arcDegrees:112,damageMultiplier:1.35,knockback:30,stagger:.20,impact:'slash'})
 ]),
 staff:chain(.30,[
  strike('staff',1,'Staff Swing','arc','slash',[.42,.12,.26],{staminaCost:5,range:58,arcDegrees:100,damageMultiplier:.92,knockback:20,stagger:.10,impact:'staffHit'}),
  strike('staff',2,'Returning Sweep','arc','reverseSlash',[.44,.12,.27],{staminaCost:6,range:60,arcDegrees:112,damageMultiplier:1.05,knockback:24,stagger:.14,impact:'staffHit'}),
  strike('staff',3,'Driving Thrust','line','thrust',[.50,.14,.29],{staminaCost:8,range:72,width:26,damageMultiplier:1.32,knockback:38,stagger:.24,impact:'staffHit'})
 ]),
 scythe:chain(.42,[
  strike('scythe',1,'Wide Reap','arc','scytheSweep',[.49,.13,.30],{staminaCost:8,range:66,arcDegrees:124,damageMultiplier:1.08,knockback:24,stagger:.10,impact:'spiritSlash'}),
  strike('scythe',2,'Returning Hook','arc','scytheSweep',[.53,.14,.32],{swingDirection:-1,staminaCost:9,range:62,arcDegrees:98,damageMultiplier:1.2,knockback:30,stagger:.16,impact:'spiritSlash'}),
  strike('scythe',3,'Reaping Sweep','arc','scytheSweep',[.66,.20,.40],{staminaCost:11,range:74,arcDegrees:140,damageMultiplier:1.55,knockback:42,stagger:.26,impact:'spiritSlash'})
 ]),
 unarmed:chain(.24,[
  strike('unarmed',1,'Jab','line','unarmed',[.28,.07,.14],{staminaCost:3,range:30,width:18,damageMultiplier:.6,knockback:8,stagger:.04,impact:'punch'}),
  strike('unarmed',2,'Cross','line','unarmed',[.32,.08,.17],{swingDirection:-1,staminaCost:3,range:34,width:20,damageMultiplier:.7,knockback:12,stagger:.06,impact:'punch'}),
  strike('unarmed',3,'Hook','arc','slash',[.42,.11,.23],{staminaCost:4,range:36,arcDegrees:84,damageMultiplier:.95,knockback:20,stagger:.12,impact:'punch'})
 ])
});

export function getMeleeLightCombo(weaponType) {
 return MELEE_LIGHT_COMBOS[weaponType]||null;
}
