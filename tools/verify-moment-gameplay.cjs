const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const out='docs/moment-gameplay/regressions';fs.mkdirSync(out,{recursive:true});
if(!process.env.RUNALIS_CANVAS_MODULE&&process.env.RUNALIS_NODE_MODULES)process.env.RUNALIS_CANVAS_MODULE=path.join(process.env.RUNALIS_NODE_MODULES,'@napi-rs/canvas');
const suites=['verify-gameplay-ai.mjs','verify-gameplay-movement.mjs','verify-gameplay-discoveries.mjs',
 'verify-enemy-combat.mjs','verify-enemy-visibility.mjs','verify-enemy-pursuit.mjs','verify-enemy-separation.mjs',
 'verify-enemy-respawn-visibility.mjs','verify-elite-hazards.mjs','verify-enemy-density.mjs',
 'verify-combat-overhaul.mjs','verify-subclasses.mjs','verify-progression-overhaul.mjs','verify-loot-overhaul.mjs',
 'verify-continent-runtime.mjs','verify-continent-persistence.mjs','verify-continent-access.mjs','verify-malakar-climax.mjs','verify-animation.mjs',
 'verify-gameplay-browser.cjs','verify-enemy-combat-browser.cjs','verify-subclasses-browser.cjs','verify-loot-browser.cjs','verify-malakar-browser.cjs'];
const report={date:new Date().toISOString(),suites:[],pass:false};
for(const suite of suites){
 const start=Date.now(),result=spawnSync(process.execPath,['tools/'+suite],{encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024});
 fs.writeFileSync(`${out}/${suite}.log`,(result.stdout||'')+(result.stderr||'')+(result.error?.message||''));
 const entry={suite,pass:result.status===0&&!result.error,durationMs:Date.now()-start};report.suites.push(entry);console.log(`${entry.pass?'PASS':'FAIL'} ${suite}`);
 if(!entry.pass){fs.writeFileSync(`${out}/results.json`,JSON.stringify(report,null,2));console.error(((result.stdout||'')+(result.stderr||'')+(result.error?.message||'')).slice(-5000));process.exit(1);}
}
report.pass=true;fs.writeFileSync(`${out}/results.json`,JSON.stringify(report,null,2));console.log('PASS '+report.suites.length+' gameplay and existing regression suites');
