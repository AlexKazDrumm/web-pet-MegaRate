// src/pages/MoviesPage.tsx
import React, { useState } from 'react';
import MovieFilters, {
  KindValue, SortField, SortOrder
} from '../components/MovieFilters';
import MovieList from '../components/MovieList';
import { Link } from 'react-router-dom';

export default function MoviesPage() {
  const [version, setVersion] = useState(0);

  const [filterKind, setFilterKind] = useState<KindValue>('all');
  const [searchText, setSearchText] = useState('');
  const [sortField,  setSortField ] = useState<SortField>('none');
  const [sortOrder,  setSortOrder ] = useState<SortOrder>('asc');

  return (
    <div style={{ padding:'24px', maxWidth:'1600px', margin:'0 auto',
                  fontFamily:'sans-serif' }}>
      <header className="catalogHeader">
        <div><h1>Каталог</h1><p>Личные оценки и данные из открытых каталогов кино.</p></div>
        <Link className="primaryButton" to="/add-movie">Добавить фильм</Link>
      </header>
      <div style={{ display:'flex', alignItems:'flex-start',
                    marginTop:'16px' }}>
        <aside style={{ width:'300px', marginRight:'16px',
                       position:'sticky', top:'24px',
                       alignSelf:'flex-start' }}>
          <MovieFilters
            filterKind={filterKind}
            onFilterKindChange={setFilterKind}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            sortField={sortField}
            onSortFieldChange={setSortField}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
          />
        </aside>

        <main style={{ flex:1 }}>
          <MovieList
            refreshKey={version}
            filterKind={filterKind}
            searchText={searchText}
            sortField={sortField}
            sortOrder={sortOrder}
          />
        </main>
      </div>
    </div>
  );
}
