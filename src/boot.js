import {checkStartupRelease} from './releaseUpdates.js';
import {initHomeScreenPrompt} from './homeScreenPrompt.js';

// Check before importing the game, so a cached entry page cannot start an old
// module graph while a new release is being loaded.
if (!await checkStartupRelease()) {
  initHomeScreenPrompt();
  await import('./main.js');
}
