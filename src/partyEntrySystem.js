// Transient, host-owned consent. Votes and callbacks never enter character saves.
const DURATION = 10000;
let sequence = 0;
export const entryParty = player => [player, ...(player?.coop?.players || [])]
  .filter(p => p && p.active !== false && p.joined !== false).slice(0, 4);
const alive = p => p.hp > 0 && !p.dead && !p.remove && !['downed', 'beingRevived', 'dead', 'respawning'].includes(p.lifeState);
const clock = () => performance.now();
export const partyEntryPending = game => !!(game?.partyEntryReady || game?.partyEntryRemote);

function clearInput(game) {
  game.blur?.();
  game.keys?.clear();
  if (game.input) for (const key of Object.keys(game.input)) {
    if (/Pressed$|Released$|Held$/.test(key)) game.input[key] = false;
  }
  if (game.input) game.input.moveX = game.input.moveY = 0;
  game.clearAbilityInputEdges?.(true);
}
export function requestPartyEntry(game, {key, title, kind = 'dungeon', initiator = game.player, commit, onCancel, force = false}) {
  if (partyEntryPending(game)) return false;
  const members = entryParty(game.player);
  if (members.length < 2 && !force) return true;
  if (members.some(p => !alive(p))) {
    game.log?.('Revive every party member before entering together.');
    onCancel?.();
    return false;
  }
  const now = clock();
  game.partyEntryReady = {id: ++sequence, key, title, kind, members, initiator,
    answers: new Set(), world: game.world, openedAt: now, deadline: now + DURATION, commit, onCancel};
  clearInput(game);
  renderPartyEntry(game);
  return false;
}
function validParty(game, r) {
  const current = entryParty(game.player);
  return game.world === r.world && current.length === r.members.length &&
    r.members.every(p => current.includes(p) && alive(p));
}
export function cancelPartyEntry(game, message = 'Party entry cancelled.', notify = true) {
  const r = game.partyEntryReady;
  game.partyEntryReady = game.partyEntryRemote = null;
  if (typeof document !== 'undefined') document.getElementById('partyEntryPanel')?.remove();
  clearInput(game);
  r?.onCancel?.();
  if (notify && r) game.log?.(message);
}
export function answerPartyEntry(game, actor, yes, id = game.partyEntryReady?.id) {
  const r = game.partyEntryReady;
  if (!r || r.id !== id || !r.members.includes(actor)) return false;
  if (clock() >= r.deadline || !validParty(game, r)) {
    cancelPartyEntry(game, 'Entry cancelled: time expired or the party changed.');
    return false;
  }
  if (!yes) {cancelPartyEntry(game, `${actor.name || 'A player'} declined. Party entry cancelled.`); return false;}
  r.answers.add(actor);
  if (r.members.every(p => r.answers.has(p))) {
    game.partyEntryReady = null;
    if (typeof document !== 'undefined') document.getElementById('partyEntryPanel')?.remove();
    clearInput(game);
    r.commit();
    return true;
  }
  renderPartyEntry(game);
  return false;
}
export function partyEntrySnapshot(game, self = game.player) {
  const r = game.partyEntryReady;
  if (!r) return null;
  return {id: r.id, title: r.title, kind: r.kind, remaining: Math.max(0, r.deadline - clock()),
    self: r.members.indexOf(self), initiator: r.members.indexOf(r.initiator),
    members: r.members.map((p, i) => ({name: p.name || `Player ${i + 1}`, ready: r.answers.has(p), remote: !!p.networkRemote}))};
}
export function receivePartyEntry(game, snapshot) {
  const previous = game.partyEntryRemote;
  game.partyEntryRemote = snapshot ? {...snapshot, deadline: clock() + snapshot.remaining} : null;
  if (!!previous !== !!snapshot || previous?.id !== snapshot?.id) clearInput(game);
  renderPartyEntry(game);
}
export function updatePartyEntry(game) {
  const r = game.partyEntryReady;
  const pending = partyEntryPending(game);
  if (r && (clock() >= r.deadline || !validParty(game, r))) {
    cancelPartyEntry(game, clock() >= r.deadline ? 'No unanimous response within ten seconds. Party entry cancelled.' : 'The party changed. Request entry again.');
  } else renderPartyEntry(game);
  return pending;
}
function respond(game, index, yes) {
  if (game.onlineSession?.role === 'guest') {
    const r = game.partyEntryRemote;
    if (r && index === r.self) game.onlineSession.sendPartyEntryAnswer(r.id, yes);
  } else {
    const r = game.partyEntryReady, actor = r?.members[index];
    // Remote members vote through their own authenticated connection.
    if (actor && !actor.networkRemote) answerPartyEntry(game, actor, yes, r.id);
  }
}
export function handlePartyEntryKeyboard(game, event) {
  if (!partyEntryPending(game)) return false;
  if (event.key === 'Tab') return true;
  event.preventDefault();
  if (!event.repeat) {
    const key = event.key.toLowerCase(), r = game.partyEntryReady;
    const index = r ? r.members.indexOf(game.player) : game.partyEntryRemote.self;
    if (key === 'enter') respond(game, index, true);
    if (key === 'escape') respond(game, index, false);
  }
  return true;
}
export function handlePartyEntryInput(game) {
  if (!partyEntryPending(game)) return false;
  const r = game.partyEntryReady;
  // The interaction that opened the prompt must not also cast a vote.
  if (r && clock() - r.openedAt < 250) return true;
  for (const input of game.getAllControllerInputsForUi?.() || []) {
    const actor = game.getActorForControllerInput?.(input) || game.player;
    const index = r ? r.members.indexOf(actor) : game.partyEntryRemote?.self;
    if (input.cancelPressed || input.backPressed) {respond(game, index, false); break;}
    if (input.confirmPressed) respond(game, index, true);
    if (!partyEntryPending(game)) break;
  }
  return true;
}
export function renderPartyEntry(game) {
  if (typeof document === 'undefined') return;
  const host = game.partyEntryReady, r = host ? partyEntrySnapshot(game) : game.partyEntryRemote;
  let el = document.getElementById('partyEntryPanel');
  if (!r) {el?.remove(); return;}
  const seconds = Math.max(0, Math.ceil((host ? host.deadline - clock() : r.deadline - clock()) / 1000));
  const signature = JSON.stringify([r.id, r.members, seconds, r.self]);
  if (el?.dataset.signature === signature) return;
  const focus = el?.contains(document.activeElement) ? document.activeElement?.dataset.entryVote : null;
  if (!el) {
    el = document.createElement('section'); el.id = 'partyEntryPanel';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'partyEntryTitle');
    el.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#080b0ee8;display:flex;align-items:center;justify-content:center;padding:16px;color:#f4e9cd;font:18px/1.4 Georgia';
    document.body.append(el);
  }
  el.dataset.signature = signature; el.replaceChildren();
  const compact = globalThis.innerHeight < 540;
  const box = document.createElement('div');
  box.style.cssText = `width:min(900px,100%);max-height:88dvh;overflow:auto;background:#171c1b;border:2px solid #b3945e;padding:${compact ? 12 : 24}px;box-sizing:border-box;text-align:center;box-shadow:0 0 70px #000`;
  const title = document.createElement('h2'); title.id = 'partyEntryTitle'; title.textContent = `Enter ${r.title}?`; title.style.cssText = `margin:0 0 8px;font-size:${compact ? 22 : 28}px;line-height:1.15`; box.append(title);
  const text = document.createElement('p'); text.textContent = `Player ${r.initiator + 1} requests ${r.kind === 'boss' ? 'a boss encounter' : 'dungeon entry'}. Everyone enters together. All players must accept; rejection or no response cancels.`; text.style.cssText = `margin:6px 0;font-size:${compact ? 14 : 18}px;line-height:1.25`; box.append(text);
  const countdown = document.createElement('p'); countdown.setAttribute('role', 'status'); countdown.textContent = `${seconds}s remaining`; countdown.style.cssText = `font-size:${compact ? 20 : 26}px;line-height:1.2;color:#e3bf79;margin:8px`; box.append(countdown);
  const cards = document.createElement('div'); cards.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px';
  for (const [i, member] of r.members.entries()) {
    const card = document.createElement('div'); card.style.cssText = `padding:${compact ? '8px 4px' : '14px 8px'};border:1px solid #665a42;background:#222824;min-width:0`;
    const name = document.createElement('strong'); name.textContent = `P${i + 1} · ${member.name}`; name.title = name.textContent; name.style.cssText = `display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:${compact ? 14 : 17}px`; card.append(name);
    const status = document.createElement('p'); status.textContent = member.ready ? 'Accepted' : 'Waiting for response'; status.style.cssText = `margin:8px 0;font-size:${compact ? 12 : 15}px;line-height:1.2;color:${member.ready ? '#b4d48f' : '#d1c5ae'}`; card.append(status);
    const local = host ? !member.remote : i === r.self;
    if (local) for (const yes of [true, false]) {
      const button = document.createElement('button'); button.textContent = yes ? 'Accept' : 'Reject';
      button.dataset.entryVote = `${i}:${yes}`; button.disabled = yes && member.ready;
      button.style.cssText = `margin:3px;padding:9px 10px;font-size:14px;line-height:1.2;color:#fff3d8;background:${yes ? '#394c35' : '#603d35'};border:1px solid #aa9366;cursor:pointer`;
      button.onclick = () => respond(game, i, yes); card.append(button);
    }
    cards.append(card);
  }
  box.append(cards);
  const hint = document.createElement('p'); hint.textContent = 'Your controller: A / Cross accepts, B / Circle rejects. Keyboard: Enter / Esc. Touch or click your choice.'; hint.style.cssText = 'font-size:12px;line-height:1.2;margin:8px 0 0;color:#c0b59d'; box.append(hint); el.append(box);
  if (focus) [...el.querySelectorAll('button')].find(b => b.dataset.entryVote === focus)?.focus();
}
