import { useNavigate, Link } from 'react-router-dom';
import MovieForm from '../components/MovieForm';

export default function AddMoviePage() {
  const nav = useNavigate();

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Добавление фильма</h1>
      <MovieForm onSuccess={() => nav('/movies')} />
      <p><Link to="/movies">← Вернуться к каталогу</Link></p>
    </div>
  );
}
