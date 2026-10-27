import {getClassDefinition,getClassAbilitySlots} from './classData.js';
import {getClassAffinities} from './progressionProfiles.js';
import {ITEMS,getAbilityById} from './data.js';
import {informationLabel} from './uiInformation.js';
import {SUBCLASSES,CLASS_SUBCLASSES} from './subclassData.js';
import {MORPH_MASTERY_LEVELS} from './abilityMorphSystem.js';
import {subclassIconMarkup} from './subclassArt.js';

const html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const EMBLEMS={
  classless:'M5 3L25 23M3 5L23 25M5 19L13 27M3 29L9 23M19 5L27 13M23 9L29 3',
  gravecaller:'M12 29L19 3M8 5Q24 0 29 17Q22 9 8 5M15 21L21 23',
  thornbinder:'M16 30V5M16 22L6 15L3 7M16 17L25 11L29 3M16 9L10 3M6 15L3 19M25 11L28 16',
  waverider:'M16 2Q4 16 5 22Q7 30 16 30Q26 30 27 22Q28 16 16 2ZM4 21Q10 16 16 21Q23 26 28 20M11 13L8 19',
  lightbringer:'M16 7L24 16L16 25L8 16ZM16 1V4M16 28V31M1 16H4M28 16H31M4 4L7 7M25 25L28 28M4 28L7 25M25 7L28 4',
  oathkeeper:'M5 4H27L25 21L16 30L7 21ZM16 8V23M10 15H22',
  fellhunter:'M6 3Q27 16 6 29L12 16ZM3 16H29M24 11L29 16L24 21',
  eldritch:'M3 16Q16 0 29 16Q16 32 3 16ZM16 9L21 16L16 23L11 16ZM7 3L11 8M25 29L21 24M25 3L21 8M7 29L11 24'
};
const STYLE={
  classless:'A weapon-focused challenge start. Learn scrolls and ordinary disciplines, without a class tree or passive.',
  gravecaller:'Command skeletons and learn a separate lich summon while attacking with necrotic magic.',
  thornbinder:'Slow enemies with vines and plant summons. Outlast them with healing growth.',
  waverider:'Soak enemies for stronger water attacks. Fight with torrents, mobility and wards.',
  lightbringer:'Aim radiant beams through groups; build Lumens for stronger blasts and shields.',
  oathkeeper:'Hold the front line with shields, holy melee attacks and protective magic.',
  fellhunter:'Set traps, expose enemies and punish them with bows, blades and gadgets.',
  eldritch:'Channel red-black lightning, move through void rifts and summon a horror. Sustained channels can drain health.'
};
const PASSIVES={
  gravecaller:'Enemy kills restore Spirit. Necrotic Bolt and summon attacks steal life within shared healing limits.',
  thornbinder:'Thorn wounds slow enemies and give nearby allies modest regeneration.',
  waverider:'Water skills build Flow; at three stacks, your next water skill is empowered.',
  lightbringer:'Radiant hits build up to three Lumens for stronger beams, blasts and shields.',
  oathkeeper:'Blocks, hits taken and melee build Conviction for stronger smites, heals and shields.',
  fellhunter:'Dodge and tools empower melee or ranged attacks; Exposed foes take stronger hits.',
  eldritch:'Channeled lightning scales with Spirit; strong positioning helps sustained attacks.'
};
const PLAYSTYLE={
  classless:['Flexible weapons','No class tree or passive'],
  gravecaller:['Undead allies / Spirit scaling','Setup / summon positioning'],
  thornbinder:['Control / sustained damage','Low burst / area placement'],
  waverider:['Mobility / sustain','Attack rhythm / Spirit costs'],
  lightbringer:['Beams / shields','Aim / exposed while channeling'],
  oathkeeper:['Durability / close combat','Slower pace / short reach'],
  fellhunter:['Traps / burst windows','Preparation / spacing'],
  eldritch:['Mobility / horror summons','Aim / health-draining channels']
};
// Each theme remains an optional skill form. The final tree calling rewards specialization.
const MORPH_COPY={
  cryomancer:'Slow and freeze foes, then Shatter prepared targets. Heal, ward and clear slows or frost from allies. Bosses resist freezing.',
  sunken:'Midnight-blue water builds shared Depth over 20 seconds. Carry rising damage between foes; five seconds without a hit resets it.',
  holyknight:'A close-range bruiser. Melee hits and clean blocks build Resolve for heavy finishers or Second Wind.',
  sinner:'A durable melee-and-magic hybrid. Build Penance in the brawl, then reclaim life or conjure unholy swords through a pack.',
  acolyte:'Nearby deaths yield Soul Fragments; ancestral rites spend them to heal allies.',
  deathknight:'Necrotic melee drains life and weakens foes. Death rites retaliate.',
  fae:'Fae butterflies and summons weaken foes; companions and gardens heal.',
  petalknight:'Root lesser foes with close thorn strikes. Bark wards retaliate against attackers.',
  sunscorched:'Burning beams and solar bursts build Heat for stronger burns.',
  dawnblade:'Light-blade combos, movement strikes and brief parries favor mobile melee.',
  bloodhound:'Stack 10s Bleed and 14s Poison wounds. Low ticks keep working while you vault, trap and shoot.',
  hellstalker:'Demonic spells burn hard for 1.8s. Vault through rifts and turn three Embers into Flashover.'
};

