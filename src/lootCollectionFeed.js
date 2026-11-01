// Short calendar-time notices survive host-to-guest profile delivery, not saves.
export function recordLootCollection(player,id,name,quantity,now=Date.now()){
 const entries=(player.lootCollections||[]).filter(e=>now-e.at<4500);
 const entry=entries.find(e=>e.id===id);
 if(entry){entry.quantity+=quantity;entry.at=now;}else entries.push({id,name,quantity,at:now});
 player.lootCollections=entries.sort((a,b)=>a.at-b.at).slice(-5);
}
export function drawLootCollectionFeed(ctx,players,viewport,now=Date.now()){
 const party=Array.isArray(players)?players:[players];
 const entries=party.flatMap(p=>(p?.lootCollections||[]).filter(e=>now-e.at<4500).map(e=>({...e,slot:p.slot||p.playerNumber||1}))).sort((a,b)=>a.at-b.at).slice(-5);
 ctx.save();ctx.font='12px sans-serif';ctx.textAlign='left';ctx.textBaseline='bottom';ctx.fillStyle='#ffffff';ctx.shadowColor='#000000';ctx.shadowBlur=3;
 const x=viewport.x+12,bottom=viewport.y+viewport.height-96;
 entries.forEach((entry,i)=>{ctx.globalAlpha=Math.min(1,(4500-(now-entry.at))/700);ctx.fillText(`${party.length>1?'P'+entry.slot+' · ':''}+${entry.quantity} ${entry.name}`,x,bottom-(entries.length-1-i)*17,Math.max(60,Math.min(310,viewport.width-24)));});
 ctx.restore();
}
