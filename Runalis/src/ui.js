// ui.js
// Runalis UI coordinator + non-inventory panels:
// character, skills, quests, log, unit frames, combat HUD, and dev tools.
// Inventory/crafting/equipment item rendering lives in panelInventory.js.
// Styles live in uiStyles.js.
//
// Updated:
// - Adds Combat Level to top-left player HUD.
// - Adds Class Level to top-left player HUD.
// - Adds Combat Level / Class Level overview to Character tab.
// - Adds combat/class progression cards to Skills tab.
// - Removes old breakthrough language.
// - Keeps modular inventory/panel system intact.

import {
  ITEMS,
  QUESTS,
  RARITY,
  ABILITIES,
  getAbilityById
} from './data.js';

import {
  countItem,
  migratePlayer,
  getPower,
  getArmour,
  addItem
} from './player.js';

import {
  getAllSkillDefinitions,
  getSkillDisplayStatus,
  getSkillProgress,
  hasUsedSkill,
  getCharacterBuildName,
  getSkillLevel,
  getHighestCombatSkills,
  getCombatLevelDetails,
  getCombatLevelProgress,
  getClassCombatLevelProgress,
  getProgressionSummary
} from './skills.js';

import { injectRunalisUiStyles } from './uiStyles.js';

import {
  renderInventory,
  bindInventoryButtons,
  bindCharacterButtons,
  ensureEquipmentShape,
  equipmentSlotCard,
  itemStatBlock,
  calculateDisplayWeaponDamage,
  calculateInventoryValue,
  calculateEquippedValue
} from './panelInventory.js';

// -----------------------------------------------------------------------------
// INIT / ROOT RENDER
// -----------------------------------------------------------------------------

export function initUI(game) {
  injectRunalisUiStyles();
  injectProgressionHudStyles();
  hideLegacyTopBanner();

  game.uiState = game.uiState || createDefaultUIState();

  const panelRoot = document.querySelector('.panel');
  if (panelRoot) {
    panelRoot.classList.remove('open');
  }

  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      const root = document.querySelector('.panel');

      const alreadyOpen =
        game.uiState.activeMainTab === tabId &&
        root?.classList.contains('open');

      document.querySelectorAll('.tab,.tab-panel').forEach(x => {
        x.classList.remove('active');
      });

      if (alreadyOpen) {
        game.uiState.activeMainTab = null;
        root?.classList.remove('open');
        return;
      }

      game.uiState.activeMainTab = tabId;
      root?.classList.add('open');

      btn.classList.add('active');

      const panel = document.getElementById(tabId);
      if (panel) panel.classList.add('active');
    });
  });

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.onclick = () => game.save?.(true);

  const loadBtn = document.getElementById('loadBtn');
  if (loadBtn) loadBtn.onclick = () => game.loadSave?.();
}

export function renderUI(player, logLines, game) {
  migratePlayer(player);
  ensureEquipmentShape(player);
  hideLegacyTopBanner();

  game.uiState = game.uiState || createDefaultUIState();

  const dialogueActive = !!game?.dialogue?.active;
  document.body.classList.toggle('dialogue-active', dialogueActive);

  renderCharacter(player, game);
  renderSkills(player, game);
  renderInventory(player, game);
  renderQuests(player, game);
  renderLog(logLines);

  if (dialogueActive) {
    hideGameHudDom();
    restoreActiveMainPanel(game);
    bindDynamicUI(player, game);
    return;
  }

  renderUnitFrames(player);
  renderCombatHud(player);

  restoreActiveMainPanel(game);
  bindDynamicUI(player, game);
}

function createDefaultUIState() {
  return {
    activeMainTab: null,
    characterSubtab: 'overview',
    inventorySubtab: 'equipment',
    skillsSubtab: 'combat'
  };
}

function bindDynamicUI(player, game) {
  const rerender = () => renderUI(player, game.logLines || [], game);

  bindSubtabs(player, game);
  bindInventoryButtons(player, game, rerender);
  bindCharacterButtons(player, game, rerender);
  bindDevButtons(player, game);
}

function bindSubtabs(player, game) {
  document.querySelectorAll('[data-character-subtab]').forEach(btn => {
    btn.onclick = () => {
      game.uiState.characterSubtab = btn.dataset.characterSubtab;
      renderUI(player, game.logLines || [], game);
    };
  });

  document.querySelectorAll('[data-inventory-subtab]').forEach(btn => {
    btn.onclick = () => {
      game.uiState.inventorySubtab = btn.dataset.inventorySubtab;
      renderUI(player, game.logLines || [], game);
    };
  });

  document.querySelectorAll('[data-skills-subtab]').forEach(btn => {
    btn.onclick = () => {
      game.uiState.skillsSubtab = btn.dataset.skillsSubtab;
      renderUI(player, game.logLines || [], game);
    };
  });
}

function restoreActiveMainPanel(game) {
  const root = document.querySelector('.panel');

  document.querySelectorAll('.tab,.tab-panel').forEach(x => {
    x.classList.remove('active');
  });

  if (!game.uiState.activeMainTab) {
    root?.classList.remove('open');
    return;
  }

  const activeBtn = document.querySelector(`.tab[data-tab="${game.uiState.activeMainTab}"]`);
  const activePanel = document.getElementById(game.uiState.activeMainTab);

  if (!activeBtn || !activePanel) {
    game.uiState.activeMainTab = null;
    root?.classList.remove('open');
    return;
  }

  root?.classList.add('open');
  activeBtn.classList.add('active');
  activePanel.classList.add('active');
}

// -----------------------------------------------------------------------------
// DOM / SCREEN HELPERS
// -----------------------------------------------------------------------------

function gameScreenIsActive() {
  const app = document.getElementById('app');
  const mainMenu = document.getElementById('mainMenu');

  return (
    app?.classList.contains('active') &&
    !mainMenu?.classList.contains('active')
  );
}

function hideLegacyTopBanner() {
  const saveBtn = document.getElementById('saveBtn');
  const loadBtn = document.getElementById('loadBtn');
  const menuBtn = document.getElementById('menuBtn');

  const controls = [saveBtn, loadBtn, menuBtn].filter(Boolean);

  controls.forEach(node => {
    node.classList.add('runalis-hide-legacy-control');
  });
}

function hideGameHudDom() {
  const unitFrames = document.getElementById('unitFramesHud');
  const combatHud = document.getElementById('combatSkillHud');

  if (unitFrames) unitFrames.remove();
  if (combatHud) combatHud.remove();
}

// -----------------------------------------------------------------------------
// TOP-LEFT MMORPG UNIT FRAMES
// -----------------------------------------------------------------------------

