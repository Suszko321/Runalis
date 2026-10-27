import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SKILL_TREE_NODES,SKILL_TREE_ORDER,CORE_SKILL_TREE_ORDER,BLOODLINE_SKILL_TREE_ORDER,WEAPON_SKILL_TREE_ORDER,
  getSkillTreeLayout,normalizeSkillTreeState,canSpendSkillTreeNode,spendSkillTreeNode,getSkillTreeBonuses,getAvailableSkillTreePoints,describeSkillTreeBonuses} from '../src/skillTreeSystem.js';
import {getPower,getArmour,calculateMaxHp,calculateMaxStamina,calculateMaxSpirit,createPlayer} from '../src/player.js';
import {getClassSubclasses,getSubclassPassiveBonuses} from '../src/subclassSystem.js';

const classes={blade:'oathkeeper',archery:'fellhunter',spirit:'gravecaller',warding:'thornbinder',hydromancy:'waverider',lightbringer:'lightbringer',eldritch:'eldritch'};
function fixture(tree){
  const player=createPlayer('Tree test');
  Object.assign(player,{classId:classes[tree]||'oathkeeper',spiritAwakened:true,knownAbilities:[],unlockedAbilities:[],skillTreeProgress:{},
    skillTree:{spent:{},bloodlineBonusPoints:1000,unlockedWeaponTrees:[...WEAPON_SKILL_TREE_ORDER]},
    bloodline:BLOODLINE_SKILL_TREE_ORDER.includes(tree)?{id:tree}:null});
  normalizeSkillTreeState(player);return player;
}

// Find a legal route while respecting both OR prerequisites and exclusive
// doctrines. Each node must be purchasable from a fresh character.
function routes(id,chosen=new Set()){
  if(chosen.has(id))return [chosen];
  const node=SKILL_TREE_NODES[id];
  if(node.choiceGroup&&[...chosen].some(other=>SKILL_TREE_NODES[other].choiceGroup===node.choiceGroup))return [];
  const requires=node.requires||[];
  let options=[chosen];
  if(node.requirementMode==='any'&&requires.length)options=requires.flatMap(parent=>routes(parent,new Set(chosen)));
  else for(const parent of requires)options=options.flatMap(route=>routes(parent,new Set(route)));
  return options.filter(route=>!node.choiceGroup||![...route].some(other=>SKILL_TREE_NODES[other].choiceGroup===node.choiceGroup))
    .map(route=>new Set([...route,id]));
}

let nodes=0,passives=0,purchases=0,bonusChecks=0;
const original=JSON.stringify(SKILL_TREE_NODES);
for(const tree of SKILL_TREE_ORDER){
  const layout=getSkillTreeLayout(tree),byId=new Map(layout.nodes.map(n=>[n.id,n]));
  assert.deepEqual(layout,getSkillTreeLayout(tree),'Layout must be deterministic');
  const foundations=layout.nodes.filter(n=>n.foundationTier);
  assert.equal(foundations.length,4,`${tree}: four new passives`);passives+=foundations.length;
  for(const edge of layout.connections){
    assert(byId.get(edge.from).position.row<byId.get(edge.to).position.row,`${edge.from} must precede ${edge.to}`);
  }
  for(const node of layout.nodes){
    nodes++;
    for(const parent of node.requires||[])assert(byId.has(parent),'Prerequisite must exist in this tree');
    const legal=routes(node.id);assert(legal.length,`${node.id}: unreachable branch`);
    const player=fixture(tree);
    for(const id of legal[0]){
      if(player.skillTree.spent[id])continue;
      const before=getAvailableSkillTreePoints(player);
      assert(spendSkillTreeNode(player,id).ok,`${id}: purchase failed`);purchases++;
      assert.equal(getAvailableSkillTreePoints(player),before-SKILL_TREE_NODES[id].cost,'Charge exact cost');
    }
    assert(!canSpendSkillTreeNode(player,node.id).ok,'Duplicate purchase must fail');
    for(const other of layout.nodes.filter(n=>n.choiceGroup&&n.choiceGroup===node.choiceGroup&&n.id!==node.id))assert(!canSpendSkillTreeNode(player,other.id).ok,'Exclusive choice must remain locked');
    const saved=JSON.parse(JSON.stringify(player));normalizeSkillTreeState(saved);
    assert.deepEqual(saved.skillTree.spent,player.skillTree.spent,'Save migration preserves purchases');
    assert.deepEqual(getSkillTreeBonuses(saved),getSkillTreeBonuses(player),'Save migration preserves bonuses');
  }
  const player=fixture(tree);
  assert(!canSpendSkillTreeNode(player,foundations[0].id).ok,'Cannot skip root');
  assert(spendSkillTreeNode(player,`${tree}_root`).ok);
  for(const node of foundations){
    const before=getSkillTreeBonuses(player),oldPoints=getAvailableSkillTreePoints(player);
    assert(spendSkillTreeNode(player,node.id).ok);
    const after=getSkillTreeBonuses(player);
    for(const [key,value] of Object.entries(getSubclassPassiveBonuses(player,node))){
      assert.equal(after[key]-(before[key]||0),value,`${node.id}/${key}: bonus must apply once`);bonusChecks++;
    }
    assert.equal(getAvailableSkillTreePoints(player),oldPoints-node.cost);
    assert(describeSkillTreeBonuses(node.bonuses).every(line=>!line.includes('undefined')));
  }
  // No point budget may be bypassed for the new branch.
  const poor=fixture(tree);poor.skillTree.bloodlineBonusPoints=0;poor.skillTree.spent[`${tree}_root`]=1;
  assert(!canSpendSkillTreeNode(poor,foundations[0].id).ok);
}
// Verify real derived stats consume the new passive bonuses, beyond aggregation.
for(const [tree,tier,stat] of [['blade',1,calculateMaxHp],['blade',3,getArmour],['archery',1,calculateMaxStamina],['spirit',1,calculateMaxSpirit],['sword',2,getPower]]){
  const p=fixture(tree);const before=stat(p);p.skillTree.spent[`${tree}_foundation_${tier}`]=1;
  assert(stat(p)>before,`${tree}: live derived stat did not improve`);
}
assert.equal(JSON.stringify(SKILL_TREE_NODES),original,'Rendering/progression must not rewrite tree definitions');
const result={trees:SKILL_TREE_ORDER.length,nodes,newPassives:passives,purchases,bonusChecks,prerequisiteOrder:'passed',allNodesReachable:'passed',exclusiveChoices:'passed',savedPurchases:'preserved',derivedStats:'passed'};
fs.mkdirSync('docs/skill-trees',{recursive:true});fs.writeFileSync('docs/skill-trees/progression-checks.json',JSON.stringify(result,null,2)+'\n');
console.log(result);
