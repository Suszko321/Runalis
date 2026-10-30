// This small classic script can report a failed module download even when none
// of the game's modules load. It never reads or writes player storage.
(() => {
  const status = document.getElementById('startupStatus');
  const message = status.querySelector('[data-startup-message]');
  const retry = status.querySelector('[data-startup-retry]');
  const menu = document.getElementById('mainMenu');
  let settled = false;
  retry.onclick = () => {
    // A rejected module import is cached for the document's lifetime. Start a
    // fresh document rather than retrying the same rejected module instance.
    const url = new URL(location.href);
    url.searchParams.set('_runalis_retry', String(Date.now()));
    location.replace(url.href);
  };
  const timer = setTimeout(() => {
    if (settled) return;
    message.textContent = 'Loading is taking longer than expected. The menu is not ready yet. Check your connection or retry.';
    retry.hidden = false;
  }, 15000);
  const url = new URL('boot.js', document.currentScript.src);
  const release = document.querySelector('meta[name="runalis-release"]')?.content;
  if (release && release !== 'development') url.searchParams.set('v', release);
  import(url.href).then(() => {
    settled = true;
    clearTimeout(timer);
    // A startup release redirect leaves this document; only unlock a booted menu.
    if (!menu.querySelector('#createProfileBtn').onclick) return;
    status.remove();
    const address = new URL(location.href);
    if (address.searchParams.has('_runalis_retry')) {
      address.searchParams.delete('_runalis_retry');
      history.replaceState(history.state, '', address.href);
    }
  }).catch(error => {
    settled = true;
    clearTimeout(timer);
    console.error('Runalis startup failed:', error);
    status.querySelector('strong').textContent = 'Runalis could not finish loading';
    message.textContent = 'A game download or startup step failed. This does not mean your saved profiles were deleted. Check your connection, then retry loading.';
    retry.hidden = false;
  });
})();
