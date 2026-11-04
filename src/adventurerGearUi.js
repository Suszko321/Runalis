import {ITEMS} from './data.js';
import {canManageAdventurer,adventurerGearOptions,transferAdventurerGear} from './livingAdventurers.js';

export function openAdventurerInventory(game,npc,owner) {
  if(!canManageAdventurer(game,npc,owner)||document.getElementById('adventurerGearOverlay'))return false;
  const dialog=document.createElement('dialog');
  dialog.id='adventurerGearOverlay';dialog.className='active';
  dialog.dataset.ownerSlot=String(owner.slot||owner.playerNumber||1);
  dialog.setAttribute('aria-label','Adventurer equipment');
  const title=document.createElement('h2');
  title.textContent=`${npc.name} · Level ${npc.skillState.combat.level}`;
  const progress=document.createElement('p');
  progress.textContent=['lightArmour','mediumArmour','heavyArmour'].map((id,i)=>
    `${['Light','Medium','Heavy'][i]} armour ${npc.skillState.skills[id]?.level||1}`).join(' · ');
  const gear=document.createElement('div'),status=document.createElement('p');
  status.setAttribute('role','status');
  const close=document.createElement('button');close.textContent='Done';close.onclick=()=>dialog.close();
  const refresh=()=>{
    gear.replaceChildren();
    const saved=owner.worldMemory.livingAdventurers.find(record=>record.id===npc.id)?.gear||{};
    for(const slot of ['weapon','helm','chest','legs','trinket']){
      const row=document.createElement('section'),label=document.createElement('strong');
      label.textContent=`${slot.toUpperCase()} · ${ITEMS[npc.equipment[slot]]?.name||'Empty'}`;
      row.append(label);
      if(saved[slot]){
        const button=document.createElement('button');button.textContent='Return to bag';
        button.onclick=()=>{
          const ok=transferAdventurerGear(game,npc,owner,slot);
          status.textContent=ok?'Returned to your bag.':'Cannot return this item. Check bag space and stay near the adventurer.';
          if(ok){refresh();close.focus();}
        };
        row.append(button);
      }
      for(const entry of adventurerGearOptions(owner).filter(item=>ITEMS[item.id].slot===slot)){
        const button=document.createElement('button');
        button.textContent=`Equip ${ITEMS[entry.id].name} · Tier ${entry.upgradeTier||1}`;
        button.onclick=()=>{
          const ok=transferAdventurerGear(game,npc,owner,slot,entry.instanceId);
          status.textContent=ok?'Equipped.':'Cannot transfer this item. Stay near the adventurer.';
          if(ok){refresh();close.focus();}
        };
        row.append(button);
      }
      gear.append(row);
    }
  };
  dialog.append(title,progress,gear,status,close);
  dialog.onclose=()=>dialog.remove();
  refresh();
  game.blur?.();
  document.body.append(dialog);
  dialog.showModal();
  return true;
}
