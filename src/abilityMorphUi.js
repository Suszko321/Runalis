import {CLASS_SUBCLASSES,SUBCLASSES,normalizeSubclassClassId} from './subclassData.js';
import {getPlayerExpertise,expertiseEffectText} from './skillExpertiseSystem.js';
import {abilitySummary} from './uiInformation.js';
import {getAbilityMorphOptions,selectAbilityMorph} from './abilityMorphSystem.js';
import {subclassIconMarkup} from './subclassArt.js';
import {respecSkillTree,getSpentSkillTreePoints} from './skillTreeSystem.js';
import {migratePlayer} from './player.js';
import {clearSubclassCombatState,clearAbilityMorphCombatState} from './subclassCombat.js';
import {clearCombatTechniqueState} from './combatExpansion.js';

const html=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
export function installSubclassStyles(){
  if(document.getElementById('subclassStyles'))return;
  const link=document.createElement('link');link.id='subclassStyles';link.rel='stylesheet';link.href=new URL('../subclasses.css',import.meta.url).href;document.head.append(link);
}
export function renderSubclassTreeChoice(player,game){
  const spent=getSpentSkillTreePoints(player),reset=game.uiState?.pendingSkillRespec;
  return `<section class="subclass-tree-choice chosen" aria-label="Skill point reset">
    <span class="skill-morph-tree-help">Learn original skills here. Choose mastery morphs in <b>Abilities</b>. ${getPlayerExpertise(player)?`Calling: <b>${html(getPlayerExpertise(player).name)}</b>.`:CLASS_SUBCLASSES[normalizeSubclassClassId(player.classId)]?'Your final Expertise follows the class capstone.':''}</span>
    <div class="subclass-respec"><span>${reset?`Refund all <b>${spent}</b> spent points for <b>1 gold</b>? Tree abilities must be learned again. Your Expertise is also reset. Starter skills, scroll skills, mastery and morph choices are kept.`:'Reset spent skill points'}</span><button type="button" data-skill-respec ${spent&&player.gold>=1?'':'disabled'}>${reset?'Confirm reset · 1 gold':'Respec Reset · 1 gold'}</button>${reset?'<button type="button" data-respec-cancel>Cancel</button>':''}</div>
  </section>`;
}
export function bindSubclassTreeControls(player,game,render){
  const refresh=()=>render(player,game.logLines||[],game);
  document.querySelectorAll('[data-skill-respec]').forEach(btn=>btn.onclick=()=>{
    if(!game.uiState.pendingSkillRespec){game.uiState.pendingSkillRespec=true;refresh();return;}
    const result=respecSkillTree(player);
    if(result.ok){clearSubclassCombatState(player);clearCombatTechniqueState(player);migratePlayer(player);delete game.uiState.pendingSkillRespec;delete game.uiState.pendingSkillTreeNodeConfirm;}
    game.log?.(result.reason);refresh();
  });
  document.querySelectorAll('[data-respec-cancel]').forEach(btn=>btn.onclick=()=>{delete game.uiState.pendingSkillRespec;refresh();});
}
export function handleSubclassTreeControls(game,input,render){
  const ui=game.uiState,pending=ui.pendingSkillRespec,column=game.uiSkillTreeControllerState?.column;
  if(!pending&&column!=='subclass'){
    if(input.upPressed&&column==='path'){game.uiSkillTreeControllerState.column='subclass';ui.subclassControlIndex=0;}else return false;
  }
  if(pending&&input.cancelPressed){delete ui.pendingSkillRespec;render(game.player,game.logLines||[],game);return true;}
  if(!pending&&input.downPressed){game.uiSkillTreeControllerState.column='path';return false;}
  const buttons=[...document.querySelectorAll('[data-skill-respec],[data-respec-cancel]')].filter(btn=>!btn.disabled);
  if(!buttons.length){game.uiSkillTreeControllerState.column='path';return false;}
  let index=Math.min(buttons.length-1,ui.subclassControlIndex||0);
  if(input.rightPressed||input.downPressed)index=(index+1)%buttons.length;
  if(input.leftPressed||input.upPressed)index=(index+buttons.length-1)%buttons.length;
  ui.subclassControlIndex=index;
  document.querySelectorAll('.subclass-tree-choice .controller-focus').forEach(el=>el.classList.remove('controller-focus'));
  buttons[index].classList.add('controller-focus');buttons[index].focus({preventScroll:true});
  if(input.confirmPressed)buttons[index].click();return true;
}
export function renderAbilityMorphChoices(player,id){
  const options=getAbilityMorphOptions(player,id);if(options.length<2)return '';
  const learned=player.knownAbilities?.includes(id);
  return `<section class="ability-morph-picker" aria-label="Skill morphs"><div class="ability-morph-heading"><h4>Skill forms</h4><span>Choose after recovery · shared mastery</span></div>
    <div class="ability-morph-options">${options.map(o=>`<button type="button" data-ability-morph="${o.id}" data-morph-ability="${id}" aria-pressed="${o.selected}" class="ability-morph-option ${o.selected?'active':''}" ${o.unlocked&&learned?'':'disabled'}>
      <span class="ability-morph-symbol">${o.id==='base'?'<svg class="subclass-emblem" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3L20 12L29 16L20 20L16 29L12 20L3 16L12 12ZM16 10L22 16L16 22L10 16Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>':subclassIconMarkup(o.id)}</span><span class="ability-morph-copy"><b>${html(o.name)}${o.selected?'<span class="morph-selected-mark" aria-label="Selected">✓</span>':''}</b><small>${!learned?'Learn skill first':o.selected?'Selected':o.id==='base'?'Always available':o.unlocked?'Available':`Mastery ${o.requiredMastery} required`}</small><em title="${html(abilitySummary(o.ability,player))}">${html(o.id==='base'?'Original class skill':SUBCLASSES[o.id]?.role||'Skill morph')}</em>${expertiseEffectText(player,o.ability)?`<small class="morph-expertise">${html(expertiseEffectText(player,o.ability))}</small>`:''}</span>
    </button>`).join('')}</div></section>`;
}
export function bindAbilityMorphControls(player,game,render,root=document){
  root.querySelectorAll('[data-ability-morph]').forEach(btn=>btn.onclick=()=>{
    const result=game.changeAbilityMorph?game.changeAbilityMorph(btn.dataset.morphAbility,btn.dataset.abilityMorph):selectAbilityMorph(player,btn.dataset.morphAbility,btn.dataset.abilityMorph);
    if(result.ok&&result.changed){if(!game.changeAbilityMorph)clearAbilityMorphCombatState(player,btn.dataset.morphAbility);game.uiState.abilityAssignmentMode=false;game.uiState.pendingAbilityId=null;}
    game.uiState.abilityMorphFeedback=result.reason;
    if(document.body.classList.contains('mobile-input'))game.uiState.mobileAbilityFeedback=result.reason;
    game.log?.(result.reason);render(player,game.logLines||[],game);
    const picker=document.querySelector('.ability-morph-picker');
    if(picker){const message=document.createElement('p');message.setAttribute('role','status');message.textContent=result.reason;picker.append(message);}
    if(result.ok&&result.changed&&(game.localMenuFrame||document.body.classList.contains('mobile-input')))game.save?.(false);
  });
}
