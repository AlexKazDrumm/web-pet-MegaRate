/* src/components/MovieForm.tsx */
import { useEffect, useState } from 'react';
import { api, createMovie, getMovie, updateMovie } from '../api';
import SearchSuggest, { SuggestItem } from './SearchSuggest';

const uniqPush = <T,>(a: T[], v: T) =>
  a.some(x => JSON.stringify(x) === JSON.stringify(v)) ? a : [...a, v];

interface Props {
  movieId?: number;       // если есть — редактируем
  onSuccess: () => void;
}

/* ---------- утилита: заменяем null → '' для всех строковых полей ---------- */
const str = (v: unknown) => (v == null ? '' : String(v));

export default function MovieForm({ movieId, onSuccess }: Props) {
  /* ---------- базовое/пустое состояние ---------- */
  const blank = {
    title:'', year:'', description:'', cover_url:'',
    kind:'film', status:'watched', personal_rating:'',
    imdb_url:'', kp_url:'', ms_url:'', rt_url:'', mc_url:'', wa_url:'',    // ← RT колонка
  };
  const [data, setData] = useState<any>(blank);

  /* ---------- подгрузка карточки в режиме Edit ---------- */
  useEffect(() => {
    if (!movieId) return;
    getMovie(movieId).then(m => {
      setData({
        title          : m.title,
        year           : str(m.year),
        description    : str(m.description),
        cover_url      : str(m.cover_url),
        kind           : m.kind,
        status         : m.status,
        personal_rating: str(m.personal_rating),
        imdb_url       : str(m.imdb_url),
        kp_url         : str(m.kp_url),
        ms_url         : str(m.ms_url),
        rt_url         : str((m as any).rt_url),
        mc_url         : str((m as any).mc_url),
        wa_url         : str((m as any).wa_url),
      });
    });
  }, [movieId]);

  /* ---------- state для «автозаполнений» ---------- */
  const [searchQuery, setSearchQuery] = useState('');
  const [descOpts ,  setDescOpts ]  = useState<{src:string;text:string}[]>([]);
  const [coverOpts,  setCoverOpts]  = useState<{src:string;url:string}[]>([]);
  const [descSrc ,   setDescSrc ]   = useState<string>();
  const [coverSrc,   setCoverSrc]   = useState<string>();
  const [loading ,   setLoading ]   = useState(false);
  const [error, setError] = useState('');

  /* ---------- change-handler ---------- */
  const change = (
    e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>,
  ) => setData({ ...data, [e.target.name]: e.target.value });

  /* ---------- выбор результата поиска ---------- */
  const pick = async (field: 'imdb'|'ms'|'kp'|'rt'|'mc'|'wa', it: SuggestItem) => {

    /* сохраняем URL источника -------------------------------- */
    if (field === 'imdb') setData((d:any) => ({ ...d, imdb_url: it.url }));
    if (field === 'ms')   setData((d:any) => ({ ...d, ms_url  : it.url }));
    if (field === 'kp')   setData((d:any) => ({ ...d, kp_url  : it.url }));
    if (field === 'rt')   setData((d:any) => ({ ...d, rt_url  : it.url }));
    if (field === 'mc')   setData((d:any) => ({ ...d, mc_url  : it.url }));
    if (field === 'wa')   setData((d:any) => ({ ...d, wa_url  : it.url }));

    /* подхватываем год / постер из подсказки ----------------- */
    if (!data.year      && it.year ) setData((d:any) => ({ ...d, year      : it.year  }));
    if (!data.cover_url && it.cover) setData((d:any) => ({ ...d, cover_url : it.cover }));

    /* берём детали страницы для описания/постера ------------- */
    const { data: det } = await api.get('/details', { params: { url: it.url } });

    if (det.description) {
      setDescOpts(o => uniqPush(o, { src: field, text: det.description }));
      if (!descSrc) { setDescSrc(field); setData((d:any) => ({ ...d, description: det.description })); }
    }
    if (det.cover) {
      setCoverOpts(o => uniqPush(o, { src: field, url: det.cover }));
      if (!coverSrc) { setCoverSrc(field); setData((d:any) => ({ ...d, cover_url: det.cover })); }
    }
  };

  /* ---------- submit (Add / Save) ---------- */
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    const payload = {
      ...data,
      year           : data.year            ? Number(data.year)            : null,
      personal_rating: data.personal_rating ? Number(data.personal_rating) : null,
    };
    try {
      if (movieId) await updateMovie(movieId, payload);
      else         await createMovie(payload);
      onSuccess();
    } catch {
      setError('Не удалось сохранить запись. Проверьте поля и доступность API.');
    } finally { setLoading(false); }
  }

  /* ---------- JSX ---------- */
  return (
    <>
      <form onSubmit={submit}
            style={{ marginBottom:24,display:'grid',gap:6,gridTemplateColumns:'repeat(4,1fr)' }}>

        {/* row-1 ---------------------------------------------------- */}
        <div style={{ display:'flex',gap:4 }}>
          <input name="title" value={data.title} onChange={change} placeholder="Название"
                 onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setSearchQuery(data.title.trim()); } }}
                 style={{ flex:1 }} required />
          <button type="button" disabled={data.title.trim().length < 3}
                  onClick={() => setSearchQuery(data.title.trim())}>Найти</button>
        </div>
        <input name="year"      value={data.year}      onChange={change} placeholder="Год" />
        <input name="cover_url" value={data.cover_url} onChange={change} placeholder="Ссылка на постер" />
        <select name="kind" value={data.kind} onChange={change}>
          {['film','series','cartoon','cartoon_series','show','anime','anime_series']
            .map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        {/* row-2 ---------------------------------------------------- */}
        <select name="status" value={data.status} onChange={change}>
          <option value="watched">watched</option>
          <option value="watchlist">watchlist</option>
        </select>
        <select name="personal_rating" value={data.personal_rating} onChange={change}>
          <option value="">–</option>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n =>
            <option key={n} value={n}>{n}</option>,
          )}
        </select>
        <input name="imdb_url" value={data.imdb_url} onChange={change} placeholder="IMDb URL" />
        <input name="kp_url"   value={data.kp_url}   onChange={change} placeholder="Кинопоиск URL" />

        {/* row-3 ---------------------------------------------------- */}
        <input name="ms_url" value={data.ms_url} onChange={change} placeholder="MyShows URL" />
        <input name="rt_url" value={data.rt_url} onChange={change} placeholder="Rotten Tomatoes URL" />
        <input name="mc_url" value={data.mc_url} onChange={change} placeholder="Metacritic URL" />
        <input name="wa_url" value={data.wa_url} onChange={change} placeholder="World-Art URL" />
        <textarea name="description" value={data.description} onChange={change}
                  placeholder="Описание" style={{ gridColumn:'span 2' }} />

        {/* выбор источника (если >1) -------------------------------- */}
        {coverOpts.length > 1 &&
          <div style={{ gridColumn:'span 4' }}>Источник постера:{' '}
            {coverOpts.map(o => (
              <label key={o.src} style={{ marginRight:12 }}>
                <input type="radio" checked={coverSrc === o.src}
                       onChange={() => { setCoverSrc(o.src); setData((d:any) => ({ ...d, cover_url: o.url })); }} />
                {o.src.toUpperCase()}
              </label>
            ))}
          </div>}
        {descOpts.length > 1 &&
          <div style={{ gridColumn:'span 4' }}>Источник описания:{' '}
            {descOpts.map(o => (
              <label key={o.src} style={{ marginRight:12 }}>
                <input type="radio" checked={descSrc === o.src}
                       onChange={() => { setDescSrc(o.src); setData((d:any) => ({ ...d, description: o.text })); }} />
                {o.src.toUpperCase()}
              </label>
            ))}
          </div>}

        <button type="submit" disabled={loading} style={{ gridColumn:'span 4' }}>
          {loading ? '…' : movieId ? 'Сохранить' : 'Добавить'}
        </button>
        {error && <p role="alert" style={{ gridColumn:'span 4', color:'#b42318' }}>{error}</p>}
      </form>

      {searchQuery &&
        <SearchSuggest query={searchQuery} kind={data.kind} onPick={pick} />}
    </>
  );
}
