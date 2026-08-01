import { useEffect, useSyncExternalStore } from 'react';

/**
 * Minimal external store for command-palette open state.
 *
 * Hand-rolled rather than pulling in a state library: this is one boolean
 * shared between the nav button and a global keyboard shortcut, and
 * useSyncExternalStore covers it without another dependency in the bundle.
 */

let isOpen = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const paletteStore = {
  open(): void {
    if (isOpen) return;
    isOpen = true;
    emit();
  },
  close(): void {
    if (!isOpen) return;
    isOpen = false;
    emit();
  },
  toggle(): void {
    isOpen = !isOpen;
    emit();
  },
  getSnapshot(): boolean {
    return isOpen;
  },
  subscribe,
};

/** Arrow wrappers keep the store methods from being passed unbound. */
const getSnapshot = () => isOpen;
const getServerSnapshot = () => false;

export function usePaletteOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Registers the global ⌘K / Ctrl-K shortcut. Mounted once, at the app root.
 * Lives here rather than beside the dialog so the component module only
 * exports components (keeps Fast Refresh working).
 */
export function useCommandPaletteShortcut(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        paletteStore.toggle();
        return;
      }
      // "/" is a common search shortcut, but must not hijack typing.
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true;
      if (event.key === '/' && !typing) {
        event.preventDefault();
        paletteStore.open();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

// ── Recent searches ───────────────────────────────────────────

const RECENT_KEY = 'aa.recent-searches';
const RECENT_LIMIT = 6;

export function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    // Private mode or disabled storage — recents are a convenience, not a
    // requirement, so degrade silently.
    return [];
  }
}

export function pushRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (trimmed.length < 2) return;
  try {
    const next = [trimmed, ...readRecentSearches().filter((q) => q !== trimmed)].slice(
      0,
      RECENT_LIMIT
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* ignore */
  }
}