function renderUnitFrames(player) {
  let frame = document.getElementById('unitFramesHud');

  if (!gameScreenIsActive()) {
    if (frame) frame.remove();
    return;
  }

  if (!frame) {
    frame = document.createElement('div');
    frame.id = 'unitFramesHud';
    document.body.appendChild(frame);
  }

  const activeSummons = (player.summons || []).filter(s => s.alive !== false);

  frame.innerHTML = `
    ${playerUnitFrame(player)}

    <div class="party-frame-list">
      ${activeSummons.length
        ? activeSummons.map(summon => summonUnitFrame(summon)).join('')
        : `<div class="empty-party-frame">No active summon</div>`
      }
    </div>
  `;
}

function playerUnitFrame(player) {
  const className = player.className || 'Classless';
  const portraitClass = player.classId || 'classless';
  const progression = getProgressionSummary(player);
  const classLevel = progression.classLevel || 0;
  const combatLevel = progression.combatLevel || player.combatLevel || 1;

  return `
    <div class="unit-frame player-unit-frame">
      <div class="unit-portrait ${escapeHtml(portraitClass)}">
        ${playerPortraitGlyph(player)}
      </div>

      <div class="unit-frame-body">
        <div class="unit-title-row">
          <b>${escapeHtml(player.name || 'Wayfarer')}</b>
          <span>${escapeHtml(className)}</span>
        </div>

        <div class="unit-level-row">
          <span>Combat Lv ${combatLevel}</span>
          <b>${classLevel > 0 ? `${escapeHtml(className)} Lv ${classLevel}` : 'No Class Lv'}</b>
        </div>

        ${unitBar('HP', player.hp, player.maxHp, 'hp')}
        ${unitBar('STA', player.stamina, player.maxStamina, 'stamina')}
        ${player.spiritAwakened
          ? unitBar('SPI', player.spirit, player.maxSpirit, 'spirit')
          : unitBar('SPI', 0, 1, 'spirit dormant')
        }
      </div>
    </div>
  `;
}

function summonUnitFrame(summon) {
  const hp = Math.max(0, summon.hp ?? summon.maxHp ?? 1);
  const maxHp = Math.max(1, summon.maxHp ?? hp ?? 1);
  const kind = summon.kind || 'summon';

  return `
    <div class="unit-frame summon-unit-frame">
      <div class="unit-portrait summon ${escapeHtml(kind)}">
        ${summonPortraitGlyph(summon)}
      </div>

      <div class="unit-frame-body">
        <div class="unit-title-row">
          <b>${escapeHtml(summon.displayName || summonName(kind))}</b>
          <span>Summon</span>
        </div>

        ${unitBar('HP', hp, maxHp, 'hp summon-hp')}
      </div>
    </div>
  `;
}

function unitBar(label, value, max, cls) {
  const safeMax = Math.max(1, max || 1);
  const safeValue = Math.max(0, value || 0);
  const pct = Math.max(0, Math.min(100, safeValue / safeMax * 100));

  return `
    <div class="unit-bar-row">
      <span>${escapeHtml(label)}</span>
      <div class="unit-bar ${escapeHtml(cls)}">
        <div style="width:${pct}%"></div>
      </div>
      <b>${Math.ceil(safeValue)}/${Math.ceil(safeMax)}</b>
    </div>
  `;
}

function playerPortraitGlyph(player) {
  if (player.classId === 'necromancer') return '☠';
  if (player.classId === 'thornbinder') return '✦';
  if (player.classId === 'templar') return '⚔';
  if (player.classId === 'mercenary') return '➹';
  return '◎';
}

function summonPortraitGlyph(summon) {
  if (summon.kind === 'lich') return '☠';
  if (summon.kind === 'thornbeast') return '✿';
  if (summon.kind === 'spectralHand') return '✋';
  return '◆';
}

// -----------------------------------------------------------------------------
// BOTTOM-LEFT COMBAT HUD
// -----------------------------------------------------------------------------

function renderCombatHud(player) {
  let hud = document.getElementById('combatSkillHud');

  if (!gameScreenIsActive()) {
    if (hud) hud.remove();
    return;
  }

  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'combatSkillHud';
    document.body.appendChild(hud);
  }

  hud.style.display = '';

  const now = performance.now() / 1000;

  const weapon = player.equipment?.weapon ? ITEMS[player.equipment.weapon] : null;
  const qId = player.loadout?.abilitySlots?.[0] || null;
  const rId = player.loadout?.abilitySlots?.[1] || null;

  const qAbility = qId ? getAbilityById(qId) : null;
  const rAbility = rId ? getAbilityById(rId) : null;

  const progression = getProgressionSummary(player);

  hud.innerHTML = `
    <div class="combat-hud-title">
      <span>Combat Lv ${progression.combatLevel}</span>
      <b>${escapeHtml(player.className || 'Classless')}${progression.classLevel ? ` Lv ${progression.classLevel}` : ''}</b>
    </div>

    <div class="combat-hud-slots">
      ${hudSlot({
        key: 'Space',
        name: getBasicAttackName(weapon),
        desc: weapon ? weaponTypeLabel(weapon.weaponType) : 'Unarmed',
        ready: true,
        cooldownPercent: 0,
        cooldownText: '',
        locked: false
      })}

      ${hudAbilitySlot(player, qAbility, 'Q', now, 'Choose a class')}

      ${hudAbilitySlot(player, rAbility, 'R', now, player.className ? 'Unlock at class skill level 10' : 'Choose a class')}
    </div>
  `;
}

function hudAbilitySlot(player, ability, key, now, lockedReason) {
  if (!ability) {
    return hudSlot({
      key,
      name: 'Locked',
      desc: lockedReason,
      ready: false,
      cooldownPercent: 0,
      cooldownText: '',
      locked: true
    });
  }

  player.cooldowns = player.cooldowns || {};

  let last = player.cooldowns[ability.id] || 0;
  const cd = ability.cd || 0;

  if (last > now) {
    player.cooldowns[ability.id] = 0;
    last = 0;
  }

  const elapsed = now - last;
  const remaining = Math.max(0, cd - elapsed);
  const onCooldown = remaining > 0;
  const percent = cd > 0 ? Math.max(0, Math.min(100, (remaining / cd) * 100)) : 0;

  const skillLevel = getSkillLevel(player.skillState, ability.skill);
  const levelLocked = ability.unlockLevel && skillLevel < ability.unlockLevel;

  const activeSummon = isSummonAbilityActive(player, ability);

  return hudSlot({
    key,
    name: ability.name,
    desc: activeSummon
      ? 'Active — press again to dismiss'
      : levelLocked
        ? `${skillLabel(ability.skill)} ${skillLevel}/${ability.unlockLevel}`
        : abilityDescriptionShort(ability),
    ready: (!onCooldown && !levelLocked) || activeSummon,
    cooldownPercent: onCooldown && !activeSummon ? percent : 0,
    cooldownText: onCooldown && !activeSummon ? remaining.toFixed(1) : '',
    locked: levelLocked
  });
}

function isSummonAbilityActive(player, ability) {
  if (!ability?.summonType) return false;

  return (player.summons || []).some(s => {
    return s.alive !== false && s.kind === ability.summonType;
  });
}

