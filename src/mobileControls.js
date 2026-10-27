import {HOTBAR_SLOT_COUNT} from './hotbarConfig.js';

// Touch is another controller for the host player. It never changes saved bindings.
export function isMobileInputDevice() {
  return navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches;
}

export async function requestMobileLandscape() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    await screen.orientation?.lock?.('landscape');
  } catch {
    // iOS and embedded browsers may require the player to rotate the device.
  }
}

export function initMobileShell() {
  if (!isMobileInputDevice()) return;
  document.body.classList.add('mobile-input');
  const rotate = document.createElement('div');
  rotate.id = 'mobileRotate';
  rotate.setAttribute('role', 'dialog');
  rotate.setAttribute('aria-label', 'Landscape play');
  rotate.innerHTML = '<div><h2>Turn your device sideways</h2><p>Runalis plays best in landscape.</p><button data-mobile-landscape>Enter fullscreen</button><button data-mobile-portrait>Continue in portrait</button></div>';
  document.body.append(rotate);
  rotate.querySelector('[data-mobile-landscape]').onclick = requestMobileLandscape;
  rotate.querySelector('[data-mobile-portrait]').onclick = () => rotate.classList.add('dismissed');
  addEventListener('orientationchange', () => rotate.classList.remove('dismissed'));
  matchMedia('(orientation: landscape)').addEventListener('change', () => rotate.classList.remove('dismissed'));
  document.addEventListener('click', event => {
    if (event.target.closest('[data-load],#continueGameBtn,#newGameBtn,#createProfileBtn')) requestMobileLandscape();
  }, true);
}

