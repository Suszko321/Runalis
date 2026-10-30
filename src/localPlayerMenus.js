// Each local player gets an isolated menu document/focus state, backed by the
// live actor. No second game, input poller, simulation, or save store is started.
export function createLocalPlayerMenus(game) {
  const sessions=new Map();
  const eligible=actor=>{const members=[game.player,...(game.player.coop?.players||[])].filter(p=>p&&p.active!==false&&!p.networkRemote);return !game.onlineSession?.role&&!actor?.networkRemote&&members.length>1&&members.includes(actor);};
  const close=actor=>{const s=sessions.get(actor);if(!s)return; sessions.delete(actor);s.frame.remove();if(!sessions.size)game.canvas?.focus?.();};
  function sync(){
    for(const [actor,s]of sessions){
      if(!game.started||!eligible(actor)||actor.active===false||s.world!==game.world||actor.hp<=0){close(actor);continue;}
      const r=game.canvas.getBoundingClientRect(),v=game.getMenuViewportForActor(actor);
      Object.assign(s.frame.style,{left:`${r.left+v.x*r.width/game.canvas.width}px`,top:`${r.top+v.y*r.height/game.canvas.height}px`,width:`${v.width*r.width/game.canvas.width}px`,height:`${v.height*r.height/game.canvas.height}px`,visibility:game.paused?'hidden':'visible'});
      if(s.ui&&!s.frame.contentDocument.querySelector('.panel.open'))close(actor);
    }
  }
  function open(actor){
    if(!eligible(actor))return false;
    if(sessions.has(actor))return true;
    const frame=document.createElement('iframe'),s={frame,world:game.world};sessions.set(actor,s);
    frame.className='local-player-menu';frame.dataset.ownerSlot=actor.slot||1;frame.title=`Player ${actor.slot||1} menu`;
    Object.assign(frame.style,{position:'fixed',border:'0',zIndex:'150',background:'#151411',boxSizing:'border-box'});
    const links=[...document.querySelectorAll('link[rel="stylesheet"]')].map(l=>`<link rel="stylesheet" href="${l.href}">`).join('');
    const release=document.querySelector('meta[name="runalis-release"]')?.content;
    const styleUrl=name=>{const url=new URL(name,document.baseURI);if(release&&release!=='development')url.search=`?v=${release}`;return url.href;};
    frame.srcdoc=`<!doctype html><html><head><base href="${document.baseURI}">${links}<link rel="stylesheet" href="${styleUrl('fullscreen-menus.css')}"><link rel="stylesheet" href="${styleUrl('local-player-menus.css')}"></head><body class="local-menu-document"><div id="mainMenu"></div><div id="app" class="screen active"><main class="game-shell"><canvas id="menuCanvas" hidden></canvas><aside class="panel"><div class="tabs"><button class="tab" data-tab="inventory">Inventory</button><button class="tab" data-tab="skills">Skills & Abilities</button><button class="tab" data-tab="character">Character</button><button class="tab" data-tab="quests">Quests</button><button class="tab" data-tab="map">Map</button><button class="tab" data-tab="log">Log</button></div>${['character','skills','inventory','quests','map','log'].map(id=>`<div id="${id}" class="tab-panel"></div>`).join('')}</aside></main></div><header id="localMenuHeader"><b>Player ${actor.slot||1}</b><button id="localMenuSections">Sections</button><button id="localMenuClose">Return to game ×</button></header><footer id="localMenuFooter">D-pad: navigate · A: select · B: close · LB/RB: tabs</footer></body></html>`;
    frame.onload=()=>{
      if(!sessions.has(actor))return;
      const w=frame.contentWindow,d=frame.contentDocument,script=d.createElement('script');script.type='module';
      const url=new URL('../src/ui.js',import.meta.url);const release=document.querySelector('meta[name="runalis-release"]')?.content;if(release&&release!=='development')url.search=`?v=${release}`;
      script.textContent=`import * as ui from ${JSON.stringify(url.href)};window.localMenuUI=ui;window.dispatchEvent(new Event('runalis-menu-ready'));`;
      script.onload=()=>{
        if(sessions.get(actor)!==s||s.ui)return;
        const view=Object.assign(Object.create(game.getActorGameView(actor)),{localMenuFrame:true,uiMenuView:null,uiState:null,uiControllerState:null,uiSkillTreeControllerState:null,onlineSession:null,player:actor,hostGame:game,log:game.log,logLines:game.logLines,keys:new Set(),input:{},canvas:d.getElementById('menuCanvas'),primaryControllerActive:true,save:()=>actor===game.player?game.save(false):game.getActorGameView(actor).save(false),shake:()=>{}});
        Object.defineProperty(view,'world',{get:()=>game.world,set:world=>{game.world=world;}});
        s.view=view;s.ui=w.localMenuUI;
        s.ui.initUI(view);s.ui.renderUI(actor,game.logLines,view);s.ui.toggleGameMenuChooser(view);
        d.getElementById('localMenuClose').onclick=()=>close(actor);
        d.getElementById('localMenuSections').onclick=()=>{if(!d.querySelector('.panel.menu-chooser'))s.ui.toggleGameMenuChooser(view);};
        const label=d.getElementById('localMenuHeader').querySelector('b');label.textContent=`P${actor.slot||1} · ${actor.name||'Player'}`;
        for(const type of ['keydown','keyup'])d.addEventListener(type,e=>{
          if(actor!==game.player){e.preventDefault();window.dispatchEvent(new KeyboardEvent(type,{key:e.key,code:e.code,repeat:e.repeat,ctrlKey:e.ctrlKey,shiftKey:e.shiftKey}));return;}
          if(type==='keyup'){window.dispatchEvent(new KeyboardEvent(type,{key:e.key,code:e.code}));return;}
          if(e.target.matches('input,textarea,select'))return;
          const key=e.key.toLowerCase();if(['tab','escape'].includes(key)){e.preventDefault();close(actor);return;}
          const action={arrowup:'upPressed',arrowdown:'downPressed',arrowleft:'leftPressed',arrowright:'rightPressed',enter:'confirmPressed',' ':'confirmPressed'}[key];
          if(action){e.preventDefault();s.ui.handleGameUiControllerInput(view,{connected:true,[action]:true});}
        });
      };
      w.addEventListener('runalis-menu-ready',()=>script.onload(),{once:true});
      script.onerror=()=>{game.log?.('Could not open the player menu. Please try again.');close(actor);};d.head.append(script);
    };
    document.body.append(frame);sync();return true;
  }
  return {eligible,open,close,sync,hasOpen:()=>sessions.size>0,isBusy:actor=>sessions.has(actor),destroy(){for(const actor of [...sessions.keys()])close(actor);},toggle(actor){if(sessions.has(actor))close(actor);else return open(actor);return true;},handleInput(input,actor){
    if(!actor||game.paused||!eligible(actor))return false;
    const s=sessions.get(actor);
    if(s){
      // Idle gamepads must not repeatedly focus a row under a mouse click,
      // rebuilding the selected item's action buttons before click completes.
      const action=Object.entries(input).some(([key,value])=>value===true&&/(Pressed|Released|Held)$/.test(key));
      if(s.ui&&action)s.ui.handleGameUiControllerInput(s.view,input);
      input.menuConsumed=true;sync();return true;
    }
    if(!game.paused&&(input.backPressed||(actor!==game.player&&input.pausePressed))){open(actor);input.menuConsumed=true;return true;}return false;
  }};
}
