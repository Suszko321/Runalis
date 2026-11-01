"""Read-only runtime art audit. Requires Pillow; writes evidence only with --report.

Run from any directory. Review warnings in context: empty spare cells, translucency
and duplicate bytes are not automatically defective art. No source art is needed.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / 'assets/art/sprites'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report', type=Path, help='Write inventory.md and inventory.json here')
args = parser.parse_args()
errors, warnings, records = [], [], []
covered = set()


def inspect(name, width, height, columns=None, rows=None, frames=None, rects=None, local_rects=False):
    path = SPRITES / (name + '.png')
    covered.add(path.name)
    if not path.is_file():
        errors.append(f'{name}: missing image')
        return
    with Image.open(path) as source:
        image = source.convert('RGBA')
    if image.width % width or image.height % height:
        errors.append(f'{name}: image {image.size} not divisible by {width}x{height}')
        return
    actual_columns, actual_rows = image.width // width, image.height // height
    if columns is not None and columns != actual_columns:
        errors.append(f'{name}: declared columns {columns}, actual {actual_columns}')
    if rows is not None and rows != actual_rows:
        errors.append(f'{name}: declared rows {rows}, actual {actual_rows}')
    capacity = actual_columns * actual_rows
    if frames is not None and frames != capacity:
        errors.append(f'{name}: declared frames {frames}, capacity {capacity}')
    if rects is not None and len(rects) != capacity:
        errors.append(f'{name}: {len(rects)} source rectangles for {capacity} cells')
    empty, edge, bounds, hashes = [], [], [], []
    for index in range(capacity):
        x, y = index % actual_columns * width, index // actual_columns * height
        cell = image.crop((x, y, x + width, y + height))
        box = cell.getchannel('A').getbbox()
        bounds.append(box)
        hashes.append(hashlib.sha256(cell.tobytes()).hexdigest())
        if box is None:
            empty.append(index)
        elif box[0] == 0 or box[1] == 0 or box[2] == width or box[3] == height:
            edge.append(index)
    allowed_empty = {3, 7} if name == 'echoryn-canopies' else set()
    if set(empty) - allowed_empty:
        errors.append(f'{name}: unexpectedly empty cells {sorted(set(empty) - allowed_empty)}')
    for index, rect in enumerate(rects or []):
        x, y, w, h = rect
        if local_rects:
            x += index % actual_columns * width
            y += index // actual_columns * height
        if min(x, y) < 0 or min(w, h) <= 0 or x + w > image.width or y + h > image.height:
            errors.append(f'{name}: spriteRect {index} outside image: {rect}')
        elif index >= capacity or x < index % actual_columns * width or y < index // actual_columns * height or x + w > (index % actual_columns + 1) * width or y + h > (index // actual_columns + 1) * height:
            errors.append(f'{name}: spriteRect {index} crosses its cell: {rect}')
    alpha = image.getchannel('A').histogram()
    partial = sum(alpha[1:255])
    if empty or edge or partial:
        warnings.append({'atlas': name, 'emptyCells': empty, 'edgeCells': edge, 'partialAlphaPixels': partial})
    records.append({'name': name, 'imageSize': list(image.size), 'cellSize': [width, height],
                    'grid': [actual_columns, actual_rows], 'cells': capacity,
                    'uniqueCells': len(set(hashes)), 'bounds': bounds,
                    'emptyCells': empty, 'edgeCells': edge, 'partialAlphaPixels': partial,
                    'bytes': path.stat().st_size,
                    'decodedRGBABytes': image.width * image.height * 4,
                    'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})


for path in sorted(SPRITES.glob('*.json')):
    meta = json.loads(path.read_text(encoding='utf-8'))
    if 'characters' in meta:
        for name in meta['characters']:
            inspect(name, meta['frameWidth'], meta['frameHeight'], meta['frames'], len(meta['rows']))
    elif 'cellWidth' in meta:
        if 'pivot' in meta and not (0 <= meta['pivot'][0] <= meta['cellWidth'] and 0 <= meta['pivot'][1] <= meta['cellHeight']):
            errors.append(f'{path.name}: pivot outside source cell')
        # sourceGrid is a source/master layout, not necessarily the exported grid.
        inspect(path.stem, meta['cellWidth'], meta['cellHeight'], meta.get('columns'),
                meta.get('rows'), meta.get('frames'), meta.get('spriteRects'),
                local_rects=path.stem.startswith('petalknight-rose-'))
    elif {'width', 'height', 'states', 'frames'} <= meta.keys():
        inspect(path.stem, meta['width'], meta['height'], meta['frames'], len(meta['states']))
    else:
        errors.append(f'{path.name}: unrecognized atlas metadata; add an explicit adapter')

# These sheets have code-defined contracts rather than individual JSON metadata.
for name, width, height, columns, rows in [
    ('human-identity', 48, 48, 8, 13),
    ('terrain-core', 64, 64, 4, 2),
    ('tideglass-rapier', 64, 96, 1, 1),
]:
    inspect(name, width, height, columns, rows)

uncovered = sorted(p.name for p in SPRITES.glob('*.png') if '-preview' not in p.stem and p.name not in covered)
errors.extend(f'{name}: no inspected contract' for name in uncovered)
for line in (ROOT / 'docs/art-audit/player-reference.sha256').read_text().splitlines():
    if not line or line.startswith('#'):
        continue
    expected, relative = line.split(maxsplit=1)
    if hashlib.sha256((ROOT / relative).read_bytes()).hexdigest() != expected:
        errors.append(f'{relative}: approved reference changed; review identity before updating baseline')

files = sorted(p for p in (ROOT / 'assets').rglob('*') if p.is_file())
duplicates = defaultdict(list)
for path in files:
    duplicates[hashlib.sha256(path.read_bytes()).hexdigest()].append(path.relative_to(ROOT).as_posix())
duplicates = [paths for paths in duplicates.values() if len(paths) > 1]
summary = {'assetFiles': len(files), 'extensions': dict(Counter(p.suffix for p in files)),
           'metadataFiles': len(list(SPRITES.glob('*.json'))), 'runtimeSheets': len(records),
           'cells': sum(r['cells'] for r in records), 'errors': errors,
           'warningSheets': len(warnings), 'duplicateGroups': len(duplicates),
           'playerReferenceHashes': 8,
           'limits': 'Structural checks only. No certification of style, animation feel, performance or dynamic-path reachability.'}
report = {'summary': summary, 'atlases': records, 'warnings': warnings, 'duplicates': duplicates}
if args.report:
    args.report.mkdir(parents=True, exist_ok=True)
    (args.report / 'inventory.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    lines = ['# Runtime art inventory', '', 'Generated by `tools/verify-art-foundation.py --report docs/art-audit`.',
             'See [the living audit](../RUNALIS_VISUAL_AUDIT.md) for interpretation and correction order.', '',
             '```json', json.dumps(summary, indent=2), '```', '',
             '| Sheet | Image | Cell | Grid | Cells / unique | Partial alpha | Empty / edge cells |',
             '| --- | --- | --- | --- | --- | --- | --- |']
    for r in records:
        pair = lambda values: ' × '.join(map(str, values))
        lines.append(f"| {r['name']} | {pair(r['imageSize'])} | {pair(r['cellSize'])} | {pair(r['grid'])} | {r['cells']} / {r['uniqueCells']} | {r['partialAlphaPixels']} | {len(r['emptyCells'])} / {len(r['edgeCells'])} |")
    lines += ['', '## Byte-identical asset groups', '',
              'Candidates for dependency review; shared pixels and export copies can be intentional. No files were removed.', '']
    lines += ['- ' + '; '.join(f'`{p}`' for p in paths) for paths in duplicates]
    lines += ['', 'JSON evidence includes per-cell alpha bounds, hashes and decoded RGBA size. It is a local generated report, ignored by Git.',
              'Unique cell counts describe repeated pixels, not the number or quality of animation poses.', '']
    (args.report / 'inventory.md').write_text('\n'.join(lines), encoding='utf-8')
print(json.dumps(summary, indent=2))
sys.exit(bool(errors))
