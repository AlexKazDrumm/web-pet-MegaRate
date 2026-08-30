import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteMovie, getMovies, refreshMovie, type Movie } from '../api';
import styles from './MovieList.module.css';
import type { SortField, SortOrder } from './MovieFilters';

interface Props {
  refreshKey: number;
  filterKind: string;
  searchText: string;
  sortField: SortField;
  sortOrder: SortOrder;
}

export default function MovieList({ refreshKey, filterKind, searchText, sortField, sortOrder }: Props) {
  const [items, setItems] = useState<Movie[]>([]);
  const [error, setError] = useState('');

  const load = () => getMovies().then(setItems).catch(() => setError('Не удалось загрузить каталог.'));
  useEffect(() => { void load(); }, [refreshKey]);

  const displayed = useMemo(() => {
    let result = filterKind === 'all' ? [...items] : items.filter(movie => movie.kind === filterKind);
    const query = searchText.trim().toLowerCase();
    if (query) result = result.filter(movie => movie.title.toLowerCase().includes(query));
    if (sortField !== 'none') {
      result.sort((left, right) => {
        const a = sortField === 'title' ? left.title.toLowerCase() : left.avg_rating ?? 0;
        const b = sortField === 'title' ? right.title.toLowerCase() : right.avg_rating ?? 0;
        const order = a < b ? -1 : a > b ? 1 : 0;
        return sortOrder === 'asc' ? order : -order;
      });
    }
    return result;
  }, [items, filterKind, searchText, sortField, sortOrder]);

  async function remove(id: number) {
    if (!window.confirm('Удалить запись из каталога?')) return;
    await deleteMovie(id);
    setItems(current => current.filter(movie => movie.id !== id));
  }

  async function refresh(id: number) {
    const updated = await refreshMovie(id);
    setItems(current => current.map(movie => movie.id === id ? updated : movie));
  }

  if (error) return <p role="alert">{error}</p>;
  if (!displayed.length) return <p className={styles.empty}>По заданным условиям ничего не найдено.</p>;

  return (
    <div className={styles.container}>
      {displayed.map(movie => (
        <article key={movie.id} className={styles.card}>
          {movie.cover_url
            ? <img src={movie.cover_url} alt={`Постер: ${movie.title}`} className={styles.poster} />
            : <div className={styles.placeholder}>Нет постера</div>}
          <div className={styles.title}>{movie.title}</div>
          <div className={styles.meta}>{movie.year ?? 'Год не указан'} · {movie.kind}</div>
          <div className={styles.ratingItem}>
            <span className={styles.ratingLabel}>Средняя оценка</span>
            <span className={styles.ratingValue}>{movie.avg_rating ?? '—'}</span>
          </div>
          <div className={styles.actions}>
            <Link className={styles.btn} to={`/edit-movie/${movie.id}`}>Изменить</Link>
            <button className={styles.btn} onClick={() => void refresh(movie.id)}>Обновить оценки</button>
            <button className={styles.btnDanger} onClick={() => void remove(movie.id)}>Удалить</button>
          </div>
        </article>
      ))}
    </div>
  );
}
