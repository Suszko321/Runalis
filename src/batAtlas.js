// Compact runtime sheets contain the original authored poses once. Animation
// keeps the existing 16/48 time slots; only the source-column lookup changes.
export const BAT_ATLASES=Object.freeze({
 bat:'veyreign-bat-beast-compact',
 royal:'veyreign-royal-blood-beast-compact',
 allied:'veyreign-royal-blood-beast-allied-compact'
});
export function batAtlasColumn(family,row,frame){
 if(family==='bat')return Math.floor(frame/4);
 return row===0||row===6?Math.floor(frame/12):Math.floor(frame%12/3);
}
