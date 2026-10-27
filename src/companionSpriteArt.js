// Allied variants of the authored four-frame pixel atlases. Source sheets stay
// untouched: recolouring happens once per loaded image, never each frame.
import { asset } from './spriteArt.js';

export const COMPANION_SPRITES = Object.freeze({
  wolf: Object.freeze({ sheet:'enemies-core', row:1, width:80, height:96, pivot:90,
    ramp:['#142533','#345e79','#79adc4','#dbf5f1'], accent:'#6df4df' }),
  sovereignWolf:Object.freeze({sheet:'enemies-core',row:1,width:80,height:96,pivot:90,ramp:['#2e2932','#80603f','#c8ad72','#fff0bd'],accent:'#f4d984'}),
  miniDemon: Object.freeze({ sheet:'summons-evolved', row:3, width:96, height:112, pivot:106,
    ramp:['#2b203a','#78579d','#ba8de0','#f0dfff'], accent:'#68f4df' })
});
const variants = new Map();
const facings = new WeakMap();
const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));

export function companionAnimationFrame(summon, now=performance.now()/1000) {
  if (Number(summon.attackAnimationUntil||0)>now) return 3;
  return summon.moving ? 1 + Math.floor(Number(summon.walkTime||0)*1.6)%2 : 0;
}

function companionVariant(kind, image) {
  const cached=variants.get(kind);
  if(cached?.source===image)return cached.canvas;
  if(typeof document==='undefined')return null;
  const config=COMPANION_SPRITES[kind], canvas=document.createElement('canvas');
  canvas.width=config.width*4;canvas.height=config.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,config.row*config.height,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height), ramp=config.ramp.map(rgb),accent=rgb(config.accent);
  for(let i=0;i<pixels.data.length;i+=4) {
    const d=pixels.data;if(!d[i+3])continue;
    const r=d[i],g=d[i+1],b=d[i+2],light=.2126*r+.7152*g+.0722*b;
    if(Math.max(r,g,b)<22)continue; // retain the sprite's crisp ink outlines
    if(r>145&&g<125&&r>g*1.24&&r>b*1.25) {
      const strength=.5+Math.min(1,Math.max(r,g,b)/255)*.5;
      for(let c=0;c<3;c++)d[i+c]=Math.round(accent[c]*strength);
    } else {
      const position=Math.min(3,Math.max(0,(light-18)/185*3)),low=Math.floor(position),high=Math.min(3,low+1),mix=position-low;
      for(let c=0;c<3;c++)d[i+c]=Math.round(ramp[low][c]*(1-mix)+ramp[high][c]*mix);
    }
  }
  ctx.putImageData(pixels,0,0);variants.set(kind,{source:image,canvas});return canvas;
}

export function drawCompanionSprite(ctx,summon,x,y) {
  const artKind=summon.artVariant || summon.kind;
  const config=COMPANION_SPRITES[artKind];if(!config)return false;
  const loaded=asset(config.sheet);if(!loaded?.ready)return false;
  const image=companionVariant(artKind,loaded.image);if(!image)return false;
  const frame=companionAnimationFrame(summon),scale=summon.direWolf?1.25:summon.kind==='miniDemon'?.75:1;
  const facing=Math.abs(summon.dirX||0)>.05?(summon.dirX<0?-1:1):(facings.get(summon)||1);
  facings.set(summon,facing);
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(facing,1);ctx.imageSmoothingEnabled=false;
  drawCompanionMark(ctx,config.accent);
  ctx.drawImage(image,frame*config.width,0,config.width,config.height,
    -Math.round(config.width*scale/2),16-Math.round(config.pivot*scale),Math.round(config.width*scale),Math.round(config.height*scale));
  ctx.restore();return true;
}

function drawCompanionMark(ctx,color) {
  // A broken pixel pact diamond supplies a second recognition cue in crowds.
  ctx.fillStyle='#203744';ctx.fillRect(-13,14,5,2);ctx.fillRect(9,14,5,2);
  ctx.fillStyle=color;ctx.fillRect(-2,20,4,2);ctx.fillRect(-6,18,3,2);ctx.fillRect(4,18,3,2);
}

export function drawDemonCompanionFallback(ctx,summon,x,y) {
  const moving=!!summon.moving,attack=companionAnimationFrame(summon)===3;
  const step=moving?Math.round(Math.sin((summon.walkTime||0)*2)*2):0,bob=moving?Math.abs(step):0;
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(summon.dirX<0?-1:1,1);
  drawCompanionMark(ctx,COMPANION_SPRITES.miniDemon.accent);
  const box=(color,a,b,w,h)=>{ctx.fillStyle=color;ctx.fillRect(a,b-bob,w,h);};
  box('#2b203a',-23,-25,10,15);box('#2b203a',13,-25,10,15);
  box('#78579d',-20,-22,8,9);box('#78579d',12,-22,8,9);
  box('#2b203a',-9,-22,18,28);box('#ba8de0',-7,-20,14,23);
  box('#78579d',-9,-35,18,15);box('#f0dfff',-6,-33,12,10);
  box('#68f4df',-12,-42,4,12);box('#68f4df',8,-42,4,12);
  box('#21182f',-4,-29,3,2);box('#21182f',2,-29,3,2);
  box('#68f4df',-4,-28,2,1);box('#68f4df',3,-28,2,1);
  box('#78579d',-8,4,5,9+step);box('#78579d',3,4,5,9-step);
  box('#ba8de0',8,-17,attack?17:7,5);box('#68f4df',attack?22:12,-18,3,7);
  ctx.restore();return true;
}

for(const config of Object.values(COMPANION_SPRITES))asset(config.sheet);
