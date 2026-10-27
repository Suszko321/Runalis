import fs from 'node:fs';
import {ENEMY_SPRITES,TOWN_PROP_SPRITES} from '../src/spriteArt.js';
import {ITEMS} from '../src/data.js';
import {itemArtIconIndex} from '../src/artIcons.js';
const file=new URL('../docs/visual-production/manifest.json',import.meta.url);
const entries=JSON.parse(fs.readFileSync(file,'utf8'));
for(const e of entries){
  const key=e.id.split(':')[1];
  if(e.family==='enemy' && ENEMY_SPRITES[key]){
    e.status='integrated';e.qa='atlas bounds/alpha and live gallery passed; full encounter review pending';
    e.replacement=`${ENEMY_SPRITES[key][0]} row ${ENEMY_SPRITES[key][1]}; idle, two strides, attack anticipation`;
  }else if(e.family==='boss' && ['veyrWarden','hollowElk','demonLord'].includes(key)){
    e.status='integrated';e.qa='live gallery passed; full encounter review pending';e.replacement='bosses-act1 atlas with existing tell/reaction layers';
    e.notes='Malakar phases 2/3 share shattered-mantle art; siege phase enlarged. Dedicated siege anatomy still pending.';
  }else if(e.id==='actor:player' || e.id==='object:npc'){
    e.status='integrated-partial';e.qa='four facings, walk/idle and sword alignment visually reviewed';
    e.notes='Directional male/female body atlases; short/ponytail raster heads; other hairstyles and gear retain existing procedural rendering. Individual NPC identity review pending.';
  }else if(e.family==='prop-variant' && TOWN_PROP_SPRITES[key]){
    e.status='integrated';e.qa='live scenes and atlas checks passed';e.replacement='props-core atlas; original interactions retained';
  }else if(e.family==='scene' && ['act1Opening','maraHouse','capital','overworld','dungeon'].includes(key)){
    e.status='integrated-partial';e.qa='scene render and selected gameplay-state invariance passed';e.notes='Terrain and shared actors/props integrated; architecture, unique interactables and full progression still need review.';
  }else if(e.family==='terrain'){
    e.status='integrated-partial';e.qa='six scene smoke checks passed';e.notes='Shared floor/ground atlas and preserved region overlays; exhaustive biome/edge review pending.';
  }else if(e.family==='item'){
    const item=ITEMS[key];
    if(itemArtIconIndex(item,{slot:item?.slot,weaponType:item?.weaponType})!==null){e.status='integrated-partial';e.qa='shared icon atlas bounds checked';e.notes='Shared family icon; item-specific appearance and all tooltips not exhaustively reviewed.';}
  }
}
for(const name of ['human-male','human-female','enemies-core','enemies-extra','enemies-remaining','bosses-act1','props-core','icons-core','terrain-core']){
  if(entries.some(e=>e.id===`atlas:${name}`))continue;
  entries.push({id:`atlas:${name}`,name,family:'production-atlas',current:`assets/art/sprites/${name}.png`,appearsIn:'Shared runtime',references:['src/spriteArt.js'],purpose:'Shipped raster presentation',replacement:'Generated source, deterministic packing',scale:'See atlas metadata',animations:[],vfx:'Existing stateful overlays retained',ui:name==='icons-core'?'Inventory and combat HUD':'n/a',constraints:'Presentation only',status:'integrated',qa:name==='terrain-core'?'live scene review':'bounds, padding and alpha verified',notes:'Source images and production notes preserved; rebuild with tools/rebuild-art.py'});
}
fs.writeFileSync(file,JSON.stringify(entries,null,2));
const cols=['id','name','family','current','appearsIn','references','purpose','replacement','scale','animations','vfx','ui','constraints','status','qa','notes'];
fs.writeFileSync(new URL('../docs/visual-production/manifest.csv',import.meta.url),cols.join(',')+'\n'+entries.map(e=>cols.map(k=>'"'+String(Array.isArray(e[k])?e[k].join('; '):e[k]||'').replaceAll('"','""')+'"').join(',')).join('\n'));
console.log(JSON.stringify(Object.fromEntries(Object.entries(Object.groupBy(entries,e=>e.status)).map(([k,v])=>[k,v.length])),null,2));
