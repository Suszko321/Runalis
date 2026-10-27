import {checkStartupRelease} from './releaseUpdates.js';

// Check before importing the game, so a cached entry page cannot start an old
// module graph while a new release is being loaded.
if (!await checkStartupRelease()) await import('./main.js');
