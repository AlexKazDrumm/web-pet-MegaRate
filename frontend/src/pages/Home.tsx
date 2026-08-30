import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>MegaRate</h1>
      <p>Каталог фильмов и сериалов с личной и агрегированной оценкой.</p>
      <ul>
        <li><Link to="/movies">Открыть каталог</Link></li>
      </ul>
    </div>
  );
}
