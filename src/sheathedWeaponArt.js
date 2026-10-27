import {ITEMS} from './data.js';
import {getGearVisualProfile} from './gearVisualStyle.js';
import {drawEquippedArt} from './equipmentArt.js';

export function drawSheathedWeapon(ctx,actor,facing,bob=0){
  const ref=actor.equipment?.weapon,id=typeof ref==='string'?ref:ref?.id;
  if(!id)return;
  const profile=getGearVisualProfile(id,ITEMS[id]||{});
  const pole=['staff','scythe','spear'].includes(profile.weaponType);
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.translate(0,Math.round(bob));ctx.scale(['left','up'].includes(facing)?-1:1,1);
  // Blades hang down from the shoulder; long hafts keep their head above it.
  ctx.translate(pole?-5:10,pole?-10:-32);ctx.rotate(pole ? .38 : -2.55);
  if(pole)ctx.scale(.82,.82);
  drawEquippedArt(ctx,id,profile,0,0,1);
  ctx.restore();
}
