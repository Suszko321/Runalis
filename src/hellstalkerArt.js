const ink='#211b1b',coal='#4b2928',iron='#8b7663',red='#d34625',orange='#f59d43',light='#ffe2a0',TAU=Math.PI*2;
const P=(c,x,y,color,size=2)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),size,size);};
function line(c,x,y,u,v,color,width=2){const n=Math.max(1,Math.ceil(Math.hypot(u-x,v-y)));for(let i=0;i<=n;i++)P(c,x+(u-x)*i/n,y+(v-y)*i/n,color,width);}
const flames=[['00001000','00012000','00121000','00123210','01233210','12344321','01244310','00122100'],['00000100','00001200','00112100','01232100','01233210','12344321','01244310','00122100'],['00100000','00110000','00121000','00123210','01233210','12344321','01244310','00122100'],['00000000','00001000','00012000','00123200','01233210','12344321','01244310','00122100']];
function flame(c,x,y,time,unit=1){const rows=flames[Math.floor(time*10)%4],colors=['',coal,red,orange,light];for(let row=0;row<rows.length;row++)for(let col=0;col<8;col++){const k=+rows[row][col];if(k)P(c,x+(col-4)*unit,y+(row-7)*unit,colors[k],unit);}}
function sigil(c,x,y,r,time=0){
 for(let i=0;i<56;i++){const a=i*TAU/56;P(c,x+Math.cos(a)*r,y+Math.sin(a)*r,i%4?coal:red,2);}
 for(let i=0;i<5;i++){const a=i*TAU/5-Math.PI/2,b=(i+2)*TAU/5-Math.PI/2;line(c,x+Math.cos(a)*r*.75,y+Math.sin(a)*r*.75,x+Math.cos(b)*r*.75,y+Math.sin(b)*r*.75,red,2);}
 flame(c,x,y,time,1);
}
function orb(c,x,y,time=0,size=1){
 for(let i=0;i<8;i++){const a=i*TAU/8+time*3;P(c,x+Math.cos(a)*7*size,y+Math.sin(a)*7*size,i%2?red:orange,2*size);}
 P(c,x-4*size,y-4*size,ink,8*size);P(c,x-2*size,y-2*size,red,4*size);P(c,x,y-2*size,light,2*size);
}
const fields=new Map();
function ground(r,id){const radius=Math.round(r),key=radius+':'+id;if(fields.has(key))return fields.get(key);const a=document.createElement('canvas');a.width=a.height=radius*2+24;const c=a.getContext('2d'),o=radius+12;
 for(let i=0;i<80;i++){const angle=i*TAU/80;P(c,o+Math.cos(angle)*radius,o+Math.sin(angle)*radius,coal,2);if(i%4===0)P(c,o+Math.cos(angle)*radius,o+Math.sin(angle)*radius,orange,2);}
 if(id==='fellhunterKillZone'){for(let i=0;i<6;i++){const angle=i*TAU/6;let x=o,y=o;for(let step=1;step<=5;step++){const a=angle+(step%2?.1:-.1),u=o+Math.cos(a)*radius*step*.17,v=o+Math.sin(a)*radius*step*.17;line(c,x,y,u,v,ink,4);line(c,x,y,u,v,coal,2);if(step%2===0)line(c,x,y,u,v,red,1);x=u;y=v;}}}
 else for(let i=0;i<12;i++){const angle=i*2.399963,d=radius*Math.sqrt((i+.5)/12)*.82,x=o+Math.cos(angle)*d,y=o+Math.sin(angle)*d;line(c,x-7,y+4,x+2,y-3,ink,5);line(c,x-7,y+4,x+2,y-3,red,2);line(c,x+2,y-3,x+9,y+2,coal,3);}
 if(fields.size>=20)fields.delete(fields.keys().next().value);fields.set(key,a);return a;}
