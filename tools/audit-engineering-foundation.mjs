// Repository inventory and syntax/import evidence, not a dead-code detector.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build, transform} from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const slash = value => value.replaceAll('\\', '/');
function walk(relative) {
  if (!fs.existsSync(path.join(root, relative))) return [];
  return fs.readdirSync(path.join(root, relative), {withFileTypes:true}).flatMap(entry => {
    const name = path.posix.join(relative, entry.name);
    return entry.isDirectory() ? walk(name) : [name];
  });
}
const directories = ['src', 'tools', 'assets', 'docs', 'Runalis', '.github'];
const inventory = Object.fromEntries(directories.map(dir => [dir, walk(dir)]));
const scripts = [...inventory.src, ...inventory.tools, ...inventory.Runalis].filter(file => /\.(?:js|mjs|cjs)$/.test(file));
const syntaxFailures = [];
for (const file of scripts) {
  try { await transform(fs.readFileSync(path.join(root, file), 'utf8'), {loader:'js', sourcefile:file, logLevel:'silent'}); }
  catch (error) { syntaxFailures.push({file, message:error.message}); }
}
const bundle = await build({absWorkingDir:root, entryPoints:['src/boot.js'], bundle:true, write:false,
  format:'esm', platform:'browser', target:['safari15.4','chrome100','firefox100'], metafile:true, logLevel:'silent'});
const inputs = bundle.metafile.inputs;
const graph = new Map();
for (const [name, data] of Object.entries(inputs)) {
  const file = slash(name).split(/[?#]/)[0];
  if (!graph.has(file)) graph.set(file, new Set());
  for (const item of data.imports) if (!item.external) graph.get(file).add(slash(item.path).split(/[?#]/)[0]);
}
// Tarjan components expose dependency cycles without labelling every cycle a bug.
let serial = 0;
const indices = new Map(), low = new Map(), stack = [], active = new Set(), cycles = [];
function visit(file) {
  indices.set(file, serial); low.set(file, serial++); stack.push(file); active.add(file);
  for (const next of graph.get(file) || []) {
    if (!indices.has(next)) { visit(next); low.set(file, Math.min(low.get(file), low.get(next))); }
    else if (active.has(next)) low.set(file, Math.min(low.get(file), indices.get(next)));
  }
  if (low.get(file) !== indices.get(file)) return;
  const component = [];
  let member;
  do { member = stack.pop(); active.delete(member); component.push(member); } while (member !== file);
  if (component.length > 1 || graph.get(file)?.has(file)) cycles.push(component.sort());
}
for (const file of graph.keys()) if (!indices.has(file)) visit(file);
cycles.sort((a,b) => b.length - a.length);
const roots = fs.readdirSync(root).filter(file => file.endsWith('.html'));
const nonStartup = inventory.src.filter(file => file.endsWith('.js') && !graph.has(file));
const queryImports = [];
for (const file of inventory.src.filter(file => file.endsWith('.js') && !file.includes('/vendor/'))) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)['"]([^'"]+[?][^'"]*)['"]/g)) {
    queryImports.push(`${file}:${source.slice(0, match.index).split('\n').length} → ${match[1]}`);
  }
}
const importers = new Map();
for (const [file, dependencies] of graph) for (const dependency of dependencies) {
  if (!importers.has(dependency)) importers.set(dependency, []);
  importers.get(dependency).push(file);
}
const top = [...importers].sort((a,b) => b[1].length-a[1].length).slice(0,15);
const largest = inventory.src.filter(file => file.endsWith('.js') && !file.includes('/vendor/')).map(file => ({file,
  lines:fs.readFileSync(path.join(root,file),'utf8').split('\n').length})).sort((a,b)=>b.lines-a.lines).slice(0,15);
const rows = [
  '# Engineering repository inventory', '',
  'Generated from the current working tree by `node tools/audit-engineering-foundation.mjs --report`.', '',
  'This is structural evidence. Import reachability does not prove code is unused; cycles and file size do not prove defects.', '',
  '| Directory | Files present |', '| --- | ---: |',
  ...directories.map(dir => `| ${dir}/ | ${inventory[dir].length} |`), '',
  `Syntax parsed: **${scripts.length}** JavaScript files, **${syntaxFailures.length}** failures (esbuild parser; includes tools and nested archive).`,
  `Startup graph: **${Object.keys(inputs).length}** module identities, **${graph.size}** physical files. Literal dynamic imports are included.`,
  `Regression scripts: **${inventory.tools.filter(file=>/\/verify-.*\.(?:mjs|cjs|py)$/.test(file)).length}**. Counts describe availability, not passing coverage.`, '',
  '## Root HTML entry pages', '', ...roots.map(file=>`- \`${file}\``), '',
  '## Modules outside the startup graph', '',
  'Inspect lab entry pages, dynamic URLs, tooling, runtime registries and persisted IDs before any removal.', '',
  ...nonStartup.map(file=>`- \`${file}\``), '',
  '## Query-bearing imports', '',
  'Different URLs create different native-browser module identities; the build canonicalizes release queries.', '',
  ...queryImports.map(ref=>`- \`${ref}\``), '',
  '## Highest direct importer counts', '', '| Module | Importers |', '| --- | ---: |',
  ...top.map(([file,callers])=>`| ${file} | ${callers.length} |`), '',
  '## Largest runtime files (context only)', '', '| Module | Lines |', '| --- | ---: |',
  ...largest.map(({file,lines})=>`| ${file} | ${lines} |`), '',
  '## Dependency cycles', '',
  'Physical-file strongly connected components in the startup bundle. Imports alone do not demonstrate an initialization failure.', '',
  ...cycles.flatMap((component,index)=>[`### Component ${index+1}: ${component.length} files`, '', component.map(file=>`\`${file}\``).join(', '), '']),
  ...(syntaxFailures.length ? ['## Syntax failures','',...syntaxFailures.map(item=>`- ${item.file}: ${item.message}`)] : [])
];
if (process.argv.includes('--report')) {
  const destination = path.join(root,'docs/engineering-audit');
  fs.mkdirSync(destination,{recursive:true});
  fs.writeFileSync(path.join(destination,'INVENTORY.md'), rows.join('\n')+'\n');
}
const result = {syntaxFiles:scripts.length, syntaxFailures, startupModuleIdentities:Object.keys(inputs).length,
  startupPhysicalFiles:graph.size, outsideStartup:nonStartup, cycles:cycles.map(component=>({size:component.length,members:component})), queryImports};
if (process.argv.includes('--json')) console.log(JSON.stringify(result,null,2));
else console.log(`Parsed ${scripts.length} scripts: ${syntaxFailures.length} syntax failures. Linked ${graph.size} startup files (${Object.keys(inputs).length} module identities); ${cycles.length} cyclic components. Cycles and non-startup modules require review, not automatic removal.`);
for (const failure of syntaxFailures) console.error(failure.file, failure.message);
if (syntaxFailures.length) process.exitCode=1;
