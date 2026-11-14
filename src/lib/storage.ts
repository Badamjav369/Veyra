import { STORAGE_PREFIX } from '../../shared/config';

// localStorage under one prefix. Every call fails quietly: storage can be blocked (private mode) or full.

export const storage = {
  get(name: string): string | null {
    try {
      return window.localStorage.getItem(STORAGE_PREFIX + name);
    } catch {
      return null;
    }
  },
  /** Throws when storage is full or blocked; use `trySet` when losing the value is fine. */
  set(name: string, value: string) {
    window.localStorage.setItem(STORAGE_PREFIX + name, value);
  },
  trySet(name: string, value: string): boolean {
    try {
      this.set(name, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(name: string) {
    try {
      window.localStorage.removeItem(STORAGE_PREFIX + name);
    } catch {
      /* nothing to remove */
    }
  },
};
