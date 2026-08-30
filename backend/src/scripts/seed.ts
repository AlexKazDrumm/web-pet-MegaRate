import { AppDataSource } from '../data-source.js';
import { Movie } from '../entity/Movie.js';

try {
  await AppDataSource.initialize();
  const repository = AppDataSource.getRepository(Movie);
  if (await repository.count() === 0) {
    await repository.save(repository.create([
      { title: 'The Matrix', kind: 'film', status: 'watched', year: 1999, personal_rating: 9 },
      { title: 'Arcane', kind: 'anime_series', status: 'watchlist', year: 2021, personal_rating: null },
    ]));
    console.log('Demo catalog created');
  }
  await AppDataSource.destroy();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
