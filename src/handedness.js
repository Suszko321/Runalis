// Anatomical ownership is fixed; screen position changes with facing and gait.
export const weaponShoulderSide = facing => facing === 'up' ? -1 : 1;
export const weaponBehindBody = facing => facing === 'up' || facing === 'right';
export const shieldBehindBody = facing => facing === 'up' || facing === 'left';
export const shieldGrip = facing => ({down:[-13,-8],right:[-8,-9],up:[14,-8],left:[-8,-9]}[facing] || [-13,-8]);
