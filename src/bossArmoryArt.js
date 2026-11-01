import {asset} from './spriteArt.js';
import {BOSS_ARMORY_ART} from './bossArmoryArtData.js';
import {FOCUS_PROJECTILE_STYLES} from './focusProjectileData.js';
export function drawBossArmoryWeapon(ctx,id,x,y,side=1){
 const profile=BOSS_ARMORY_ART[id];if(!profile)return false;
 const record=asset(profile.sheet);if(!record?.ready)return true;
 const {width,height,gripX,gripY,scale}=profile;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(x,y);ctx.scale(side,1);
 ctx.drawImage(record.image,-gripX*scale,-gripY*scale,width*scale,height*scale);ctx.restore();return true;
}
export function drawFocusProjectile(ctx,projectile,x,y){
 const style=FOCUS_PROJECTILE_STYLES[projectile.focusItemId];if(!style)return false;
 const record=asset('focus-projectiles');if(!record?.ready)return false;
 const heavy=projectile.kind==='focusLance'||projectile.comboType==='heavy',width=heavy?38:28,height=heavy?24:22;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.rotate(Math.atan2(projectile.dirY??0,projectile.dirX??1));
 ctx.drawImage(record.image,style.index%4*32,Math.floor(style.index/4)*32,32,32,-width/2,-height/2,width,height);ctx.restore();return true;
}
for(const profile of Object.values(BOSS_ARMORY_ART))asset(profile.sheet);
asset('focus-projectiles');
