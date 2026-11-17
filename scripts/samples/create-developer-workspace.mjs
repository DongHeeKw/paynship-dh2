import { openDeveloperWorkspace } from '../../features/workspace/core/sqlite-store.mjs';

if (process.argv.length > 2) {
  console.error('No arguments accepted. This command only initializes its marked local sample database.');
  process.exitCode = 1;
} else {
  let store;
  try {
    store = openDeveloperWorkspace();
    const data = store.getWorkspace();
    console.log(JSON.stringify({ sampleOnly: true, databasePath: store.databasePath, customers: data.customers.length,
      requestsPerCustomer: data.requests.length, fixtureVersion: data.fixtureVersion, existingChangesPreserved: true, productionDatabaseAccessed: false }, null, 2));
  } catch {
    console.error('Local sample initialization failed. Check the sample marker, original sample key and local file permissions. Existing data was not reset.');
    process.exitCode = 1;
  } finally { store?.close(); }
}
