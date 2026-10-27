// Authored pixel geometry, centered on the hand grip at (0, 0).
export const TIDEGLASS_RAPIER_ART={width:64,height:96,gripX:32,gripY:80,scale:.85};
export function drawTideglassRapierModel(ctx){
 const pixel=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 // Long, tapered glass blade: a bright cutting edge and a deep teal facet.
 pixel('#172e37',-2,-46,5,37);pixel('#172e37',-1,-49,3,3);
 pixel('#172e37',0,-52,1,3);
 pixel('#348da6',-1,-46,3,36);pixel('#8de2e5',-1,-46,1,36);
 pixel('#d8ffff',0,-49,1,39);pixel('#46b4c5',1,-43,1,33);
 pixel('#ecffff',-1,-40,1,6);pixel('#28677c',1,-24,1,5);
 // Brass ricasso, swept quillons, and a small shell guard.
 pixel('#352819',-3,-10,7,5);pixel('#b68b4e',-2,-9,5,3);
 pixel('#f0d59a',-2,-9,4,1);pixel('#5d492d',-5,-7,11,3);
 pixel('#c8a86b',-5,-7,11,1);pixel('#e6d4a3',-6,-8,2,1);
 pixel('#e6d4a3',5,-9,2,2);pixel('#776040',-4,-5,9,2);
 pixel('#ead69c',-3,-5,6,1);pixel('#5faaa9',-1,-6,3,2);
 // The knuckle bow curls around the fingers, rather than becoming a broad crossguard.
 pixel('#322d23',6,-7,2,10);pixel('#c5a169',6,-7,1,9);
 pixel('#d5bc84',4,2,3,1);pixel('#6a5435',2,3,3,1);
 // Leather grip and a glass inset in the brass pommel.
 pixel('#162d30',-2,-2,4,8);pixel('#326164',-1,-1,1,6);
 pixel('#977744',-2,-2,4,1);pixel('#887141',-2,5,4,1);
 pixel('#372e22',-3,6,6,3);pixel('#c4a466',-2,6,4,3);
 pixel('#7bd6d9',-1,7,2,1);
}