function hudSlot({ key, name, desc, ready, cooldownPercent, cooldownText, locked }) {
  return `
    <div class="combat-hud-slot ${ready ? 'ready' : ''} ${locked ? 'locked' : ''}">
      <div class="combat-hud-key">${escapeHtml(key)}</div>

      <div class="combat-hud-body">
        <b>${escapeHtml(name)}</b>
        <span>${escapeHtml(desc || '')}</span>
      </div>

      ${cooldownPercent > 0 ? `
        <div class="combat-hud-cooldown" style="height:${cooldownPercent}%"></div>
        <div class="combat-hud-cd-text">${escapeHtml(cooldownText)}</div>
      ` : ''}
    </div>
  `;
}

function getBasicAttackName(weapon) {
  if (!weapon) return 'Basic Strike';

  if (weapon.weaponType === 'bow') return 'Arrow Shot';
  if (weapon.weaponType === 'scythe') return 'Scythe Slash';
  if (weapon.weaponType === 'staff') return 'Staff Strike';
  if (weapon.weaponType === 'sword') return 'Sword Slash';

  return 'Basic Attack';
}

function abilityDescriptionShort(ability) {
  if (ability.summonType) {
    return `Summon ${summonName(ability.summonType)}`;
  }

  if (ability.damageMultiplier) {
    return `${Math.round(ability.damageMultiplier * 100)}% skill damage`;
  }

  if (ability.damageReduction) {
    return `${Math.round(ability.damageReduction * 100)}% damage reduction`;
  }

  return ability.skill ? skillLabel(ability.skill) : 'Ability';
}

// -----------------------------------------------------------------------------
// DEV TOOLS
// -----------------------------------------------------------------------------

function bindDevButtons(player, game) {
  document.querySelectorAll('[data-dev-give-item]').forEach(btn => {
    btn.onclick = () => {
      const itemId = btn.dataset.devGiveItem;
      const item = ITEMS[itemId];

      if (!item) {
        game?.log?.(`DEV: Missing item ${itemId}.`);
        return;
      }

      addItem(player, itemId, item.stack ? 10 : 1);
      migratePlayer(player);
      game?.log?.(`DEV: Added ${item.stack ? '10x ' : ''}${item.name}.`);
      renderUI(player, game.logLines || [], game);
    };
  });

  document.querySelectorAll('[data-dev-give-all-gear]').forEach(btn => {
    btn.onclick = () => {
      const gear = Object.values(ITEMS).filter(item => {
        return item && item.id && (item.slot || item.type === 'weapon' || item.type === 'armour' || item.type === 'trinket');
      });

      for (const item of gear) {
        addItem(player, item.id, 1);
      }

      migratePlayer(player);
      game?.log?.(`DEV: Added ${gear.length} gear items.`);
      renderUI(player, game.logLines || [], game);
    };
  });

  document.querySelectorAll('[data-dev-give-all-items]').forEach(btn => {
    btn.onclick = () => {
      const items = Object.values(ITEMS).filter(item => item && item.id);

      for (const item of items) {
        addItem(player, item.id, item.stack ? 25 : 1);
      }

      migratePlayer(player);
      game?.log?.(`DEV: Added every item in data.js.`);
      renderUI(player, game.logLines || [], game);
    };
  });

  document.querySelectorAll('[data-dev-raise-class-skill]').forEach(btn => {
    btn.onclick = () => {
      raiseClassSkill(player, game, 10);
    };
  });

  document.querySelectorAll('[data-dev-raise-all-skills]').forEach(btn => {
    btn.onclick = () => {
      raiseAllSkills(player, game, 10);
    };
  });

  document.querySelectorAll('[data-dev-full-restore]').forEach(btn => {
    btn.onclick = () => {
      player.hp = player.maxHp;
      player.stamina = player.maxStamina;

      if (player.spiritAwakened) {
        player.spirit = player.maxSpirit;
      }

      migratePlayer(player);
      game?.log?.('DEV: Restored HP, stamina, and spirit.');
      renderUI(player, game.logLines || [], game);
    };
  });
}

function raiseClassSkill(player, game, amount = 10) {
  if (!player.classSkill) {
    game?.log?.('DEV: No class skill selected. Choose a class first.');
    return;
  }

  const skill = player.skillState?.skills?.[player.classSkill];

  if (!skill) {
    game?.log?.(`DEV: Missing class skill ${player.classSkill}.`);
    return;
  }

  skill.used = true;
  skill.level += amount;
  skill.xp = 0;

  migratePlayer(player);

  game?.log?.(`DEV: Raised ${skillLabel(player.classSkill)} by ${amount} levels.`);
  renderUI(player, game.logLines || [], game);
}

function raiseAllSkills(player, game, amount = 10) {
  const skills = player.skillState?.skills || {};
  const entries = Object.entries(skills);

  for (const [, skill] of entries) {
    skill.used = true;
    skill.level += amount;
    skill.xp = 0;
  }

  migratePlayer(player);

  game?.log?.(`DEV: Raised ${entries.length} skills by ${amount} levels.`);
  renderUI(player, game.logLines || [], game);
}

function renderDevPanel(player) {
  const allItems = Object.values(ITEMS)
    .filter(item => item && item.id)
    .sort((a, b) => {
      const typeA = a.type || '';
      const typeB = b.type || '';

      if (typeA !== typeB) return typeA.localeCompare(typeB);
      return String(a.name || a.id).localeCompare(String(b.name || b.id));
    });

  const gearCount = allItems.filter(item => {
    return item.slot || item.type === 'weapon' || item.type === 'armour' || item.type === 'trinket';
  }).length;

  const progression = getProgressionSummary(player);

  return `
    <div class="card dev-card">
      <h2>Dev Tools</h2>
      <p class="tag">Testing tools for progression, item validation, and equipment checks.</p>

      <div class="progression-mini-grid">
        ${progressionMiniCard('Combat Level', progression.combatLevel, progression.combatRank)}
        ${progressionMiniCard('Class Level', progression.classLevel || '—', progression.classRank)}
      </div>

      <div class="button-row">
        <button class="small-btn" data-dev-raise-class-skill="1">Raise Class Skill +10</button>
        <button class="small-btn" data-dev-raise-all-skills="1">Raise All Skills +10</button>
        <button class="small-btn" data-dev-give-all-gear="1">Give All Gear (${gearCount})</button>
        <button class="small-btn" data-dev-give-all-items="1">Give Every Item</button>
        <button class="small-btn" data-dev-full-restore="1">Full Restore</button>
      </div>
    </div>

    <div class="card dev-card">
      <h3>Give Any Item</h3>
      <p class="tag">Click any item below to add it to your inventory. Stackable items add 10 at a time.</p>

      <div class="dev-item-grid">
        ${allItems.map(item => devItemButton(item)).join('')}
      </div>
    </div>
  `;
}

