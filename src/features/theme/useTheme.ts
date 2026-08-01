import { useCallback, useEffect, useSyncExternalStore } from 'react';

/**
 * Theme preference.
 *
 * Dark is the canonical design, but the preference is tri-state: an explicit
 * `light`/`dark` choice, or `system` to follow the OS. Resolution is written
 * to `data-theme` on <html>, which is what the CSS overrides key off.
 *
 * The initial value is applied by an inline script in index.html before first
 * paint — doing it in an effect would flash the wrong theme on every load.
 */

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'aa.theme';

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {
    /* Storage unavailable — fall through to the default. */
  }
  return 'dark';
}

let preference: ThemePreference = typeof window === 'undefined' ? 'dark' : readStored();
const listeners = new Set<() => void>();

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return pref;
}

function apply(pref: ThemePreference): void {
  const resolved = resolveTheme(pref);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;

  // Keep the browser UI (address bar, form controls) in step with the page.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = resolved === 'dark' ? '#020202' : '#fbfbfd';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => preference;
const getServerSnapshot = (): ThemePreference => 'dark';

export function setThemePreference(next: ThemePreference): void {
  preference = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  apply(next);
  for (const listener of listeners) listener();
}

export function useTheme() {
  const pref = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Only meaningful while following the system; an explicit choice must not
  // be overridden when the OS switches.
  useEffect(() => {
    if (pref !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [pref]);

  const cycle = useCallback(() => {
    const order: ThemePreference[] = ['dark', 'light', 'system'];
    const index = order.indexOf(pref);
    setThemePreference(order[(index + 1) % order.length] as ThemePreference);
  }, [pref]);

  return { preference: pref, resolved: resolveTheme(pref), setTheme: setThemePreference, cycle };
}
