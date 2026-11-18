// The three optional routes use stable evidence keys in the host's campaign.
export const SERAPH_TRIALS = {
  lastStandBastion: {
    key:'signal', result:'supplyLine',
    stages:[
      ['roadSurvey','Scout the river shelf','From this shelf you can see both the toll gate and the relief wagons. The low culvert is clear.'],
      ['winch','Set the freight winch','The old freight cradle crosses below the watchfires. Once you signal the gatehouse, wagons can move without using the contested road.'],
      ['standard','Signal the gatehouse','Three short pulls. The east watch answers. The freight route is ready for the wagons.']
    ],
    hint:'Follow the relief corridor from the southeast courtyard. Scout the river shelf, set the winch, then signal the watch.'
  },
  forgottenOssuary: {
    key:'chime', result:'quieted',
    stages:[
      ['graveChime','The Chime of Earth','The first chime sounds beneath the water.'],
      ['bloodChime','The Chime of Blood','The second chime carries the names of the living.'],
      ['breathChime','The Chime of Breath','The last chime fades before it can disturb the dead.']
    ],
    hint:'The burial rite calls for earth, then blood, then breath. Read the stone beside the lower bridge.'
  },
  unfinishedHour: {
    key:'parallax', result:'aligned',
    stages:[
      ['eastGlass','Turn the Dawn Glass','The dawn glass fixes what might yet be.'],
      ['westGlass','Turn the Dusk Glass','The dusk glass holds what cannot be changed.'],
      ['stillGlass','Turn the Midnight Glass','The midnight glass brings both halves into focus. The mirror shows the road you actually walked.']
    ],
    hint:'The old telescope marks the order: dawn east, dusk west, and midnight beneath the still star.'
  }
};

export const SERAPH_PROOFS = {
  lastStandBastion:{
    outerRefuge:['road','water'],screenedEscort:['road','watch','water'],
    freightConvoy:['supplyLine','reliefPledge']
  },
  forgottenOssuary:{
    publicRecord:['crypt','archive','memorial'],sealedRecord:['crypt','archive','memorial'],
    keeperOfRites:['quieted','blankNames']
  },
  unfinishedHour:{
    keepMyLife:['caravan','orrakai','covenant'],anotherChance:['caravan','orrakai','covenant'],
    anchorReality:['aligned','telescope']
  }
};

export const SERAPH_RESOLUTION_LINES = {
  freightConvoy:'You found a road I stopped looking for. Iria will take the freight cradle and Denn will account for every wagon. Carry the Iron Vow.',
  keeperOfRites:'You kept the rite without silencing a single witness. I can lay the memorial to rest myself now. Take the Bell and let its first note be for them.',
  anchorReality:'You lined up three skies and still knew which road was yours. Carry the Lucid Mirror. Keep looking through it when certainty comes too easily.'
};
