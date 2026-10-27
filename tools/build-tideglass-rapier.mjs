import fs from 'node:fs';
import {createRequire} from 'node:module';
import {TIDEGLASS_RAPIER_ART as art,drawTideglassRapierModel} from '../src/tideglassRapierArt.js';
const {createCanvas}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
const canvas=createCanvas(art.width,art.height),ctx=canvas.getContext('2d');
ctx.translate(art.gripX,art.gripY);drawTideglassRapierModel(ctx);
fs.writeFileSync(new URL('../assets/art/sprites/tideglass-rapier.png',import.meta.url),canvas.toBuffer('image/png'));
