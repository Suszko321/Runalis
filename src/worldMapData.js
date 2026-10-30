// worldMapData.js
// Lightweight, code-drawn region map metadata for the Act I menu map.
//
// The visible region name is Echoryn Forest, while the runtime/story region
// continues to use Hearthmere identifiers for save compatibility.

import {
  ACT1_LANDMARKS,
  OVERWORLD_H,
  OVERWORLD_W
} from './overworldUtils.js';
import { ACT1_OVERWORLD_DISPLAY_NAME } from './worldNames.js';
import {ECHORYN_ROADS,ECHORYN_RIVERS,ECHORYN_LAKES,ECHORYN_ESCARPMENTS,ECHORYN_REGIONS,ECHORYN_FOREST_WALLS} from './echorynGeography.js';

const L = ACT1_LANDMARKS;

export const ACT1_WORLD_MAP = {
  id: 'act1OrrakaiMarches',
  regionId: 'hearthmereFrontier',
  actId: 'act1',
  displayName: ACT1_OVERWORLD_DISPLAY_NAME,
  internalName: 'Hearthmere Frontier',
  subtitle: 'Act I frontier map',
  bounds: {
    width: OVERWORLD_W,
    height: OVERWORLD_H
  },
  terrain: {
    roads: ECHORYN_ROADS.map(r=>({...r,importance:r.width>=4?'main':'secondary'})),
    rivers: ECHORYN_RIVERS,
    lakes: ECHORYN_LAKES,
    forestWalls: ECHORYN_FOREST_WALLS,
    cliffs: ECHORYN_ESCARPMENTS.map(e=>({id:e.id,points:[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]]})),
    regions: ECHORYN_REGIONS.map(r=>({...r,points:Array.from({length:20},(_,i)=>{const a=i*Math.PI/10;return [r.x+Math.cos(a)*r.rx,r.y+Math.sin(a)*r.ry];})}))
  },
  markers: [
    {
      id: 'orrakai',
      name: 'Orrakai',
      type: 'hub',
      category: 'Settlement',
      x: L.outpost[0] + 3,
      y: L.outpost[1] + 8,
      icon: 'OR',
      alwaysKnown: true,
      major: true,
      description: 'The Act I safe hub. Vendors, class trainers, campfires, shrines, and early quest NPCs are clustered here.'
    },
    {
      id: 'orrakaiWardenOutpost',
      sourcePoiId: 'outpost',
      name: 'Orrakai South Gate',
      type: 'outpost',
      category: 'Town Gate',
      x: L.outpost[0],
      y: L.outpost[1],
      icon: 'WO',
      alwaysKnown: true,
      major: true,
      recommendedLevel: 1,
      description: 'The south approach to Orrakai. Full town services are inside the Orrakai hub.'
    },
    {
      id: 'orrakaiMarket',
      name: 'Orrakai Market Quarter',
      type: 'vendor',
      category: 'Vendor',
      x: L.outpost[0] + 3,
      y: L.outpost[1] + 8,
      icon: '$',
      alwaysKnown: true,
      services: ['Tools', 'Rations', 'Materials', 'Selling'],
      description: 'The market is inside Orrakai beside the bank and town square.'
    },
    {
      id: 'orrakaiTrainers',
      name: 'Class Trainer Circle',
      type: 'trainer',
      category: 'Training',
      x: L.outpost[0] + 3,
      y: L.outpost[1] + 8,
      icon: 'TR',
      alwaysKnown: true,
      services: ['Class choice', 'Ability identity'],
      description: 'The training yard is inside Orrakai, with class mentors and practice services in one place.'
    },
    {
      id: 'weatheredShrine',
      name: 'Weathered Shrine',
      type: 'shrine',
      category: 'Rest / Shrine',
      x: L.outpost[0] + 3,
      y: L.outpost[1] + 8,
      icon: '+',
      alwaysKnown: true,
      services: ['Shrine', 'Rest point'],
      description: 'A safe shrine inside Orrakai for recovering before leaving either town gate.'
    },
    {
      id: 'frontierRoadGate',
      sourcePoiId: 'pilgrimRoadGate',
      name: 'Frontier Road Gate',
      type: 'gate',
      category: 'Travel Gate',
      x: L.pilgrimRoadGate[0],
      y: L.pilgrimRoadGate[1],
      icon: 'GT',
      major: true,
      recommendedLevel: 15,
      description: 'Orrakai\'s north expedition route toward the Pilgrim Road and Act II. Opens after Act I completion and travel supplies.'
    },
    {
      id: 'frontierRoad',
      name: 'Frontier Road / Pilgrim Road',
      type: 'road',
      category: 'Main Road',
      x: 138,
      y: 48,
      icon: 'RD',
      alwaysKnown: true,
      major: true,
      description: 'The main Act I road spine. It runs from Orrakai toward the chapel road, then onward to the Act II route.'
    },
    {
      id: 'hollowGrove',
      name: 'Blighted Grove',
      type: 'sideZone',
      category: 'Side Zone',
      x: L.hollowGrove[0],
      y: L.hollowGrove[1],
      icon: 'HG',
      recommendedLevel: 2,
      tags: ['foraging', 'hollow'],
      description: 'A small procedural grove for early herbs, Blighted enemies, and first exploration practice.'
    },
    {
      id: 'ashenOrchard',
      sourcePoiId: 'ashenOrchard',
      name: 'Ashen Orchard',
      type: 'poi',
      category: 'Quest POI',
      x: L.ashenOrchard[0],
      y: L.ashenOrchard[1],
      icon: 'AO',
      major: true,
      recommendedLevel: 3,
      tags: ['gathering', 'investigation'],
      description: 'A failed purification site with Ash Fruit, grave materials, and early Act I investigation evidence.'
    },
    {
      id: 'hungryShrine',
      name: 'Hungry Shrine',
      type: 'shrine',
      category: 'Shrine',
      x: L.hungryShrine[0],
      y: L.hungryShrine[1],
      icon: 'HS',
      recommendedLevel: 5,
      tags: ['side quest', 'spirit'],
      description: 'A strange roadside shrine tied to frontier offerings and spirit-leaning side work.'
    },
    {
      id: 'lanternSpan',
      sourcePoiId: 'pilgrimBridge',
      name: 'Lantern Span',
      type: 'bridge',
      category: 'Bridge',
      x: L.pilgrimBridge[0],
      y: L.pilgrimBridge[1],
      icon: 'LS',
      major: true,
      recommendedLevel: 7,
      description: 'The main crossing on the chapel road. The map marks it as Lantern Span for readability.'
    },
    {
      id: 'brokenChapel',
      sourcePoiId: 'brokenChapel',
      name: 'Broken Chapel',
      type: 'poi',
      category: 'Main Quest POI',
      x: L.brokenChapel[0],
      y: L.brokenChapel[1],
      icon: 'BC',
      major: true,
      recommendedLevel: 8,
      tags: ['quest', 'covenant', 'undead'],
      description: 'The Act I mystery pivots here. Chapel ruins reveal holy machinery and the deeper Hearthmere wound.'
    },
    {
      id: 'castleVeyr',
      sourcePoiId: 'gothicCastle',
      name: 'Castle Veyreign',
      type: 'castle',
      category: 'Major POI',
      x: L.castleVeyr[0],
      y: L.castleVeyr[1],
      icon: 'CV',
      major: true,
      recommendedLevel: 25,
      tags: ['undead', 'vampire', 'castle'],
      description: 'A cursed noble fortress and major Act I landmark tied to Veyr bloodline content.'
    },
    {
      id: 'hunterCamp',
      name: 'Hunter Reach Camp',
      type: 'camp',
      category: 'Camp',
      x: L.hunterCamp[0],
      y: L.hunterCamp[1],
      icon: 'HC',
      recommendedLevel: 8,
      services: ['Campfire', 'Scout quests'],
      description: 'A road camp for hunter/scout work, mid-Act I travel, and route warnings.'
    },
    {
      id: 'watcherRidge',
      sourcePoiId: 'watcherRidge',
      name: 'Watcher Ridge',
      type: 'ridge',
      category: 'Danger POI',
      x: L.watcherRidge[0],
      y: L.watcherRidge[1],
      icon: 'WR',
      recommendedLevel: 14,
      tags: ['elite', 'wraith'],
      description: 'High ridge ruins with stronger enemies and late Act I danger.'
    },
    {
      id: 'thornrootHollow',
      sourcePoiId: 'thornrootHollow',
      name: 'Thornroot Crypt',
      type: 'dungeon',
      category: 'Dungeon Entrance',
      x: L.thornrootHollow[0],
      y: L.thornrootHollow[1],
      icon: 'TH',
      major: true,
      recommendedLevel: 4,
      tags: ['thornbinder', 'dungeon'],
      description: 'A root-choked hollow and early dungeon entrance for forest corruption content.'
    },
    {
      id: 'mirrorGrove',
      sourcePoiId: 'mirrorGrove',
      name: 'Mirror Grove',
      type: 'grove',
      category: 'Shrine / Grove',
      x: L.mirrorGrove[0],
      y: L.mirrorGrove[1],
      icon: 'MG',
      recommendedLevel: 6,
      tags: ['gathering', 'shrine'],
      description: 'A quiet Thornwood grove with shrine content and reagent routes.'
    },
    {
      id: 'riverbendCamp',
      name: 'Riverbend Camp',
      type: 'camp',
      category: 'Campfire',
      x: L.riverbendCamp[0],
      y: L.riverbendCamp[1],
      icon: 'CF',
      recommendedLevel: 3,
      services: ['Campfire', 'Rest point'],
      description: 'A small wilderness rest point between Thornwood and the Riverlands.'
    },
    {
      id: 'saltwellCamp',
      sourcePoiId: 'saltwellCamp',
      name: 'Saltwell Camp',
      type: 'fishing',
      category: 'Fishing / Vendor',
      x: L.saltwellCamp[0],
      y: L.saltwellCamp[1],
      icon: 'FI',
      recommendedLevel: 4,
      services: ['Fishing', 'Food', 'Hunter vendor'],
      tags: ['fishing', 'food'],
      description: 'Primary Act I fishing landmark and food-preparation camp.'
    },
    {
      id: 'lanternMarsh',
      sourcePoiId: 'lanternMarsh',
      name: 'Lantern Marsh',
      type: 'camp',
      category: 'Survival Camp',
      x: L.lanternMarsh[0],
      y: L.lanternMarsh[1],
      icon: 'LM',
      recommendedLevel: 9,
      services: ['Campfire', 'Mire route'],
      description: 'A marsh waystation and survival anchor before the Iron Mire.'
    },
    {
      id: 'abandonedMine',
      name: 'Abandoned Mine',
      type: 'mine',
      category: 'Mining Side Zone',
      x: L.abandonedMine[0],
      y: L.abandonedMine[1],
      icon: 'AM',
      recommendedLevel: 7,
      tags: ['mining', 'side zone'],
      description: 'A procedural mining side zone with ore routes and mine enemies.'
    },
    {
      id: 'ironMire',
      sourcePoiId: 'ironMireDungeon',
      name: 'Iron Mire Sink',
      type: 'mine',
      category: 'Mining / Dungeon',
      x: L.ironMire[0],
      y: L.ironMire[1],
      icon: 'IM',
      recommendedLevel: 9,
      tags: ['mining', 'dungeon'],
      description: 'A flooded mire descent and Act I mining route for ore, bone, and mire resources.'
    },
    {
      id: 'oldHollow',
      sourcePoiId: 'oldHollowDungeon',
      name: 'Old Blighted',
      type: 'dungeon',
      category: 'Dungeon Entrance',
      x: L.oldHollow[0],
      y: L.oldHollow[1],
      icon: 'OH',
      major: true,
      recommendedLevel: 12,
      tags: ['grave', 'dungeon'],
      description: 'An old grave descent on the route toward late Act I danger.'
    },
    {
      id: 'redSealKeep',
      sourcePoiId: 'demonCultLair',
      aliases: ['dawnspireRoot', 'demonCultLair'],
      name: 'Last Dawn Keep',
      type: 'keep',
      category: 'Final Dungeon Entrance',
      x: L.demonCultLair[0],
      y: L.demonCultLair[1],
      icon: 'RS',
      major: true,
      recommendedLevel: 12,
      tags: ['cult', 'demon', 'main quest'],
      description: 'The fortified Act I keep around the Last Dawn. This is the route into the final dungeon chain.'
    },
    {
      id: 'sealworks',
      aliases: ['dawnspireRoot'],
      name: 'Sealworks Beneath Orrakai',
      type: 'dungeon',
      category: 'Story Dungeon',
      x: L.demonCultLair[0] - 18,
      y: L.demonCultLair[1] - 20,
      icon: 'SW',
      major: true,
      recommendedLevel: 12,
      tags: ['dawnspire', 'main quest'],
      description: 'The hidden machine-wound below Act I. It preserves Dawnspire Root naming without moving save IDs.'
    },
    {
      id: 'malakarChamber',
      aliases: ['malakar', 'dawnspireRoot', 'demonCultLair'],
      name: "Malakar's Chamber",
      type: 'boss',
      category: 'Boss Arena',
      x: L.demonCultLair[0] + 7,
      y: L.demonCultLair[1] + 11,
      icon: 'MK',
      major: true,
      recommendedLevel: 13,
      tags: ['boss', 'act finale'],
      description: 'The Act I boss arena at the root of the Last Dawn/Dawnspire dungeon path.'
    },
    {
      id: 'infiniteTower',
      sourcePoiId: 'infiniteTower',
      name: 'Infinite Tower',
      type: 'tower',
      category: 'Repeatable Dungeon',
      x: L.infiniteTower[0],
      y: L.infiniteTower[1],
      icon: 'IT',
      recommendedLevel: 5,
      tags: ['repeatable', 'infinite dungeon'],
      description: 'The Act I repeatable/infinite dungeon entrance.'
    }
  ]
};

export function getAct1WorldMapMarker(markerId) {
  return ACT1_WORLD_MAP.markers.find(marker => marker.id === markerId) || null;
}
