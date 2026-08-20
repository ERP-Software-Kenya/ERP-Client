import { useEffect, useState } from 'react';
import { useDebounce } from './useDebounce';

export function usePagination() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  return { page, setPage, search, setSearch, debouncedSearch };
}