export function creatorClassEmblem(id){
  return `<svg class="creator-class-emblem" viewBox="0 0 32 32" aria-hidden="true"><path d="${EMBLEMS[id]||EMBLEMS.classless}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"/></svg>`;
}
export function creatorClassInformationHtml(option,gear={}){
  if(!option)return '';
  const definition=getClassDefinition(option.id);
  const kit=Object.values(gear).map(id=>ITEMS[id]?.name||id).join(' / ');
  const abilities=getClassAbilitySlots(option.id).filter(Boolean).map(id=>getAbilityById(id)?.name||id);
  const affinities=getClassAffinities({classId:option.id}).map(informationLabel).join(' / ');
  const morphs=CLASS_SUBCLASSES[option.id]||[];
  const health=option.id==='gravecaller'?'Health -12% vs base':option.id==='oathkeeper'?'Health +16% vs base':null;
  const passive=definition?.passive;
  const [strength,tradeoff]=PLAYSTYLE[option.id];
  return `
    <header class="creator-detail-title creator-dossier-header" style="--class-color:${html(option.color)}">
      <div class="creator-class-seal">${creatorClassEmblem(option.id)}</div>
      <div><h2>${html(option.name)}</h2><p>${html(option.role)}</p></div>
    </header>
    <div class="creator-detail-sheet creator-class-summary creator-dossier" aria-label="Class details" style="--class-color:${html(option.color)}">
      <section class="creator-core-info">
        <p class="creator-class-identity">${html(STYLE[option.id])}</p>
        <div class="creator-facts-grid">
          <section class="creator-fact creator-starting-kit"><h3>Starts with</h3><p>${html(kit)}</p><p>${html(abilities.join(' / ')||'No starting active skill')}</p></section>
          <section class="creator-fact creator-passive-card"><h3>${passive?html(passive.name):'Classless'}</h3><p>${html(PASSIVES[option.id]||'No class passive. Train ordinary disciplines and learn scroll skills freely.')}</p></section>
          <section class="creator-fact creator-training"><h3>+25% XP</h3><p>${html(affinities)}</p><small>Training bonus only.</small>${health?`<p class="creator-health-note">${html(health)}</p>`:''}</section>
        </div>
        <div class="creator-playstyle-row"><p><b>Strengths</b> ${html(strength)}</p><p><b>Tradeoffs</b> ${html(tradeoff)}</p></div>
      </section>
      <section class="creator-morph-overview" aria-label="Subclass themes and skill morphs">
        <div class="creator-morph-heading"><h3>Subclass morphs</h3><p class="creator-morph-explainer">${morphs.length?"Each skill's mastery unlocks forms in Abilities. Specialize at the tree's end.":'Original skills'}</p></div>
        ${morphs.length?`
        <div class="creator-morph-cards">${morphs.map((id,index)=>{
          const family=SUBCLASSES[id];
          return `<article class="creator-morph-card" data-creator-morph-theme="${html(id)}" style="--morph-color:${family.colors[0]}">
            <div class="creator-morph-emblem">${subclassIconMarkup(id)}</div>
            <div class="creator-morph-title"><h4>${html(family.name)}</h4><span class="creator-mastery-badge">Mastery ${MORPH_MASTERY_LEVELS[index]}</span></div>
            <p class="creator-morph-description">${html(MORPH_COPY[id])}</p>
          </article>`;
        }).join('')}</div>`:`<p class="creator-morph-explainer">${option.id==='classless'?'No subclass morphs. Build your playstyle with weapons, gear and learned scrolls.':'No subclass morphs. Eldritch uses its original lightning, void and horror skills.'}</p>`}
      </section>
    </div>`;
}
