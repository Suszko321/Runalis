const releasePattern=/^[a-f0-9]{16}$/;
const release=()=>document.querySelector('meta[name="runalis-release"]')?.content;

async function latestRelease(){
  const url=new URL('release.json',document.baseURI);
  url.searchParams.set('check',Date.now()+'-'+Math.random().toString(36).slice(2));
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3000);
  try{
    const response=await fetch(url,{cache:'no-store',signal:controller.signal});
    if(!response.ok)return null;
    const value=await response.json();
    return typeof value.release==='string'&&releasePattern.test(value.release)?value.release:null;
  }catch{return null;}finally{clearTimeout(timer);}
}

function loadRelease(latest){
  const url=new URL(location.href);
  // A deployment edge may briefly serve old HTML even at the fresh address.
  // Never keep navigating in that case; let the current game remain usable.
  const attemptedAt=Number(url.searchParams.get('_runalis_checked'))||0;
  if(url.searchParams.get('_runalis_release')===latest&&Date.now()-attemptedAt<60000)return false;
  url.searchParams.set('_runalis_release',latest);
  url.searchParams.set('_runalis_checked',String(Date.now()));
  location.replace(url.href);
  return true;
}

export async function checkStartupRelease(){
  const current=release();
  if(!releasePattern.test(current||''))return false; // Local development.
  const latest=await latestRelease();
  if(latest&&latest!==current)return loadRelease(latest);
  const url=new URL(location.href);
  if(url.searchParams.has('_runalis_release')&&(latest===current||url.searchParams.get('_runalis_release')===current)){
    url.searchParams.delete('_runalis_release');
    url.searchParams.delete('_runalis_checked');
    history.replaceState(history.state,'',url.href);
  }
  return false;
}

export function installReleaseUpdates(getGame){
  const current=release();
  if(!releasePattern.test(current||''))return ()=>{};
  let checking=false,stopped=false,banner=null,pending=null,dismissed=null;
  function offerUpdate(latest){
    if(banner||dismissed===latest)return;
    banner=document.createElement('aside');banner.id='releaseUpdateNotice';banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');
    const message=document.createElement('span'),update=document.createElement('button'),later=document.createElement('button');
    const game=getGame(),role=game?.onlineSession?.role;
    message.textContent=role==='host'?'Update ready. Updating will save and close your multiplayer world.':role==='guest'?'Update ready. Updating will save your character and leave multiplayer.':'A game update is ready. Save and update when you are ready.';
    update.textContent='Save & update';later.textContent='Later';update.type=later.type='button';
    update.onclick=()=>{
      const active=getGame();
      if(document.querySelector('#characterCreatorOverlay.active')){message.textContent='Finish character customization before updating.';return;}
      if(active&&!active.destroyed){
        try{if(active.save(false)!==true){message.textContent='Could not save. Your game is still open; finish any activity that blocks saving, or free browser storage, then try again.';return;}}
        catch{message.textContent='Could not save. Your game is still open. Please try saving again before updating.';return;}
        active.onlineSession?.disconnect();
      }
      if(!loadRelease(pending||latest))message.textContent='The update is still reaching this server. Please try again shortly.';
    };
    later.onclick=()=>{dismissed=latest;banner.remove();banner=null;};
    banner.append(message,update,later);document.body.append(banner);
  }
  async function check(){
    if(stopped||checking||document.visibilityState==='hidden')return;
    checking=true;
    try{
      const latest=await latestRelease();
      if(stopped)return;
      if(latest&&latest!==current)pending=latest;
      if(!pending)return;
      const game=getGame();
      if(!game||game.destroyed){if(!document.querySelector('#characterCreatorOverlay.active'))loadRelease(pending);}
      else offerUpdate(pending);
    }finally{checking=false;}
  }
  const events=['focus','pageshow','online'];
  for(const event of events)addEventListener(event,check);
  document.addEventListener('visibilitychange',check);
  const timer=setInterval(check,60000);
  return ()=>{stopped=true;clearInterval(timer);for(const event of events)removeEventListener(event,check);document.removeEventListener('visibilitychange',check);banner?.remove();};
}
