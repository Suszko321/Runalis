// Package the static game without changing Live Server development files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '_site');
const files = new Set();

function add(relative) {
  relative = relative.replaceAll('\\', '/');
  if (files.has(relative)) return;
  if (relative.startsWith('/') || relative.split('/').includes('..')) throw new Error(`Unsafe path: ${relative}`);
  let current = root;
  for (const part of relative.split('/')) {
    if (!fs.readdirSync(current).includes(part)) throw new Error(`Missing file or incorrect case: ${relative}`);
    current = path.join(current, part);
  }
  if (!fs.statSync(current).isFile()) throw new Error(`Not a regular file: ${relative}`);
  files.add(relative);
  if (relative.endsWith('.js')) {
    const source = fs.readFileSync(current, 'utf8');
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)) {
      if (!match[1].startsWith('.')) throw new Error(`Non-relative module in ${relative}: ${match[1]}`);
      add(path.posix.normalize(path.posix.join(path.posix.dirname(relative), match[1].split(/[?#]/)[0])));
    }
  }
}

function addDirectory(relative) {
  for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const name = `${relative}/${entry.name}`;
    if (entry.isDirectory()) addDirectory(name);
    else if (/\.(png|webp|jpg|jpeg|svg|json|woff2?|ttf|otf|ogg|mp3|wav)$/i.test(name)) add(name);
  }
}

add('index.html');
add('src/main.js');
add('src/vendor/peerjs-LICENSE.txt');
// Some shared menu styles are loaded on demand from JavaScript.
for (const name of fs.readdirSync(root)) if (name.endsWith('.css')) add(name);
add('assets/art/runalis-main-menu.png');
for (const directory of ['assets/art/sprites', 'assets/combat-icons', 'assets/environment', 'assets/skill-tree-icons', 'assets/ui']) addDirectory(directory);
for (const name of fs.readdirSync(path.join(root, 'assets/ui/fonts'))) if (name.endsWith('-OFL.txt')) add(`assets/ui/fonts/${name}`);

// Validate literal resource references. Template-generated sprite/icon URLs are
// covered by including their complete runtime directories and browser testing.
for (const relative of files) {
  if (!/\.(html|css|js)$/.test(relative)) continue;
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const refs = [
    ...source.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g),
    ...source.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g),
    ...source.matchAll(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g),
  ];
  for (const [, ref] of refs) {
    if (ref.includes('${') || /^(?:data:|https?:|#)/.test(ref)) continue;
    if (ref.startsWith('/')) throw new Error(`Domain-root resource in ${relative}: ${ref}`);
    // JavaScript-generated HTML uses document-relative src/href; new URL uses
    // module-relative ../ paths. CSS URLs are relative to the stylesheet.
    const base = relative.endsWith('.js') && !ref.startsWith('../') ? '' : path.posix.dirname(relative);
    const resolved = path.posix.normalize(path.posix.join(base, ref.split(/[?#]/)[0]));
    if (/\.(png|webp|jpg|svg|css|js|woff2?|ttf|otf|ogg|mp3|wav|json)$/.test(resolved) && !files.has(resolved)) {
      throw new Error(`Resource absent from deployment: ${relative} -> ${resolved}`);
    }
  }
}

// Only this fixed generated directory may be replaced.
// Version the complete module graph together. Updating only main.js leaves
// cached imports (including mobile menus) from the previous release in use.
const releaseHash = createHash('sha256');
for (const relative of [...files].sort()) {
  if (/\.(html|css|js)$/.test(relative)) releaseHash.update(relative).update(fs.readFileSync(path.join(root, relative)));
}
const release = releaseHash.digest('hex').slice(0, 16);
const versioned = ref => `${ref.split(/[?#]/)[0]}?v=${release}`;
if (path.dirname(output) !== path.resolve(root)) throw new Error('Output must stay inside the project');
fs.rmSync(output, { recursive: true, force: true });
for (const relative of files) {
  const destination = path.join(output, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (relative.endsWith('.js')) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    fs.writeFileSync(destination, source.replace(/((?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"])(\.[^'"]+)(['"])/g, (_, prefix, ref, suffix) => `${prefix}${versioned(ref)}${suffix}`));
  } else if (relative.endsWith('.html')) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    fs.writeFileSync(destination, source.replace(/((?:src|href)\s*=\s*['"])([^'"]+\.(?:js|css)(?:\?[^'"]*)?)(['"])/g, (_, prefix, ref, suffix) => `${prefix}${versioned(ref)}${suffix}`));
  } else fs.copyFileSync(path.join(root, relative), destination);
}
fs.writeFileSync(path.join(output, '.nojekyll'), '');
const bytes = [...files].reduce((sum, name) => sum + fs.statSync(path.join(output, name)).size, 0);
console.log(`Prepared ${files.size} game files (${(bytes / 1024 / 1024).toFixed(1)} MiB) in _site; resource paths and module filename case validated.`);
