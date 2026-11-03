// Pure rule shared by committed weapon hits and their UI descriptions.
export const PRIMARY_WEAPON_SPIRIT_RECOVERY=Object.freeze({grimoire:.4,spiritFocus:.3,other:.25});
export function weaponSpiritRecoveryRate(type){return type==='grimoire'?PRIMARY_WEAPON_SPIRIT_RECOVERY.grimoire:type==='spiritFocus'?PRIMARY_WEAPON_SPIRIT_RECOVERY.spiritFocus:PRIMARY_WEAPON_SPIRIT_RECOVERY.other;}
export function weaponSpiritRecoveryAmount(player,type){
 const maximum=Number(player?.maxSpirit);
 return Number.isFinite(maximum)?Math.max(0,maximum)*weaponSpiritRecoveryRate(type):0;
}
export function weaponSpiritRecoveryLabel(type){return `${Math.round(weaponSpiritRecoveryRate(type)*100)}% of maximum Spirit`;}
