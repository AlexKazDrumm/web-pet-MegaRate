import iconv from 'iconv-lite';
import axios, { AxiosError, AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { assertSourceUrl } from './urlPolicy.js';

/* ─────────────── utils ─────────────── */

export interface ParsedRating {
  rating: number | null;
  votes: number | null;
}

export interface ParsedMcRating extends ParsedRating {
  user_rating: number | null;
  user_votes : number | null;
}

export interface ParsedWaRating extends ParsedRating {}

function log(msg: string) {
  console.log(`[ratingParser] ${msg}`);
}

/* заголовки для axios */
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
  'Accept-Encoding': 'identity', // IMDb иногда капризничает
};

/* безопасный GET → '' при ошибке */
async function safeGet(url: string): Promise<string> {
  try {
    const { data, status } = await axios.get(url, { headers: HEADERS, timeout: 15_000 });
    log(`GET ${url} → ${status} (${typeof data === 'string' ? data.length : 0} bytes)`);
    return typeof data === 'string' ? data : '';
  } catch (err) {
    const e = err as AxiosError;
    log(`⚠️  ${url} → ${e.response?.status ?? e.code}`);
    return '';
  }
}

/* ─────────────── IMDb ─────────────── */

export async function parseImdb(url: string): Promise<ParsedRating> {
  assertSourceUrl(url, 'imdb');
  const html = await safeGet(url);
  if (!html) return { rating: null, votes: null };

  const $ = cheerio.load(html);
  const root = $('[data-testid="hero-rating-bar__aggregate-rating__score"]');

  const rating = parseFloat(root.find('span').first().text().replace(',', '.'));

  /* голоса: 138K • 1.2M • 123 456 */
  let votesText = root.parent().find('.sc-d541859f-3').first().text().trim();
  let votes: number | null = null;
  if (votesText.endsWith('K')) votes = Math.round(parseFloat(votesText) * 1_000);
  else if (votesText.endsWith('M')) votes = Math.round(parseFloat(votesText) * 1_000_000);
  else votes = parseInt(votesText.replace(/[^\d]/g, ''), 10);

  return {
    rating: isFinite(rating) ? rating : null,
    votes : isFinite(votes)  ? votes  : null,
  };
}

/* ─────────────── Kinopoisk (два API-ключа) ─────────────── */

const KEY_500 = process.env.KINOP_API500_KEY ?? '';
const KEY_200 = process.env.KINOP_API200_KEY ?? '';

function kpId(url: string): string | null {
  /* поддерживаем /film/123/ и /series/123 и без слеша */
  const m = url.match(/(?:film|series)\/(\d+)/);
  return m ? m[1] : null;
}

async function kpCall<T>(
  url: string,
  key: string,
  hdr: Record<string, string>
): Promise<AxiosResponse<T>> {
  return axios.get(url, {
    headers: hdr,
    timeout: 12_000,
    validateStatus: () => true,
  });
}

export async function parseKp(url: string): Promise<ParsedRating> {
  assertSourceUrl(url, 'kinopoisk');
  const id = kpId(url);
  if (!id) {
    log('KP: id NOT found in URL');
    return { rating: null, votes: null };
  }

  /* ---------- API #1 : 500 req/день ---------- */
  if (KEY_500) {
    const r1 = await kpCall<{ ratingKinopoisk: number; ratingKinopoiskVoteCount: number }>(
      `https://kinopoiskapiunofficial.tech/api/v2.2/films/${id}`,
      KEY_500,
      { 'X-API-KEY': KEY_500, accept: 'application/json' }
    );
    log(`KP#1 ${id} → ${r1.status}`);

    if (r1.status === 200 && r1.data?.ratingKinopoisk) {
      return {
        rating: +r1.data.ratingKinopoisk,
        votes : +r1.data.ratingKinopoiskVoteCount,
      };
    }

    /* 402/403/429/5xx → пробуем запасной ключ */
    if ([402, 403, 429].includes(r1.status) || r1.status >= 500) {
      log('KP#1 limit or error — switching to backup key');
    } else {
      /* валидная ошибка (404, 400…) — дальше смысла нет */
      return { rating: null, votes: null };
    }
  } else {
    log('KP#1 skipped — KEY_500 not set');
  }

  /* ---------- API #2 : 200 req/день ---------- */
  if (!KEY_200) {
    log('KP#2 skipped — KEY_200 not set');
    return { rating: null, votes: null };
  }

  const r2 = await kpCall<{ rating: { kp: number }; votes: { kp: string | number } }>(
    `https://api.kinopoisk.dev/v1.4/movie/${id}`,
    KEY_200,
    { 'X-API-KEY': KEY_200, accept: 'application/json' }
  );
  log(`KP#2 ${id} → ${r2.status}`);

  if (r2.status === 200 && r2.data?.rating?.kp) {
    return {
      rating: +r2.data.rating.kp,
      votes : +r2.data.votes.kp,
    };
  }

  return { rating: null, votes: null };
}

/* ─────────────── MyShows ─────────────── */

