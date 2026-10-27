export const WORKSHOP_MARKERS=Object.freeze({
 blacksmith:{color:'#e3a263',shape:'anvil',tooltip:'Blacksmith — Weapon & Armour Upgrades'},
 craftsman:{color:'#d4bf80',shape:'tools',tooltip:'Craftsman — Crafting Services'}
});
export function drawWorkshopIcon(ctx,kind,x,y,size=14){
 const meta=WORKSHOP_MARKERS[kind];if(!meta)return;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(size/14,size/14);ctx.fillStyle='#101519';ctx.fillRect(-8,-7,16,14);ctx.fillStyle=meta.color;
 if(kind==='blacksmith'){
  ctx.fillRect(-6,-5,11,3);ctx.beginPath();ctx.moveTo(5,-5);ctx.lineTo(8,-5);ctx.lineTo(5,-2);ctx.fill();ctx.fillRect(-3,-2,6,3);ctx.fillRect(-1,1,3,3);ctx.fillRect(-5,4,11,2);
 }else{
  ctx.rotate(-Math.PI/4);ctx.fillRect(-1,-5,2,12);ctx.fillRect(-5,-6,10,3);ctx.rotate(Math.PI/2);ctx.fillRect(-1,-4,2,11);ctx.fillRect(-3,-6,2,5);ctx.fillRect(1,-6,2,5);ctx.fillRect(-3,-2,6,2);
 }ctx.restore();
}
export function workshopIconMarkup(kind){
 const meta=WORKSHOP_MARKERS[kind];if(!meta)return '';
 const shape=kind==='blacksmith'?'<path d="M2 3h12l-3 3H9v4h3v2H3v-2h3V6H2z"/>':'<path d="m3 2 4 4-2 2-4-4zm3 6 2-2 6 6-2 2zM11 1h2v4l-2 2-8 8-2-2 8-8z"/>';
 return `<svg width="18" height="18" viewBox="0 0 16 16" fill="${meta.color}" aria-hidden="true" style="image-rendering:pixelated">${shape}</svg>`;
}
export function workshopMapMarkers(world){return (world?.objects||[]).filter(o=>WORKSHOP_MARKERS[o.workshopService]&&!o.remove).map(npc=>({id:`service-${npc.id}`,npcId:npc.id,name:npc.workshopName||npc.name,service:npc.workshopService,type:'service',description:WORKSHOP_MARKERS[npc.workshopService].tooltip,x:npc.x/32,y:npc.y/32}));}
export function drawWorkshopFixture(ctx,o,camera){
 if(o.serviceMarkerOnly)return true;
 if(o.propType!=='workshopSign')return false;
 const x=Math.round(o.x-camera.x),y=Math.round(o.y-camera.y);ctx.save();ctx.fillStyle='#34291e';ctx.fillRect(x-2,y-26,4,33);ctx.fillStyle='#685236';ctx.fillRect(x-16,y-27,32,23);ctx.strokeStyle='#241e17';ctx.strokeRect(x-16,y-27,32,23);drawWorkshopIcon(ctx,o.service,x,y-16,17);ctx.restore();return true;
}
export function drawWorkshopWorker(ctx,npc,camera){
 if(!npc.workRole)return;
 const now=performance.now()/1000,x=npc.x-camera.x,y=npc.y-camera.y,side=npc.workRole==='smith'?1:-1;
 const cycle=(now*(npc.workPulseUntil>now?3:1.1))%1,swing=cycle<.35?-1.05+cycle/.35*1.8:.75-(cycle-.35)/.65*1.8;
 ctx.save();ctx.translate(Math.round(x+side*11),Math.round(y-24));ctx.scale(side,1);ctx.strokeStyle='#af8965';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-4,0);ctx.lineTo(2,2);ctx.stroke();ctx.rotate(npc.workRole==='smith'?swing:Math.sin(now*5)*.16);
 ctx.fillStyle='#8c633e';ctx.fillRect(0,-1,16,2);ctx.fillStyle=npc.workRole==='smith'?'#aeb2b0':'#d4c9a3';ctx.fillRect(12,-4,npc.workRole==='smith'?7:4,6);ctx.restore();
}
export function drawWorkshopStrike(ctx,fx,camera){
 const t=Math.max(0,Math.min(1,(fx.age||0)/.35)),x=fx.x-camera.x+(fx.service==='blacksmith'?28:-18),y=fx.y-camera.y-12;
 ctx.save();ctx.globalAlpha=1-t;ctx.fillStyle=fx.service==='blacksmith'?'#ffd38b':'#d6c895';for(let i=0;i<6;i++){const a=i*2.4;ctx.fillRect(Math.round(x+Math.cos(a)*t*22),Math.round(y-Math.abs(Math.sin(a))*t*18+t*t*13),2,2);}ctx.restore();
}
