import {asset} from './spriteArt.js';
export const GROUND_EFFECT_ROWS=Object.freeze({oathkeeperConsecratedGround:0,thornbinderBramblePatch:1,cursedGround:2,wellspring:3,drowningPressure:3});
export function drawPersistentGroundArt(ctx,fx,x,y){
 const row=GROUND_EFFECT_ROWS[fx.kind];if(row===undefined)return false;
 const a=asset('persistent-ground');if(!a?.ready)return false;
 const age=Math.max(0,Number(fx.age)||0),ttl=Math.max(.001,Number(fx.ttl)||.3),radius=Math.max(8,Number(fx.radius)||72);
 const phase=(age*7)%4,frame=Math.floor(phase),blend=phase-frame;
 const fade=Math.min(1,Math.max(0,(ttl-age)/Math.min(.35,ttl)));
 ctx.save();ctx.imageSmoothingEnabled=false;
 // Bottom-registered cells; keep the footprint stable as embers/ripples cycle.
 for(const [col,opacity] of [[frame,1-blend],[(frame+1)%4,blend]]){
  ctx.globalAlpha=fade*opacity*.82;
  ctx.drawImage(a.image,col*160,row*112,160,112,x-radius,y-radius*.95,radius*2,radius*1.4);
 }
 // Range remains circular in simulation; preserve an honest, subdued boundary.
 ctx.globalAlpha=fade*.32;ctx.strokeStyle=['#eecb77','#6fad66','#b575e5','#74dbe8'][row];ctx.lineWidth=1;
 ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.stroke();ctx.restore();return true;
}
asset('persistent-ground');
