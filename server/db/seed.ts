import { migrateDatabase, seedDatabase } from './migrations';

(async () => {
  await migrateDatabase();
  await seedDatabase();
})();
