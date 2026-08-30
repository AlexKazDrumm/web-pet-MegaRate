import iconv from 'iconv-lite';
import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { fetchDetails } from './detailsParsers.js';

/* ─────────────── shared ─────────────── */

export interface SearchItem {
  title: string;
  year : string;
  url  : string;    // финальная «чистая» ссылка
  cover: string;    // может быть ''
}

export interface WaSuggestPack { wa: SearchItem[] }

function dbg(msg: string, ...rest: any[]) {
  // eslint-disable-next-line no-console
  console.log(`[search] ${msg}`, ...rest);
}

async function fetchRaw(url: string): Promise<AxiosResponse<string>> {
  const res = await axios
    .get<string>(url, {
      responseType   : 'text',
      timeout        : 15_000,
      validateStatus : () => true,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
        'Accept-Language': 'ru,en;q=0.8',
        Accept           : 'text/html',
        'Accept-Encoding': 'identity',
      },
    })
    .catch(err => err.response ?? { status: 0, data: '' } as AxiosResponse<string>);

  dbg(`GET ${url} → ${res.status} (${typeof res.data === 'string'
    ? res.data.length : 0}b)`);
  return res;
}

/* ─────────────── IMDb ─────────────── */

export async function imdbFind(q: string): Promise<SearchItem[]> {
  /* фиксируем русскую локаль и в URL, и в заголовке */
  const url  = `https://www.imdb.com/find/?q=${encodeURIComponent(q)}&s=tt&lang=ru-RU`;
  const resp = await fetchRaw(url);
  if (resp.status !== 200 || typeof resp.data !== 'string') return [];

  const $   = cheerio.load(resp.data);
  const raw: SearchItem[] = [];

  $('li.find-title-result').each((_i, el) => {
    const a  = $(el).find('a.ipc-metadata-list-summary-item__t');
    const id = a.attr('href')?.match(/\/title\/(tt\d+)/)?.[1];
    if (!id) return;

    raw.push({
      title: a.text().trim(),                 // временно — англ.
      year : $(el).find('ul li').first().text().trim(),
      url  : `https://www.imdb.com/title/${id}`,
      cover: $(el).find('img').attr('src') ?? '',
    });
  });

  /* добираем ru-title за один запрос на каждую карточку (≤5) */
  const list = await Promise.all(
    raw.slice(0, 5).map(async item => {
      const det = await fetchDetails(item.url);
      return {
        ...item,
        title: det.ru_title || det.orig_title || item.title,  // заменяем, если смогли
      };
    }),
  );

  return list;
}

/* ─────────────── MyShows ─────────────── */

export type MsMode = 'movie' | 'series';

const MS_CARD_SEL = '.MovieCard, .Tile, .ShowCatalogCard';

async function msParse(html: string): Promise<SearchItem[]> {
  const $   = cheerio.load(html);
  const res: SearchItem[] = [];

  $(MS_CARD_SEL).slice(0, 5).each((_i, el) => {
    const a    = $(el).is('a') ? $(el) : $(el).find('a').first();
    const href = a.attr('href') ?? '';
    const id   = href.match(/\/(?:view|movie)\/(\d+)/)?.[1];
    if (!id) return;

    const cover = $(el).find('img').attr('src') ?? '';
    const title = $(el)
      .find('.ShowCatalogCard__title, .MovieCard__title, .Tile__name')
      .first()
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim();
    const year =
      $(el).find('.ShowCatalogCard__info, .MovieCard__info-item').first().text()
        .match(/\d{4}/)?.[0] ?? '';

    res.push({
      title,
      year,
      url  : `https://myshows.me${href}`,
      cover,
    });
  });

  return res;
}

export async function msFind(q: string, mode: MsMode): Promise<SearchItem[]> {
  const url =
    mode === 'movie'
      ? `https://myshows.me/movies/catalog/?q=${encodeURIComponent(q)}&fromSearch=true`
      : `https://myshows.me/search/all/?q=${encodeURIComponent(q)}&fromSearch=true`;

  const html = await fetchRaw(url).then(r => r.data).catch(() => '');
  const res  = await msParse(html);

  dbg(`msFind "${q}" [${mode}] → ${res.length} items`);
  if (res[0]) dbg('  first:', res[0]);
  return res.slice(0, 5);
}

/* ─────────────── Кинопоиск ─────────────── */

const KP_KEY_500 = process.env.KINOP_API500_KEY ?? '';
const KP_KEY_200 = process.env.KINOP_API200_KEY ?? '';

