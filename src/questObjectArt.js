// Small physical evidence, drawn in the native pixel palette. These models have
// no asynchronous asset dependency and remain readable while atlases load.
export const QUEST_EVIDENCE_ART=['document','lantern','wax','cloth','ritual','tracks','roots','water','remains','toy','mechanism','reliquary','stone','satchel','table','arrow','echo'];
export function getQuestEvidenceArt(o){
 if(QUEST_EVIDENCE_ART.includes(o.questArt))return o.questArt;
 const s=`${o.id||''} ${o.name||''}`.toLowerCase();
 if(/lantern/.test(s))return 'lantern';
 if(/cradle|reliquary|relic socket/.test(s))return 'reliquary';
 if(/manifest|ledger|record|plan|index|order|account|archive/.test(s))return 'document';
 if(/wax|seal evidence/.test(s))return 'wax';
 if(/cloth|ribbon/.test(s))return 'cloth';
 if(/ritual marking|refusal|restraint/.test(s))return 'ritual';
 if(/footprint|patrol evidence|trail|shelter route/.test(s))return 'tracks';
 if(/toy|wooden horse/.test(s))return 'toy';
 if(/family.*table/.test(s))return 'table';
 if(/satchel/.test(s))return 'satchel';
 if(/arrow/.test(s))return 'arrow';
 if(/weapon marks|breach marks/.test(s))return 'stone';
 if(/sluice|device|door|regulator/.test(s))return 'mechanism';
 if(/irrigation|water/.test(s))return 'water';
 if(/echo|memory|root-heart/.test(s))return 'echo';
 if(/root/.test(s))return 'roots';
 if(/grave|healer|defender/.test(s))return 'remains';
 if(/stone|foundation|seam|memorial|symbols|ward/.test(s))return 'stone';
 return 'document';
}
export function drawQuestEvidence(ctx,o,x,y){
 const type=getQuestEvidenceArt(o),f=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 const line=(color,width,points)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='rgba(10,13,12,.32)';ctx.beginPath();ctx.ellipse(0,8,23,6,0,0,Math.PI*2);ctx.fill();
 if(type==='document'){
  f('#372e25',-19,-19,36,29);f('#b6a079',-17,-21,33,27);f('#dfca98',-14,-19,26,22);
  for(let i=0;i<4;i++)f('#74664c',-10,-14+i*5,18-i%2*7,2);
  f('#382e28',-18,-21,7,5);f('#725338',11,-1,5,7);f('#904538',5,-8,7,7);f('#c57d4d',7,-7,2,3);
 }else if(type==='lantern'){
  line('#aaa184',3,[[-8,-28],[-8,-35],[7,-35],[7,-28]]);f('#453d30',-13,-28,26,7);f('#a79767',-12,-27,24,4);
  f('#263232',-10,-21,20,25);f('#b4d2c5',-7,-19,14,21);f('#f3d688',-5,-16,9,15);f('#fff0b1',-2,-13,4,9);
  f('#5c553d',-12,3,24,6);line('#52564e',2,[[3,-20],[-2,-12],[5,-8],[-4,2]]);f('#352c22',-15,8,31,3);
 }else if(type==='wax'){
  f('#6a5840',-21,-3,38,7);f('#aa8b61',-19,-5,34,6);
  for(const [a,b]of [[-10,-8],[4,-2],[14,7]]){f('#5a2525',a-5,b-4,12,10);f('#a44a3c',a-4,b-5,9,8);f('#cf8b58',a-1,b-4,2,6);}
 }else if(type==='cloth'){
  line('#332a25',4,[[-22,5],[-16,-16],[0,-19],[20,-8],[12,9],[-3,5],[-12,10],[-22,5]]);
  ctx.fillStyle='#baa989';ctx.beginPath();ctx.moveTo(-20,4);ctx.lineTo(-14,-14);ctx.lineTo(0,-17);ctx.lineTo(18,-7);ctx.lineTo(10,7);ctx.lineTo(-3,3);ctx.closePath();ctx.fill();
  line('#d4ad5d',3,[[-14,-10],[-3,-12],[12,-5]]);f('#4a3c30',-19,2,9,7);f('#6e5d46',4,1,8,5);
 }else if(type==='ritual'){
  ctx.strokeStyle='#8b483c';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,24,12,0,.3,5.4);ctx.stroke();
  line('#bd815a',2,[[-18,-3],[0,-13],[16,5],[-14,7],[0,-13],[4,11]]);f('#cec1a0',-25,3,6,3);f('#4a302a',11,-5,10,3);
 }else if(type==='tracks'){
  for(const [a,b]of [[-15,3],[-3,-4],[8,-10],[17,-18]]){f('#493c31',a,b,7,9);f('#756249',a+1,b,5,3);f('#a79976',a-2,b+8,11,2);}
  f('#783e33',-20,8,11,3);f('#8c4a39',-5,10,5,2);
 }else if(type==='roots'){
  for(const [width,shade]of [[8,'#2e3025'],[4,'#666c42']]){line(shade,width,[[-25,9],[-13,1],[-4,-14],[9,-5],[24,-13]]);line(shade,width,[[1,-8],[8,7],[23,10]]);line(shade,width,[[-12,0],[-17,-13],[-10,-22]]);}
  f('#a89055',-5,-15,4,4);f('#78845a',8,1,4,3);
 }else if(type==='water'){
  f('#524f3a',-28,-9,56,18);f('#263f3a',-24,-7,48,13);f('#496a51',-20,-5,19,3);f('#7e8860',3,1,17,2);f('#162d2c',-9,-2,21,5);f('#a49b78',-27,8,54,4);
 }else if(type==='remains'){
  f('#4e4636',-23,-8,46,20);f('#74664a',-20,-9,39,15);f('#9b8d66',-15,-11,28,10);line('#b8ad8b',3,[[-14,0],[11,4]]);f('#d4c5a0',-18,-3,7,6);f('#4c3f32',-3,-17,5,11);f('#817052',-6,-20,12,4);
 }else if(type==='toy'){
  f('#583d29',-16,-8,28,13);f('#ad8050',-14,-10,23,10);f('#c29560',6,-21,7,15);f('#b28451',9,-22,10,6);f('#241f1b',15,-21,2,2);f('#775234',-12,4,5,8);f('#775234',6,2,5,10);line('#6a4d31',3,[[-16,-7],[-22,-2]]);
 }else if(type==='mechanism'){
  f('#3d453e',-26,-21,52,32);f('#7d8268',-23,-23,46,30);f('#a8a788',-20,-22,40,4);
  for(const a of [-13,0,13]){f('#333e37',a-2,-15,5,21);f('#8f8050',a-1,-13,2,15);}
  line('#b4a779',4,[[-11,-10],[11,-1]]);f('#423e30',-4,-12,8,8);
 }else if(type==='reliquary'){
  f('#352b28',-25,-12,50,24);f('#745641',-23,-14,46,22);f('#251f21',-17,-8,34,13);f('#b49759',-22,-15,5,27);f('#b49759',17,-15,5,27);f('#d1b574',-26,-17,11,5);f('#d1b574',15,-17,11,5);f('#a8956a',-23,7,46,4);
  if(/recovered|malakar/.test(`${o.id} ${o.name}`.toLowerCase())){f('#8e937c',-12,-13,24,16);line('#323c38',2,[[1,-13],[-3,-4],[5,3]]);}
 }else if(type==='stone'){
  f('#42493f',-23,-14,46,26);f('#7d826d',-21,-18,41,27);f('#a3a68a',-17,-20,31,6);line('#3e4b41',2,[[-13,-9],[10,-9],[10,0],[-7,0],[-7,-5],[3,-5]]);f('#b0a888',-23,8,46,4);
 }else if(type==='satchel'){
  f('#302820',-19,-20,37,31);f('#79593b',-17,-22,33,29);f('#9e7850',-15,-20,29,12);f('#4f392a',-14,-6,27,3);f('#b29a60',-3,-10,7,9);line('#5d442d',4,[[-14,-20],[-9,-29],[12,-29],[17,-17]]);
 }else if(type==='table'){
  f('#362c22',-24,-12,48,21);f('#956a42',-23,-15,46,17);line('#c2965e',2,[[-20,-13],[20,-13]]);f('#53412d',-20,5,6,9);f('#53412d',14,5,6,9);f('#c0b18a',-12,-13,15,8);f('#644a34',9,-14,9,8);
 }else if(type==='arrow'){
  line('#372e23',5,[[-24,9],[23,-18]]);line('#ac8857',2,[[-24,8],[22,-18]]);line('#8c9690',5,[[16,-18],[25,-22],[23,-14]]);line('#984b3a',4,[[-19,2],[-19,9],[-12,9]]);
 }else if(type==='echo'){
  f('#353f36',-17,3,34,9);f('#737c60',-13,0,26,8);line('#719f91',3,[[-9,-5],[0,-25],[10,-7],[0,1],[-9,-5]]);line('#b1d1ad',2,[[0,-22],[-1,-6],[7,-8]]);f('#a9bd87',-18,-15,3,3);f('#a9bd87',15,-23,2,3);
 }
 ctx.restore();return type;
}
