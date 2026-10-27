// Keep the fullscreen canvas proportional without increasing its pixel budget.
// Input conversion and camera code already use the canvas's actual dimensions.
const sizes=new WeakMap(),PIXELS=960*600;
export function fitGameplayCanvas(game){
 const canvas=game?.canvas;
 if(typeof window==='undefined'||canvas?.id!=='game'||game.developerEditor)return;
 const old=sizes.get(canvas);if(old?.w===window.innerWidth&&old.h===window.innerHeight)return;
 const rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
 const ratio=rect.width/rect.height;
 let width=Math.max(1,Math.round(Math.sqrt(PIXELS*ratio))),height=Math.max(1,Math.round(width/ratio));
 if(width>2048||height>2048){const scale=2048/Math.max(width,height);width=Math.round(width*scale);height=Math.round(height*scale);}
 sizes.set(canvas,{w:window.innerWidth,h:window.innerHeight});
 if(width===canvas.width&&height===canvas.height)return;
 if(game.camera){game.camera.x+=(canvas.width-width)/2;game.camera.y+=(canvas.height-height)/2;}
 canvas.width=width;canvas.height=height;
 const ctx=game.ctx||canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
}
