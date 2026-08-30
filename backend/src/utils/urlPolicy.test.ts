import { describe, expect, it } from 'vitest';
import { assertSourceUrl, sourceFromUrl } from './urlPolicy.js';

describe('source URL policy', () => {
  it('accepts supported catalog pages', () => {
    expect(sourceFromUrl('https://www.imdb.com/title/tt0133093/')).toBe('imdb');
    expect(sourceFromUrl('https://www.kinopoisk.ru/film/301/')).toBe('kinopoisk');
  });

  it('rejects deceptive and local hosts', () => {
    expect(sourceFromUrl('https://imdb.com.example.org/title/1')).toBeNull();
    expect(sourceFromUrl('http://127.0.0.1:5432/private')).toBeNull();
    expect(() => assertSourceUrl('https://example.org')).toThrow('Unsupported source URL');
  });

  it('checks the expected source', () => {
    expect(() => assertSourceUrl('https://www.imdb.com/title/1', 'kinopoisk')).toThrow();
  });
});
