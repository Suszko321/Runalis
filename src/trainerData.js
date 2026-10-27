// trainerData.js
// Class trainer states, unlock tiers, and relationship-aware training hooks.

export const CLASS_TRAINERS = {
  thornbinder: {
    classId: 'thornbinder',
    companionId: 'mara',
    skillId: 'warding',
    trainerName: 'Mara Vell',
    classMeaning:
      'Thornbinder is Mara\'s answer to a poisoned world: lash with living briars, slow what hunts you, wound what will not stop, and keep allies alive through stubborn green life.',
    unlockFlags: ['trainer.mara.introduced'],
    trainingStates: [
      {
        id: 'rootsBeforeMiracles',
        minRelationship: 0,
        line: 'Roots first. Miracles later. The world respects what holds.'
      },
      {
        id: 'healingWithTeeth',
        minRelationship: 1,
        line: 'Healing without teeth is just asking cruelty to return tomorrow.'
      },
      {
        id: 'elderThornChoice',
        minRelationship: 2,
        line: 'One great beast or many little survivors. Choose the shape of your stubbornness.'
      }
    ]
  },

  fellhunter: {
    classId: 'fellhunter',
    companionId: 'bram',
    skillId: 'archery',
    trainerName: 'Bram',
    classMeaning:
      'Fellhunter is Bram\'s courage made practical: count rations, set traps, keep distance, and survive what stronger people call impossible.',
    unlockFlags: ['trainer.bram.introduced'],
    trainingStates: [
      {
        id: 'staminaIsCourage',
        minRelationship: 0,
        line: 'Stamina is courage with a number attached. Watch it.'
      },
      {
        id: 'traplineDrill',
        minRelationship: 1,
        line: 'A trap is just a decision you made before panic arrived.'
      },
      {
        id: 'protectorDrill',
        minRelationship: 2,
        line: 'Do not fight to look brave. Fight so someone behind you gets another breath.'
      }
    ]
  },

  mercenary: {
    classId: 'mercenary',
    aliasFor: 'fellhunter',
    companionId: 'bram',
    skillId: 'archery',
    trainerName: 'Bram',
    classMeaning:
      'Fellhunter is Bram\'s courage made practical: count rations, set traps, keep distance, and survive what stronger people call impossible.',
    unlockFlags: ['trainer.bram.introduced'],
    trainingStates: [
      {
        id: 'staminaIsCourage',
        minRelationship: 0,
        line: 'Stamina is courage with a number attached. Watch it.'
      },
      {
        id: 'traplineDrill',
        minRelationship: 1,
        line: 'A trap is just a decision you made before panic arrived.'
      },
      {
        id: 'protectorDrill',
        minRelationship: 2,
        line: 'Do not fight to look brave. Fight so someone behind you gets another breath.'
      }
    ]
  },

  gravecaller: {
    classId: 'gravecaller',
    companionId: 'dusk',
    skillId: 'spirit',
    trainerName: 'Kaelen Dusk',
    classMeaning:
      'Gravecaller is Dusk refusing shame: death is not evil, grief is not corruption, and forbidden power must be handled responsibly.',
    unlockFlags: ['trainer.dusk.introduced'],
    trainingStates: [
      {
        id: 'speakSoftlyToBones',
        minRelationship: 0,
        line: 'Do not command the dead before you learn to listen.'
      },
      {
        id: 'lifestealWarning',
        minRelationship: 1,
        line: 'Taking life is easy. Knowing when not to take it is the lesson.'
      },
      {
        id: 'lesserOrLich',
        minRelationship: 2,
        line: 'Many bones, or one will strong enough to stand beside you. Both choices have costs.'
      }
    ]
  },

  necromancer: {
    classId: 'necromancer',
    companionId: 'dusk',
    skillId: 'spirit',
    trainerName: 'Kaelen Dusk',
    classMeaning:
      'Gravecaller is Dusk refusing shame: death is not evil, grief is not corruption, and forbidden power must be handled responsibly.',
    unlockFlags: ['trainer.dusk.introduced'],
    trainingStates: [
      {
        id: 'speakSoftlyToBones',
        minRelationship: 0,
        line: 'Do not command the dead before you learn to listen.'
      },
      {
        id: 'lifestealWarning',
        minRelationship: 1,
        line: 'Taking life is easy. Knowing when not to take it is the lesson.'
      },
      {
        id: 'lesserOrLich',
        minRelationship: 2,
        line: 'Many bones, or one will strong enough to stand beside you. Both choices have costs.'
      }
    ]
  },

  oathkeeper: {
    classId: 'oathkeeper',
    companionId: 'elian',
    skillId: 'blade',
    trainerName: 'Sister Elian',
    classMeaning:
      'Oathkeeper is Elian\'s crisis of faith: light should shield people, not own them.',
    unlockFlags: ['trainer.elian.introduced'],
    trainingStates: [
      {
        id: 'oathAsShield',
        minRelationship: 0,
        line: 'An oath is a shield. If it becomes a cage, break the lock.'
      },
      {
        id: 'radiantGuard',
        minRelationship: 1,
        line: 'Radiance without mercy is only fire with better manners.'
      },
      {
        id: 'faithAfterDoubt',
        minRelationship: 2,
        line: 'Doubt did not kill my faith. It taught it to kneel before people, not power.'
      }
    ]
  },

  waverider: {
    classId: 'waverider',
    skillId: 'warding',
    trainerName: 'Tideglass Adept Naia',
    classMeaning:
      'Waveriding is the discipline of yielding without surrender: pressure for enemies, shelter for allies, and motion that refuses to be pinned down.',
    unlockFlags: ['trainer.naia.introduced'],
    trainingStates: [
      {
        id: 'listenForCurrent',
        minRelationship: 0,
        line: 'Do not force the current. Give it a direction, then survive what it carries.'
      },
      {
        id: 'pressureAndShelter',
        minRelationship: 1,
        line: 'The same water that breaks stone can hold a drowning hand above the surface.'
      },
      {
        id: 'delugeCrown',
        minRelationship: 2,
        line: 'A deluge is not rage. It is every patient drop arriving together.'
      }
    ]
  }
};

CLASS_TRAINERS.hydromancer = {
  ...CLASS_TRAINERS.waverider,
  classId: 'hydromancer'
};

export const TRAINER_DIALOGUE_STATE_KEYS = [
  'trainer.mara.introduced',
  'trainer.mara.trainingTier',
  'trainer.bram.introduced',
  'trainer.bram.trainingTier',
  'trainer.dusk.introduced',
  'trainer.dusk.trainingTier',
  'trainer.elian.introduced',
  'trainer.elian.trainingTier',
  'trainer.elian.doubtAwakened',
  'trainer.elian.defected',
  'trainer.elian.tragicEnemy',
  'trainer.elian.sacrificed',
  'trainer.naia.introduced'
];

export function getTrainerByClass(classId) {
  const normalizedClassId = classId === 'templar'
    ? 'oathkeeper'
    : classId === 'necromancer'
      ? 'gravecaller'
      : classId === 'hydromancer'
        ? 'waverider'
        : classId === 'mercenary'
          ? 'fellhunter'
        : classId;
  return CLASS_TRAINERS[normalizedClassId] || CLASS_TRAINERS[classId] || null;
}
