// Read-only audit of current ownership/transport defects. These are diagnostic
// observations, not passing acceptance tests: a confirmed finding needs repair.
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import fs from 'node:fs';
import {createPlayer,chooseClass} from '../src/player.js';
import {updateWorldLootPickups} from '../src/lootSystem.js';
import {bindOnlineConnection} from '../src/onlineTransport.js';
import {MAX_PACKET_BYTES} from '../src/onlineProtocol.js';

const findings=[];
const player=(name,slot)=>{
  const p=createPlayer(name);chooseClass(p,'oathkeeper');
  Object.assign(p,{slot,playerNumber:slot,profileId:name,x:100,y:100});return p;
};
const count=(p,id)=>p.inventory.filter(i=>i.id===id||i.item===id||i.itemId===id).reduce((n,i)=>n+(i.qty||0),0);

// A different character can reuse a departed character's local or online slot.
{
  const host=player('audit-host',1),replacement=player('audit-replacement',2);
  host.x=500;host.coop={players:[replacement]};
  const before=count(replacement,'ironOre');
  const world={drops:[{id:'departed-player-drop',itemId:'ironOre',qty:3,ownerSlot:2,ownerLabel:'P2',x:100,y:100,age:0,ttl:90}]};
  updateWorldLootPickups(world,host,0,()=>{});
  const observed=count(replacement,'ironOre')-before;
  findings.push({id:'MP-001',confirmed:observed===3,observed,
    description:'A replacement profile in slot 2 collects the departed profile\'s slot-owned loot.'});
  assert.equal(observed,3,'Audit baseline changed: reassess MP-001 rather than assuming it remains open.');
}

// The sender's permitted packet size exceeds the receiver's 512-frame limit.
{
  class Connection extends EventEmitter {
    open=true;bufferSize=0;dataChannel={bufferedAmount:0};frames=[];
    send(frame){this.frames.push(frame);}close(){this.open=false;}
  }
  const sender=new Connection(),receiver=new Connection(),errors=[];
  const tx=bindOnlineConnection(sender,()=>{},error=>{throw error;});
  let received=0;bindOnlineConnection(receiver,()=>received++,error=>errors.push(error.message));
  const packet={type:'audit',payload:'a'.repeat(MAX_PACKET_BYTES-2048)};
  const length=JSON.stringify(packet).length;
  assert(length<MAX_PACKET_BYTES);assert(tx.send(packet));
  for(const frame of sender.frames)receiver.emit('data',frame);
  const confirmed=sender.frames.length>512&&received===0&&errors.length>0;
  findings.push({id:'MP-003',confirmed,length,frames:sender.frames.length,received,error:errors[0],
    description:'A packet below MAX_PACKET_BYTES is sent successfully but every frame is rejected by the receiver.'});
  assert(confirmed,'Audit baseline changed: reassess MP-003.');
}

const report={date:'2026-10-31',kind:'controlled defect reproductions; no live profiles or services',findings};
fs.mkdirSync(new URL('../docs/multiplayer-audit/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../docs/multiplayer-audit/diagnostics.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