function devItemButton(item) {
  const rarity = RARITY?.[item.rarity];
  const color = rarity?.color || '#aeb8ca';
  const type = item.type || 'item';
  const slot = item.slot ? ` • ${item.slot}` : '';

  return `
    <button class="dev-item-button" data-dev-give-item="${escapeHtml(item.id)}">
      <b style="color:${color}">${escapeHtml(item.name || item.id)}</b>
      <span>${escapeHtml(type)}${escapeHtml(slot)}</span>
    </button>
  `;
}

// -----------------------------------------------------------------------------
// CHARACTER
// -----------------------------------------------------------------------------

function renderCharacter(player, game) {
  const el = document.getElementById('character');
  if (!el) return;

  const subtab = game.uiState.characterSubtab || 'overview';
  const weapon = player.equipment.weapon ? ITEMS[player.equipment.weapon] : null;

  el.innerHTML = `
    <div class="subtab-bar character-subtabs">
      <button class="subtab ${subtab === 'overview' ? 'active' : ''}" data-character-subtab="overview">Overview</button>
      <button class="subtab ${subtab === 'sheet' ? 'active' : ''}" data-character-subtab="sheet">Character Sheet</button>
      <button class="subtab ${subtab === 'equipment' ? 'active' : ''}" data-character-subtab="equipment">Equipment</button>
      <button class="subtab ${subtab === 'dev' ? 'active' : ''}" data-character-subtab="dev">Dev</button>
    </div>

    ${subtab === 'overview' ? renderCharacterOverview(player, weapon) : ''}
    ${subtab === 'sheet' ? renderCharacterSheet(player, weapon) : ''}
    ${subtab === 'equipment' ? renderCharacterEquipment(player) : ''}
    ${subtab === 'dev' ? renderDevPanel(player) : ''}
  `;
}

function renderCharacterOverview(player, weapon) {
  const buildName = getCharacterBuildName(player.skillState);
  const spiritState = player.spiritAwakened ? 'Awakened' : 'Dormant';
  const className = player.className || 'None';
  const classSkill = player.classSkill ? skillLabel(player.classSkill) : '—';
  const classBonus = player.classSkill ? '+50%' : '—';

  const progression = getProgressionSummary(player);
  const classProgress = getClassCombatLevelProgress(player);
  const combatProgress = getCombatLevelProgress(player);

  return `
    <div class="progression-card-grid">
      ${bigProgressionCard({
        title: 'Combat Level',
        value: progression.combatLevel,
        subtitle: progression.combatRank,
        percent: combatProgress.percent,
        note: 'Based on Blade, Archery, Spirit, and Warding.'
      })}

      ${bigProgressionCard({
        title: 'Class Level',
        value: progression.classLevel || '—',
        subtitle: progression.classLevel ? progression.classRank : 'Choose a class instructor',
        percent: classProgress.percent || 0,
        note: progression.classSkillName
          ? `Scales from ${progression.classSkillName}.`
          : 'Class level starts after choosing a class.'
      })}
    </div>

    <div class="card">
      <h2>${escapeHtml(player.name)}</h2>
      <div class="stat-row"><span>Identity</span><b>${escapeHtml(buildName)}</b></div>
      <div class="stat-row"><span>Origin</span><b>${escapeHtml(player.origin || 'Unknown')}</b></div>
      <div class="stat-row"><span>Class</span><b>${escapeHtml(className)}</b></div>
      <div class="stat-row"><span>Class Skill</span><b>${escapeHtml(classSkill)}</b></div>
      <div class="stat-row"><span>Class XP Bonus</span><b>${escapeHtml(classBonus)}</b></div>
      <div class="stat-row"><span>Spirit</span><b>${spiritState}</b></div>

      ${bar('Health', player.hp, player.maxHp, 'bad')}
      ${bar('Stamina', player.stamina, player.maxStamina, 'good')}
      ${player.spiritAwakened
        ? bar('Spirit', player.spirit, player.maxSpirit, 'blue')
        : dormantBar('Spirit', 'Dormant')
      }

      <div class="stat-row"><span>Ash Coins</span><b class="gold">${player.gold || 0}</b></div>
    </div>

    <div class="card">
      <h3>Combat Loadout</h3>
      <div class="stat-row"><span>Basic Attack</span><b>Spacebar</b></div>
      <div class="stat-row"><span>Class Skill 1</span><b>Q — ${abilitySlotName(player, 0)}</b></div>
      <div class="stat-row"><span>Class Skill 2</span><b>R — ${abilitySlotName(player, 1)}</b></div>
      <div class="stat-row"><span>Interact</span><b>E</b></div>
      <div class="stat-row"><span>Equipped Weapon</span><b>${weapon ? escapeHtml(weapon.name) : 'None'}</b></div>
      <div class="stat-row"><span>Weapon Type</span><b>${weapon ? weaponTypeLabel(weapon.weaponType) : 'Unarmed'}</b></div>
    </div>

    <div class="card">
      <h3>Active Summons</h3>
      ${(player.summons || []).filter(s => s.alive !== false).length
        ? (player.summons || []).filter(s => s.alive !== false).map(s => `
          <div class="stat-row">
            <span>${escapeHtml(s.displayName || summonName(s.kind))}</span>
            <b>${Math.ceil(s.hp || 0)}/${Math.ceil(s.maxHp || 1)} HP</b>
          </div>
        `).join('')
        : `<p class="tag">No active summon.</p>`
      }
      <p class="tag">Summons are permanent until dismissed or killed. Press the summon skill again to dismiss.</p>
    </div>
  `;
}

