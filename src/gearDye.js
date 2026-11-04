export const DYE_SLOTS = ['helm','chest','legs'];

export function gearDye(actor, slot) {
  if (!DYE_SLOTS.includes(slot)) return '';
  const ref = actor?.equipment?.[slot];
  const id = typeof ref === 'string' ? ref : ref?.id;
  const colour = actor?.appearance?.gearDyes?.[id];
  return validDyeColour(colour) ? colour.toLowerCase() : '';
}

export function validDyeColour(colour) {
  return typeof colour === 'string' && /^#[a-f0-9]{6}$/i.test(colour);
}

export function dyeRGB(colour) {
  return [1,3,5].map(i => parseInt(colour.slice(i,i+2),16));
}

// Remap the material ramp while retaining the original alpha and dark ink.
export function dyeMaterialPixel(data, index, r, g, b, colour, light = 1) {
  const value = .25*r + .55*g + .2*b;
  const blend = Math.max(0,Math.min(1,(value-23)/25,(246-value)/30));
  const shade = (value-105)*.78;
  data[index] = (r+(colour[0]+shade-r)*blend)*light;
  data[index+1] = (g+(colour[1]+shade-g)*blend)*light;
  data[index+2] = (b+(colour[2]+shade-b)*blend)*light;
}
