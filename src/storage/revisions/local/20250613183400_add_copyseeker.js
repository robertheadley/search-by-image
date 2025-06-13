const message = 'Add CopySeeker';

const revision = '20250613183400_add_copyseeker';

async function upgrade() {
  const changes = {};
  const {engines, disabledEngines} = await browser.storage.local.get([
    'engines',
    'disabledEngines'
  ]);
  const newEngine = 'copyseeker';

  const enabledEngineCount = engines.length - disabledEngines.length;

  // Add CopySeeker after Hive (similar plagiarism/reverse search engine)
  const hiveIndex = engines.indexOf('hive');
  if (hiveIndex !== -1) {
    engines.splice(hiveIndex + 1, 0, newEngine);
  } else {
    // Fallback: add at end if Hive not found
    engines.push(newEngine);
  }
  changes.engines = engines;

  // Disable by default if user has too many engines enabled
  if (enabledEngineCount >= 8) {
    disabledEngines.push(newEngine);
  }
  changes.disabledEngines = disabledEngines;

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};