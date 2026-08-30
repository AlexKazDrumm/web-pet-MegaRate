import axios from 'axios';
import * as cheerio from 'cheerio';
import { assertSourceUrl } from './urlPolicy.js';

/* ───────── публичная структура ───────── */
export interface Details {
  description      : string;
  cover            : string;

  /* --- из IMDb hero-блока ----------------------------------------- */
  ru_title?        : string | null;
  orig_title?      : string | null;
  year?            : number | null;
  age_rating?      : string | null;
  runtime_min?     : number | null;

  imdb_rating?     : number | null;
  imdb_votes?      : number | null;
  popularity_rank? : number | null;
  popularity_delta?: number | null;

  genres?          : string[];
  directors?       : string[];
  writers?         : string[];
  stars?           : string[];

  trailer?         : { url: string; seconds: number | null } | null;
}

/* ───────── общие вещи ───────── */
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  /* ставим русский языком ПЕРВЫМ, иначе IMDb отдаёт англ-версию */
  'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
  Accept           : 'text/html',
  'Accept-Encoding': 'identity',
};

const download = async (url: string): Promise<string> =>
  axios
    .get<string>(url, { headers: HEADERS, timeout: 15_000 })
    .then(r => r.data)
    .catch(() => '');

/* ───────── helpers ───────── */
const toNumber = (s: string): number | null => {
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};

const votesToInt = (txt: string): number | null => {
  txt = txt.trim().toUpperCase();
  if (txt.endsWith('K')) return Math.round(parseFloat(txt) * 1_000);
  if (txt.endsWith('M')) return Math.round(parseFloat(txt) * 1_000_000);
  return toNumber(txt);
};

const durToMin = (txt: string): number | null => {
  const h = txt.match(/(\d+)\s*h/i)?.[1];
  const m = txt.match(/(\d+)\s*m/i)?.[1];
  if (!h && !m) return null;
  return (h ? +h * 60 : 0) + (m ? +m : 0);
};

const creditList = (
  $: cheerio.CheerioAPI,
  label: 'Director' | 'Writers' | 'Stars',
): string[] =>
  $('li[data-testid="title-pc-principal-credit"]')
    .filter((_, el) =>
      $(el).find('.ipc-metadata-list-item__label').text().includes(label),
    )
    .first()
    .find('a.ipc-metadata-list-item__list-content-item')
    .map((_, a) => $(a).text().trim())
    .get();

const uniq = (arr: string[]) => [...new Set(arr)];

/* ───────── IMDb ───────── */
async function imdbDetails(url: string): Promise<Details> {
  const html = await download(`${url}?language=ru-RU`);          // ← фиксируем локаль
  const $    = cheerio.load(html);

  /* ru_title */
  const ruTitle =
    $('span[data-testid="hero__primary-text"]').first().text().trim() || null;

  /* orig_title */
  const origTitle = $('div')
    .filter((_, el) => $(el).text().startsWith('Original title:'))
    .first()
    .text()
    .replace(/^Original title:\s*/i, '')
    .trim() || null;

  /* год / возраст / длительность */
  const metaLis   = $('ul.sc-103e4e3c-2 li');
  const year         = toNumber(metaLis.eq(0).text());
  const age_rating   = metaLis.eq(1).text().trim() || null;
  const runtime_min  = durToMin(metaLis.eq(2).text());

  /* рейтинг + голоса */
  const ratingTxt   = $('[data-testid="hero-rating-bar__aggregate-rating__score"] span')
                        .first()
                        .text()
                        .replace(',', '.');
  const imdb_rating = parseFloat(ratingTxt);
  const imdb_votes  = votesToInt(
    $('[data-testid="hero-rating-bar__aggregate-rating__score"]')
      .parent()
      .find('.sc-d541859f-3, [data-testid$="vote-count"]')
      .first()
      .text(),
  );

  /* популярность (— .first() убирает дубли «498498», «1111») */
  const popularity_rank  = toNumber(
    $('[data-testid="hero-rating-bar__popularity__score"]').first().text(),
  );
  const popularity_delta = toNumber(
    $('[data-testid="hero-rating-bar__popularity__delta"]').first().text(),
  );

  /* постер / сюжет */
  let cover = $('meta[property="og:image"]').attr('content') || '';
  if (cover.startsWith('//')) cover = 'https:' + cover;
  const description = $('[data-testid="plot-xl"]').first().text().trim();

  /* трейлер */
  const trailerRel = $('[data-testid="video-player-slate-overlay"]').attr('href') ?? '';
  const trailerUrl = trailerRel ? `https://www.imdb.com${trailerRel}` : '';
  const trailerLen = durToMin($('[data-testid="video-player-slate-runtime"]').text());

  /* жанры + списки имён */
  const genres = $('[data-testid="interests"] .ipc-chip__text')
    .map((_, el) => $(el).text().trim())
    .get();

  const directors = creditList($, 'Director');
  const writers   = creditList($, 'Writers');
  const stars     = creditList($, 'Stars');

  return {
    description,
    cover,

    ru_title   : ruTitle,
    orig_title : origTitle,
    year,
    age_rating,
    runtime_min,

    imdb_rating : isFinite(imdb_rating) ? imdb_rating : null,
    imdb_votes,
    popularity_rank,
    popularity_delta,

    genres,
    directors : uniq(directors),
    writers   : uniq(writers),
    stars     : uniq(stars),

    trailer: trailerUrl ? { url: trailerUrl, seconds: trailerLen } : null,
  };
}

