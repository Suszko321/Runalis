import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {humanFrame} from '../src/spriteArt.js';
const root=path.resolve(import.meta.dirname,'..');
const sources=fs.readdirSync(path.join(root,'src')).filter(f=>f.endsWith('.js'));
let imports=0;
for(const file of sources){
  const full=path.join(root,'src',file),text=fs.readFileSync(full,'utf8');
  execFileSync(process.execPath,['--check',full],{stdio:'pipe'});
  for(const match of text.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)){
    assert.ok(fs.existsSync(path.resolve(path.dirname(full),match[1].split('?')[0])),`Missing import ${file}: ${match[1]}`);imports++;
  }
}
const baseline=path.resolve(root,'../Runalis-visual-baseline-20260924/src');
const protectedFiles=['player.js','combat.js','combatMoves.js','combatActions.js','enemyAI.js','enemyBehaviors.js','world.js','worldContent.js','worldMapData.js','overworldTerrain.js','dungeonSystem.js','bossSystem.js','bossData.js','questSystem.js','questData.js','storyProgress.js','saveProfiles.js','act1OpeningSystem.js','gameInteraction.js','data.js','main.js'];
const authorized=JSON.parse(fs.readFileSync(path.join(root,'docs/visual-production/authorized-gameplay-changes.json'),'utf8'));
for(const file of protectedFiles){
 const current=fs.readFileSync(path.join(root,'src',file));
 if(authorized.files[file])assert.equal(createHash('sha256').update(current).digest('hex'),authorized.files[file],`Gameplay file differs from reviewed authorized change: ${file}`);
 else assert.deepEqual(current,fs.readFileSync(path.join(baseline,file)),`Simulation file changed: ${file}`);
}
assert.equal(humanFrame({state:'idle',gaitKey:2}),0);
assert.equal(humanFrame({state:'death',gaitKey:2}),0);
assert.deepEqual([0,1,2,3].map(gaitKey=>humanFrame({state:'walk',gaitKey})),[1,2,3,0]);
const report={date:new Date().toISOString(),syntaxModules:sources.length,resolvedImports:imports,unchangedGameplayFiles:protectedFiles.length-Object.keys(authorized.files).length,authorizedGameplayChanges:Object.keys(authorized.files),animationFrameContracts:'passed'};
fs.writeFileSync(path.join(root,'docs/visual-production/code-checks.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
