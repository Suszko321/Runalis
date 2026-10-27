// companionData.js
// Companion and class trainer story definitions.

export const COMPANIONS = {
  mara: {
    id: 'mara',
    fullName: 'Mara Vell',
    trainerClassId: 'thornbinder',
    trainerSkill: 'warding',
    storyRole: 'Orrakai healer, alchemist, and practical emotional anchor',
    worldview: 'Endure. Heal. Grow through the cracks.',
    personality: ['sharp', 'tired', 'sarcastic', 'deeply caring'],
    combatIdentity:
      'Roots, vines, poison, plant summons, healing, survival magic, and battlefield control.',
    relationshipArc: [
      {
        actId: 'act1',
        stage: 'orrakaiRecovery',
        beat: 'Mara helps Covenant physicians interpret the player\'s unusual recovery and refuses to romanticize it.'
      },
      {
        actId: 'act1',
        stage: 'poisonedWorld',
        beat: 'She proves that the Rot follows ancient foundations even when Covenant purification succeeds around them.'
      },
      {
        actId: 'act2',
        stage: 'healingAsControl',
        beat: 'Covenant healers impress and disgust her because their cures erase pain by erasing people.'
      },
      {
        actId: 'act3',
        stage: 'growThroughTheEnd',
        beat: 'Zephyr offers to remove all pain from the living world; Mara rejects healing without personhood.'
      }
    ],
    personalQuest: {
      id: 'maraRootsInAsh',
      title: 'Roots in Ash',
      premise: 'Mara and Covenant physicians test why living remedies reach Rot that white fire cannot touch beneath ancient stone.',
      stages: ['Gather living herbs', 'Stabilize an Essence-damaged child', 'Combine field medicine with careful purification']
    },
    classReactions: {
      thornbinder: 'Mara calls the player stubborn enough to learn what roots already know.',
      gravecaller: 'Mara respects useful forbidden work but warns against confusing grief with wisdom.',
      necromancer: 'Mara respects useful forbidden work but warns against confusing grief with wisdom.',
      oathkeeper: 'Mara distrusts holy certainty but watches whether the player protects people first.',
      templar: 'Mara distrusts holy certainty but watches whether the player protects people first.',
      fellhunter: 'Mara likes that the player asks practical questions before heroic ones.',
      mercenary: 'Mara likes that the player asks practical questions before heroic ones.'
    }
  },

  bram: {
    id: 'bram',
    fullName: 'Bram',
    trainerClassId: 'fellhunter',
    trainerSkill: 'archery',
    storyRole: 'Young Orrakai road guard',
    worldview: 'Train. Fight. Protect what is in front of you.',
    personality: ['brave', 'scared', 'friendly', 'grounded'],
    combatIdentity:
      'Dodging, blocking, stamina discipline, traps, throwing blades, bombs, hooklines, and survival fundamentals.',
    relationshipArc: [
      {
        actId: 'act1',
        stage: 'reliefRoad',
        beat: 'Bram holds a relief route after a Last Dawn attack and learns fear does not mean cowardice.'
      },
      {
        actId: 'act1',
        stage: 'firstTrophy',
        beat: 'He keeps a small trophy from the first real victory to remind himself he stood his ground.'
      },
      {
        actId: 'act2',
        stage: 'ordinaryCourage',
        beat: 'Clean Covenant cities make him wonder if order is worth fear. He notices people stop laughing.'
      },
      {
        actId: 'act3',
        stage: 'protector',
        beat: 'Zephyr offers to erase Bram\'s fear. Bram refuses because courage requires fear.'
      }
    ],
    personalQuest: {
      id: 'bramLanternDrill',
      title: 'The Lantern Drill',
      premise: 'Bram trains villagers and refugees to survive without waiting for heroes.',
      stages: ['Recover practice weapons', 'Defend a camp drill', 'Let Bram lead a defense alone']
    },
    classReactions: {
      fellhunter: 'Bram bonds through drills, jokes, traps, and practical courage.',
      mercenary: 'Bram bonds through drills, jokes, traps, and practical courage.',
      oathkeeper: 'Bram admires protection but worries oaths can become cages.',
      templar: 'Bram admires protection but worries oaths can become cages.',
      gravecaller: 'Bram is nervous at first, then learns fear is not proof of evil.',
      necromancer: 'Bram is nervous at first, then learns fear is not proof of evil.',
      thornbinder: 'Bram asks Mara and the player if vines count as cheating in a spar.'
    }
  },

  dusk: {
    id: 'dusk',
    fullName: 'Kaelen Dusk',
    shortName: 'Dusk',
    trainerClassId: 'gravecaller',
    trainerSkill: 'spirit',
    storyRole: 'Demon-touched outcast and survivor of Covenant purification',
    worldview: 'Use what others fear. Death is not evil. Abuse of power is evil.',
    personality: ['guarded', 'bitter', 'intelligent', 'misunderstood'],
    combatIdentity:
      'Summons, curses, lifesteal, bone magic, spirit manipulation, and forbidden Essence techniques.',
    relationshipArc: [
      {
        actId: 'act1',
        stage: 'huntedOutcast',
        beat: 'Dusk helps identify the difference between demon corruption and Covenant Essence damage.'
      },
      {
        actId: 'act1',
        stage: 'notAMonster',
        beat: 'The player sees Dusk use death magic to preserve memory instead of exploit it.'
      },
      {
        actId: 'act2',
        stage: 'purificationScar',
        beat: 'Dusk reveals what Covenant purification took from him and why he survived changed.'
      },
      {
        actId: 'act3',
        stage: 'griefWithAName',
        beat: 'Zephyr offers to erase his shame. Dusk chooses to remember and remain himself.'
      }
    ],
    personalQuest: {
      id: 'duskNamesForTheDead',
      title: 'Names for the Dead',
      premise: 'Dusk gathers erased names before the Dawnspire Network consumes their last echoes.',
      stages: ['Recover a bone charm', 'Speak with a damaged echo', 'Choose whether to bind or release the dead']
    },
    classReactions: {
      gravecaller: 'Dusk trusts the player earlier but tests whether they respect the dead.',
      necromancer: 'Dusk trusts the player earlier but tests whether they respect the dead.',
      oathkeeper: 'Dusk is sharp with Oathkeepers but respects protective action over holy language.',
      templar: 'Dusk is sharp with Oathkeepers but respects protective action over holy language.',
      thornbinder: 'Dusk and Mara argue over whether decay is enemy or ingredient.',
      fellhunter: 'Dusk appreciates practical people because they ask fewer stupid theological questions.',
      mercenary: 'Dusk appreciates practical people because they ask fewer stupid theological questions.'
    }
  },

  elian: {
    id: 'elian',
    fullName: 'Sister Elian',
    trainerClassId: 'oathkeeper',
    trainerSkill: 'blade',
    storyRole: 'Covenant priestess who begins as a sincere believer',
    worldview: 'Faith should protect people, not control them.',
    personality: ['sincere', 'disciplined', 'compassionate', 'conflicted'],
    combatIdentity:
      'Shields, oaths, radiant strikes, defensive magic, cleansing abilities, and protection skills.',
    relationshipArc: [
      {
        actId: 'act1',
        stage: 'sincerePriestess',
        beat: 'Elian genuinely helps wounded villagers and believes the Covenant is necessary.'
      },
      {
        actId: 'act2',
        stage: 'faithCracks',
        beat: 'She discovers purification removes grief, memory, doubt, love, and rebellion.'
      },
      {
        actId: 'act2',
        stage: 'choiceOfFaith',
        beat: 'Depending on flags, she defects, remains loyal as a tragic enemy, or sacrifices herself to expose truth.'
      },
      {
        actId: 'act3',
        stage: 'protectiveLight',
        beat: 'If present, she rejects Zephyr by redefining faith as protection without ownership.'
      }
    ],
    personalQuest: {
      id: 'elianTheOathAndTheChain',
      title: 'The Oath and the Chain',
      premise: 'Elian must decide whether her vows belong to the Covenant or to the people those vows were meant to shield.',
      stages: ['Recover forbidden Covenant text', 'Witness a failed purification', 'Choose testimony, defection, or loyal silence']
    },
    classReactions: {
      oathkeeper: 'Elian takes special interest and the Covenant tries harder to claim the player.',
      templar: 'Elian takes special interest and the Covenant tries harder to claim the player.',
      gravecaller: 'Elian begins wary, then must confront whether fear is moral evidence.',
      necromancer: 'Elian begins wary, then must confront whether fear is moral evidence.',
      thornbinder: 'Elian respects healing that does not require obedience.',
      fellhunter: 'Elian appreciates Bram-like courage because it protects without doctrine.',
      mercenary: 'Elian appreciates Bram-like courage because it protects without doctrine.'
    }
  }
};

