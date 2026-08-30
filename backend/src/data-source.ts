import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { fileURLToPath } from 'node:url';
import { Movie } from './entity/Movie.js';

const filePath = fileURLToPath(import.meta.url);
const root = filePath.endsWith('.ts') ? 'src' : 'dist';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url : process.env.DATABASE_URL,
  logging: false,
  synchronize: false,
  entities: [Movie],
  migrations: [`${root}/migration/*.{ts,js}`],
});
