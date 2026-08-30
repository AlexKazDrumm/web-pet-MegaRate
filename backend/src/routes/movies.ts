import { Router } from 'express';
import { AppDataSource } from '../data-source.js';
import { Movie } from '../entity/Movie.js';
import { InputError } from '../utils/errors.js';
import { parseMovieInput } from '../utils/input.js';
import { parseImdb, parseKp, parseMs, parseRt, parseMc, parseWa } from '../utils/ratingParsers.js';

export const router = Router();
function idOrThrow(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new InputError('Invalid movie id');
  return id;
}
async function fillRatings(movie: Movie): Promise<void> {
  const [imdb, kp, ms, rt, mc, wa] = await Promise.all([
    movie.imdb_url ? parseImdb(movie.imdb_url) : null,
    movie.kp_url ? parseKp(movie.kp_url) : null,
    movie.ms_url ? parseMs(movie.ms_url) : null,
    movie.rt_url ? parseRt(movie.rt_url) : null,
    movie.mc_url ? parseMc(movie.mc_url) : null,
    movie.wa_url ? parseWa(movie.wa_url) : null,
  ]);
  if (imdb) { movie.imdb_rating = imdb.rating; movie.imdb_votes = imdb.votes; }
  if (kp) { movie.kp_rating = kp.rating; movie.kp_votes = kp.votes; }
  if (ms) { movie.ms_rating = ms.rating; movie.ms_votes = ms.votes; }
  if (rt) {
    movie.rt_critics_rating = rt.criticsRating; movie.rt_critics_votes = rt.criticsVotes;
    movie.rt_audience_rating = rt.audienceRating; movie.rt_audience_votes = rt.audienceVotes;
  }
  if (mc) {
    movie.mc_rating = mc.rating; movie.mc_reviews = mc.votes;
    movie.mc_user_rating = mc.user_rating; movie.mc_user_votes = mc.user_votes;
  }
  if (wa) { movie.wa_rating = wa.rating; movie.wa_votes = wa.votes; }
}
function withAverage(movie: Movie) {
  const values = [movie.imdb_rating, movie.kp_rating, movie.ms_rating,
    movie.rt_critics_rating, movie.rt_audience_rating, movie.mc_rating,
    movie.mc_user_rating, movie.wa_rating].map(Number).filter(Number.isFinite);
  const avg_rating = values.length
    ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;
  return { ...movie, avg_rating };
}
router.get('/', async (_req, res, next) => {
  try {
    const movies = await AppDataSource.getRepository(Movie).find({ order: { id: 'DESC' } });
    res.json(movies.map(withAverage));
  } catch (error) { next(error); }
});
router.post('/refresh', async (_req, res, next) => {
  try {
    const repo = AppDataSource.getRepository(Movie); const movies = await repo.find();
    for (const movie of movies) { await fillRatings(movie); await repo.save(movie); }
    res.json({ total: movies.length, updated: movies.length });
  } catch (error) { next(error); }
});
router.post('/:id/refresh', async (req, res, next) => {
  try {
    const repo = AppDataSource.getRepository(Movie);
    const movie = await repo.findOneByOrFail({ id: idOrThrow(req.params.id) });
    await fillRatings(movie); res.json(withAverage(await repo.save(movie)));
  } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const movie = await AppDataSource.getRepository(Movie).findOneByOrFail({ id: idOrThrow(req.params.id) });
    res.json(withAverage(movie));
  } catch (error) { next(error); }
});
router.post('/', async (req, res, next) => {
  try {
    const repo = AppDataSource.getRepository(Movie);
    const movie = repo.create(parseMovieInput(req.body, false));
    await fillRatings(movie); res.status(201).json(withAverage(await repo.save(movie)));
  } catch (error) { next(error); }
});
router.patch('/:id', async (req, res, next) => {
  try {
    const repo = AppDataSource.getRepository(Movie);
    const movie = await repo.findOneByOrFail({ id: idOrThrow(req.params.id) });
    const changes = parseMovieInput(req.body, true); repo.merge(movie, changes);
    if (Object.keys(changes).some(key => key.endsWith('_url') && key !== 'cover_url')) await fillRatings(movie);
    res.json(withAverage(await repo.save(movie)));
  } catch (error) { next(error); }
});
router.delete('/:id', async (req, res, next) => {
  try {
    const repo = AppDataSource.getRepository(Movie);
    const movie = await repo.findOneByOrFail({ id: idOrThrow(req.params.id) });
    await repo.remove(movie); res.status(204).end();
  } catch (error) { next(error); }
});
