import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Clock, CornerDownLeft, Search, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { DURATION, EASE_OUT_EXPO } from '@/lib/motion';
import { sizedImage } from '@shared/images';
import { getCategory } from '@shared/taxonomy';
import type { SearchEntry } from '@shared/schema';
import {
  paletteStore,
  pushRecentSearch,
  readRecentSearches,
  usePaletteOpen,
} from './store';
import { usePopularEntries, useSearch } from './useSearch';

export function CommandPalette() {
  const isOpen = usePaletteOpen();
  const prefersReduced = useReducedMotion() ?? false;

  return (
    <AnimatePresence>
      {isOpen ? <PaletteDialog prefersReduced={prefersReduced} /> : null}
    </AnimatePresence>
  );
}

function PaletteDialog({ prefersReduced }: { prefersReduced: boolean }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  // Read once on open; the list only changes when the palette commits a
  // selection, at which point the palette is closing anyway.
  const [recents] = useState<string[]>(() => readRecentSearches());

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /** Focus is returned here on close, so keyboard users don't lose their place. */
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const listboxId = useId();

  const { results } = useSearch(query);
  const popular = usePopularEntries(6);

  const showingResults = query.trim().length >= 2;
  const entries: SearchEntry[] = showingResults ? results.map((r) => r.entry) : popular;

  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();

    // Lock the page behind the dialog without a layout jump from the
    // disappearing scrollbar.
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      restoreFocusRef.current?.focus();
    };
  }, []);

  // Derived, not an effect: resetting the highlight is a consequence of the
  // query changing, so tracking it during render avoids a second commit.
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    setActiveIndex(0);
  }

  const commit = useCallback(
    (entry: SearchEntry | undefined) => {
      if (!entry) return;
      pushRecentSearch(query);
      paletteStore.close();
      void navigate(`/equipment/${entry.slug}`);
    },
    [navigate, query]
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      paletteStore.close();
      return;
    }
    if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % Math.max(entries.length, 1));
      return;
    }
    if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + entries.length) % Math.max(entries.length, 1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      commit(entries[activeIndex]);
    }
  };

  // Keep the highlighted row in view during keyboard navigation.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const motionProps = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.97, y: -8 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98, y: -4 },
      };

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center p-4 pt-[12vh] sm:p-6 sm:pt-[14vh]">
      <motion.div
        className="absolute inset-0 bg-deep/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={() => paletteStore.close()}
        aria-hidden="true"
      />

      <motion.div
        {...motionProps}
        transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
        role="dialog"
        aria-modal="true"
        aria-label="Search equipment"
        className="relative w-full max-w-2xl overflow-hidden rounded-(--radius-sheet) border border-line-strong bg-elevated shadow-(--shadow-sheet)"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-line px-5">
          <Search size={18} className="shrink-0 text-fg-tertiary" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search 380+ entries…"
            className="h-14 w-full bg-transparent text-body text-fg outline-none placeholder:text-fg-tertiary"
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={
              entries[activeIndex] ? `${listboxId}-${activeIndex}` : undefined
            }
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[0.6875rem] text-fg-tertiary sm:inline">
            ESC
          </kbd>
        </div>

        <div className="max-h-[min(28rem,55vh)] overflow-y-auto overscroll-contain">
          {!showingResults ? (
            <div className="flex items-center gap-2 px-5 pt-4 text-overline uppercase text-fg-tertiary">
              <TrendingUp size={12} aria-hidden="true" /> Popular
            </div>
          ) : null}

          {showingResults && entries.length === 0 ? (
            <p className="px-5 py-10 text-center text-caption text-fg-secondary">
              No equipment matches &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <ul ref={listRef} id={listboxId} role="listbox" aria-label="Search results" className="p-2">
              {entries.map((entry, index) => (
                <ResultRow
                  key={entry.id}
                  id={`${listboxId}-${index}`}
                  index={index}
                  entry={entry}
                  active={index === activeIndex}
                  onSelect={() => commit(entry)}
                  onHover={() => setActiveIndex(index)}
                />
              ))}
            </ul>
          )}

          {!showingResults && recents.length > 0 ? (
            <div className="border-t border-line px-5 py-4">
              <div className="flex items-center gap-2 text-overline uppercase text-fg-tertiary">
                <Clock size={12} aria-hidden="true" /> Recent
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {recents.map((recent) => (
                  <li key={recent}>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(recent);
                        inputRef.current?.focus();
                      }}
                      className="rounded-full border border-line bg-card px-3 py-1.5 text-caption text-fg-secondary transition-colors hover:border-line-strong hover:text-fg"
                    >
                      {recent}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-4 border-t border-line px-5 py-3 text-[0.6875rem] text-fg-tertiary">
          <span className="flex items-center gap-1.5">
            <CornerDownLeft size={11} aria-hidden="true" /> to open
          </span>
          <span>↑↓ to navigate</span>
          <span className="ml-auto tnum">{entries.length} shown</span>
        </div>
      </motion.div>
    </div>
  );
}

function ResultRow({
  id,
  index,
  entry,
  active,
  onSelect,
  onHover,
}: {
  id: string;
  index: number;
  entry: SearchEntry;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const category = getCategory(entry.category);

  return (
    <li
      id={id}
      data-index={index}
      role="option"
      aria-selected={active}
      className={cn(
        'flex cursor-pointer items-center gap-4 rounded-xl px-3 py-2.5 transition-colors duration-150',
        active ? 'bg-raised' : 'hover:bg-card'
      )}
      onMouseMove={onHover}
      onClick={onSelect}
    >
      <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-base">
        {entry.thumb ? (
          <img
            src={sizedImage(entry.thumb, 330)}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] text-fg">{entry.name}</p>
        <p className="tnum truncate text-caption text-fg-tertiary">
          {category?.name ?? entry.category}
          {entry.country ? ` · ${entry.country}` : ''}
          {entry.year ? ` · ${entry.year}` : ''}
        </p>
      </div>
    </li>
  );
}
