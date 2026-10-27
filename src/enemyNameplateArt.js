import {getEnemyNameplate} from './humanoidEnemies.js';
function fit(ctx,text,width){let value=String(text||'Enemy');if(ctx.measureText(value).width<=width)return value;while(value.length>1&&ctx.measureText(value+'…').width>width)value=value.slice(0,-1);return value+'…';}
export function enemyPlateLayout(ctx,enemy,x,y){
 const label=getEnemyNameplate(enemy),rank=label.rank,important=rank!=='normal';
 ctx.save();ctx.font=important?'bold 12px Georgia':'bold 10px Georgia';
 const name=fit(ctx,label.name||enemy.bossName||enemy.name||enemy.kind,important?184:142),textWidth=ctx.measureText(name).width;
 ctx.font='9px sans-serif';const modifiers=important&&label.modifierText?fit(ctx,label.modifierText,190):'',modifierWidth=ctx.measureText(modifiers).width,levelWidth=ctx.measureText(`Lv. ${label.level}`).width;
 ctx.restore();const width=Math.max(important?rank==='boss'?124:100:54,Math.ceil(textWidth)+(important?24:9+levelWidth),modifierWidth+12);
 return {label,name,modifiers,rank,important,width,left:x-width/2-3,right:x+width/2+3,top:y-(important?modifiers?50:38:21),bottom:y+8};
}
export function drawEnemyNameplate(ctx,enemy,x,y,{hideLabel=false}={}){
 const p=enemyPlateLayout(ctx,enemy,x,y),friendly=enemy.friendly||enemy.disposition==='friendly';
 const width=p.important?(p.rank==='boss'?124:100):54,left=Math.round(x-width/2),top=Math.round(y);
 const value=Number(enemy.hp)||0,max=Math.max(1,Number(enemy.maxHp)||1),fill=Math.round((width-4)*Math.max(0,Math.min(1,value/max)));
 ctx.save();ctx.fillStyle='#0a1013';ctx.fillRect(left-1,top-1,width+2,8);ctx.strokeStyle=p.important?'#9e8557':'#777565';ctx.lineWidth=1;ctx.strokeRect(left-.5,top-.5,width+1,7);
 ctx.fillStyle=friendly?'#1f463c':'#4a2026';ctx.fillRect(left+1,top+1,width-2,4);
 ctx.fillStyle=friendly?'#5eaf91':'#ba3f48';ctx.fillRect(left+2,top+1,fill,4);ctx.fillStyle=friendly?'#a1d8b9':'#ed8580';ctx.fillRect(left+2,top+1,fill,1);
 if(!hideLabel){
  ctx.textAlign='center';ctx.lineJoin='round';ctx.lineWidth=3;ctx.strokeStyle='#0a1013';ctx.font=p.important?'bold 12px Georgia':'bold 10px Georgia';
  if(p.important){
   const lift=p.modifiers?12:0;
   ctx.lineWidth=4;ctx.strokeStyle='#0a1013';ctx.strokeText(p.name,Math.round(x),top-22-lift);
   ctx.lineWidth=2;ctx.strokeStyle='#b79957';ctx.strokeText(p.name,Math.round(x),top-22-lift);
   ctx.fillStyle='#f2e6c8';ctx.fillText(p.name,Math.round(x),top-22-lift);
   const symbol=p.rank==='boss'?'♛':'◆',rank=p.rank==='boss'?'BOSS':['rare','champion'].includes(enemy.encounterTier)?enemy.encounterTier.toUpperCase():'ELITE';
   ctx.lineWidth=3;ctx.strokeStyle='#0a1013';ctx.font='bold 9px sans-serif';ctx.fillStyle='#e28b73';const rankText=`${symbol} ${rank} · Lv. ${p.label.level}`;ctx.strokeText(rankText,Math.round(x),top-9-lift);ctx.fillText(rankText,Math.round(x),top-9-lift);
   if(p.modifiers){ctx.font='9px sans-serif';ctx.fillStyle='#c9b894';ctx.strokeText(p.modifiers,Math.round(x),top-9);ctx.fillText(p.modifiers,Math.round(x),top-9);}
  }else{
   const nameWidth=ctx.measureText(p.name).width,level=`Lv. ${p.label.level}`;ctx.font='bold 9px sans-serif';const levelWidth=ctx.measureText(level).width,total=nameWidth+9+levelWidth,start=Math.round(x-total/2);
   ctx.textAlign='left';ctx.font='bold 10px Georgia';ctx.strokeText(p.name,start,top-7);ctx.fillStyle='#e6dfcd';ctx.fillText(p.name,start,top-7);ctx.font='bold 9px sans-serif';ctx.strokeText(level,start+nameWidth+9,top-7);ctx.fillStyle='#df8275';ctx.fillText(level,start+nameWidth+9,top-7);
  }
 }
 ctx.restore();
}