function kpTypePath(apiType: string): 'film' | 'series' {
  return apiType?.toUpperCase().includes('SERIES') ? 'series' : 'film';
}

/** сжимает объект до ~300 симв. чтобы не заспамить консоль */
const short = (obj: unknown) =>
  JSON.stringify(obj).slice(0, 300).replace(/\s+/g, ' ') + '…';

export async function kpFind(q: string): Promise<SearchItem[]> {
  dbg(`kpFind "${q}" — start  (KEY500=${!!KP_KEY_500}  KEY200=${!!KP_KEY_200})`);

  /* ---------- API #1 : Unofficial (500 req / day) ---------- */
  if (KP_KEY_500) {
    const url =
      `https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword` +
      `?keyword=${encodeURIComponent(q)}&page=1`;

    dbg(`kpFind#1  →  ${url}`);

    const r = await axios.get<{
      pagesCount: number;
      films: Array<{
        filmId: number;
        nameRu?: string;
        nameEn?: string;
        year?: string;
        type?: string;
        posterUrlPreview?: string;
      }>;
    }>(url, {
      headers: { 'X-API-KEY': KP_KEY_500, accept: 'application/json' },
      timeout: 12_000,
      validateStatus: () => true,
    });

    dbg(`kpFind#1 "${q}" → HTTP ${r.status}`);

    if (r.status !== 200)
      dbg('kpFind#1 body:', short(r.data));

    if (r.status === 200 && r.data?.films?.length) {
      const list = r.data.films.slice(0, 5).map(f => ({
        title: f.nameRu || f.nameEn || '',
        year : f.year ?? '',
        url  : `https://www.kinopoisk.ru/${kpTypePath(f.type ?? 'FILM')}/${f.filmId}/`,
        cover: f.posterUrlPreview ?? '',
      }));
      dbg('kpFind#1 first item:', list[0]);
      return list;
    }

    if (r.status === 200)
      dbg('kpFind#1 — 200, но films.length === 0');

    /* 402/403/429/5xx — падаем вниз к backup-ключу */
  } else {
    dbg('kpFind#1 skipped — KEY_500 not set');
  }

  /* ---------- API #2 : kinopoisk.dev (200 req / day) ---------- */
  if (!KP_KEY_200) {
    dbg('kpFind#2 skipped — KEY_200 not set');
    return [];
  }

  const url2 =
    `https://api.kinopoisk.dev/v1.4/movie/search` +
    `?page=1&limit=10&query=${encodeURIComponent(q)}`;

  dbg(`kpFind#2  →  ${url2}`);

  const r2 = await axios.get<{
    docs: Array<{
      id: number;
      name?: string;
      alternativeName?: string;
      year?: number;
      type?: string;
      poster?: { previewUrl?: string };
    }>;
  }>(url2, {
    headers: { 'X-API-KEY': KP_KEY_200, accept: 'application/json' },
    timeout: 12_000,
    validateStatus: () => true,
  });

  dbg(`kpFind#2 "${q}" → HTTP ${r2.status}`);

  if (r2.status !== 200)
    dbg('kpFind#2 body:', short(r2.data));

  if (r2.status === 200 && r2.data?.docs?.length) {
    const list = r2.data.docs.slice(0, 5).map(d => ({
      title: d.name || d.alternativeName || '',
      year : d.year ? String(d.year) : '',
      url  : `https://www.kinopoisk.ru/${kpTypePath(d.type ?? 'FILM')}/${d.id}/`,
      cover: d.poster?.previewUrl ?? '',
    }));
    dbg('kpFind#2 first item:', list[0]);
    return list;
  }

  if (r2.status === 200)
    dbg('kpFind#2 — 200, но docs.length === 0');

  dbg(`kpFind "${q}" → 0 items (returning [])`);
  return [];
}

/* ====================================================================
   Rotten Tomatoes
   ==================================================================== */