export const COMPANION_RELATIONSHIP_STATES = {
  0: 'stranger',
  1: 'trusted',
  2: 'bonded',
  3: 'devoted',
  '-1': 'strained',
  '-2': 'broken'
};

export const CAMP_DIALOGUE_STATES = {
  act1AfterAttack: {
    id: 'act1AfterAttack',
    trigger: 'story.hearthmereAttackSurvived',
    companionLines: {
      mara: 'Do not mistake surviving for being fine. Sit down before I make you.',
      bram: 'I held the lantern. My hands were shaking so hard I thought I would drop it.',
      dusk: 'Your blessing failed. That means someone will decide you are useful.',
      elian: 'The Light did not take you. I do not know whether to be relieved or afraid.'
    }
  },
  act2PurificationTruth: {
    id: 'act2PurificationTruth',
    trigger: 'story.purificationTruthSeen',
    companionLines: {
      mara: 'That was not healing. That was pruning a person until obedience fit.',
      bram: 'They smiled after. That made it worse.',
      dusk: 'Now you know what they called mercy when they put their hands on me.',
      elian: 'If this is salvation, then my vows have been standing in the wrong room.'
    }
  },
  act3ZephyrOffer: {
    id: 'act3ZephyrOffer',
    trigger: 'zephyr.personalOffersHeard',
    companionLines: {
      mara: 'Pain is not holy, but neither is emptiness.',
      bram: 'I want the fear gone. I do. But I want to be the one who outgrows it.',
      dusk: 'He offered silence. I have buried too many names to accept it.',
      elian: 'A god who cannot bear refusal is only a jailer with better music.'
    }
  }
};

export function getCompanion(id) {
  return COMPANIONS[id] || null;
}
