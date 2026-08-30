import axios from 'axios';

export type MovieKind = 'film' | 'cartoon' | 'series' | 'cartoon_series' | 'show' | 'anime' | 'anime_series';
export type MovieStatus = 'watched' | 'watchlist';

export interface Movie {
  id: number;
  title: string;
  kind: MovieKind;
  status: MovieStatus;
  year: number | null;
  description: string | null;
  cover_url: string | null;
  personal_rating: number | null;
  imdb_url: string | null;
  kp_url: string | null;
  ms_url: string | null;
  rt_url: string | null;
  mc_url: string | null;
  wa_url: string | null;
  avg_rating: number | null;
}

export type MoviePayload = Omit<Movie, 'id' | 'avg_rating'>;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  timeout: 20_000,
});

export const getMovies = () => api.get<Movie[]>('/movies').then(response => response.data);
export const getMovie = (id: number) => api.get<Movie>(`/movies/${id}`).then(response => response.data);
export const createMovie = (movie: MoviePayload) => api.post<Movie>('/movies', movie).then(response => response.data);
export const updateMovie = (id: number, movie: Partial<MoviePayload>) =>
  api.patch<Movie>(`/movies/${id}`, movie).then(response => response.data);
export const deleteMovie = (id: number) => api.delete(`/movies/${id}`);
export const refreshMovie = (id: number) => api.post<Movie>(`/movies/${id}/refresh`).then(response => response.data);
