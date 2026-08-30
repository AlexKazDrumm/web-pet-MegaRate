import { describe, expect, it } from 'vitest';
import { parseMovieInput } from './input.js';

describe('movie input', () => {
  it('normalizes a valid movie', () => {
    expect(parseMovieInput({
      title: ' The Matrix ', kind: 'film', status: 'watched', year: '1999',
      personal_rating: '9', description: '', cover_url: '', imdb_url: '', kp_url: '',
      ms_url: '', rt_url: '', mc_url: '', wa_url: '',
    })).toMatchObject({ title: 'The Matrix', year: 1999, personal_rating: 9, description: null });
  });

  it('rejects invalid fields', () => {
    expect(() => parseMovieInput({ title: '', kind: 'film', status: 'watched' })).toThrow();
    expect(() => parseMovieInput({ title: 'Test', kind: 'unknown', status: 'watched' })).toThrow();
    expect(() => parseMovieInput({ title: 'Test', kind: 'film', status: 'watched', year: 1500 })).toThrow();
  });
});
