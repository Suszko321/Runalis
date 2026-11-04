import {ITEMS} from './data.js';
import {DYE_SLOTS,gearDye,validDyeColour} from './gearDye.js';
import {drawHumanActor} from './humanRenderer.js';
import {objectInInteractionRange} from './interactionRange.js';
import {hasLineOfSight} from './world.js';

const OVERLAY = 'tailorOverlay';
const SWATCHES = ['#ad5949','#c78949','#b8a363','#667d52','#467b7b','#526b9a','#826296','#827364','#454650','#bcb9ae'];
const itemFor = (actor,slot) => {
  const ref = actor.equipment?.[slot];
  const item = ITEMS[typeof ref === 'object' ? ref?.id : ref];
  return item?.type === 'armour' && item.slot === slot ? item : null;
};

function inReach(game, actor, npc) {
  return game.world?.mode === 'capital' && actor.hp > 0 && !actor.controllerDisconnected &&
    npc?.tailorService && game.world.objects.includes(npc) &&
    objectInInteractionRange(actor,npc) && hasLineOfSight(game.world,actor.x,actor.y,npc.x,npc.y);
}

export function closeTailor(game) {
  if(game.tailorSession)document.getElementById(OVERLAY)?.close();
}

export function isTailorBusy(game, actor) {
  return game.tailorSession?.actor === actor;
}

export function openTailor(view,npc) {
  const game = view.hostGame || view, actor = view.player;
  if (!inReach(game,actor,npc) || game.tailorSession) return false;
  if (actor.networkRemote) return !!game.onlineSession?.delegateService(actor,{type:'tailor'},npc);
  const worn = DYE_SLOTS.map(slot=>({slot,item:itemFor(actor,slot)})).filter(entry=>entry.item);
  if (!worn.length) {game.log('Equip a hood, chest piece or legwear to have it dyed.');return false;}

  const dialog = document.createElement('dialog');
  const previous = document.activeElement;
  dialog.id = OVERLAY;
  dialog.className = 'active';
  dialog.dataset.ownerSlot = String(actor.slot || actor.playerNumber || 1);
  dialog.setAttribute('aria-labelledby','tailorTitle');
  dialog.innerHTML = `
    <h2 id="tailorTitle">The Quiet Stitch</h2>
    <p>Choose a worn piece and preview its new colour.</p>
    <div class="tailor-layout">
      <canvas width="152" height="184" aria-label="Outfit preview"></canvas>
      <div>
        <div class="tailor-controls" data-tailor-pieces></div>
        <div class="tailor-controls" aria-label="Dye colours">${SWATCHES.map(colour=>`<button type="button" data-dye="${colour}" aria-label="Dye ${colour}" style="--swatch:${colour}"></button>`).join('')}</div>
        <label>Custom colour <input type="color" aria-label="Custom dye colour"></label>
        <div class="tailor-controls">
          <button type="button" data-reset>Original colour</button>
          <button type="button" data-rotate>Turn preview</button>
        </div>
      </div>
    </div>
    <p role="status"></p>
    <div class="tailor-controls">
      <button type="button" data-apply>Apply dye</button>
      <button type="button" data-close>Done</button>
    </div>`;
  document.body.append(dialog);
  game.setUiOwner?.(actor);
  game.blur?.();
  const world = game.world;
  const draft = {...actor.appearance?.gearDyes};
  let selected = worn[0], direction = 0, frame;
  const picker = dialog.querySelector('input');
  const status = dialog.querySelector('[role="status"]');
  const buttons = dialog.querySelector('[data-tailor-pieces]');
  const ctx = dialog.querySelector('canvas').getContext('2d');
  const preview = {...actor,x:76,y:126,appearance:{...actor.appearance,gearDyes:draft},
    isMoving:false,combatState:{},actionState:{},visualAction:null,floatingTexts:[]};
  const valid = () => game.world === world && inReach(game,actor,npc);
  const sync = () => {
    for (const button of buttons.children) button.setAttribute('aria-pressed',String(button.dataset.slot===selected.slot));
    picker.value = gearDye(preview,selected.slot) || '#827364';
    status.textContent = '';
  };
  for (const entry of worn) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.slot = entry.slot;
    button.textContent = entry.item.name;
    button.onclick = () => {selected=entry;sync();};
    buttons.append(button);
  }
  const choose = colour => {if(validDyeColour(colour))draft[selected.item.id]=colour;sync();};
  for (const button of dialog.querySelectorAll('[data-dye]')) button.onclick = () => choose(button.dataset.dye);
  picker.oninput = () => choose(picker.value);
  dialog.querySelector('[data-reset]').onclick = () => {delete draft[selected.item.id];sync();};
  dialog.querySelector('[data-rotate]').onclick = () => {direction=(direction+1)%4;};
  dialog.querySelector('[data-apply]').onclick = () => {
    if (!valid() || itemFor(actor,selected.slot) !== selected.item) {dialog.close();return;}
    actor.appearance ||= {};
    const saved = actor.appearance.gearDyes ||= {};
    const id = selected.item.id;
    if (validDyeColour(draft[id])) saved[id]=draft[id];
    else delete saved[id];
    status.textContent = `${selected.item.name} updated.`;
  };
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.onclose = () => {
    cancelAnimationFrame(frame);
    game.tailorSession = null;
    dialog.remove();
    previous?.isConnected && previous.focus({preventScroll:true});
  };
  game.tailorSession = {actor};
  dialog.showModal();
  sync();
  const paint = () => {
    if (!dialog.open) return;
    if (!valid()) {dialog.close();return;}
    ctx.clearRect(0,0,152,184);
    [preview.dirX,preview.dirY] = [[0,1],[1,0],[0,-1],[-1,0]][direction];
    drawHumanActor(ctx,preview,{x:0,y:0},{scale:2,animationTime:0});
    frame=requestAnimationFrame(paint);
  };
  paint();
  return true;
}

export function handleTailorController(input) {
  const dialog = document.getElementById(OVERLAY);
  if (!dialog?.open) return false;
  if (input.cancelPressed || input.backPressed) {dialog.close();return true;}
  if (input.confirmPressed) {document.activeElement?.click();return true;}
  const step = input.upPressed || input.leftPressed ? -1 : input.downPressed || input.rightPressed ? 1 : 0;
  if (step) {
    const choices = [...dialog.querySelectorAll('button')];
    const index = choices.indexOf(document.activeElement);
    choices[(index+step+choices.length)%choices.length].focus();
  }
  return true;
}
