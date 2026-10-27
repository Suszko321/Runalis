import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { ABILITIES,getAbilityById } from '../src/data.js';
import { SKILL_TREE_NODES } from '../src/skillTreeSystem.js';
import { getAbilityIconPath,techniqueIconMarkup } from '../src/combatTechniqueIcons.js';
import { getPassiveIconArt,skillTreeIconMarkup } from '../src/skillTreeIconArt.js';
import { getSignatureAbilityProfile } from '../src/animationProfiles.js';
import { drawSkillPresentation } from '../src/skillPresentationRenderer.js';
const require=createRequire(import.meta.url),{createCanvas}=require(process.env.RUNALIS_CANVAS_MODULE||'@napi-rs/canvas');
const canvas=createCanvas(320,240),ctx=canvas.getContext('2d');
const silhouettes=new Set(),motions=new Set(),emblems=new Set();let renders=0;
for(const a of ABILITIES){
 const path=getAbilityIconPath(a);assert.ok(path,`No icon: ${a.id}`);assert.ok(!silhouettes.has(path),`Shared silhouette: ${a.id}`);silhouettes.add(path);
 assert.ok(fs.existsSync(`assets/combat-icons/${a.id}.svg`));assert.ok(techniqueIconMarkup(a).includes(`/${a.id}.svg`));
 const profile=getSignatureAbilityProfile(a.id);assert.ok(profile);assert.ok(!motions.has(profile.id),`Shared motion profile: ${a.id}`);motions.add(profile.id);
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])for(const tier of [0,2,5])for(const phase of ['release','impact'])for(const age of [.06,.25,.45]){
  const effect={kind:'abilityPresentation',abilityId:a.id,x:160,y:130,dirX:dx,dirY:dy,ttl:.6,age,phase,masteryTier:tier,chargeLevel:2};
  const before=JSON.stringify(effect);ctx.clearRect(0,0,320,240);ctx.globalAlpha=.73;ctx.lineWidth=7;
  const transform=ctx.getTransform(),alpha=ctx.globalAlpha;assert.equal(drawSkillPresentation(ctx,effect,{x:0,y:0}),true);
  assert.equal(JSON.stringify(effect),before);assert.equal(ctx.globalAlpha,alpha);assert.equal(ctx.lineWidth,7);assert.deepEqual(ctx.getTransform(),transform);
  assert.ok(ctx.getImageData(0,0,320,240).data.some(v=>v!==0),`Blank effect ${a.id}`);renders++;
 }
}
for(const node of Object.values(SKILL_TREE_NODES)){
 const markup=skillTreeIconMarkup(node),path=markup.match(/src="([^"]+)"/)[1];assert.ok(fs.existsSync(path),`Broken tree icon: ${node.id}`);
 if(node.unlocksAbility)continue;
 const emblem=JSON.stringify(getPassiveIconArt(node));
 // The six Base Mastery endpoints deliberately share their hybrid-build crown.
 // Ordinary passives and weapon nodes still require distinct authored emblems.
 if(!(node.expertise&&node.expertise.family==='base'))assert.ok(!emblems.has(emblem),`Shared passive emblem ${node.id}`);
 emblems.add(emblem);
}
for(const [alias,id] of [['heavyCut','oathkeeperOathStrike'],['necromancerNecroticBolt','graveSpark']]){
 const a=getAbilityById(alias);if(a)assert.equal(getAbilityIconPath(a),getAbilityIconPath(getAbilityById(id)));
}
const report={activeSilhouettes:silhouettes.size,individualMotionProfiles:motions.size,passiveEmblems:emblems.size,renderedEffects:renders,directions:4,masteryTiers:[0,2,5],renderInputsUnchanged:true,canvasStateRestored:true,treeAssetsPresent:true};
fs.writeFileSync('docs/combat-overhaul/skill-art-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