export async function parseMs(url: string): Promise<ParsedRating> {
  assertSourceUrl(url, 'myshows');
  const html = await safeGet(url);
  if (!html) return { rating: null, votes: null };

  const $ = cheerio.load(html);

  /* сам рейтинг (5-балльный) */
  const ratingText = $('.ShowRating-value div').first().text().replace(',', '.').trim();
  const rating5    = parseFloat(ratingText);
  const rating10   = isFinite(rating5) ? +(rating5 * 2).toFixed(2) : null; // 5★ → 10★

  /* если рейтинг отсутствует или равен 0.0 → голоса игнорируем */
  if (rating10 === null || rating10 === 0) {
    log('MyShows: rating 0.0 — votes skipped');
    return { rating: rating10, votes: null };
  }

  /* берём только «свои» голоса MyShows */
  const votesText = $('.Counter').first().text().replace(/[^\d]/g, '');
  const votes     = parseInt(votesText, 10);

  return {
    rating: rating10,
    votes : isFinite(votes) ? votes : null,
  };
}

/* ====================================================================
   Rotten Tomatoes
   ==================================================================== */

export interface ParsedRt {
  criticsRating : number | null;
  criticsVotes  : number | null;
  audienceRating: number | null;
  audienceVotes : number | null;
}

/* helper — «88 %» → 8.8 */
const pctTo10 = (s: string): number | null => {
  const n = parseFloat(s.replace('%', ''));
  return Number.isFinite(n) ? +(n / 10).toFixed(1) : null;
};

/* helper — «10,000+ Verified Ratings» → 10000 */
const votesToInt = (txt: string): number | null => {
  const cleaned = txt.replace(/[,+]/g, '').trim();
  const m = cleaned.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};

export async function parseRt(url: string): Promise<ParsedRt> {
  assertSourceUrl(url, 'rottentomatoes');
  const html = await safeGet(url);
  if (!html) {
    return { criticsRating: null, criticsVotes: null, audienceRating: null, audienceVotes: null };
  }

  const $ = cheerio.load(html);

  const criticsRating  = pctTo10($('[slot="criticsScore"]').first().text());
  const criticsVotes   = votesToInt($('[slot="criticsReviews"]').first().text());

  const audienceRating = pctTo10($('[slot="audienceScore"]').first().text());
  const audienceVotes  = votesToInt($('[slot="audienceReviews"]').first().text());

  return { criticsRating, criticsVotes, audienceRating, audienceVotes };
}

/* ===================================================================
   Metacritic
   =================================================================== */

/* helper: «43» (из /100) → 4.3  | «tbd» → null */
const score100to10 = (txt: string): number | null => {
  const n = parseInt(txt.trim(), 10);
  return Number.isFinite(n) ? +(n / 10).toFixed(1) : null;
};

/* helper: «Based on 618 User Ratings» → 618 */
const votesFromText = (txt: string): number | null => {
  const m = txt.replace(/[,+]/g, '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
};

export async function parseMc(url: string): Promise<ParsedMcRating> {
  assertSourceUrl(url, 'metacritic');
  const html = await safeGet(url);
  if (!html) {
    return {
      rating      : null, votes      : null,
      user_rating : null, user_votes : null,
    };
  }

  const $ = cheerio.load(html);

  /* ---------- критики ---------- */
  const criticScoreTxt  =
    $('[data-testid="critic-score-info"] .c-siteReviewScore span')
      .first().text().trim().toLowerCase();
  const ratingCritics   = score100to10(criticScoreTxt);

  const criticVotesTxt  =
    $('[data-testid="critic-score-info"] .c-productScoreInfo_reviewsTotal')
      .first().text();
  const criticVotes     = votesFromText(criticVotesTxt);

  /* ---------- зрители ---------- */
  const userScoreTxt =
    $('[data-testid="user-score-info"] .c-siteReviewScore span')
      .first().text().trim().toLowerCase();
  const ratingUsers  =
    userScoreTxt === 'tbd' ? null : parseFloat(userScoreTxt);

  const userVotesTxt =
    $('[data-testid="user-score-info"] .c-productScoreInfo_reviewsTotal')
      .first().text();
  const userVotes = votesFromText(userVotesTxt);

  return {
    rating      : ratingCritics,
    votes       : criticVotes,
    user_rating : Number.isFinite(ratingUsers) ? ratingUsers : null,
    user_votes  : userVotes,
  };
}

/* ─────────────── World-Art ─────────────── */

const WA_ROOT = 'http://www.world-art.ru';

async function fetchWaPage(url: string): Promise<string> {
  try {
    const resp = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 15_000,
      headers: HEADERS,
      validateStatus: () => true,
    });
    console.log(`[parseWa] GET ${url} → ${resp.status} (${resp.data.byteLength}b)`);
    return iconv.decode(Buffer.from(resp.data), 'windows-1251');
  } catch (err) {
    const e = err as AxiosError;
    console.log(`[parseWa] ⚠️ ${url} → ${e.response?.status ?? e.code}`);
    return '';
  }
}

function waToFloat(s: string): number | null {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? +n.toFixed(1) : null;
}
function waVotes(s: string): number | null {
  const m = s.replace(/\s+/g, '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export async function parseWa(url: string): Promise<ParsedWaRating> {
  assertSourceUrl(url, 'worldart');
  const html = await fetchWaPage(url);
  if (!html) return { rating: null, votes: null };

  const $ = cheerio.load(html);

  // «Средний балл»
  const ratingText = $('td.review:contains("Средний балл")')
    .nextAll('td.review').first().text();
  const rating     = waToFloat(ratingText);

  // «Проголосовало»
  const votesText = $('td.review:contains("Проголосовало")')
    .nextAll('td.review').first().text();
  const votes     = waVotes(votesText);

  return { rating, votes };
}