function renderCharacterSheet(player, weapon) {
  const highestCombat = getHighestCombatSkills(player.skillState)[0];
  const highestCombatText = highestCombat
    ? `${highestCombat.name} Level ${highestCombat.level}`
    : 'None';

  const weaponDamage = weapon
    ? calculateDisplayWeaponDamage(player, weapon)
    : Math.max(1, Math.floor(getPower(player) * 0.65));

  const inventoryValue = calculateInventoryValue(player);
  const equippedValue = calculateEquippedValue(player);
  const progression = getProgressionSummary(player);
  const combatDetails = getCombatLevelDetails(player.skillState);
  const classProgress = getClassCombatLevelProgress(player);

  return `
    <div class="character-sheet-grid">
      <div class="card character-paper">
        <div class="sheet-title-row">
          <div>
            <h2>${escapeHtml(player.name)}</h2>
            <p class="tag">${escapeHtml(player.className || 'Classless')} • ${escapeHtml(getCharacterBuildName(player.skillState))}</p>
          </div>
          <div class="sheet-badge">Combat Lv ${progression.combatLevel}</div>
        </div>

        <div class="sheet-bars">
          ${bar('Health', player.hp, player.maxHp, 'bad')}
          ${bar('Stamina', player.stamina, player.maxStamina, 'good')}
          ${player.spiritAwakened
            ? bar('Spirit', player.spirit, player.maxSpirit, 'blue')
            : dormantBar('Spirit', 'Dormant')
          }
        </div>

        <div class="sheet-section-title">Progression</div>
        <div class="sheet-stat-grid">
          ${sheetStat('Combat Level', progression.combatLevel)}
          ${sheetStat('Combat Rank', progression.combatRank)}
          ${sheetStat('Class Level', progression.classLevel || '—')}
          ${sheetStat('Class Rank', progression.classRank)}
          ${sheetStat('Class Skill', progression.classSkillName || 'None')}
          ${sheetStat('Average Combat Level', combatDetails.averageCombatLevel.toFixed(1))}
        </div>

        <div class="sheet-section-title">Core Stats</div>
        <div class="sheet-stat-grid">
          ${sheetStat('Power', Math.floor(getPower(player)))}
          ${sheetStat('Armour', Math.floor(getArmour(player)))}
          ${sheetStat('Weapon Damage', weaponDamage)}
          ${sheetStat('Gold', player.gold || 0)}
          ${sheetStat('Highest Combat Skill', highestCombatText)}
          ${sheetStat('Class XP Bonus', player.classSkill ? '+50%' : 'None')}
        </div>
      </div>

      <div class="card character-paper">
        <div class="sheet-section-title">Equipped Gear</div>
        <div class="paper-equipment-list">
          ${paperEquipmentRow(player, 'weapon', 'Weapon')}
          ${paperEquipmentRow(player, 'helm', 'Helm')}
          ${paperEquipmentRow(player, 'chest', 'Chest')}
          ${paperEquipmentRow(player, 'legs', 'Legs')}
          ${paperEquipmentRow(player, 'trinket', 'Charm')}
        </div>

        <div class="sheet-section-title">Equipment Value</div>
        <div class="sheet-stat-grid two">
          ${sheetStat('Equipped Value', `${equippedValue} Ash`)}
          ${sheetStat('Inventory Value', `${inventoryValue} Ash`)}
        </div>
      </div>

      <div class="card character-paper">
        <div class="sheet-section-title">Weapon Scaling</div>
        ${weapon ? itemStatBlock(player, weapon) : `<p class="tag">No weapon equipped.</p>`}

        <div class="sheet-section-title">Current Abilities</div>
        <div class="paper-ability-list">
          ${paperAbilityRow(player, 0, 'Q')}
          ${paperAbilityRow(player, 1, 'R')}
        </div>
      </div>

      <div class="card character-paper">
        <div class="sheet-section-title">Combat Skills</div>
        <div class="paper-skill-list">
          ${['blade', 'archery', 'spirit', 'warding'].map(skillId => paperSkillRow(player, skillId)).join('')}
        </div>

        <div class="sheet-section-title">Class Progress</div>
        ${classProgress.skillId
          ? `
            <div class="paper-skill-row boosted">
              <div class="stat-row">
                <span>${escapeHtml(classProgress.className)} Level</span>
                <b>${classProgress.level}</b>
              </div>
              ${bar('', classProgress.xp, classProgress.next, 'gold')}
              <p class="tag gold">${escapeHtml(classProgress.rankName)} • ${escapeHtml(classProgress.skillName)} based</p>
            </div>
          `
          : `<p class="tag">No class selected.</p>`
        }
      </div>
    </div>
  `;
}

function renderCharacterEquipment(player) {
  return `
    <div class="card">
      <h2>Equipped Gear</h2>
      <div class="equipment-grid">
        ${equipmentSlotCard(player, 'weapon', 'Weapon', player.equipment.weapon)}
        ${equipmentSlotCard(player, 'helm', 'Helm', player.equipment.helm)}
        ${equipmentSlotCard(player, 'chest', 'Chest', player.equipment.chest)}
        ${equipmentSlotCard(player, 'legs', 'Legs', player.equipment.legs)}
        ${equipmentSlotCard(player, 'trinket', 'Charm', player.equipment.trinket)}
      </div>
    </div>
  `;
}

function bigProgressionCard({ title, value, subtitle, percent, note }) {
  const safePercent = Math.max(0, Math.min(100, percent || 0));

  return `
    <div class="card progression-big-card">
      <div class="progression-big-row">
        <span>${escapeHtml(title)}</span>
        <b>${escapeHtml(value)}</b>
      </div>
      <p class="tag gold">${escapeHtml(subtitle || '')}</p>
      <div class="bar">
        <div class="fill gold" style="width:${safePercent}%"></div>
      </div>
      <p class="tag">${escapeHtml(note || '')}</p>
    </div>
  `;
}

function progressionMiniCard(label, value, subtext) {
  return `
    <div class="progression-mini-card">
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(value)}</b>
      <small>${escapeHtml(subtext || '')}</small>
    </div>
  `;
}

function sheetStat(label, value) {
  return `
    <div class="sheet-stat">
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(value)}</b>
    </div>
  `;
}

function paperEquipmentRow(player, slot, label) {
  const itemId = player.equipment?.[slot];
  const item = itemId ? ITEMS[itemId] : null;
  const rarity = item ? RARITY?.[item.rarity] : null;
  const color = rarity?.color || '#aeb8ca';

  return `
    <div class="paper-row">
      <span>${escapeHtml(label)}</span>
      <b style="color:${color}">${item ? escapeHtml(item.name) : 'Empty'}</b>
    </div>
  `;
}

function paperAbilityRow(player, index, key) {
  const id = player.loadout?.abilitySlots?.[index];
  const ability = id ? getAbilityById(id) : null;

  if (!ability) {
    return `
      <div class="paper-row">
        <span>${escapeHtml(key)}</span>
        <b>Locked</b>
      </div>
    `;
  }

  return `
    <div class="paper-row">
      <span>${escapeHtml(key)}</span>
      <b>${escapeHtml(ability.name)}</b>
    </div>
  `;
}

function paperSkillRow(player, skillId) {
  const progress = getSkillProgress(player.skillState, skillId);
  const boosted = player.classSkill === skillId;

  return `
    <div class="paper-skill-row ${boosted ? 'boosted' : ''}">
      <div class="stat-row">
        <span>${escapeHtml(skillLabel(skillId))}</span>
        <b>Level ${progress.level}</b>
      </div>
      ${bar('', progress.xp, progress.next, boosted ? 'gold' : '')}
      ${boosted ? `<p class="tag gold">Class Boosted +50%</p>` : ''}
    </div>
  `;
}

// -----------------------------------------------------------------------------
// SKILLS
// -----------------------------------------------------------------------------

