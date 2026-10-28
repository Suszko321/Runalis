// Rasterize the game's existing vector favicon for browser/OS app launchers.
const fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require(process.env.RUNALIS_CANVAS_MODULE||path.join(process.env.RUNALIS_NODE_MODULES,'@napi-rs/canvas'));
(async()=>{
 const html=fs.readFileSync('index.html','utf8');
 const svg=decodeURIComponent(html.match(/href="data:image\/svg\+xml,([^"]+)"/)[1]);
 const image=await loadImage(Buffer.from(svg));
 for(const size of [180,192,512]){
  const canvas=createCanvas(size,size);canvas.getContext('2d').drawImage(image,0,0,size,size);
  fs.writeFileSync(`assets/ui/runalis-app-${size}.png`,canvas.toBuffer('image/png'));
 }
 console.log('Built Home Screen icons from the existing Runalis shield.');
})().catch(error=>{console.error(error);process.exitCode=1;});
