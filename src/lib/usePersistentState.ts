import { useCallback, useState } from 'react';
import { storage } from './storage';

/** useState that remembers its value in localStorage (memory only when storage is blocked). */
export function usePersistentState<T>(name: string, fallback: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = storage.get(name);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  });

  const update = useCallback(
    (next: T) => {
      setValue(next);
      storage.trySet(name, JSON.stringify(next));
    },
    [name],
  );

  return [value, update];
}