function renderSkills(player, game) {
  const el = document.getElementById('skills');
  if (!el) return;

  const subtab = game.uiState.skillsSubtab || 'combat';

  const combatSkills = getAllSkillDefinitions().filter(s => s.type === 'combat');
  const gatheringSkills = getAllSkillDefinitions().filter(s => s.type === 'gathering');
  const productionSkills = getAllSkillDefinitions().filter(s => s.type === 'production');
  const worldSkills = getAllSkillDefinitions().filter(s => s.type === 'world');

  const progression = getProgressionSummary(player);
  const combatProgress = getCombatLevelProgress(player);
  const classProgress = getClassCombatLevelProgress(player);

  el.innerHTML = `
    <div class="subtab-bar skills-sheet-tabs">
      <button class="subtab ${subtab === 'combat' ? 'active' : ''}" data-skills-subtab="combat">Combat</button>
      <button class="subtab ${subtab === 'gathering' ? 'active' : ''}" data-skills-subtab="gathering">Gathering</button>
      <button class="subtab ${subtab === 'production' ? 'active' : ''}" data-skills-subtab="production">Production</button>
      <button class="subtab ${subtab === 'world' ? 'active' : ''}" data-skills-subtab="world">World</button>
      <button class="subtab ${subtab === 'abilities' ? 'active' : ''}" data-skills-subtab="abilities">Abilities</button>
    </div>

    <div class="progression-card-grid">
      ${bigProgressionCard({
        title: 'Combat Level',
        value: progression.combatLevel,
        subtitle: progression.combatRank,
        percent: combatProgress.percent,
        note: 'Derived from Blade, Archery, Spirit, and Warding.'
      })}

      ${bigProgressionCard({
        title: 'Class Level',
        value: progression.classLevel || '—',
        subtitle: progression.classLevel ? progression.classRank : 'Classless',
        percent: classProgress.percent || 0,
        note: classProgress.skillName
          ? `${classProgress.className} level is based on ${classProgress.skillName}.`
          : 'Choose an instructor path to begin class progression.'
      })}
    </div>

    <div class="card">
      <h2>Skills</h2>
      <p class="tag">Every skill levels infinitely. Combat Level measures overall fighting experience. Class Level only follows the combat skill linked to your chosen class.</p>
      <div class="stat-row"><span>Class Boosted Skill</span><b>${player.classSkill ? skillLabel(player.classSkill) : 'None'}</b></div>
      <div class="stat-row"><span>Class XP Bonus</span><b>${player.classSkill ? '+50%' : 'None'}</b></div>
    </div>

    ${subtab === 'combat' ? skillSection('Combat Skills', combatSkills, player) : ''}
    ${subtab === 'gathering' ? skillSection('Gathering Skills', gatheringSkills, player) : ''}
    ${subtab === 'production' ? skillSection('Production Skills', productionSkills, player) : ''}
    ${subtab === 'world' ? skillSection('World Skills', worldSkills, player) : ''}
    ${subtab === 'abilities' ? abilitySheet(player) : ''}
  `;
}

function skillSection(title, skills, player) {
  return `
    <div class="card">
      <h3>${escapeHtml(title)}</h3>
      <div class="skill-sheet-list">
        ${skills.map(skill => skillCard(skill, player)).join('')}
      </div>
    </div>
  `;
}

function skillCard(skill, player) {
  const progress = getSkillProgress(player.skillState, skill.id);
  const status = getSkillDisplayStatus(player.skillState, skill.id);
  const used = hasUsedSkill(player.skillState, skill.id);
  const boosted = player.classSkill === skill.id;

  return `
    <div class="skill-card skill-row-card ${used ? 'used' : 'unused'} ${boosted ? 'boosted' : ''}">
      <div class="skill-row-header">
        <div>
          <h3>${escapeHtml(skill.name)}</h3>
          <p class="tag">${escapeHtml(skill.description || '')}</p>
        </div>

        <div class="skill-row-level">
          <b>${escapeHtml(status)}</b>
          ${boosted ? `<span class="tag gold">Class Boosted +50%</span>` : ''}
        </div>
      </div>

      ${bar('', progress.xp, progress.next, boosted ? 'gold' : '')}

      <div class="skill-row-details">
        <div class="stat-row"><span>XP</span><b>${Math.floor(progress.xp)} / ${Math.floor(progress.next)}</b></div>
        <div class="stat-row"><span>Leveling</span><b>Infinite</b></div>
      </div>
    </div>
  `;
}

function abilitySheet(player) {
  const classAbilities = ABILITIES.filter(a => a.classId);
  const generalAbilities = ABILITIES.filter(a => !a.classId);

  return `
    <div class="card">
      <h3>Class Ability Sheet</h3>
      <p class="tag">Class abilities unlock after choosing an instructor path. Your first class ability unlocks immediately. Your second unlocks when the class-linked skill reaches level 10.</p>
      <div class="ability-sheet-grid">
        ${classAbilities.map(a => abilityCard(player, a)).join('')}
      </div>
    </div>

    <div class="card">
      <h3>General Ability Sheet</h3>
      <p class="tag">These are older/general abilities that can stay available while the combat system continues evolving.</p>
      <div class="ability-sheet-grid">
        ${generalAbilities.map(a => abilityCard(player, a)).join('')}
      </div>
    </div>
  `;
}

function abilityCard(player, ability) {
  const unlocked = player.unlockedAbilities?.includes(ability.id);
  const sl = getSkillLevel(player.skillState, ability.skill);
  const levelMet = sl >= (ability.unlockLevel || 1);
  const classMet = !ability.classId || player.classId === ability.classId;
  const spiritMet = !ability.requiresSpiritAwakened || player.spiritAwakened;
  const usable = unlocked && levelMet && classMet && spiritMet;

  return `
    <div class="ability-card ${usable ? 'unlocked' : 'locked'}">
      <div class="stat-row">
        <span><b>${escapeHtml(ability.name)}</b></span>
        <b>${escapeHtml(ability.key || ability.classSlot || '-')}</b>
      </div>

      <div class="stat-row"><span>Skill</span><b>${escapeHtml(skillLabel(ability.skill))}</b></div>
      <div class="stat-row"><span>Unlock</span><b>${escapeHtml(skillLabel(ability.skill))} ${ability.unlockLevel || 1}</b></div>
      <div class="stat-row"><span>Cooldown</span><b>${ability.cd || 0}s</b></div>
      <div class="stat-row"><span>Cost</span><b>${ability.cost || 0} ${escapeHtml(ability.costType || '')}</b></div>
      ${ability.classId ? `<div class="stat-row"><span>Class</span><b>${escapeHtml(classLabel(ability.classId))}</b></div>` : ''}

      <p class="tag">${escapeHtml(ability.desc || abilityDescriptionShort(ability))}</p>

      <p class="tag ${usable ? 'gold' : ''}">
        ${usable ? 'Unlocked / Available' : abilityLockReason(player, ability)}
      </p>
    </div>
  `;
}

