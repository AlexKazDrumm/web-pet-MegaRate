import { Router } from 'express';
import { fetchDetails } from '../utils/detailsParsers.js';
import { InputError } from '../utils/errors.js';
import { assertSourceUrl } from '../utils/urlPolicy.js';

export const detailsRouter = Router();

/* GET /details?url=https://… */
detailsRouter.get('/', (req, res, next) => {
  (async () => {
    const url = String(req.query.url ?? '').trim();
    if (!url) throw new InputError('URL is required');
    assertSourceUrl(url);

    const details = await fetchDetails(url);
    res.json(details);
  })().catch(next);                  // все async-ошибки → Express
});
