export const ZARYNTH_CAPITAL = 'zarynthCapital';
export const LEGACY_ACT2 = 'act2AureateReckoning';
export const ACT2_FINALE = 'act2MissingReports';

export const SERAPH_DOMAINS = {
  lastStandBastion: {
    id: 'lastStandBastion', name: 'Bastion of the Last Stand', quest: 'act2FortressDivided',
    guardian: 'Kaedros, the Last Banner', relic: 'The Iron Vow', oath: 'Responsibility',
    level: 24, theme: 'mine', color: '#e4a066', bossKind: 'shieldKnight',
    site: [1478, 484], road: [[1440,489],[1455,474],[1478,484]],
    description: 'A Varkan fortress. Its watchfires light the approach above the Zarynth Highway.'
  },
  forgottenOssuary: {
    id: 'forgottenOssuary', name: 'Ossuary of Forgotten Names', quest: 'act2DeadRemember',
    guardian: 'Morisyl, Keeper of the Last Names', relic: 'The Mourning Bell', oath: 'Remembrance',
    level: 26, theme: 'grave', color: '#9bd5d6', bossKind: 'gravePriest',
    site: [1822, 645], road: [[1830,605],[1819,606],[1818,622],[1822,645]],
    description: 'An Orunic burial city. A road of unmarked stones descends below the southern bank.'
  },
  unfinishedHour: {
    id: 'unfinishedHour', name: 'The Unfinished Hour', quest: 'act2LifeUnlived',
    guardian: 'Elyndra, the Unwritten', relic: 'The Lucid Mirror', oath: 'Identity',
    level: 27, theme: 'cosmic', color: '#d5a4fd', bossKind: 'wraith',
    site: [2325, 548], road: [[2310,583],[2331,565],[2325,548]],
    description: 'A Nymbrian observatory. Its broken instrument points toward a star that never rises.'
  }
};

export const ACT2_FLAGS = {
  commission: 'act2.commission',
  ward: 'act2.wardExplained',
  admitted: 'act2.admitted',
  miracle: 'act2.miracle',
  seraphel: 'act2.audience',
  cassian: 'act2.imperialCommission',
  entered: 'act2.underworksReached',
  response: 'act2.outbreakResponse',
  behemoth: 'act2.behemothDefeated',
  intervention: 'act2.intervention',
  reports: 'act2.reportsRead'
};

export const domainFlag = (id, key) => `act2.domains.${id}.${key}`;
export const ACT2_BEHEMOTH = 'rootCrownedBehemoth';

const targets = {
  [ACT2_FLAGS.commission]:'wardenMael',
  [ACT2_FLAGS.ward]:'act2-examiner',
  [ACT2_FLAGS.admitted]:'continent-zarynth-trade-ward-concordant-entry',
  [ACT2_FLAGS.miracle]:'act2-zephyr',
  [ACT2_FLAGS.seraphel]:'act2-seraphel',
  [ACT2_FLAGS.cassian]:'act2-cassian',
  [ACT2_FLAGS.entered]:'act2-zarynthCapital-stairs',
  [ACT2_FLAGS.response]:'act2-tavia',
  [ACT2_FLAGS.intervention]:'act2-aftercare',
  [ACT2_FLAGS.reports]:'act2-maelReports',
  ...Object.fromEntries(Object.keys(SERAPH_DOMAINS).map(id=>[domainFlag(id,'relic'),`continent-${id}-entrance`]))
};

function quest(id, title, level, summary, objectives, xp = 160) {
  return {
    id, title, recommendedLevel: level, type: 'main', progressScope: 'shared', summary,
    stages: [{id:'resolve', title, text:summary, objectives: objectives.map(([flag,label]) => ({type:'storyFlag', flag, label, required:1, targetId:targets[flag]}))}],
    rewards: {xp:{renown:xp}}
  };
}

const domains = Object.values(SERAPH_DOMAINS);
const q = [
  quest('act2AshesAfterDawn','Ashes After Dawn',20,'Return to Warden Mael at Orrakai’s Covenant infirmary.',[[ACT2_FLAGS.commission,'Accept Mael’s commission']]),
  quest('act2ThreeWitnesses','The Road of Three Witnesses',21,'Find Examiner Sera at the Saint Orvane checkpoint on the Pilgrim Road, or before Zarynth’s Concordant Gate.',[[ACT2_FLAGS.ward,'Learn why the Concordant Ward bars you']]),
  quest('act2ThreeSeraphs','The Three Seraphs',26,'Follow the Zarynth Highway to the three domains. Their custodians can release the relics in any order.',domains.map(d => [domainFlag(d.id,'relic'),`Secure ${d.relic} · ${d.name}`])),
  quest('act2FortressDivided','A Fortress Divided',24,'Find Kaedros at the Bastion above the first stretch of the Zarynth Highway. Clear a route for the refugees, open the old freight line, or challenge him in the ring.',[[domainFlag('lastStandBastion','relic'),'Acquire the Iron Vow']],400),
  quest('act2DeadRemember','What the Dead Remember',26,'Follow the burial road south from the highway to the Ossuary. Recover the burial records, sound the three funeral chimes, or challenge Morisyl.',[[domainFlag('forgottenOssuary','relic'),'Acquire the Mourning Bell']],450),
  quest('act2LifeUnlived','A Life Unlived',27,'Look for the observatory northwest of Eastwind Caravan Yard. Explore the three visions, align the still-star glasses, or challenge Elyndra.',[[domainFlag('unfinishedHour','relic'),'Acquire the Lucid Mirror']],450),
  quest('act2ConcordantGate','The Concordant Gate',28,'Use the three relics at the northern gate inside the public Zarynth Trade Ward.',[[ACT2_FLAGS.admitted,'Pass the Concordant Ward with all three relics']],360),
  quest('act2LivingSaint','The Living Saint',29,'Go to the Covenant hospital in western Zarynth. An infected transport has just arrived.',[[ACT2_FLAGS.miracle,'Witness Zephyr Light heal the patients']],300),
  quest('act2HandBeneath','The Hand Beneath the Falling',29,'Find Seraphel at the garden court northwest of the council hall.',[[ACT2_FLAGS.seraphel,'Speak to Seraphel about Malakar’s warning']],300),
  quest('act2EmperorsBurden','The Emperor’s Burden',29,'Attend Emperor Cassian’s council in the northeast of the inner ward.',[[ACT2_FLAGS.cassian,'Accept the aqueduct commission']],300),
  quest('act2BloomBeneath','The Bloom Beneath the Walls',30,'Descend the aqueduct stairs east of the market. Hear the expedition’s options at the sluice junction.',[[ACT2_FLAGS.entered,'Reach the underworks'],[ACT2_FLAGS.response,'Decide how to stop the spread toward the refuge']],450),
  quest('act2RootCrowned','The Root-Crowned Behemoth',32,'Destroy the three exposed root hearts and fight the central manifestation in the cistern.',[[ACT2_FLAGS.behemoth,'Defeat the Root-Crowned Behemoth']],900),
  quest(ACT2_FINALE,'The Missing Reports',32,'See Zephyr at the aqueduct junction, then visit Mael in the capital’s western records office.',[[ACT2_FLAGS.intervention,'Witness the aftermath of the outbreak'],[ACT2_FLAGS.reports,'Read the missing maintenance reports with Mael']],850)
];
export const ACT2_QUESTS = Object.fromEntries(q.map(entry => [entry.id,entry]));

export function isAct2Instance(id) {
  return id === ZARYNTH_CAPITAL || Object.hasOwn(SERAPH_DOMAINS,id);
}