function abilityLockReason(player, ability) {
  if (ability.classId && player.classId !== ability.classId) {
    return `Requires ${classLabel(ability.classId)} path`;
  }

  const sl = getSkillLevel(player.skillState, ability.skill);
  if (ability.unlockLevel && sl < ability.unlockLevel) {
    return `Requires ${skillLabel(ability.skill)} level ${ability.unlockLevel}`;
  }

  if (ability.requiresSpiritAwakened && !player.spiritAwakened) {
    return 'Requires awakened Spirit';
  }

  if (!player.unlockedAbilities?.includes(ability.id)) {
    return 'Not unlocked yet';
  }

  return 'Locked';
}

// -----------------------------------------------------------------------------
// QUESTS / LOG
// -----------------------------------------------------------------------------

function renderQuests(player, game) {
  const el = document.getElementById('quests');
  if (!el) return;

  syncLegacyQuestDisplayState(player);

  el.innerHTML = `
    <div class="card">
      <h2>Quests</h2>
      ${renderConnectedQuestLog(player)}
    </div>
  `;
}

function renderConnectedQuestLog(player) {
  const activeQuests = player?.quests?.active || {};
  const completedQuests = player?.quests?.completed || {};

  const active = Object.values(activeQuests);
  const completed = Object.values(completedQuests);

  if (!active.length && !completed.length) {
    return `
      <div class="quest-card">
        <h3>No Active Quests</h3>
        <p class="tag">Speak with NPCs in the world to discover work, mysteries, and faction conflicts.</p>
      </div>

      <div class="quest-card">
        <h3>${escapeHtml(QUESTS?.humanBeginning?.title || 'Human Beginning')}</h3>
        <p class="tag">You are classless until you choose an instructor path in the world.</p>
        <p class="tag">Templar = Blade, Mercenary = Archery, Necromancer = Spirit, Thornbinder = Warding.</p>
      </div>
    `;
  }

  return `
    ${active.map(quest => renderActiveQuestCard(quest)).join('')}

    ${completed.length ? `
      <div class="quest-section-title">Completed</div>
      ${completed.map(quest => renderCompletedQuestCard(quest)).join('')}
    ` : ''}
  `;
}

function renderActiveQuestCard(quest) {
  const objectives = Array.isArray(quest.objectives) ? quest.objectives : [];

  return `
    <div class="quest-card active">
      <div class="quest-card-header">
        <h3>${escapeHtml(quest.title || quest.id || 'Quest')}</h3>
        <span>Stage ${Number(quest.stageIndex || 0) + 1}</span>
      </div>

      ${quest.description ? `<p class="tag">${escapeHtml(quest.description)}</p>` : ''}

      ${quest.readyToTurnIn ? `
        <p class="quest-ready">Ready to turn in.</p>
      ` : ''}

      <div class="quest-objectives">
        ${objectives.length
          ? objectives.map(renderQuestObjective).join('')
          : `<p class="tag">No current objectives.</p>`
        }
      </div>
    </div>
  `;
}

function renderQuestObjective(objective) {
  const current = Number(objective.current || 0);
  const required = Number(objective.required || 1);
  const complete = current >= required;

  return `
    <div class="quest-objective ${complete ? 'complete' : ''}">
      <span class="quest-check">${complete ? '✓' : '○'}</span>
      <span>${escapeHtml(getObjectiveLabel(objective))}</span>
      <b>${current}/${required}</b>
    </div>
  `;
}

function renderCompletedQuestCard(quest) {
  return `
    <div class="quest-card completed">
      <h3>${escapeHtml(quest.title || quest.id || 'Completed Quest')}</h3>
      <p class="tag">Completed.</p>
    </div>
  `;
}

function getObjectiveLabel(objective) {
  if (!objective) return 'Unknown objective';

  if (objective.label) return objective.label;

  if (objective.type === 'collect') {
    return `Collect ${prettyId(objective.itemId)}`;
  }

  if (objective.type === 'kill') {
    return `Defeat ${prettyId(objective.enemyKind)}`;
  }

  if (objective.type === 'killAny') {
    return `Defeat enemies`;
  }

  if (objective.type === 'talk') {
    return `Speak with ${prettyId(objective.npcId)}`;
  }

  if (objective.type === 'discoverPoi') {
    return `Discover ${prettyId(objective.poiId)}`;
  }

  return prettyId(objective.type || 'Objective');
}

function syncLegacyQuestDisplayState(player) {
  if (!player) return;

  player.quest = player.quest || {};
  player.quests = player.quests || { active: {}, completed: {} };
  player.quests.active = player.quests.active || {};
  player.quests.completed = player.quests.completed || {};

  syncLegacyFirstOath(player);
  syncLegacyHungryShrine(player);
  syncLegacyHumanBeginning(player);
}

function syncLegacyFirstOath(player) {
  const firstOathState = Number(player.quest?.firstOath || 0);

  if (firstOathState >= 3) {
    delete player.quests.active.firstOathLegacy;

    player.quests.completed.firstOathLegacy = {
      id: 'firstOathLegacy',
      title: QUESTS?.firstOath?.title || 'First Oath of Runalis',
      completedAt: performance.now()
    };

    return;
  }

  const stage = getFirstOathStage(player);
  const emberleaf = countItem(player, 'emberleaf');
  const ironOre = countItem(player, 'ironOre');

  player.quests.active.firstOathLegacy = {
    id: 'firstOathLegacy',
    title: QUESTS?.firstOath?.title || 'First Oath of Runalis',
    description: stage?.text || 'Prove you can gather, endure, and fight if needed.',
    stageIndex: Math.max(0, firstOathState),
    objectives: firstOathState <= 1
      ? [
          {
            type: 'collect',
            itemId: 'emberleaf',
            current: Math.min(emberleaf, 3),
            required: 3
          },
          {
            type: 'collect',
            itemId: 'ironOre',
            current: Math.min(ironOre, 2),
            required: 2
          }
        ]
      : [
          {
            type: 'talk',
            npcId: 'wardenMael',
            current: 0,
            required: 1
          }
        ],
    complete: false,
    readyToTurnIn: false
  };
}

function syncLegacyHungryShrine(player) {
  if (player.spiritAwakened || Number(player.quest?.hungryShrine || 0) >= 2) {
    delete player.quests.active.hungryShrineLegacy;

    player.quests.completed.hungryShrineLegacy = {
      id: 'hungryShrineLegacy',
      title: QUESTS?.hungryShrine?.title || 'The Hungry Shrine',
      completedAt: performance.now()
    };

    return;
  }

  const gravecap = countItem(player, 'gravecap');
  const boneShard = countItem(player, 'boneShard');

  player.quests.active.hungryShrineLegacy = {
    id: 'hungryShrineLegacy',
    title: QUESTS?.hungryShrine?.title || 'The Hungry Shrine',
    description: 'Find the Hungry Shrine and bring the offering it wants.',
    stageIndex: 0,
    objectives: [
      {
        type: 'collect',
        itemId: 'gravecap',
        current: Math.min(gravecap, 2),
        required: 2
      },
      {
        type: 'collect',
        itemId: 'boneShard',
        current: Math.min(boneShard, 1),
        required: 1
      }
    ],
    complete: false,
    readyToTurnIn: false
  };
}