export async function rtFind(q: string): Promise<SearchItem[]> {
  const url  = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(q)}`;
  const resp = await fetchRaw(url);
  if (resp.status !== 200 || typeof resp.data !== 'string') return [];

  const $   = cheerio.load(resp.data);
  const res: SearchItem[] = [];

  $('search-page-media-row').slice(0, 5).each((_i, row) => {
    const aTitle = $(row).find('a[slot="title"]').first();
    const aThumb = $(row).find('a[slot="thumbnail"]').first();

    const href = aTitle.attr('href') || aThumb.attr('href') || '';
    if (!href.startsWith('https://')) return;          // пропускаем рекламные/не-title

    res.push({
      title: aTitle.text().trim(),
      year : $(row).attr('releaseyear') || '',
      url  : href,
      cover: aThumb.find('img').attr('src') ?? '',
    });
  });

  dbg(`rtFind "${q}" → ${res.length} items`);
  if (res[0]) dbg('  first:', res[0]);
  return res;
}

/* ===================================================================
   Metacritic
   =================================================================== */

const MC_ROOT = 'https://www.metacritic.com';

/* берём только «movie», пропускаем игры и т.д. */
const isMovieOrShow = ($row: cheerio.Cheerio<any>): boolean => {
  const tag = $row
    .find('[data-testid="tag-list"] .c-tagList_button')
    .first()
    .text()
    .trim()
    .toLowerCase();                 // movie | tv | game …

  return tag === 'movie' || tag === 'tv';
};

export async function mcFind(q: string): Promise<SearchItem[]> {
  const url  = `${MC_ROOT}/search/${encodeURIComponent(q)}/`;
  const html = (await fetchRaw(url)).data as string;
  if (!html) return [];

  const $   = cheerio.load(html);
  const res: SearchItem[] = [];

  $('[data-testid="search-result-item"]').each((_i, el) => {
    const $row = $(el);                         // ← Cheerio<any>
    if (!isMovieOrShow($row)) return;           // игры пропускаем

    const href  = $row.attr('href') ?? '';
    const cover = $row.find('img').attr('src') ?? '';
    const title = $row.find('p').first().text().trim();
    const year  = $row
      .find('span.u-text-uppercase')
      .first()
      .text()
      .match(/\d{4}/)?.[0] ?? '';

    res.push({
      title,
      year,
      url  : href.startsWith('http') ? href : `${MC_ROOT}${href}`,
      cover,
    });
  });

  dbg(`mcFind "${q}" → ${res.length} items`);
  return res.slice(0, 5);
}

/* ====================================================================
   World-Art
   ==================================================================== */

const WA_ROOT = 'http://www.world-art.ru';

/* helper: в поисковой выдаче пропускаем литературу/people */
const encCp1251 = (s: string): string =>
  iconv.encode(s, 'windows-1251')              // → Buffer cp1251-байт
       .reduce((acc, b) => acc + '%' + b.toString(16).toUpperCase().padStart(2, '0'), '');

/* --- helper #2: GET + правильная декодировка cp1251 -------------------- */
async function fetchWa(url: string): Promise<string> {
  const { data, status } = await axios.get<ArrayBuffer>(url, {
    responseType : 'arraybuffer',              // ← сырые байты
    timeout      : 15_000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
      'Accept-Language': 'ru,en;q=0.8',
      Accept           : 'text/html',
      'Accept-Encoding': 'identity',
    },
    validateStatus: () => true,
  });
  console.log(`[wa] GET ${url} → ${status} (${(data as ArrayBuffer).byteLength}b)`);
  return iconv.decode(Buffer.from(data), 'windows-1251');   // cp1251 → UTF-8-строка
}

/* --- helper #3: ссылка только на «кино/анимацию» ------------------------ */
const isCinemaHref = (h: string) => /\/?cinema\/cinema\.php/.test(h);

/* ----------------------------------------------------------------------- */
export async function waFind(q: string): Promise<SearchItem[]> {
  const enc = encCp1251(q);                                   // <-- главное отличие
  const urls = [
    `${WA_ROOT}/search.php?public_search=${enc}&global_sector=cinema`,
    `${WA_ROOT}/search.php?public_search=${enc}&global_sector=animation`,
  ];

  const htmlAll = await Promise.all(urls.map(u => fetchWa(u).catch(() => '')));

  const res: SearchItem[] = [];
  htmlAll.forEach(html => {
    const $ = cheerio.load(html);

    $('a.estimation').each((_i, a) => {
      const href = $(a).attr('href') ?? '';
      if (!isCinemaHref(href)) return;

      const title = $(a).text().trim();
      const year  = $(a)
        .closest('tr')
        .find('td font[size="3"]')
        .first()
        .text()
        .trim();

      const img = $(a).closest('tr').find('img').first().attr('src') ?? '';

      res.push({
        title,
        year,
        url  : href.startsWith('http') ? href : `${WA_ROOT}/${href.replace(/^\//, '')}`,
        cover: img.startsWith('http') ? img  : (img ? `${WA_ROOT}/${img.replace(/^\//,'')}` : ''),
      });
    });
  });

  console.log(`[waFind] "${q}" → ${res.length} items`);
  return res.slice(0, 5);
}