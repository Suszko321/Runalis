// Stable ground positions and authored pixel blossoms, shared by the live field
// and its visual. No random flicker, raster filtering or moving healing radius.
export function createFaeFlowerLayout(radius){
  const flowers=[];
  for(let i=0;i<64;i++){
    const angle=i*2.399963229728653,distance=radius*Math.sqrt((i+.5)/64)*.95;
    flowers.push({x:Math.round(Math.cos(angle)*distance),y:Math.round(Math.sin(angle)*distance),
      style:i%3,unit:i%5===0?1:2,delay:.08+(distance/radius)*.48+(i%4)*.06});
  }
  return flowers.sort((a,b)=>a.y-b.y);
}
const BLOSSOMS=[
  ['0002000','0023200','0234320','0023200','0005000','0065600','0005000','0005000'],
  ['0003000','0032300','0324230','0032300','0005000','0005600','0065000','0005000'],
  ['0020200','0232320','0024200','0032300','0005000','0065000','0005600','0005000']
];
export function drawFaeFlowerField(ctx,fx,camera){
  const visual=fx.flowerVisual;if(!visual?.active)return;
  const elapsed=(fx.flowerAge||0)+(fx.age||0),duration=visual.duration;
  if(elapsed>=duration)return;
  const x=Math.round(fx.x-camera.x),y=Math.round(fx.y-camera.y),radius=fx.radius;
  if(x+radius<0||y+radius<0||x-radius>ctx.canvas.width||y-radius>ctx.canvas.height)return;
  const colors=fx.colors||['#d29ee4','#a5f1ef','#446b57'];
  const palette=['','#382b45',colors[0],colors[1],'#f6dec2','#45645d','#91cbb7'];
  const ending=Math.max(0,Math.min(1,(duration-elapsed)/.85));
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.globalAlpha=.3*Math.min(1,elapsed/.5)*ending;
  for(let i=0;i<80;i++){
    const angle=i*Math.PI*2/80;ctx.fillStyle=i%3?colors[0]:colors[1];
    ctx.fillRect(Math.round(x+Math.cos(angle)*radius),Math.round(y+Math.sin(angle)*radius),2,1);
  }
  for(const flower of visual.flowers){
    const growing=Math.max(0,Math.min(1,(elapsed-flower.delay)/.6));
    const sinking=Math.max(0,Math.min(1,(duration-elapsed-flower.delay*.25)/.7));
    const rows=BLOSSOMS[flower.style],visible=Math.floor(rows.length*Math.min(growing,sinking));
    if(!visible)continue;ctx.globalAlpha=.92*Math.min(1,sinking*2);
    const px=x+flower.x,py=y+flower.y;
    for(let row=rows.length-visible;row<rows.length;row++)for(let col=0;col<7;col++){
      const cell=Number(rows[row][col]);if(!cell)continue;ctx.fillStyle=palette[cell];
      ctx.fillRect(px+(col-3)*flower.unit,py+(row-rows.length+1)*flower.unit,flower.unit,flower.unit);
    }
  }
  ctx.restore();
}