function syncLegacyHumanBeginning(player) {
  if (player.classId) {
    delete player.quests.active.humanBeginningLegacy;

    player.quests.completed.humanBeginningLegacy = {
      id: 'humanBeginningLegacy',
      title: QUESTS?.humanBeginning?.title || 'Human Beginning',
      completedAt: performance.now()
    };

    return;
  }

  player.quests.active.humanBeginningLegacy = {
    id: 'humanBeginningLegacy',
    title: QUESTS?.humanBeginning?.title || 'Human Beginning',
    description: 'You are classless until you choose an instructor path in the world.',
    stageIndex: 0,
    objectives: [
      {
        type: 'talk',
        npcId: 'classInstructor',
        label: 'Choose a class instructor path',
        current: 0,
        required: 1
      }
    ],
    complete: false,
    readyToTurnIn: false
  };
}

function prettyId(value) {
  return String(value || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
    .trim();
}

function renderLog(lines) {
  const el = document.getElementById('log');
  if (!el) return;

  el.innerHTML = `
    <div class="card">
      <h2>World Log</h2>
      <div class="log-list">
        ${(lines || []).map(l => `<div class="log-line">${escapeHtml(l)}</div>`).join('')}
      </div>
    </div>
  `;
}

export function getFirstOathStage(p) {
  if (!p?.quest) {
    return {
      stage: 0,
      text: QUESTS?.firstOath?.stages?.[0] || 'Speak with Warden Mael.'
    };
  }

  if (p.quest.firstOath === 0) {
    return {
      stage: 0,
      text: QUESTS?.firstOath?.stages?.[0] || 'Speak with Warden Mael.'
    };
  }

  if (countItem(p, 'emberleaf') < 3 || countItem(p, 'ironOre') < 2) {
    return {
      stage: 1,
      text: QUESTS?.firstOath?.stages?.[1] || 'Gather Emberleaf x3 and Iron Ore x2.'
    };
  }

  if ((p.quest.hollowlings || 0) < 3) {
    return {
      stage: 2,
      text: QUESTS?.firstOath?.stages?.[2] || 'Defeat Hollowlings x3.'
    };
  }

  if (p.quest.firstOath < 3) {
    return {
      stage: 3,
      text: QUESTS?.firstOath?.stages?.[3] || 'Return to Warden Mael.'
    };
  }

  return {
    done: true,
    stage: 4,
    text: 'You completed your first oath and earned standing in Runalis.'
  };
}

// -----------------------------------------------------------------------------
// GENERIC UI HELPERS
// -----------------------------------------------------------------------------

function abilitySlotName(player, index) {
  const id = player.loadout?.abilitySlots?.[index];
  const ability = id ? getAbilityById(id) : null;

  return ability ? ability.name : 'Locked';
}

function classLabel(classId) {
  if (classId === 'templar') return 'Templar';
  if (classId === 'mercenary') return 'Mercenary';
  if (classId === 'necromancer') return 'Necromancer';
  if (classId === 'thornbinder') return 'Thornbinder';

  return classId || 'Class';
}

function summonName(kind) {
  if (kind === 'lich') return 'Lich';
  if (kind === 'thornbeast') return 'Thornbeast';
  if (kind === 'spectralHand') return 'Spectral Hand';

  return 'Summon';
}

function skillLabel(skillId) {
  if (skillId === 'blade') return 'Blade';
  if (skillId === 'archery') return 'Archery';
  if (skillId === 'spirit') return 'Spirit';
  if (skillId === 'warding') return 'Warding';
  if (skillId === 'foraging') return 'Foraging';
  if (skillId === 'mining') return 'Mining';
  if (skillId === 'fishing') return 'Fishing';
  if (skillId === 'crafting') return 'Crafting';
  if (skillId === 'cooking') return 'Cooking';
  if (skillId === 'runecraft') return 'Runecraft';
  if (skillId === 'renown') return 'Renown';

  return String(skillId || 'Unknown');
}

function weaponTypeLabel(type) {
  if (type === 'sword') return 'Sword';
  if (type === 'bow') return 'Bow';
  if (type === 'staff') return 'Staff';
  if (type === 'scythe') return 'Scythe';

  return type || 'Weapon';
}

function bar(label, value, max, cls = '') {
  const safeMax = Math.max(1, max || 1);
  const safeValue = Math.max(0, value || 0);
  const pct = Math.max(0, Math.min(100, safeValue / safeMax * 100));

  return `
    ${label ? `<div class="stat-row"><span>${escapeHtml(label)}</span><span>${Math.ceil(safeValue)}/${Math.ceil(safeMax)}</span></div>` : ''}
    <div class="bar"><div class="fill ${escapeHtml(cls)}" style="width:${pct}%"></div></div>
  `;
}

function dormantBar(label, text) {
  return `
    ${label ? `<div class="stat-row"><span>${escapeHtml(label)}</span><span>${escapeHtml(text)}</span></div>` : ''}
    <div class="bar dormant"><div class="fill" style="width:0%"></div></div>
  `;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;'
  }[c]));
}

// -----------------------------------------------------------------------------
// SMALL STYLE PATCH FOR NEW PROGRESSION UI
// -----------------------------------------------------------------------------

function injectProgressionHudStyles() {
  if (document.getElementById('runalisProgressionHudStyles')) return;

  const style = document.createElement('style');
  style.id = 'runalisProgressionHudStyles';

  style.textContent = `
    .unit-level-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin: 2px 0 4px;
      font-size: 10px;
      color: var(--muted, #9facbf);
      font-weight: 800;
      letter-spacing: 0.02em;
    }

    .unit-level-row b {
      color: var(--gold, #d9ad4f);
      font-size: 10px;
      white-space: nowrap;
    }

    .progression-card-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    .progression-big-card {
      position: relative;
      overflow: hidden;
    }

    .progression-big-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 4px;
    }

    .progression-big-row span {
      color: var(--muted, #9facbf);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .progression-big-row b {
      color: var(--gold, #d9ad4f);
      font-size: 26px;
      line-height: 1;
    }

    .progression-mini-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin: 10px 0 12px;
    }

    .progression-mini-card {
      border: 1px solid rgba(122, 148, 191, 0.22);
      background: rgba(8, 13, 22, 0.58);
      border-radius: 12px;
      padding: 10px;
      display: grid;
      gap: 3px;
    }

    .progression-mini-card span {
      color: var(--muted, #9facbf);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .progression-mini-card b {
      color: var(--gold, #d9ad4f);
      font-size: 20px;
    }

    .progression-mini-card small {
      color: var(--muted, #9facbf);
      font-size: 11px;
      line-height: 1.25;
    }

    @media (max-width: 820px) {
      .progression-card-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}