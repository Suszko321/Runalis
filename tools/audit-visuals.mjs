import fs from 'node:fs';
import path from 'node:path';
import { VISUAL_MODEL_REGISTRY } from '../src/modelRegistry.js';
import { ITEMS, ABILITIES, BIOMES } from '../src/data.js';

const root = path.resolve(import.meta.dirname, '..');
const sources = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).map(f => ({ file: `src/${f}`, text: fs.readFileSync(path.join(root, 'src', f), 'utf8') }));
const out = path.join(root, 'docs/visual-production');
fs.mkdirSync(out, { recursive: true });
const old = fs.existsSync(path.join(out, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'))) : [];
const previous = new Map(old.map(e => [e.id, e]));
const entries = new Map();
function references(token) {
  return sources.flatMap(s => s.text.split('\n').flatMap((line, i) => line.includes(token) ? [`${s.file}:${i + 1}`] : [])).slice(0, 24);
}
function add(id, name, family, token, extra = {}) {
  const saved = previous.get(id);
  entries.set(id, {
    id, name, family, current: 'Existing code-drawn presentation; requires visual review',
    appearsIn: 'Shared game renderer; Act One reachability to verify', references: references(token),
    purpose: family, replacement: 'Cohesive pixel-art treatment; preserve readable state cues',
    scale: family === 'terrain' ? '32 world pixels/tile' : 'Match existing rendered footprint',
    animations: /actor|enemy|boss|npc|summon/.test(family) ? ['idle', 'locomotion', 'attack/cast', 'hurt', 'death (where implemented)'] : [],
    vfx: 'Retain authoritative effect timing; review visual clarity',
    ui: /item|ability/.test(family) ? 'Inventory/action icon and tooltip' : 'Existing labels and prompts',
    constraints: 'Render-only. Do not change collision, gameplay timing, equipment, saves, or progression.',
    status: 'audit-pending', qa: 'not-tested', notes: '', ...extra,
    ...(saved ? { status: saved.status, qa: saved.qa, notes: saved.notes, replacement: saved.replacement } : {})
  });
}
for (const e of Object.values(VISUAL_MODEL_REGISTRY)) add(e.id, e.name, e.category, e.id.split(':')[1], { current: e.modelPath, constraints: `${e.collisionProfile}; preserve gameplay dimensions`, status: e.logicOnly ? 'intentional-invisible' : 'audit-pending' });
add('actor:player', 'Player and co-op appearance', 'actor', 'drawHumanActor');
for (const [id, item] of Object.entries(ITEMS)) add(`item:${id}`, item.name || id, 'item', id);
for (const ability of ABILITIES) add(`ability:${ability.id}`, ability.name || ability.id, 'ability', ability.id);
for (const id of Object.keys(BIOMES)) add(`terrain:${id}`, id, 'terrain', id);
for (const s of sources) {
  for (const m of s.text.matchAll(/(?:export\s+)?function\s+(draw\w+)\s*\(/g)) {
    const name = m[1];
    add(`renderer:${s.file}:${name}`, name, /summon/i.test(name) ? 'summon' : 'render-system', name, { references: [`${s.file}:${s.text.slice(0, m.index).split('\n').length}`] });
  }
  for (const m of s.text.matchAll(/propType\s*:\s*['"]([^'"]+)['"]/g)) add(`prop:${m[1]}`, m[1], 'prop-variant', m[1]);
  if (/ui|panel|hud|menu|creator|dialogue/i.test(s.file)) add(`ui:${s.file}`, path.basename(s.file), 'ui', path.basename(s.file), { references: [s.file], replacement: 'Warm parchment, ink, brass; readable responsive typography and consistent focus cues' });
}
for (const mode of ['act1Opening', 'maraHouse', 'capital', 'overworld', 'dungeon', 'tower', 'sideZone']) add(`scene:${mode}`, mode, 'scene', mode, { animations: ['ambient', 'transitions'], notes: 'Review floors, walls, props, actors, hazards, feedback and UI together.' });
const result = [...entries.values()];
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(result, null, 2));
const cols = ['id','name','family','current','appearsIn','references','purpose','replacement','scale','animations','vfx','ui','constraints','status','qa','notes'];
fs.writeFileSync(path.join(out, 'manifest.csv'), cols.join(',') + '\n' + result.map(e => cols.map(k => '"' + String(Array.isArray(e[k]) ? e[k].join('; ') : e[k] || '').replaceAll('"','""') + '"').join(',')).join('\n'));
const counts = Object.groupBy(result, e => e.family);
console.log(JSON.stringify(Object.fromEntries(Object.entries(counts).map(([k,v]) => [k,v.length])), null, 2));
console.log(`${result.length} visual entries indexed. Coverage is an inventory, not a claim of completion.`);
