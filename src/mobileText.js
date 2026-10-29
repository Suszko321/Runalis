import {DIALOGUE_PHASES} from './dialogueRuntime.js';
import {resolveDialoguePortrait,drawDialoguePortrait} from './dialoguePortrait.js';

// Dialogue uses the existing state machine and online input routing. Only the
// presentation changes: native scrolling instead of shrinking or clipping text.
export function renderMobileDialogue(game){
 const d=game.dialogue,active=!!game.mobileControls&&!game.paused&&!game.deathScreen?.active&&d?.active&&!d.actor?.networkRemote&&(!d.actor||d.actor===game.player);
 let el=document.getElementById('mobileDialogue');
 if(!active){el?.remove();return false;}
 if(!el){
  el=document.createElement('section');el.id='mobileDialogue';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','mobileDialogueSpeaker');
  const header=document.createElement('header'),portrait=document.createElement('canvas'),speaker=document.createElement('strong'),close=document.createElement('button');portrait.className='mobile-dialogue-portrait';portrait.width=104;portrait.height=120;portrait.setAttribute('aria-hidden','true');speaker.id='mobileDialogueSpeaker';close.textContent='Leave';close.onclick=()=>game.closeConversation();header.append(portrait,speaker,close);
  const scroll=document.createElement('div');scroll.className='mobile-dialogue-scroll';const text=document.createElement('p'),choices=document.createElement('div');text.className='mobile-dialogue-text';choices.className='mobile-dialogue-choices';scroll.append(text,choices);
  const footer=document.createElement('footer'),history=document.createElement('button'),next=document.createElement('button');history.dataset.mobileDialogueHistory='';history.textContent='History';next.dataset.mobileDialogueNext='';
  const route=input=>game.routeDialogueInput(game.dialogue,{inputDevice:'touch',...input},game.dialogue.actor||game.player,game.world);
  text.onclick=()=>{if([DIALOGUE_PHASES.TYPING,DIALOGUE_PHASES.AWAITING_CONTINUE].includes(game.dialogue.phase))route({pointerConfirm:true});};
  history.onclick=()=>route({historyPressed:true});next.onclick=()=>route({pointerConfirm:true,confirmPressed:true});footer.append(history,next);el.append(header,scroll,footer);document.body.append(el);
 }
 el.querySelector('#mobileDialogueSpeaker').textContent=d.speakerName||d.npcName||'Unknown';
 el.style.setProperty('--mobile-dialogue-size',`${28*Math.max(.8,Math.min(1.5,d.settings?.dialogueFontScale||1))}px`);
 const portrait=el.querySelector('canvas'),actor=resolveDialoguePortrait(d);portrait.hidden=!actor;
 if(actor){const ctx=portrait.getContext('2d');ctx.clearRect(0,0,104,120);ctx.imageSmoothingEnabled=false;drawDialoguePortrait(ctx,{x:0,y:0,w:104,h:120},actor,d);}
 const text=el.querySelector('.mobile-dialogue-text'),choices=el.querySelector('.mobile-dialogue-choices'),history=el.querySelector('[data-mobile-dialogue-history]'),next=el.querySelector('[data-mobile-dialogue-next]');
 const value=d.historyOpen?(d.history||[]).map(e=>`${e.speakerName||'Unknown'}\n${e.text}`).join('\n\n'):d.visibleText||'';
 if(text.textContent!==value)text.textContent=value;
 const showChoices=d.phase===DIALOGUE_PHASES.AWAITING_CHOICE&&!d.historyOpen;
 const signature=JSON.stringify([showChoices,(d.options||[]).map(o=>[o.label,o.text,o.disabled,o.requirementText]),d.historyOpen]);
 if(el.dataset.choices!==signature){
  el.dataset.choices=signature;choices.replaceChildren();
  if(showChoices)for(const [index,option]of(d.options||[]).entries()){
   const button=document.createElement('button');button.dataset.mobileDialogueChoice=String(index);button.textContent=(option.label||option.text||'…')+(option.disabled&&option.requirementText?` — ${option.requirementText}`:'');button.disabled=!!option.disabled;
   button.onclick=()=>game.routeDialogueInput(game.dialogue,{pointerChoiceIndex:index,inputDevice:'touch'},game.dialogue.actor||game.player,game.world);choices.append(button);
  }
 }
 for(const button of choices.children){const index=Number(button.dataset.mobileDialogueChoice),selected=index===d.selectedIndex;button.disabled=!!d.options?.[index]?.disabled||d.transitionLock>0;button.classList.toggle('selected',selected);if(selected)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');}
 if(showChoices&&el.dataset.selected!==String(d.selectedIndex)&&['controller','keyboard'].includes(d.inputDevice))choices.querySelector('.selected')?.scrollIntoView({block:'nearest'});
 el.dataset.selected=String(d.selectedIndex);
 const line=d.historyOpen?'history':`${d.speakerId}:${d.currentUtteranceIndex??d.utteranceIndex??''}:${d.fullText||d.text||''}`;
 if(el.dataset.line!==line){el.dataset.line=line;el.querySelector('.mobile-dialogue-scroll').scrollTop=0;}
 next.hidden=showChoices;next.disabled=d.transitionLock>0||[DIALOGUE_PHASES.OPENING,DIALOGUE_PHASES.PROCESSING_CHOICE,DIALOGUE_PHASES.CLOSING].includes(d.phase);history.disabled=d.transitionLock>0;
 next.textContent=d.historyOpen?'Return':d.phase===DIALOGUE_PHASES.TYPING?'Reveal text':'Continue';history.hidden=d.historyOpen||!(d.history||[]).length;
 return true;
}
