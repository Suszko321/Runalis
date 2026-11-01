import {GEAR_RARITIES,canonicalGearRarity,isGear} from './gearRarity.js';
import {ITEMS} from './data.js';
export function groundLootStyle(drop){
 const grade=GEAR_RARITIES[canonicalGearRarity(drop.gearRarity||drop.rarity)];
 const gear=isGear(ITEMS[drop.itemId||drop.item]);
 const exalted=gear&&grade.rank>=3,age=Math.max(0,Number(drop.age)||0);
 return {color:grade.color,gear,exalted,lift:exalted&&age<.8?Math.sin(age/.8*Math.PI)*46:0,beamHeight:exalted?112+grade.rank*12:0};
}
// Broken runic spires and rising motes, drawn with the game's hard pixel edges.
export function drawGroundLootAura(ctx,drop,x,y){
 const style=groundLootStyle(drop),t=Number(drop.age)||0;
 if(!style.gear)return style;
 ctx.save();ctx.fillStyle=style.color;ctx.strokeStyle=style.color;
 for(const [radius,alpha]of [[20,.05],[14,.1],[8,.18]]){ctx.globalAlpha=alpha;ctx.beginPath();ctx.ellipse(x,y+3,radius,radius*.35,0,0,Math.PI*2);ctx.fill();}
 if(style.exalted){
  const h=style.beamHeight;
  for(let step=0;step<8;step++){ctx.globalAlpha=.05+(7-step)*.018;const w=8-Math.floor(step/2);ctx.fillRect(Math.round(x-w/2),Math.round(y-step*h/8),w,Math.ceil(h/8));}
  ctx.globalAlpha=.65;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-12,y);ctx.lineTo(x-7,y-9);ctx.lineTo(x,y-4);ctx.lineTo(x+7,y-9);ctx.lineTo(x+12,y);ctx.stroke();
  for(let i=0;i<5;i++){const rise=((t*.32+i/5)%1);ctx.globalAlpha=(1-rise)*.75;ctx.fillRect(Math.round(x+Math.sin(i*2.4)*9),Math.round(y-rise*h),2,3);}
 }
 ctx.restore();return style;
}
