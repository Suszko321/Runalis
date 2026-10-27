import {worldMemory,travelByStone,travelAvailability,worldEntityMemoryKey,worldEntityMemoryId} from './worldExploration.js';
import {TILE} from './data.js';
import {workshopMapMarkers,workshopIconMarkup} from './workshopArt.js';
import {getSurvey,renderSurveyArt,revealSurvey,surveyKey} from './mapSurvey.js';
// panelWorldMap.js
// Authored geography with discovered locations and Nav Stone destinations.

import { ACT1_WORLD_MAP } from './worldMapData.js';
import { enterCapitalHub } from './hubSystem.js';
import { addStatusText } from './floatingText.js';
import {bindMapControllerCursor} from './mapControllerCursor.js';

const MAP_RETURN_HOLD_SECONDS = 1;

export function renderWorldMap(player, game) {
  const el = document.getElementById('map');
  if (!el) return;
  // HUD refreshes also call renderUI. Do no survey or DOM work for a closed map.
  if(game.uiState?.activeMainTab!=='map')return;

  const memory=worldMemory((game.hostGame||game).player);
  const continent=game.world.continentId==='runalis',frontier=continent||game.world.regionId==='hearthmereFrontier';
  const bounds={width:game.world.width||120,height:game.world.height||64};
  const known=frontier?ACT1_WORLD_MAP.markers.filter(marker=>memory.locations['map:'+marker.id]||player.discoveredLocations?.[marker.id]||player.discoveredLocations?.[marker.sourcePoiId]).map(marker=>marker.id==='frontierRoadGate'?{...marker,description:'An escorted expedition service at Orrakai’s north gate. The physical roads can also be explored on foot.'}:marker):[];
  known.push(...(game.world.authoredLocations||[]).filter(s=>memory.locations[`${worldEntityMemoryKey(game.world,s)}:${worldEntityMemoryId(s)}`]&&!known.some(k=>k.id===s.id)).map(s=>({...s,x:s.x/TILE,y:s.y/TILE,icon:'●'})));
  // Dungeon identities discovered in later acts remain useful even after the
  // player returns west. Unvisited global catalogue entries stay off the map.
  if(continent)for(const place of game.world.continentLocations||[]){
    const identity=place.poiId||place.dungeonId||place.id;
    if(!['dungeonEntrance','sideZoneEntrance','towerEntrance','capitalGate','travelRouteEntrance'].includes(place.kind)||!player.discoveredLocations?.[identity]||known.some(k=>k.id===identity||k.sourcePoiId===identity))continue;
    known.push({...place,id:identity,x:place.x/TILE,y:place.y/TILE,type:place.kind==='capitalGate'?'gate':'dungeon',icon:place.kind==='capitalGate'?'GT':'DG'});
  }
  const stones=(game.world.navStones||[]).filter(s=>memory.stones[s.id]);
  known.push(...workshopMapMarkers(game.world));
  const survey=getSurvey(memory,game.world,[...known,...stones.map(s=>({x:s.x/TILE,y:s.y/TILE}))]);
  revealSurvey(memory,game.world,[player]);
  const selected=stones.find(s=>s.id===game.mapSelectedStone)||stones[0];
  game.mapSelectedStone=selected?.id||null;
  game.navStoneFocus=Math.max(0,stones.indexOf(selected));
  const position=mapPointToPercent(player.x/TILE,player.y/TILE,bounds);
  const renderKey=JSON.stringify([survey.revision||0,position,known.map(s=>s.id),stones.map(s=>s.id),selected?.id,selected?travelAvailability(game,selected.id).reason:null,getMapReturnAvailability(game).reason]);
  if(el.surveyWorld===game.world&&el.surveyPlayer===player&&el.surveyRenderKey===renderKey&&el.querySelector('[data-world-map]'))return;
  el.surveyWorld=game.world;el.surveyPlayer=player;el.surveyRenderKey=renderKey;
  el.surveyResizeObserver?.disconnect();
  el.innerHTML = `
    <style>
      #map .survey-surface .survey-stone,
      #map .survey-surface .world-map-static-marker { transform:translate(-50%,-50%) scale(var(--survey-inverse-zoom,1)) !important; transform-origin:center; }
      #map .survey-surface .survey-player { transform:translate(-50%,-50%) scale(var(--survey-inverse-zoom,1)) !important; transform-origin:center; }
      html body #map .survey-surface button.survey-stone { width:22px!important; height:26px!important; min-width:0!important; min-height:0!important; padding:0!important; border:0!important; border-radius:0!important; background:transparent!important; box-shadow:none!important; outline:none!important; clip-path:none!important; }
      html body #map .survey-surface button.survey-stone::before,html body #map .survey-surface button.survey-stone::after { content:none!important; }
      html body #map .survey-surface button.survey-stone img { width:14px!important; height:20px!important; filter:drop-shadow(0 1px 1px #000); }
      html body #map .survey-surface button.survey-stone.selected img,html body #map .survey-surface button.survey-stone.cursor-hovered img { filter:brightness(1.5) drop-shadow(0 0 2px #e5c77c); }
      html body #map .survey-surface button.survey-stone span { display:none; top:25px; background:transparent!important; padding:0!important; color:#f3e5c8; text-shadow:0 1px 2px #000,1px 0 2px #000,-1px 0 2px #000; }
      html body #map .survey-surface button.survey-stone:hover span,html body #map .survey-surface button.survey-stone:focus-visible span { display:block; }
      .survey-controller-cursor { position:absolute; z-index:20; width:22px; height:22px; transform:translate(-50%,-50%); border:1px solid #f0dfb2; border-radius:50%; box-shadow:0 0 2px #000; pointer-events:none; }
      .survey-controller-cursor[hidden] { display:none!important; }
      .survey-controller-cursor::before,.survey-controller-cursor::after { content:''; position:absolute; background:#f0dfb2; box-shadow:0 0 2px #000; }
      .survey-controller-cursor::before { width:30px; height:1px; left:-5px; top:10px; }
      .survey-controller-cursor::after { height:30px; width:1px; top:-5px; left:10px; }
      .survey-controller-cursor.over-stone { border-color:#fff4d6; }
      .survey-controller-cursor span { position:absolute; top:29px; left:50%; transform:translateX(-50%); white-space:nowrap; color:#fff0ce; font:12px Georgia; text-shadow:0 1px 3px #000,1px 0 2px #000,-1px 0 2px #000; }
    </style>
    <div class="world-map-shell static survey-map" data-world-map>
      <div class="world-map-header">
        <div>
          <span>${continent?'Continental survey':'Regional survey'}</span>
          <h2>${escapeHtml(continent?'Runalis':frontier?ACT1_WORLD_MAP.displayName:game.world.name)}</h2>
          <p>Explore on foot to reveal places and attune NavStones for fast travel.</p>
        </div>
        <div class="world-map-toggle-copy">
          ${renderReturnControl(game)}
        </div>
      </div>

      <div class="world-map-layout static">
        <div class="world-map-stage static" data-world-map-stage>
          <div class="survey-viewport"><div class="survey-surface" style="aspect-ratio:${bounds.width}/${bounds.height}">
          ${renderSurveyArt(game.world,survey)}
          <div class="world-map-marker-layer static">
            ${known.map(s=>renderStaticMapMarker(s,bounds)).join('')}
            ${stones.map(s=>{const pos=mapPointToPercent(s.x/TILE,s.y/TILE,bounds);return `<button tabindex="-1" class="survey-stone ${s.id===selected?.id?'selected':''}" data-select-stone="${escapeHtml(s.id)}" style="left:${pos.left}%;top:${pos.top}%" aria-label="Select NavStone: ${escapeHtml(s.name)}" title="${escapeHtml(s.name)}"><img src="assets/ui/nav-stone.svg" alt=""/><span>${escapeHtml(s.name)}</span></button>`;}).join('')}
            <div class="survey-player" style="left:${position.left}%;top:${position.top}%" role="img" aria-label="Your position" title="You are here">▲</div>
          </div>
          </div><div class="survey-controller-cursor" hidden aria-hidden="true"><span></span></div></div>
          <div class="survey-tools" aria-label="Map controls"><button data-map-zoom="out" aria-label="Zoom out">−</button><button data-map-zoom="reset">Fit map</button>${continent?'<button data-map-zoom="nearby">Nearby</button>':''}<button data-map-zoom="in" aria-label="Zoom in">+</button><span>Sticks: cursor · LT/RT: zoom · Scroll / drag</span></div>
          <div class="survey-legend"><span>▲ You</span><span>◇ NavStone</span><span>● Discovered place</span><span class="fog-key">▧ Unexplored</span></div>
        </div>
        <aside class="survey-sidebar" aria-label="Discovered destinations">
          <h3>NavStone travel</h3><p>Either stick: move cursor · LT/RT: zoom · A: select, then travel. D-pad Up/Down: destination list.</p>
          <div class="survey-stone-list">${stones.map(s=>`<button type="button" data-select-stone="${escapeHtml(s.id)}" class="${s.id===selected?.id?'selected':''}" aria-pressed="${s.id===selected?.id}"><img src="assets/ui/nav-stone.svg" alt=""/>${escapeHtml(s.name)}</button>`).join('')||'<p>No NavStones discovered yet. Approach one to attune it.</p>'}</div>
          <div class="survey-travel-detail" aria-live="polite">${renderStoneDetail(game,selected)}</div>
          <details class="survey-index"><summary>Discovered places · ${known.length}</summary>${known.map(s=>`<button data-map-place="${escapeHtml(s.id)}" title="${escapeHtml(s.description||s.lore||s.name)}">${escapeHtml(s.name)}</button>`).join('')||'<p>Explore to discover landmarks.</p>'}</details>
          <details class="survey-index"><summary>Discovered biomes · ${Object.keys(survey.biomes).length}</summary>${Object.values(survey.biomes).map(b=>`<p>${escapeHtml(b.name)}</p>`).join('')}</details>
        </aside>
      </div>

      <div class="world-map-static-footer">
        <span><b>Gold roads</b> mark main travel routes.</span>
        <span><b>Blue waterways</b> show rivers, lakes, and mire channels.</span>
        <span><b>Dark forest</b> and <b>stone edges</b> mark terrain barriers.</span>
      </div>
    </div>
  `;
  el.querySelector('[data-map-return]').onclick=()=>completeMapReturn(game);
  const bindTravel=()=>el.querySelectorAll('[data-nav-stone]').forEach(button=>button.onclick=()=>{
    attemptMapTravel(game,button.dataset.navStone);
  });
  const selectStone=(id,centerView=true)=>{
    if(game.mapSelectedStone===id&&el.querySelector('.survey-travel-detail [data-nav-stone]')?.dataset.navStone===id)return;
    game.mapSelectedStone=id;
    game.navStoneFocus=Math.max(0,stones.findIndex(s=>s.id===id));
    el.querySelectorAll('[data-select-stone]').forEach(b=>{const active=b.dataset.selectStone===id;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
    el.querySelector('.survey-travel-detail').innerHTML=renderStoneDetail(game,stones.find(s=>s.id===id));bindTravel();
    if(centerView)el.dispatchEvent(new CustomEvent('survey-select-stone',{detail:stones.find(s=>s.id===id)}));
  };
  el.surveySelectStone=selectStone;
  el.querySelectorAll('[data-select-stone]').forEach(button=>{
    button.onclick=()=>selectStone(button.dataset.selectStone);
    if(button.closest('.survey-stone-list'))button.onfocus=()=>selectStone(button.dataset.selectStone);
  });
  bindTravel();bindSurveyNavigation(el,known,bounds,game.world,player);
  if(isWorldMapPanelActive(game)&&!el.surveyCursor?.active)focusMapStone(game,el.querySelector('.survey-stone-list .selected'));
}

function renderStoneDetail(game,stone){
  if(!stone)return '<p>Travel unlocks as you discover NavStones.</p>';
  const status=travelAvailability(game,stone.id);
  return `<h4>${escapeHtml(stone.name)}</h4><p>1 field ration · 2 minutes · Whole party</p><p class="survey-travel-status">${escapeHtml(status.ok?'Ready to travel.':status.reason)}</p><button type="button" data-nav-stone="${escapeHtml(stone.id)}" ${status.ok?'':'disabled'}>Travel to ${escapeHtml(stone.name)}</button>`;
}

function attemptMapTravel(game,id){
  if(travelByStone(game,id)){closeMapPanel(game);game.renderOwnedUI?.();return true;}
  const el=document.getElementById('map'),stone=game.world.navStones?.find(s=>s.id===id);
  const detail=el?.querySelector('.survey-travel-detail');
  if(detail){
    detail.innerHTML=renderStoneDetail(game,stone);
    const status=detail.querySelector('.survey-travel-status');
    status?.classList.add('travel-blocked');status?.setAttribute('role','alert');
    const button=detail.querySelector('[data-nav-stone]');
    if(button)button.onclick=()=>attemptMapTravel(game,id);
  }
  return false;
}

function bindSurveyNavigation(el,known,bounds,world,player){
  const viewport=el.querySelector('.survey-viewport'),surface=el.querySelector('.survey-surface');
  const key=surveyKey(world),continental=world.continentId==='runalis',maxZoom=continental?18:5;
  const remembered=el.surveyView?.key===key?el.surveyView:null;
  let zoom=remembered?.zoom||(continental?4:2.5),x=0,y=0,drag=null,cursorController;
  const fit=()=>{surface.style.width=`${Math.min(viewport.clientWidth,viewport.clientHeight*bounds.width/bounds.height)}px`;};
  const apply=()=>{const maxX=zoom>1?zoom*surface.offsetWidth/2:0,maxY=zoom>1?zoom*surface.offsetHeight/2:0;x=clamp(x,-maxX,maxX);y=clamp(y,-maxY,maxY);surface.style.transform=`translate(${x}px,${y}px) scale(${zoom})`;surface.style.setProperty('--survey-inverse-zoom',1/zoom);el.surveyView={key,zoom,panX:x/(surface.offsetWidth||1),panY:y/(surface.offsetHeight||1)};cursorController?.refresh();};
  const zoomAt=(factor,anchor={x:viewport.clientWidth/2,y:viewport.clientHeight/2})=>{
    const before=zoom;zoom=clamp(zoom*factor,1,maxZoom);
    if(zoom===before)return;
    const ax=anchor.x-viewport.clientWidth/2,ay=anchor.y-viewport.clientHeight/2;
    x=ax-(ax-x)*zoom/before;y=ay-(ay-y)*zoom/before;apply();
  };
  const center=(tx,ty)=>{x=(.5-tx/bounds.width)*surface.offsetWidth*zoom;y=(.5-ty/bounds.height)*surface.offsetHeight*zoom;apply();};
  fit();
  if(remembered){x=remembered.panX*surface.offsetWidth;y=remembered.panY*surface.offsetHeight;apply();}
  else center(player.x/TILE,player.y/TILE);
  const observer=new ResizeObserver(()=>{if(!el.contains(surface)){observer.disconnect();return;}const saved=el.surveyView;fit();x=saved.panX*surface.offsetWidth;y=saved.panY*surface.offsetHeight;apply();});observer.observe(viewport);
  el.surveyResizeObserver=observer;
  el.querySelectorAll('[data-map-zoom]').forEach(b=>b.onclick=()=>{
    const action=b.dataset.mapZoom;
    if(action==='nearby'){zoom=clamp(bounds.width/240,1,maxZoom);center(player.x/TILE,player.y/TILE);return;}
    const before=zoom;zoom=action==='reset'?1:clamp(zoom*(action==='in'?1.4:1/1.4),1,maxZoom);
    if(zoom===1)x=y=0;else{x*=zoom/before;y*=zoom/before;}apply();
  });
  if(el.surveyStoneHandler)el.removeEventListener('survey-select-stone',el.surveyStoneHandler);
  el.surveyStoneHandler=e=>{const stone=e.detail;if(!stone||zoom===1)return;center(stone.x/TILE,stone.y/TILE);};
  el.addEventListener('survey-select-stone',el.surveyStoneHandler);
  viewport.onwheel=e=>{e.preventDefault();cursorController.hide();const rect=viewport.getBoundingClientRect();zoomAt(e.deltaY<0?1.15:1/1.15,{x:e.clientX-rect.left,y:e.clientY-rect.top});};
  viewport.onpointerdown=e=>{cursorController.hide();if(e.target.closest('button'))return;drag={x:e.clientX,y:e.clientY,ox:x,oy:y};viewport.setPointerCapture(e.pointerId);};
  viewport.onpointermove=e=>{if(e.movementX||e.movementY)cursorController.hide();if(!drag)return;x=drag.ox+e.clientX-drag.x;y=drag.oy+e.clientY-drag.y;apply();};
  viewport.onpointerup=viewport.onpointercancel=()=>{drag=null;};
  el.querySelectorAll('[data-map-place]').forEach(b=>b.onclick=()=>{const p=known.find(p=>p.id===b.dataset.mapPlace);if(!p)return;zoom=continental?clamp(bounds.width/240,1,maxZoom):3;center(p.x,p.y);el.querySelectorAll('.world-map-static-marker').forEach(m=>m.classList.toggle('survey-highlight',m.dataset.mapMarkerId===p.id));});
  cursorController=bindMapControllerCursor(el,viewport,key,{pan:(dx,dy)=>{x+=dx;y+=dy;apply();},zoom:zoomAt});
  el.surveyControllerCursor=cursorController;
}

export function bindWorldMapButtons() {
  // Destination handlers are bound to the freshly rendered map above.
}

export function isWorldMapPanelActive(game) {
  return !!(
    game?.uiState?.activeMainTab === 'map' &&
    document.getElementById('map')?.classList.contains('active')
  );
}

export function handleWorldMapControllerInput(game, input, elapsedSeconds) {
  if (!isWorldMapPanelActive(game)) {
    resetMapReturnHold(game);
    return false;
  }

  if (handleMapReturnHold(game, input)) {
    return true;
  }

  const el=document.getElementById('map');
  if(input?.downPressed||input?.upPressed)el.surveyControllerCursor?.hide();
  else el.surveyControllerCursor?.update(input,elapsedSeconds);
  if(el.surveyCursor?.active){
    if(input?.confirmPressed&&el.surveyCursor.hoveredId){
      const id=el.surveyCursor.hoveredId;
      if(game.mapSelectedStone!==id)el.surveySelectStone?.(id,false);
      else attemptMapTravel(game,id);
    }
    return true;
  }

  const destinations=[...document.querySelectorAll('#map .survey-stone-list [data-select-stone]')];
  if(destinations.length){
    let index=destinations.findIndex(b=>b.dataset.selectStone===game.mapSelectedStone);
    if(index<0)index=0;
    if(input?.downPressed)index=(index+1)%destinations.length;
    if(input?.upPressed)index=(index-1+destinations.length)%destinations.length;
    game.navStoneFocus=index;
    if(input?.downPressed||input?.upPressed)focusMapStone(game,destinations[index]);
    if(input?.confirmPressed){
      attemptMapTravel(game,destinations[index].dataset.selectStone);
    }
  }
  return true;

}

function focusMapStone(game,button){
  document.querySelectorAll('.game-ui-controller-focus').forEach(b=>b.classList.remove('game-ui-controller-focus'));
  if(!button)return;
  button.classList.add('game-ui-controller-focus');
  button.focus({preventScroll:true});
  button.scrollIntoView({block:'nearest',inline:'nearest'});
  game.uiControllerState && (game.uiControllerState.focusIndex=game.navStoneFocus||0);
}

function renderReturnControl(game) {
  const result = getMapReturnAvailability(game);
  const disabled = !result.allowed;

  return `
    <div class="world-map-return-control ${disabled ? 'disabled' : ''}" data-map-return-control>
      <button type="button" data-map-return ${disabled?'disabled':''}>Return to Orrakai</button>
      <span data-map-return-status>${escapeHtml(disabled ? result.reason : 'Hold Y: Return to Orrakai')}</span>
      <div class="world-map-return-meter" aria-hidden="true">
        <i data-map-return-fill style="width:0%"></i>
      </div>
    </div>
  `;
}

function handleMapReturnHold(game, input) {
  const state = getMapReturnHoldState(game);
  const held = !!(input?.yHeld || input?.ability1Held);

  if (!held) {
    resetMapReturnHold(game);
    return !!input?.yPressed;
  }

  const result = getMapReturnAvailability(game);
  if (!result.allowed) {
    resetMapReturnHold(game);
    showMapReturnStatus(result.reason, 0);
    maybeLogMapReturnBlock(game, result.reason);
    return true;
  }

  const now = performance.now();
  if (!state.startedAt) {
    state.startedAt = now;
    state.triggered = false;
  }

  const progress = Math.max(0, Math.min(1, (now - state.startedAt) / (MAP_RETURN_HOLD_SECONDS * 1000)));
  showMapReturnStatus('Returning to Orrakai...', progress);

  if (!state.triggered && progress >= 1) {
    state.triggered = true;
    completeMapReturn(game);
  }

  return true;
}

export function completeMapReturn(game) {
  const hostGame = game?.hostGame || game;
  const availability=getMapReturnAvailability(game);
  if(!availability.allowed){showMapReturnStatus(availability.reason,0);return false;}

  resetMapReturnHold(game);

  const returned = enterCapitalHub(game);
  if (!returned) {
    showMapReturnStatus('Cannot return to Orrakai from here.', 0);
    return false;
  }
  closeMapPanel(game);
  hostGame.paused=false;

  hostGame.renderOwnedUI?.();
  hostGame.log?.('Returned to Orrakai.');
  addStatusText(hostGame.player, 'Returned to Orrakai', {
    color: '#ffcc66',
    ttl: 1.25
  });
  return true;
}

export function getMapReturnAvailability(game) {
  const hostGame = game?.hostGame || game;
  const hostPlayer = hostGame?.player;
  const actor = game?.player || hostPlayer;
  const world = hostGame?.world;

  if (!hostGame || !hostPlayer || !world) {
    return blocked('Cannot return to Orrakai from here.');
  }

  if (game?.hostGame && actor !== hostPlayer) {
    return blocked('Only the host can return the party to Orrakai.');
  }

  if (world.mode === 'capital') {
    return blocked('You are already in Orrakai.');
  }

  if (hostGame.dialogue?.active) {
    return blocked('Cannot return to Orrakai right now.');
  }

  if (hostGame.loading || hostGame.transitioning || hostGame.cutscene?.active || hostGame.scriptedEncounter?.active) {
    return blocked('Cannot return to Orrakai right now.');
  }

  if (isOverlayActive()) {
    return blocked('Cannot return to Orrakai right now.');
  }

  if (Number(hostPlayer.hp || 0) <= 0) {
    return blocked('Cannot return to Orrakai while defeated.');
  }

  return { allowed: true, reason: 'Hold Y: Return to Orrakai' };
}

function isOverlayActive() {
  return [
    'characterCreatorOverlay',
    'marketShopOverlay',
    'workshopServiceOverlay',
    'fishingMiniGameOverlay',
    'couchCoopJoinOverlay',
    'loadingScreen'
  ].some(id => document.getElementById(id)?.classList.contains('active'));
}

function blocked(reason) {
  return {
    allowed: false,
    reason
  };
}

function maybeLogMapReturnBlock(game, reason) {
  const hostGame = game?.hostGame || game;
  const now = performance.now();

  hostGame.uiControllerState = hostGame.uiControllerState || {};
  if (hostGame.uiControllerState.mapReturnBlockReason === reason &&
    now - Number(hostGame.uiControllerState.mapReturnBlockAt || 0) < 900) {
    return;
  }

  hostGame.uiControllerState.mapReturnBlockReason = reason;
  hostGame.uiControllerState.mapReturnBlockAt = now;
  hostGame.log?.(reason);
}

function getMapReturnHoldState(game) {
  const hostGame = game?.hostGame || game;
  hostGame.uiControllerState = hostGame.uiControllerState || {};
  hostGame.uiControllerState.mapReturnHold = hostGame.uiControllerState.mapReturnHold || {
    startedAt: 0,
    triggered: false
  };

  return hostGame.uiControllerState.mapReturnHold;
}

function resetMapReturnHold(game) {
  const hostGame = game?.hostGame || game;
  const state = hostGame?.uiControllerState?.mapReturnHold;

  if (state) {
    state.startedAt = 0;
    state.triggered = false;
  }

  if (isWorldMapPanelActive(game)) {
    const result = getMapReturnAvailability(game);
    const control = document.querySelector('[data-map-return-control]');
    if (control) control.classList.toggle('disabled', !result.allowed);
    showMapReturnStatus(result.reason, 0);
  } else {
    showMapReturnStatus(null, 0);
  }
}

function showMapReturnStatus(text, progress = 0) {
  const control = document.querySelector('[data-map-return-control]');
  const status = document.querySelector('[data-map-return-status]');
  const fill = document.querySelector('[data-map-return-fill]');

  if (status && text) status.textContent = text;
  if (fill) fill.style.width = `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`;
  if (control) control.classList.toggle('holding', progress > 0);
}

function closeMapPanel(game) {
  const hostGame = game?.hostGame || game;
  const panelRoot = document.querySelector('.panel');

  if (game?.uiState) {
    game.uiState.activeMainTab = null;
    game.uiState.menuChooserOpen = false;
  }

  if (hostGame?.uiState && hostGame !== game) {
    hostGame.uiState.activeMainTab = null;
    hostGame.uiState.menuChooserOpen = false;
  }

  if (game?.uiControllerState) {
    game.uiControllerState.focusIndex = 0;
    game.uiControllerState.lastPanelId = null;
  }

  if (hostGame?.uiControllerState) {
    hostGame.uiControllerState.focusIndex = 0;
    hostGame.uiControllerState.lastPanelId = null;
  }

  panelRoot?.classList.remove('open', 'menu-chooser');
  if (panelRoot) panelRoot.dataset.panelClosed = 'true';

  document.querySelectorAll('.tab[data-tab]').forEach(tab => {
    tab.classList.remove('active', 'game-ui-controller-focus');
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active', 'game-ui-controller-focus');
    panel.hidden = true;
    panel.setAttribute('aria-hidden', 'true');
    panel.style.display = 'none';
    panel.style.visibility = 'hidden';
    panel.style.opacity = '0';
    panel.style.pointerEvents = 'none';
  });
}

function renderStaticMapMarker(marker,bounds=ACT1_WORLD_MAP.bounds) {
  const pos = mapPointToPercent(marker.x, marker.y,bounds);
  const label = getStaticMarkerLabel(marker);
  const classes = [
    'world-map-static-marker',
    `type-${marker.type || 'poi'}`,
    marker.major ? 'major' : 'minor',
    isDangerMarker(marker) ? 'danger' : '',
    isServiceMarker(marker) ? 'service' : ''
  ].filter(Boolean).join(' ');

  return `
    <div
      class="${classes}"
      data-map-marker-id="${escapeHtml(marker.id)}"
      style="left:${pos.left}%; top:${pos.top}%"
      title="${escapeHtml(marker.service?`${marker.name} — ${marker.description}`:marker.name)}"
      role="img" aria-label="${escapeHtml(marker.service?`${marker.name} — ${marker.description}`:marker.name)}"
    >
      <span>${marker.service?workshopIconMarkup(marker.service):marker.navStone ? '<img src="assets/ui/nav-stone.svg" width="18" height="22" alt="Nav Stone">' : escapeHtml(marker.icon || marker.name?.slice(0, 2) || '?')}</span>
      <em>${escapeHtml(label)}</em>
    </div>
  `;
}

function getStaticMarkerLabel(marker) {
  const compactLabels = {
    orrakaiWardenOutpost: 'Orrakai South Gate',
    orrakaiMarket: 'Market',
    orrakaiTrainers: 'Trainers',
    weatheredShrine: 'Shrine',
    frontierRoad: 'Frontier / Pilgrim Road',
    hunterCamp: 'Hunter Camp',
    riverbendCamp: 'Campfire',
    saltwellCamp: 'Saltwell Camp',
    lanternMarsh: 'Lantern Marsh',
    abandonedMine: 'Abandoned Mine',
    redSealKeep: 'Last Dawn Keep',
    sealworks: 'Sealworks Beneath Orrakai',
    malakarChamber: "Malakar's Chamber"
  };

  return compactLabels[marker.id] || marker.name || marker.id;
}

function isDangerMarker(marker) {
  return ['boss', 'keep'].includes(marker?.type) || marker?.tags?.some(tag => ['boss', 'demon', 'cult', 'act finale'].includes(tag));
}

function isServiceMarker(marker) {
  return ['service', 'vendor', 'fishing', 'mine', 'camp', 'shrine', 'trainer'].includes(marker?.type);
}

function mapPointToPercent(x, y,bounds=ACT1_WORLD_MAP.bounds) {
  return {
    left: clamp((Number(x || 0) / bounds.width) * 100, 0, 100),
    top: clamp((Number(y || 0) / bounds.height) * 100, 0, 100)
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

