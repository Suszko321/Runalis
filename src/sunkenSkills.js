// Preserve the original water techniques; pressure owns encounter-wide Depth.
export const SUNKEN_PRESSURE=Object.freeze({opening:.72,rampSeconds:20,grace:3,encounterGrace:5,tick:.5,cap:48,directRamp:.5,burnOpening:.10,burnRamp:1.10});
export const SUNKEN_SKILLS=Object.freeze({
 hydromancerWaterTorrent:['Abyssal Torrent','Drive dark-blue water through a cone ahead. Sustained hits build shared Depth and leave a pressure burn. Hold to charge a wider, harder strike.'],
 hydromancerBubbleWard:['Pressure Shell','Enclose yourself in deep-water pressure, retaining Bubble Ward’s protection. A short defensive pause does not immediately lose built Depth.'],
 hydromancerMendingCurrent:['Stillwater Mend','Draw restorative deep water around yourself and nearby allies. Keeps Mending Current’s healing; healing does not generate Depth.'],
 hydromancerTidalCut:['Drowned Edge','Advance behind a dark-water blade and cut nearby enemies. A close-range way to maintain Depth and renew pressure burns.'],
 hydromancerRiptideStep:['Undercurrent Slip','Slip along passable ground in a trail of midnight water and release a water strike on arrival. Damaging contacts renew pressure; walls stop your movement.'],
 hydromancerDrowningPressure:['Crushing Depths','Collapse dark-water pressure around an aimed group. Slow and heavily Soak enemies for stronger water follow-ups; the initial impact renews their pressure burns.'],
 hydromancerWellspring:['Blackwater Spring','Raise a restorative deep-water spring that returns health, Stamina and Spirit to nearby allies. Restoration retains its original behavior and does not generate Depth.'],
 hydromancerDelugeCrown:['Crown of the Trench','Crash a crown of dark-blue water into an area and shelter nearby allies. In a long fight, built Depth strengthens the impact and its pressure burn.'],
 waveriderMaelstrom:['Abyssal Maelstrom','Hold a broad abyssal whirlpool around yourself. Pull and Soak enemies, maintaining Depth across the pack and strengthening their pressure burns. Flow widens the vortex; release or dodge to stop.'],
 waveriderUndertow:['Drowning Undertow','Send a dark current along your aim. Its continuing hits pull and Soak enemies while maintaining shared Depth.'],
 waveriderPressureSpear:['Trench Spear','Drive a narrow lance of midnight water through aligned foes. Soaked targets take stronger hits. Charge for a heavier strike that renews pressure.'],
 waveriderTideMirror:['Mirror of the Deep','Raise a dark-water curtain that retains Tide Mirror’s ranged protection and returning jet. Damaging replies can maintain pressure; protection alone cannot.']
});
export function applySunkenTuning(ability) {
 const spec=SUNKEN_SKILLS[ability.id];if(!spec)return;
 ability.name=spec[0];
 ability.desc=spec[1]+(ability.damage?' Sunken starts with 28% less damage. Damaging Sunken skills build Depth over 20 seconds, shared between targets. Five seconds without a qualifying hit resets Depth; each pressure burn lasts up to three seconds after its last source hit.':'');
}
