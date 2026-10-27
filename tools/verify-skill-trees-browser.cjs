const {chromium}=require(process.env.RUNALIS_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const errors=[],results=[];
  fs.mkdirSync('docs/skill-trees',{recursive:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.route('**/src/main.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
    await page.goto(process.env.RUNALIS_PREVIEW_URL||'http://127.0.0.1:8768/');
    const trees=await page.evaluate(async()=>{
      const ui=await import('/src/ui.js'),p=await import('/src/player.js'),tree=await import('/src/skillTreeSystem.js');
      const {createWorld}=await import('/src/world.js');
      const game={player:p.createPlayer('Tree review'),world:createWorld(),camera:{x:0,y:0},logLines:[],log(t){this.logLines.push(t);},save(){},keys:{},input:{},canvas:document.querySelector('#game')};
      document.querySelector('#mainMenu').classList.remove('active');document.querySelector('#app').classList.add('active');
      ui.initUI(game);game.renderOwnedUI=()=>ui.renderUI(game.player,game.logLines,game);
      window.treeReview={game,ui,p,tree};game.renderOwnedUI();
      return tree.SKILL_TREE_ORDER;
    });
    await page.locator('[data-tab="skills"]').evaluate(e=>e.click());
    await page.locator('button.subtab[data-skills-subtab="trees"]').click();
    await page.evaluate(()=>document.fonts.ready);
    for(const size of [[1920,1080],[1440,900],[1366,768],[1280,720],[1024,768],[800,700]]){
      await page.setViewportSize({width:size[0],height:size[1]});
      for(const treeId of trees){
        await page.evaluate(treeId=>{
          const {game,tree,p}=treeReview;
          const classes={blade:'oathkeeper',archery:'fellhunter',spirit:'gravecaller',warding:'thornbinder',hydromancy:'waverider',lightbringer:'lightbringer',eldritch:'eldritch'};
          Object.assign(game.player,{classId:classes[treeId]||'oathkeeper',classChosen:true,knownAbilities:[],unlockedAbilities:[],skillTreeProgress:{},skillTree:{spent:{},bloodlineBonusPoints:100,unlockedWeaponTrees:[...tree.WEAPON_SKILL_TREE_ORDER]},bloodline:tree.BLOODLINE_SKILL_TREE_ORDER.includes(treeId)?{id:treeId}:null,raceId:treeId});
          game.uiState.selectedSkillTreeId=treeId;game.uiState.selectedSkillTreeNodeId=`${treeId}_root`;
          game.renderOwnedUI();
        },treeId);
        await page.waitForTimeout(35);
        const result=await page.evaluate(()=>{
          const graph=document.querySelector('.prerequisite-tree'),bounds=graph.getBoundingClientRect();
          const nodes=[...graph.querySelectorAll('[data-select-skill-tree-node]')];
          const clipped=nodes.filter(n=>{const b=n.getBoundingClientRect();return b.left<bounds.left-1||b.right>bounds.right+1||b.top<bounds.top-1||b.bottom>bounds.bottom+1;}).map(n=>n.dataset.selectSkillTreeNode);
          const overlaps=[];for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i].getBoundingClientRect(),b=nodes[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps.push([nodes[i].dataset.selectSkillTreeNode,nodes[j].dataset.selectSkillTreeNode]);}
          const model=treeReview.tree.getSkillTreeLayout(graph.dataset.branchingSkillTree);
          const clippedNames=nodes.filter(n=>{const label=n.querySelector('.tree-node-name');return label.scrollHeight>label.clientHeight+1||label.scrollWidth>label.clientWidth+1;}).map(n=>n.dataset.selectSkillTreeNode);
          const action=document.querySelector('.tree-learn-button').getBoundingClientRect(),pane=document.querySelector('.skill-tree-detail-pane').getBoundingClientRect();
          return {tree:model.tree,count:nodes.length,expected:model.nodes.length,edges:graph.querySelectorAll('[data-tree-from]').length,expectedEdges:model.connections.length,clipped,clippedNames,actionVisible:action.top>=pane.top&&action.bottom<=pane.bottom,overlaps,scroll:graph.scrollHeight>graph.clientHeight+1||graph.scrollWidth>graph.clientWidth+1,dimensions:[graph.clientWidth,graph.scrollWidth,graph.clientHeight,graph.scrollHeight],height:Math.round(bounds.height),minNodeHeight:Math.min(...nodes.map(n=>n.getBoundingClientRect().height)),pageSheets:graph.querySelectorAll('.menu-sheet-pane').length};
        });
        results.push({viewport:size,...result});
        assert.equal(result.count,result.expected);assert.equal(result.edges,result.expectedEdges);
        assert.deepEqual(result.clipped,[],`${size} ${treeId} clipped`);assert.deepEqual(result.overlaps,[],`${size} ${treeId} overlaps`);
        assert(!result.scroll,`${size} ${treeId} scrolls: ${JSON.stringify(result)}`);assert.equal(result.pageSheets,0);
        assert(result.actionVisible,'Purchase action must stay visible');
        assert.deepEqual(result.clippedNames,[],`${size} ${treeId}: cropped names`);
        if(['archery','hydromancy','sword'].includes(treeId)&&[1440,1280,800].includes(size[0]))await page.screenshot({path:`docs/skill-trees/${treeId}-${size[0]}.png`});
      }
    }
    await page.setViewportSize({width:1440,height:900});
    await page.locator('[data-select-skill-tree-node="eldritchWeapon_foundation_1"]').click();
    assert(await page.locator('[data-skill-tree-node="eldritchWeapon_foundation_1"]').isDisabled(),'Prerequisite must gate purchase');
    await page.locator('[data-select-skill-tree-node="eldritchWeapon_root"]').click();
    await page.locator('[data-skill-tree-node="eldritchWeapon_root"]').click();
    await page.locator('[data-select-skill-tree-node="eldritchWeapon_foundation_1"]').click();
    await page.locator('[data-skill-tree-node="eldritchWeapon_foundation_1"]').click();
    assert(await page.evaluate(()=>!!treeReview.game.player.skillTree.spent.eldritchWeapon_foundation_1));
    await page.locator('[data-select-skill-tree-node="eldritchWeapon_foundation_2"]').focus();
    assert.equal(await page.locator('[data-select-skill-tree-node="eldritchWeapon_foundation_2"]').getAttribute('aria-pressed'),'true');
    await page.evaluate(()=>treeReview.ui.handleGameUiControllerInput(treeReview.game,{connected:true,downPressed:true}));
    assert(await page.locator('.game-ui-controller-focus').count()>0);
    assert.deepEqual(errors,[]);
    fs.writeFileSync('docs/skill-trees/browser-checks.json',JSON.stringify({errors,results,purchase:'passed',keyboard:'passed',controller:'passed'},null,2));
    console.log(`PASS: ${results.length} tree/viewport checks; every node and prerequisite visible without graph scrolling or overlap; purchase, keyboard and controller passed.`);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
