import { useEffect, useState } from 'react';

/** Runs `apply(list[0])` once, the first time `list` becomes non-empty. */
export function useAutoSelectFirst<T>(list: T[] | undefined, apply: (first: T) => void) {
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (list && list.length > 0 && !applied) {
      apply(list[0]);
      setApplied(true);
    }
  }, [list, applied]);
}
