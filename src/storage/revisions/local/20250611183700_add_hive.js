const message = 'Add Hive';

const revision = '20250611183700_add_hive';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngine = 'hive';

  const enabledEngineCount = engines.length - disabledEngines.length;

  // Add hive after unsplash (near the end of the list)
  const unsplashIndex = engines.indexOf('unsplash');
  if (unsplashIndex !== -1) {
    engines.splice(unsplashIndex + 1, 0, newEngine);
  } else {
    // Fallback: add at the end if unsplash not found
    engines.push(newEngine);
  }
  changes.engines = engines;

  // Disable the new engine by default if user has more than 8 enabled engines
  if (enabledEngineCount >= 8) {
    disabledEngines.push(newEngine);
  }
  changes.disabledEngines = disabledEngines;

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};