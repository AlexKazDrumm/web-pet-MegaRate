export const KIND_OPTIONS = [
  { value: 'all', label: 'Все типы' },
  { value: 'film', label: 'Фильм' },
  { value: 'series', label: 'Сериал' },
  { value: 'cartoon', label: 'Мультфильм' },
  { value: 'cartoon_series', label: 'Мультсериал' },
  { value: 'show', label: 'Шоу' },
  { value: 'anime', label: 'Аниме' },
  { value: 'anime_series', label: 'Аниме-сериал' },
] as const;
export type KindValue = typeof KIND_OPTIONS[number]['value'];
export type SortField = 'none' | 'title' | 'avg';
export type SortOrder = 'asc' | 'desc';

interface Props {
  filterKind: KindValue;
  onFilterKindChange: (value: KindValue) => void;
  searchText: string;
  onSearchTextChange: (value: string) => void;
  sortField: SortField;
  onSortFieldChange: (value: SortField) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (value: SortOrder) => void;
}

export default function MovieFilters(props: Props) {
  return (
    <div className="filters">
      <label>Поиск
        <input value={props.searchText} onChange={event => props.onSearchTextChange(event.target.value)} placeholder="Название" />
      </label>
      <label>Тип
        <select value={props.filterKind} onChange={event => props.onFilterKindChange(event.target.value as KindValue)}>
          {KIND_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>Сортировка
        <select value={props.sortField} onChange={event => props.onSortFieldChange(event.target.value as SortField)}>
          <option value="none">По добавлению</option>
          <option value="title">По названию</option>
          <option value="avg">По оценке</option>
        </select>
      </label>
      <label>Порядок
        <select value={props.sortOrder} onChange={event => props.onSortOrderChange(event.target.value as SortOrder)}>
          <option value="asc">По возрастанию</option>
          <option value="desc">По убыванию</option>
        </select>
      </label>
    </div>
  );
}
