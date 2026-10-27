import {MAX_PACKET_BYTES,parseWire} from './onlineProtocol.js';
import {ONLINE_PEER_OPTIONS} from './onlineNetworkConfig.js';
let library;
export async function createOnlinePeer(id) {
  library ||= import('./vendor/peerjs-1.5.5.min.js');await library;
  const options={debug:0,...ONLINE_PEER_OPTIONS,...(globalThis.RUNALIS_NETWORK_CONFIG||{})};
  return new globalThis.Peer(id,options);
}
// Chunk before WebRTC's message limit. A slow receiver skips new state until
// its previous snapshot drains instead of growing an unbounded send queue.
export function bindOnlineConnection(connection,onMessage,onError) {
  const assemblies=new Map();let serial=0;
  connection.on('data',chunk=>{
    try{
      if(!chunk||typeof chunk!=='object'||typeof chunk.id!=='number'||!Number.isInteger(chunk.n)||chunk.n<1||chunk.n>512||!Number.isInteger(chunk.i)||chunk.i<0||chunk.i>=chunk.n||typeof chunk.text!=='string'||chunk.text.length>16000)throw Error('Invalid network frame.');
      const now=Date.now();for(const [key,item]of assemblies)if(now-item.at>15000)assemblies.delete(key);
      if(!assemblies.has(chunk.id)){if(assemblies.size>=4)throw Error('Too many incomplete network messages.');assemblies.set(chunk.id,{parts:new Array(chunk.n),bytes:0,count:0,at:now});}
      const item=assemblies.get(chunk.id);if(item.parts.length!==chunk.n)throw Error('Invalid network message size.');
      if(item.parts[chunk.i]!==undefined)return;
      item.parts[chunk.i]=chunk.text;item.bytes+=chunk.text.length;item.count++;
      if(item.bytes>MAX_PACKET_BYTES)throw Error('Network message too large.');
      if(item.count===chunk.n){assemblies.delete(chunk.id);onMessage(parseWire(item.parts.join('')));}
    }catch(error){onError(error);}
  });
  connection.on('error',onError);
  return {
    send(packet,{state=false}={}){
      if(!connection.open)return false;
      if(state&&(connection.bufferSize>4||connection.dataChannel?.bufferedAmount>256000))return false;
      const text=JSON.stringify(packet);if(text.length>MAX_PACKET_BYTES)throw Error('This world update is too large to send.');
      const id=++serial,n=Math.ceil(text.length/12000);
      for(let i=0;i<n;i++)connection.send({id,n,i,text:text.slice(i*12000,(i+1)*12000)});
      return true;
    },
    close(){assemblies.clear();connection.close();}
  };
}