/* ───────── MyShows ───────── */
async function myshowsDetails(url: string): Promise<Details> {
  const html = await download(url);
  const $    = cheerio.load(html);

  return {
    description:
      $('.SlidingTabs__descriptioncontent .HtmlContent').first().text().trim(),
    cover:
      $('meta[property="og:image"]').attr('content') ??
      $('.MoviePagePoster__image, .ShowPoster__image').first().attr('src') ??
      '',
  };
}

/* ───────── Кинопоиск (без изменений) ───────── */
const KEY_500 = process.env.KINOP_API500_KEY ?? '';
const KEY_200 = process.env.KINOP_API200_KEY ?? '';

const kpId = (u: string): string | null => u.match(/(?:film|series)\/(\d+)/)?.[1] ?? null;

async function kpDetailsApi(id: string): Promise<Details | null> {
  if (KEY_500) {
    const r = await axios.get<{
      description?: string; posterUrl?: string; posterUrlPreview?: string;
    }>(`https://kinopoiskapiunofficial.tech/api/v2.2/films/${id}`, {
      headers: { 'X-API-KEY': KEY_500, accept: 'application/json' },
      timeout: 12_000, validateStatus: () => true,
    });

    if (r.status === 200) {
      return {
        description: r.data.description?.trim() ?? '',
        cover      : r.data.posterUrl ?? r.data.posterUrlPreview ?? '',
      };
    }
    if (![402, 403, 429].includes(r.status) && r.status < 500) return null;
  }

  if (KEY_200) {
    const r = await axios.get<{
      description?: string; poster?: { url?: string };
    }>(`https://api.kinopoisk.dev/v1.4/movie/${id}`, {
      headers: { 'X-API-KEY': KEY_200, accept: 'application/json' },
      timeout: 12_000, validateStatus: () => true,
    });

    if (r.status === 200) {
      return {
        description: r.data.description?.trim() ?? '',
        cover      : r.data.poster?.url ?? '',
      };
    }
  }
  return null;
}

async function kpDetailsHtml(url: string): Promise<Details> {
  const html = await download(url);
  const $    = cheerio.load(html);

  const description =
    $('meta[property="og:description"]').attr('content')?.trim() ??
    $('p.film-synopsys').text().trim() ??
    '';

  let cover = $('meta[property="og:image"]').attr('content') ?? '';
  if (cover.startsWith('//')) cover = 'https:' + cover;

  return { description, cover };
}

async function kinopoiskDetails(url: string): Promise<Details> {
  const id = kpId(url);
  if (!id) return { description: '', cover: '' };

  const viaApi = await kpDetailsApi(id);
  return viaApi ?? kpDetailsHtml(url);
}

/* ───────── единый экспорт ───────── */
export async function fetchDetails(url: string): Promise<Details> {
  try {
    const parsed = assertSourceUrl(url);
    const host = parsed.hostname;

    if (host === 'imdb.com' || host === 'www.imdb.com') return imdbDetails(parsed.href);
    if (host === 'myshows.me' || host === 'www.myshows.me') return myshowsDetails(parsed.href);
    if (host === 'kinopoisk.ru' || host === 'www.kinopoisk.ru') return kinopoiskDetails(parsed.href);

    return { description: '', cover: '' };
  } catch (error) {
    if (error instanceof Error && error.name === 'InputError') throw error;
    return { description: '', cover: '' };
  }
}
