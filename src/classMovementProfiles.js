import {normalizeSubclassClassId} from './subclassData.js';
export const CLASS_MOVEMENT_PROFILES=Object.freeze({
 gravecaller:{motif:'spectral',color:'#9fb9cc',light:'#d8d6f0',bob:-2,lean:.025,arm:-1,cloak:4},
 oathkeeper:{motif:'momentum',color:'#c4aa75',light:'#eee0b9',bob:0,lean:.065,arm:-3,cloak:1},
 fellhunter:{motif:'streak',color:'#87ac8a',light:'#d3e4bc',bob:-3,lean:.085,arm:-4,cloak:3},
 lightbringer:{motif:'radiant',color:'#dfbd6a',light:'#fff1c3',bob:-2,lean:.025,arm:-1,cloak:5},
 thornbinder:{motif:'leaves',color:'#82a36b',light:'#d4d99b',bob:-1,lean:.045,arm:-2,cloak:3},
 waverider:{motif:'current',color:'#75bbd2',light:'#d0edee',bob:-1,lean:.035,arm:-1,cloak:4}
});
export function classMovementProfile(classId){return CLASS_MOVEMENT_PROFILES[normalizeSubclassClassId(classId)]||null;}
