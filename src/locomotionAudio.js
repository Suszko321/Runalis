import { playSfx } from './audioSystem.js';
import { getLocomotionContactIndex } from './locomotionProfiles.js';
import { SOUND_EVENT_KEYS } from './combatFeedbackProfiles.js';

export function updateActorLocomotionAudio(actor) {
  if (!actor) return;

  if (!actor.isMoving) {
    actor.lastLocomotionContact = -1;
    return;
  }

  const running = !!actor.actionState?.sprinting;
  const contact = getLocomotionContactIndex(running ? 'run' : 'walk', actor.walkTime || 0);
  if (contact < 0 || contact === actor.lastLocomotionContact) return;

  actor.lastLocomotionContact = contact;
  playSfx(running ? SOUND_EVENT_KEYS.RUN_STEP : SOUND_EVENT_KEYS.FOOTSTEP, {
    volume: running ? 0.34 : 0.22,
    throttle: running ? 0.12 : 0.18
  });

  const weapon = actor.equipment?.weapon;
  const chest = actor.equipment?.chest;
  if (weapon || chest) {
    playSfx(SOUND_EVENT_KEYS.GEAR_MOVE, {
      volume: running ? 0.2 : 0.12,
      throttle: 0.3
    });
  }
}