export function createMobileControls(game, actions) {
  if (!isMobileInputDevice()) return null;
  const root = document.createElement('div');
  root.id = 'mobileControls';
  root.setAttribute('aria-label', 'Touch controls');
  root.innerHTML = `<div class="mobile-tools"><button data-action="menu">Menus</button><button data-action="multiplayer">Multiplayer</button><button data-action="pause">Pause</button><button data-action="fullscreen" aria-label="Enter fullscreen">⛶</button></div>
    <div class="mobile-gameplay"><div id="mobileStick" role="group" aria-label="Movement thumbstick"><span></span></div>
    <div class="mobile-actions">${Array.from({length:HOTBAR_SLOT_COUNT}, (_, i) => `<button data-hold="ability${i}" aria-label="Skill slot ${i+1}"><span>Skill ${i+1}</span><small></small></button>`).join('')}
    <button data-hold="attack" class="mobile-attack">Attack<small>Hold: heavy</small></button><button data-hold="sprint">Sprint</button><button data-hold="dash">Dodge</button><button data-hold="interact">Interact</button></div></div>
    <div class="mobile-story"><button data-action="skip">Skip opening</button></div><div class="mobile-aim-reticle" hidden aria-hidden="true"></div>`;
  document.body.append(root);
  const input = {connected:true, mobile:true, slotIndex:-2, moveX:0, moveY:0};
  const pointers = new Map();
  const abort = new AbortController();
  const listen = (target, type, fn) => target.addEventListener(type, fn, {signal:abort.signal, passive:false});
  const stick = root.querySelector('#mobileStick');
  const knob = stick.querySelector('span');
  const reticle = root.querySelector('.mobile-aim-reticle');
  let aimPointerId = null, aimPoint = null;
  let stickId = null, uiAt = 0, wasBlocked = false;
  const originalHeight = game.canvas.height;
  function resizeCanvas() {
    const rect = game.canvas.getBoundingClientRect();
    if (rect.width && rect.height) game.canvas.height = Math.round(game.canvas.width * rect.height/rect.width);
  }
  resizeCanvas();
  const held = name => [...pointers.values()].some(value => value === name);
  function reset() {
    pointers.clear(); stickId = null;
    aimPointerId = aimPoint = null;
    input.mouseAimActive = false;
    reticle.hidden = true;
    for (const key of Object.keys(input)) if (/(Held|Pressed|Released)$/.test(key)) input[key] = false;
    input.moveX = input.moveY = 0;
    knob.style.transform = '';
    root.querySelectorAll('.held').forEach(el => el.classList.remove('held'));
  }
  function blocked() {
    return game.paused || game.dialogue?.active&&!game.dialogue.actor?.networkRemote || game.isActorInterfaceBusy(game.player) ||
      game.couchCoopJoinMenu?.active || game.world?.mode === 'act1Opening' ||
      !!document.querySelector('#yourOrderLedger,#characterCreatorOverlay.active,#pvpArenaOverlay.active');
  }
  function move(event) {
    const rect = stick.getBoundingClientRect(), radius = rect.width * .35;
    const x = event.clientX - rect.left - rect.width/2, y = event.clientY - rect.top - rect.height/2;
    const length = Math.hypot(x,y), scale = Math.min(1, radius/(length || 1));
    input.moveX = length > radius*.16 ? x/Math.max(radius,length) : 0;
    input.moveY = length > radius*.16 ? y/Math.max(radius,length) : 0;
    knob.style.transform = `translate(${x*scale}px,${y*scale}px)`;
  }
  listen(root, 'pointerdown', event => {
    const button = event.target.closest('[data-hold]');
    if (!button && event.target !== stick && !stick.contains(event.target)) return;
    event.preventDefault(); event.stopPropagation(); actions.unlock();
    if (blocked() || game.primaryControllerActive) return;
    if (!button) {
      if (stickId !== null) return;
      stickId = event.pointerId; pointers.set(stickId,'move'); move(event);
      stick.setPointerCapture(stickId); return;
    }
    const name = button.dataset.hold;
    if (button.disabled) return;
    const alreadyHeld = held(name);
    pointers.set(event.pointerId,name); button.setPointerCapture(event.pointerId);
    if (!alreadyHeld) input[`${name}Pressed`] = true;
    input[`${name}Held`] = true;
    if (name === 'interact') { input.confirmPressed = !alreadyHeld; input.confirmHeld = true; }
    button.classList.add('held');
  });
  listen(root, 'pointermove', event => {
    if (event.pointerId !== stickId) return;
    event.preventDefault(); move(event);
  });
  function release(event) {
    const name = pointers.get(event.pointerId);
    if (!name) return;
    event.preventDefault(); pointers.delete(event.pointerId);
    if (name === 'move') { stickId = null; input.moveX = input.moveY = 0; knob.style.transform = ''; return; }
    if (held(name)) return;
    input[`${name}Held`] = false;
    if (event.type === 'pointerup') input[`${name}Released`] = true;
    else { input[`${name}Pressed`] = false; actions.cancelCharge(); }
    if (name === 'interact') { input.confirmHeld = false; input.confirmReleased = event.type === 'pointerup'; }
    root.querySelector(`[data-hold="${name}"]`)?.classList.remove('held');
  }
  for (const type of ['pointerup','pointercancel','lostpointercapture']) listen(root,type,release);
  // A separate finger on the world steers aim; buttons and the movement wheel
  // never count as aiming touches. Capture lets a held aim continue off canvas.
  listen(game.canvas, 'pointerdown', event => {
    if (event.pointerType !== 'touch' || blocked() || game.primaryControllerActive || aimPointerId !== null) return;
    event.preventDefault(); actions.unlock();
    aimPointerId = event.pointerId;
    aimPoint = {x:event.clientX,y:event.clientY};
    game.canvas.setPointerCapture(event.pointerId);
  });
  listen(game.canvas, 'pointermove', event => {
    if (event.pointerId !== aimPointerId) return;
    event.preventDefault(); aimPoint = {x:event.clientX,y:event.clientY};
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) listen(game.canvas,type,event => {
    if (event.pointerId !== aimPointerId) return;
    aimPointerId = null;
    if (type !== 'pointerup') aimPoint = null;
    // A quick tap survives until one gameplay frame consumes its direction.
  });
  root.querySelectorAll('[data-action]').forEach(button => {
    button.onclick = event => {
      event.stopPropagation(); actions.unlock(); reset(); actions.cancelCharge();
      const action = button.dataset.action;
      if (action === 'fullscreen') requestMobileLandscape();
      else actions[action]?.();
    };
  });
  listen(window, 'blur', () => {reset(); actions.cancelCharge();});
  listen(document, 'visibilitychange', () => {if(document.hidden){reset(); actions.cancelCharge();}});
  listen(window, 'resize', () => {reset(); actions.cancelCharge(); resizeCanvas();});
  return {
    input,
    update(now) {
      const locked = !!blocked() || game.primaryControllerActive;
      if (locked && !wasBlocked) {reset(); actions.cancelCharge();}
      wasBlocked = locked;
      input.mouseAimActive = !locked && !!aimPoint;
      reticle.hidden = !input.mouseAimActive;
      if (input.mouseAimActive) {
        const rect = game.canvas.getBoundingClientRect();
        input.mouseWorldX = (aimPoint.x-rect.left)*game.canvas.width/rect.width + game.camera.x;
        input.mouseWorldY = (aimPoint.y-rect.top)*game.canvas.height/rect.height + game.camera.y;
        reticle.style.left = `${aimPoint.x}px`;
        reticle.style.top = `${aimPoint.y}px`;
      }
      root.classList.toggle('gameplay-hidden', locked);
      root.classList.toggle('opening', game.world?.mode === 'act1Opening');
      root.classList.toggle('hardware-controller', game.primaryControllerActive);
      if (now < uiAt) return;
      uiAt = now + .2;
      // Mirror the authoritative HUD, including morph names, charges and cooldowns.
      root.querySelectorAll('[data-hold^="ability"]').forEach((button, index) => {
        const id = game.player.loadout?.abilitySlots?.[index];
        const slot = [...document.querySelectorAll('#combatSkillHud .combat-hud-slot')].find(el => el.dataset.abilityId === id);
        const name = slot?.querySelector('.combat-hud-body b')?.textContent || actions.abilityName(id) || `Empty ${index+1}`;
        button.querySelector('span').textContent = name;
        button.setAttribute('aria-label', `Skill ${index+1}: ${name}`);
        button.disabled = !id;
        button.querySelector('small').textContent = slot?.querySelector('.combat-hud-cd-text')?.textContent || slot?.querySelector('.combat-hud-charge-text')?.textContent || '';
        button.classList.toggle('cooling', !!slot?.querySelector('.combat-hud-cooldown'));
        button.classList.toggle('resource-low', !!slot?.classList.contains('resource-failed'));
      });
    },
    endFrame() {
      for (const key of Object.keys(input)) if (/(Pressed|Released)$/.test(key)) input[key] = false;
      if (aimPointerId === null) aimPoint = null;
    },
    destroy() {reset(); abort.abort(); root.remove(); game.canvas.height = originalHeight;}
  };
}
