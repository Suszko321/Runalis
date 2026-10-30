export const COOP_CAMERA_KEY = 'runalis.coopCamera';
export function cameraPreference() {
  try { return localStorage.getItem(COOP_CAMERA_KEY) === 'forced' ? 'forced' : 'join'; } catch { return 'join'; }
}
export function partyCameraLayout(members, width, height, previousShared = true, preference = 'join') {
  if (members.length < 2 || preference === 'forced') return {shared:false,zoom:1};
  const xs=members.map(p=>p.x),ys=members.map(p=>p.y);
  const fit=Math.min(1,width/(Math.max(...xs)-Math.min(...xs)+240),height/(Math.max(...ys)-Math.min(...ys)+240));
  return {shared:fit >= (previousShared ? .65 : .82),zoom:Math.max(.65,fit)};
}
