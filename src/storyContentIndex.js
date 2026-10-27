// storyContentIndex.js
// Single import point for the Runalis three-act story/content foundation.

export {
  STORY_ACTS,
  OPENING_TEN_MINUTES,
  MAIN_QUESTLINES,
  UNBOUND_REVEAL_TRACK,
  COVENANT_OF_LIGHT,
  ENDINGS,
  RECURRING_SYMBOLS,
  SIDE_QUEST_THEMES,
  ENVIRONMENTAL_STORYTELLING,
  IMPLEMENTATION_STATE_KEYS,
  DEVELOPMENT_CHECKLIST,
  getStoryAct,
  getMainQuestline
} from './storyData.js';

export {
  RUNALIS_REGIONS,
  getRegionData,
  getRegionsByAct
} from './regionData.js';

export {
  TRAVEL_RESOURCE_IDS,
  TRAVEL_ROUTES,
  getTravelRoute,
  getRouteRequirementStatus
} from './travelData.js';

export {
  COMPANIONS,
  COMPANION_RELATIONSHIP_STATES,
  CAMP_DIALOGUE_STATES,
  getCompanion
} from './companionData.js';

export {
  ACT_BOSS_DUNGEONS,
  getActBossDungeon,
  getDungeonsForAct
} from './dungeonData.js';

export {
  MAJOR_BOSSES,
  BOSS_DIFFICULTY_RULES,
  getMajorBoss,
  getBossPhaseDefinition
} from './bossData.js';

export {
  STORY_DIALOGUE_TRIGGERS,
  CLASS_SPECIFIC_REACTION_TRIGGERS,
  getStoryDialogueTrigger
} from './dialogueData.js';

export {
  CLASS_TRAINERS,
  TRAINER_DIALOGUE_STATE_KEYS,
  getTrainerByClass
} from './trainerData.js';
