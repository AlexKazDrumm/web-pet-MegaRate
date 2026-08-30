import { InputError } from './errors.js';

export type SourceName = 'imdb' | 'myshows' | 'kinopoisk' | 'rottentomatoes' | 'metacritic' | 'worldart';
const SOURCE_HOSTS: Record<SourceName, Set<string>> = {
  imdb: new Set(['imdb.com', 'www.imdb.com']),
  myshows: new Set(['myshows.me', 'www.myshows.me']),
  kinopoisk: new Set(['kinopoisk.ru', 'www.kinopoisk.ru']),
  rottentomatoes: new Set(['rottentomatoes.com', 'www.rottentomatoes.com']),
  metacritic: new Set(['metacritic.com', 'www.metacritic.com']),
  worldart: new Set(['world-art.ru', 'www.world-art.ru']),
};

export function sourceFromUrl(raw: string): SourceName | null {
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.username || url.password || raw.length > 2_048) return null;
  for (const [source, hosts] of Object.entries(SOURCE_HOSTS) as Array<[SourceName, Set<string>]>) {
    if (!hosts.has(url.hostname.toLowerCase())) continue;
    if (source === 'worldart') return ['http:', 'https:'].includes(url.protocol) ? source : null;
    return url.protocol === 'https:' ? source : null;
  }
  return null;
}

export function assertSourceUrl(raw: string, expected?: SourceName): URL {
  const source = sourceFromUrl(raw);
  if (!source || (expected && source !== expected)) throw new InputError('Unsupported source URL');
  return new URL(raw);
}
