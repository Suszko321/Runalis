// A small portable gate. Broader feature and browser suites remain necessary.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../',import.meta.url));
const suites = ['audit-engineering-foundation.mjs','verify-profile-storage.mjs','verify-bubble-ward-save.mjs',
  'verify-coop-session-state.mjs','verify-coop-readiness.mjs','verify-continent-persistence.mjs',
  'verify-online-protocol.mjs','verify-party-entry.mjs','verify-mercy-aid-migration.mjs',
  'verify-long-term-progression.mjs','verify-hotbar-assignment.mjs'];
let failed = 0;
for (const suite of suites) {
  const result = spawnSync(process.execPath,['tools/'+suite],{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
  const pass = result.status===0 && !result.error;
  console.log(`${pass?'PASS':'FAIL'} ${suite}`);
  if (!pass) {failed++;console.error((result.stdout||'')+(result.stderr||'')+(result.error?.message||''));}
}
console.log(`${suites.length-failed}/${suites.length} engineering checks passed. This gate does not certify all gameplay, browser or network behavior.`);
if (failed) process.exitCode=1;
