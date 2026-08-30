/* src/routes/search.ts */
import { Router } from 'express';
import {
  imdbFind, msFind, kpFind, rtFind, mcFind, waFind,   // ← waFind есть
  MsMode,
} from '../utils/searchParsers.js';
import { InputError } from '../utils/errors.js';

export const searchRouter = Router();

/* GET /search?q=…&kind=film */
searchRouter.get('/', (req, res, next) => {
  (async () => {
    const q    = String(req.query.q ?? '').trim();
    const kind = String(req.query.kind ?? '').trim();
    if (!q) {
      return res.json({ imdb: [], ms: [], kp: [], rt: [], mc: [], wa: [] });
    }
    if (q.length > 120) throw new InputError('Search query is too long');

    /* режим для MyShows */
    const movieKinds  = ['film', 'cartoon', 'anime'];
    const seriesKinds = ['series', 'cartoon_series', 'anime_series', 'show'];
    if (kind && ![...movieKinds, ...seriesKinds].includes(kind)) throw new InputError('Unknown movie kind');
    const msMode: MsMode = movieKinds.includes(kind)  ? 'movie'
                         : seriesKinds.includes(kind) ? 'series'
                         : 'movie';

    /* ───── главный вызов ───── */
    const [imdb, ms, kp, rt, mc, wa] = await Promise.all([   // ← добавили wa
      imdbFind(q),
      msFind(q, msMode),
      kpFind(q),
      rtFind(q),
      mcFind(q),
      waFind(q),
    ]);

    console.log(
      `[route/search] "${q}" kind=${kind || '-'}  ` +
      `IMDb=${imdb.length}  MyS=${ms.length}(${msMode})  KP=${kp.length}` +
      `  RT=${rt.length}  MC=${mc.length}  WA=${wa.length}`,            // ← WA
    );

    res.json({ imdb, ms, kp, rt, mc, wa });   // ← wa теперь существует
  })().catch(next);
});