export function drawHellstalkerEffect(c,fx,camera){
 if(fx.subclassId!=='hellstalker')return false;const x=Math.round(fx.x-camera.x),y=Math.round(fx.y-camera.y),r=fx.radius||35,t=Math.min(1,(fx.age||0)/(fx.ttl||.35)),time=fx.phaseTime??t,g=fx.geometry;
 if(x< -650||y< -650||x>c.canvas.width+650||y>c.canvas.height+650)return true;c.save();c.imageSmoothingEnabled=false;c.globalAlpha*=1-t*.75;
 if(g==='hellWarning'){c.globalAlpha=.7;sigil(c,x,y,r,time);}
 else if(g==='field'){
  if(/BearTrap|Deadfall/.test(fx.abilityId||'')){sigil(c,x,y,Math.min(r,55),time);if(/Deadfall/.test(fx.abilityId)){orb(c,x,y-44-Math.sin(time*3)*3,time,2);line(c,x,y-30,x,y,coal,2);}else if(fx.armed!==false)flame(c,x,y-1,time,3);}
  else{c.globalAlpha=.78;const a=ground(r,fx.abilityId);c.drawImage(a,x-r-12,y-r-12);for(let i=0;i<10;i++){const angle=i*2.39996,d=r*(.18+(i%4)*.18);flame(c,x+Math.cos(angle)*d,y+Math.sin(angle)*d,time+i*.21,fx.abilityId==='fellhunterKillZone'?2:1);}}
 }else if(g==='dash'||g==='chain'){
  const ex=(fx.endX??fx.x)-camera.x,ey=(fx.endY??fx.y)-camera.y,dx=ex-x,dy=ey-y;
  line(c,x,y,ex,ey,coal,g==='chain'?3:5);for(let i=0;i<9;i++){const px=x+dx*i/8,py=y+dy*i/8;P(c,px-3,py-2,ink,5);P(c,px,py,red,2);if(i%2===0)flame(c,px,py,time+i*.1,1);}if(g==='chain'){
   const ux=dx/Math.max(1,Math.hypot(dx,dy)),uy=dy/Math.max(1,Math.hypot(dx,dy));
   if(fx.abilityId==='fellhunterRicochetBlade')orb(c,ex,ey,time,2);
   else{line(c,ex-ux*8,ey-uy*8,ex+ux*5,ey+uy*5,iron,3);line(c,ex+ux*5,ey+uy*5,ex-uy*7,ey+ux*7,orange,2);}
  }
 }else if(g==='arc'){
  const angle=Math.atan2(fx.dirY||0,fx.dirX??1),radius=Math.min(100,fx.range||70);for(let i=0;i<28;i++){const a=angle-1+i/27*2;P(c,x+Math.cos(a)*radius,y+Math.sin(a)*radius,coal,4);P(c,x+Math.cos(a)*(radius-2),y+Math.sin(a)*(radius-2),orange,2);if(i%6===0)flame(c,x+Math.cos(a)*radius,y+Math.sin(a)*radius,t,1);}
 }else if(g==='cast'||g==='kindling'||g==='mark'){sigil(c,x,y,24,time);flame(c,x,y-8,time,g==='cast'?2:3);for(let i=0;i<5;i++)P(c,x-10+i*5,y-5-(i%2)*9-t*10,i%2?red:light,2);}
 else if(g==='impact'){flame(c,x,y,time,2);for(let i=0;i<6;i++){const a=i*TAU/6;P(c,x+Math.cos(a)*(5+t*16),y+Math.sin(a)*(5+t*16),i%2?orange:coal,2);}}
 else{const flash=g==='flashover'||g==='hellRupture',radius=flash?r:r*.7;if(g==='hellRupture'||fx.abilityId==='fellhunterDeadfall'){sigil(c,x,y,r*.7,time);orb(c,x,y-70*(1-Math.min(1,t*4)),time,3);}for(let i=0;i<(flash?14:10);i++){const a=i*TAU/(flash?14:10),d=radius*(.2+t*.8);flame(c,x+Math.cos(a)*d,y+Math.sin(a)*d,t+i*.13,flash?2:1);P(c,x+Math.cos(a)*d,y+Math.sin(a)*d,light,2);}flame(c,x,y,t,3);}
 c.restore();return true;
}
export function drawHellProjectile(c,s,camera){if(!s.a.hellSkill)return false;c.save();c.globalAlpha=1;c.imageSmoothingEnabled=false;const x=s.x-camera.x,y=s.y-camera.y,dx=s.aim.x,dy=s.aim.y;
 const phase=s.travelled/s.speed;
 for(let i=1;i<5;i++)flame(c,x-dx*i*6,y-dy*i*6,phase+i*.2,1);
 if(s.a.id==='fellhunterThrowingDaggers'){line(c,x-dx*14,y-dy*14,x+dx*15,y+dy*15,ink,6);line(c,x-dx*12,y-dy*12,x+dx*15,y+dy*15,orange,3);P(c,x+dx*15,y+dy*15,light,3);}else orb(c,x,y,phase,1);
 c.restore();return true;}
export function drawHellAffliction(c,e,entry,camera,now){if(!entry.ability?.hellSkill)return false;const x=e.x-camera.x,y=e.y-camera.y;c.save();c.globalAlpha=.72;for(let i=0;i<entry.stacks;i++)P(c,x-7+i*6,y-48,i===2?light:orange,3);flame(c,x-6,y-5,now,1);flame(c,x+6,y-8,now+.2,1);c.restore();return true;}
export function drawHellCaster(c,p,s,camera,now){if(!(s.hellExposureUntil>now))return;c.save();c.globalAlpha=.55;const x=p.x-camera.x,y=p.y-camera.y;flame(c,x+12,y+3,now,1);if(s.empower?.a?.hellSkill&&s.empower.until>now){sigil(c,x,y+3,32,now);for(const sign of [-1,1]){line(c,x+sign*9,y-35,x+sign*16,y-49,ink,5);line(c,x+sign*16,y-49,x+sign*20,y-42,red,2);}flame(c,x-14,y-15,now,1);flame(c,x+14,y-15,now+.2,1);}c.restore();}
