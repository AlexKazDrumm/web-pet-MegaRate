import type { MovieKind, MovieStatus } from '../entity/Movie.js';
import type { SourceName } from './urlPolicy.js';
import { assertSourceUrl } from './urlPolicy.js';
import { InputError } from './errors.js';

const KINDS: MovieKind[] = ['film', 'cartoon', 'series', 'cartoon_series', 'show', 'anime', 'anime_series'];
const STATUSES: MovieStatus[] = ['watched', 'watchlist'];
export interface MovieInput {
  title: string; kind: MovieKind; status: MovieStatus; year: number | null;
  description: string | null; cover_url: string | null; personal_rating: number | null;
  imdb_url: string | null; kp_url: string | null; ms_url: string | null;
  rt_url: string | null; mc_url: string | null; wa_url: string | null;
}
const SOURCE_FIELDS: Array<[keyof MovieInput, SourceName]> = [
  ['imdb_url', 'imdb'], ['kp_url', 'kinopoisk'], ['ms_url', 'myshows'],
  ['rt_url', 'rottentomatoes'], ['mc_url', 'metacritic'], ['wa_url', 'worldart'],
];
function optionalText(value: unknown, maxLength: number): string | null {
  if (value == null || value === '') return null;
  const result = String(value).trim();
  if (result.length > maxLength) throw new InputError(`Text exceeds ${maxLength} characters`);
  return result || null;
}
function optionalNumber(value: unknown, min: number, max: number): number | null {
  if (value == null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new InputError(`Number must be between ${min} and ${max}`);
  return number;
}
export function parseMovieInput(body: unknown, partial = false): Partial<MovieInput> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('JSON object expected');
  const source = body as Record<string, unknown>;
  const result: Partial<MovieInput> = {};
  if (!partial || 'title' in source) {
    const title = String(source.title ?? '').trim();
    if (!title || title.length > 255) throw new InputError('Title must contain 1–255 characters');
    result.title = title;
  }
  if (!partial || 'kind' in source) {
    if (!KINDS.includes(source.kind as MovieKind)) throw new InputError('Unknown movie kind');
    result.kind = source.kind as MovieKind;
  }
  if (!partial || 'status' in source) {
    if (!STATUSES.includes(source.status as MovieStatus)) throw new InputError('Unknown movie status');
    result.status = source.status as MovieStatus;
  }
  if (!partial || 'year' in source) result.year = optionalNumber(source.year, 1888, 2100);
  if (!partial || 'description' in source) result.description = optionalText(source.description, 20_000);
  if (!partial || 'cover_url' in source) {
    const cover = optionalText(source.cover_url ?? source.cover, 2_048);
    if (cover) {
      let parsed: URL;
      try { parsed = new URL(cover); } catch { throw new InputError('Invalid cover URL'); }
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new InputError('Invalid cover URL');
    }
    result.cover_url = cover;
  }
  if (!partial || 'personal_rating' in source) result.personal_rating = optionalNumber(source.personal_rating, 0, 10);
  for (const [field, sourceName] of SOURCE_FIELDS) {
    if (partial && !(field in source)) continue;
    const value = optionalText(source[field], 2_048);
    if (value) assertSourceUrl(value, sourceName);
    (result as Record<string, unknown>)[field] = value;
  }
  return result;
}
