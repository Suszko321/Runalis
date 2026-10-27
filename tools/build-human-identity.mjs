import fs from 'node:fs';
import {createRequire} from 'node:module';
import {HUMAN_IDENTITY_ITEMS,HUMAN_IDENTITY_DIRECTIONS,paintHumanIdentityCell} from '../src/humanIdentityArt.js';
const {createCanvas}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
const canvas=createCanvas(384,HUMAN_IDENTITY_ITEMS.length*48),ctx=canvas.getContext('2d');
for(const [row,item] of HUMAN_IDENTITY_ITEMS.entries())for(const [body,bodyType] of ['male','female'].entries())for(const [direction,facing] of HUMAN_IDENTITY_DIRECTIONS.entries()){
 ctx.save();ctx.translate((body*4+direction)*48+24,row*48+24);paintHumanIdentityCell(ctx,item,facing,bodyType);ctx.restore();
}
fs.writeFileSync(new URL('../assets/art/sprites/human-identity.png',import.meta.url),canvas.toBuffer('image/png'));
