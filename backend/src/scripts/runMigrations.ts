import { AppDataSource } from '../data-source.js';

try {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  await AppDataSource.destroy();
  console.log('Database migrations completed');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
