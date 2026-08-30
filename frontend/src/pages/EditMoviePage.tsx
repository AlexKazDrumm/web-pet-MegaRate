import { useParams, useNavigate, Link } from 'react-router-dom';
import MovieForm from '../components/MovieForm';

export default function EditMoviePage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  if (!id) return <p>Некорректная ссылка.</p>;

  return (
    <div style={{padding:24,fontFamily:'sans-serif'}}>
      <h1>Редактирование фильма #{id}</h1>
      <MovieForm movieId={Number(id)} onSuccess={() => nav('/movies')} />
      <p><Link to="/movies">← Вернуться к каталогу</Link></p>
    </div>
  );
}
