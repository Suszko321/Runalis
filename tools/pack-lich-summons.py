"""Rebuild the three production animation atlases from preserved source strips."""
from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('pack_art', ROOT / 'tools/pack-art.py')
packer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packer)

for morph, width, height, target, grid in [
    ('cursed', 96, 112, 94, True),
    ('acolyte', 96, 112, 94, False),
    ('deathknight', 128, 144, 112, True),
]:
    source = ROOT / f'assets/art/source/lich-{morph}.png'
    boxes = packer.grid_boxes(source, 1, 4) if grid else None
    packer.pack(source, f'lich-{morph}', 1, 4, width, height, target, boxes)
