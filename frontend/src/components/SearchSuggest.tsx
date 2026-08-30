/* src/components/SearchSuggest.tsx */
import { useEffect, useState } from 'react';
import { api } from '../api';

/* -------- типы подсказок -------- */
export interface SuggestItem {
  title: string;
  year : string;
  url  : string;
  cover: string;
}

/* ответ /search теперь содержит 4 источника */
export interface SuggestPack {
  imdb: SuggestItem[];
  ms  : SuggestItem[];
  kp  : SuggestItem[];
  rt  : SuggestItem[];
  mc  : SuggestItem[];
  wa  : SuggestItem[];
}

/* ключ источника                           ↓    */
export type OnPick = (field: 'imdb' | 'ms' | 'kp' | 'rt' | 'mc' | 'wa', it: SuggestItem) => void;

export default function SearchSuggest({
  query, kind, onPick,
}: {
  query : string;
  kind  : string;
  onPick: OnPick;
}) {
  const empty: SuggestPack = { imdb: [], ms: [], kp: [], rt: [], mc: [], wa:[] };
  const [data,     setData]     = useState<SuggestPack>(empty);
  const [selected, setSelected] =
  useState<Record<'imdb'|'ms'|'kp'|'rt'|'mc'|'wa', string|undefined>>(
    { imdb:undefined, ms:undefined, kp:undefined, rt:undefined, mc:undefined, wa:undefined },
  );

  /* ---------- запрос к /search ---------- */
  useEffect(() => {
    if (query.length < 3) { setData(empty); return; }

    api.get<SuggestPack>('/search', { params: { q: query, kind } })
       .then(r => setData(r.data))
       .catch(() => setData(empty));
  }, [query, kind]);

  /* ---------- UI ---------- */
  const Block = ({
    label, list, field,
  }: {
    label: string;
    list : SuggestItem[];
    field: 'imdb' | 'ms' | 'kp' | 'rt' | 'mc' | 'wa';
  }) => (
    <div style={{ marginBottom: 12 }}>
      <strong>{label}</strong>{list.length === 0 && ' —'}
      {list.map(it => (
        <label key={it.url} style={{ display:'flex',gap:8,cursor:'pointer' }}>
          <input
            type="radio"
            name={field}
            checked={selected[field] === it.url}
            onChange={() => {
              setSelected(s => ({ ...s, [field]: it.url }));
              onPick(field, it);
            }}
          />
          {it.cover && <img src={it.cover} width={40} height={60} />}
          <span>{it.title}{it.year && ` (${it.year})`}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div style={{ border:'1px solid #ccc',padding:12,marginTop:12 }}>
      <Block label="IMDb"              field="imdb" list={data.imdb} />
      <Block label="MyShows"           field="ms"   list={data.ms}   />
      <Block label="Кинопоиск"         field="kp"   list={data.kp}   />
      <Block label="Rotten Tomatoes"   field="rt"   list={data.rt}   />
      <Block label="Metacritic"        field="mc"   list={data.mc} />
      <Block label="World-Art"         field="wa"   list={data.wa} />
    </div>
  );
}
