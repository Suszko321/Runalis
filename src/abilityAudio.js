import { playSfx } from './audioSystem.js';

// Event hooks use the existing synthesizer/mixer; assets can replace individual
// stages without coupling audio to combat authority.
const listeners = new Set();
const signatures = {
  oathkeeper:'block',fellhunter:'projectileLaunch',gravecaller:'summon',thornbinder:'ability',
  waverider:'spellRelease',lightbringer:'spellRelease'
};
export function subscribeAbilityAudio(listener) { listeners.add(listener);return ()=>listeners.delete(listener); }
export function playAbilityAudioEvent(stage,ability,extra={}) {
  if(!ability)return;
  const event={stage,abilityId:ability.id,classId:ability.classId,...extra};
  for(const listener of listeners)listener(event);
  if(ability.spectralUrn){if(['cast','urnShatter','impact'].includes(stage))playSfx('spectralUrn',{phase:stage,volume:stage==='impact'?.26:.55,throttleKey:'urn:'+stage,throttle:stage==='impact'?.16:.08});return;}
  if(ability.oathBlades){playSfx('oathBlade',{family:ability.oathBladeFamily||'base',phase:stage,volume:stage==='bladeLaunch'?.3:.5,throttleKey:'blades:'+stage,throttle:.15});return;}
  if(ability.hellSkill){playSfx('hellstalkerSpell',{phase:stage,mobility:ability.role==='mobility',volume:stage==='impact'?.42:.5,throttleKey:'hell:'+stage,throttle:stage==='impact'?.18:.12});return;}
  if(ability.classId==='fellhunter'){playSfx('fellhunterTool',{family:ability.subclassId||'base',phase:stage,tool:/Trap|Deadfall|Bomb|Caltrops|KillZone/.test(ability.id),volume:stage==='impact'?.42:.5,throttleKey:'hunt:'+stage,throttle:stage==='impact'?.18:.12});return;}
  if(ability.gardenGraveMorph){playSfx('gardenGraveSpell',{phase:stage,family:ability.subclassId,eruption:ability.roseEruption&&stage==='cast',volume:stage==='channelLoop'?.17:.5,throttleKey:ability.subclassId+':'+stage,throttle:stage==='channelLoop'?.75:stage==='impact'?.18:.12});return;}
  if(ability.classId==='oathkeeper'){
    playSfx('oathMiracle',{phase:stage,family:ability.subclassId||'base',
      heavy:/Judgment|Smite|Debt/.test(ability.id),volume:stage==='channelLoop'?.16:.55,
      throttleKey:'oath:'+stage,throttle:stage==='channelLoop'?.6:stage==='impact'?.14:.12});return;
  }
  if(ability.cryoSkill){playSfx('cryoSpell',{phase:stage,volume:stage==='channelLoop'?.18:.5,throttleKey:'cryo:'+stage,throttle:stage==='impact'?.18:.12});return;}
  const cue=stage==='masteryMilestone'?'spellRelease':stage==='impact'?'projectileImpact':stage==='channelEnd'?'menuBack':stage==='start'?'spellBuildup':signatures[ability.classId] || 'ability';
  playSfx(cue,{volume:stage==='channelLoop' ? .18 : .5,throttle:stage==='channelLoop' ? .7 : .12});
}
