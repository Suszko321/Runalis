import {ITEMS} from './data.js';
import {hudPortraitUrl} from './hudPortrait.js';
import {canManageAdventurer} from './livingAdventurers.js';
import {adventurerModelAvailable,prepareAdventurerExchange,commitAdventurerExchange,localAdventurerReply,modelAdventurerReply} from './adventurerMind.js';

export function openAdventurerChat(game,npc,owner) {
  if(!canManageAdventurer(game,npc,owner)||!npc.adventurerMind||document.getElementById('adventurerChatOverlay'))return false;
  const world=game.world,mind=npc.adventurerMind;
  const valid=()=>game.world===world&&canManageAdventurer(game,npc,owner);
  const dialog=document.createElement('dialog');
  dialog.id='adventurerChatOverlay';
  dialog.className='active';
  dialog.dataset.ownerSlot=String(owner.slot||owner.playerNumber||1);
  dialog.setAttribute('aria-labelledby','adventurerChatTitle');
  dialog.innerHTML=`
    <header><img width="52" height="52" alt=""><div><h2 id="adventurerChatTitle"></h2><p data-profile></p></div>
    <button type="button" data-close>Done</button></header>
    <div class="adventurer-transcript" role="log" aria-live="polite"></div>
    <details><summary>Companion’s journal</summary><ul></ul></details>
    <form><label for="adventurerChatText">Say something</label>
    <div><input id="adventurerChatText" name="message" type="text" maxlength="280" autocomplete="off" required>
    <button type="submit">Send</button></div></form>
    <label data-local-model hidden><input type="checkbox"> Use the on-device language model</label>
    <p data-chat-status role="status"></p>`;
  const find=selector=>dialog.querySelector(selector);
  const transcript=find('[role="log"]'),input=find('#adventurerChatText'),send=find('[type="submit"]');
  const status=find('[data-chat-status]'),journal=find('ul'),mode=find('[data-local-model]');
  const previous=document.activeElement;
  const lifetime=new AbortController();
  find('img').src=hudPortraitUrl(npc);
  find('h2').textContent=npc.name;
  find('[data-profile]').textContent=`${npc.className||npc.classId} · ${mind.personality.voice}`;
  function line(speaker,message){
    const row=document.createElement('p'),name=document.createElement('strong');
    name.textContent=speaker;
    row.append(name,document.createTextNode(message));
    transcript.append(row);
    while(transcript.childElementCount>12)transcript.firstElementChild.remove();
    transcript.scrollTop=transcript.scrollHeight;
  }
  function refreshJournal(){
    journal.replaceChildren();
    for(const note of [...mind.notes].reverse()){
      const li=document.createElement('li');
      li.textContent=note.text;
      journal.append(li);
    }
  }
  for(const turn of mind.turns){line('You',turn.text);line(npc.name,turn.reply);}
  if(!mind.turns.length)line(npc.name,'What’s on your mind?');
  refreshJournal();
  find('[data-close]').onclick=()=>dialog.close();
  dialog.onclose=()=>{
    lifetime.abort();
    dialog.remove();
    if(previous?.isConnected)previous.focus({preventScroll:true});
  };
  find('form').onsubmit=async event=>{
    event.preventDefault();
    if(send.disabled)return;
    if(!valid()){status.textContent='Move closer when your companion is ready to talk.';return;}
    const text=prepareAdventurerExchange(mind,input.value);
    if(!text)return;
    input.value='';
    line('You',text);
    const context={name:npc.name,className:npc.className||npc.classId,level:npc.skillState?.combat?.level||1,
      place:world.name||'the road',hp:Math.round(npc.hp),maxHp:Math.round(npc.maxHp),hired:npc.hiredAdventurer,
      weapon:ITEMS[npc.equipment?.weapon]?.name,chest:ITEMS[npc.equipment?.chest]?.name};
    let reply;
    if(!mode.hidden&&mode.querySelector('input').checked){
      send.disabled=true;
      status.textContent=`${npc.name} is thinking…`;
      const signal=AbortSignal.any([lifetime.signal,AbortSignal.timeout(8000)]);
      reply=await Promise.race([modelAdventurerReply(mind,text,context,signal),
        new Promise(resolve=>signal.addEventListener('abort',()=>resolve(null),{once:true}))]);
      if(lifetime.signal.aborted||!dialog.open)return;
      send.disabled=false;
    }
    if(!valid()){status.textContent='Your companion is no longer ready to talk.';return;}
    reply ||= localAdventurerReply(mind,text,context);
    commitAdventurerExchange(mind,text,reply);
    line(npc.name,reply);
    refreshJournal();
    status.textContent='';
    input.focus();
  };
  game.blur?.();
  document.body.append(dialog);
  dialog.showModal();
  input.focus();
  adventurerModelAvailable().then(available=>{if(dialog.open)mode.hidden=!available;});
  return true;
}
