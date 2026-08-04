import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Menu, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { motionWhen, TRANSITION_HOVER } from '@/lib/motion';
import { paletteStore } from '@/features/search/store';
import { AccountMenu } from '@/features/auth/AccountMenu';

const LINKS = [
  { to: '/browse', label: 'Browse' },
  { to: '/conflicts', label: 'Conflicts' },
  { to: '/countries', label: 'Countries' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/compare', label: 'Compare' },
];

/**
 * Frosted navigation.
 *
 * Transparent over the hero and blurs in on scroll, so the homepage opens on
 * uninterrupted imagery. The blur is applied to a background layer rather than
 * the bar itself to keep text rendering crisp.
 */
export function Nav() {
  // Initialised from the current scroll position rather than set inside the
  // effect, so a page restored mid-scroll paints the frosted bar immediately.
  const [scrolled, setScrolled] = useState(() => window.scrollY > 24);
  const [menuOpen, setMenuOpen] = useState(false);
  const prefersReduced = useReducedMotion() ?? false;
  const location = useLocation();
  const openPalette = () => paletteStore.open();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile sheet on navigation. Tracked during render rather than in
  // an effect so the sheet is already gone on the first frame of the new route
  // instead of flashing for one paint.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    if (menuOpen) setMenuOpen(false);
  }

  // Home and detail pages open with a full-bleed photographic hero that stays
  // dark in both themes. While the bar is still transparent over one of those,
  // it has to adopt the dark tokens too — otherwise light mode paints dark nav
  // text onto a dark image. Once scrolled, the frosted backdrop takes over and
  // the page tokens are correct again.
  const overDarkHero =
    !scrolled &&
    !menuOpen &&
    (location.pathname === '/' || location.pathname.startsWith('/equipment/'));

  return (
    <header className={cn('fixed inset-x-0 top-0 z-50', overDarkHero && 'on-dark')}>
      <div
        className={cn(
          'absolute inset-0 border-b transition-all duration-500 ease-(--ease-out-expo)',
          scrolled || menuOpen
            ? 'glass border-line'
            : 'border-transparent bg-transparent backdrop-blur-none'
        )}
      />

      <nav
        aria-label="Primary"
        className="relative mx-auto flex h-nav max-w-(--container-page) items-center gap-6 px-6"
      >
        {/* No aria-label: the visible text is already the accessible name,
            and an override that doesn't contain it breaks voice control. */}
        <Link to="/" className="shrink-0 text-[0.9375rem] font-semibold tracking-tight text-fg">
          Arsenal<span className="text-fg-tertiary"> Atlas</span>
        </Link>

        {/* lg, not md. A fifth link (Conflicts) plus search, account and the
            wordmark overflows a 768px bar; below this the same links are in
            the sheet, which is where they belong at that width anyway. */}
        <ul className="ml-4 hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'relative inline-flex min-h-11 items-center px-3 text-caption transition-colors duration-200',
                    isActive ? 'text-fg' : 'text-fg-secondary hover:text-fg'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive ? (
                      <motion.span
                        {...motionWhen(!prefersReduced, { layoutId: 'nav-active' })}
                        className="absolute inset-x-3 -bottom-0.5 h-px rounded-full bg-fg"
                        transition={TRANSITION_HOVER}
                      />
                    ) : null}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={openPalette}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-elevated px-4 text-caption text-fg-secondary transition-colors duration-200 hover:bg-raised hover:text-fg"
          >
            <Search size={16} aria-hidden="true" />
            {/* sr-only rather than hidden below sm: the label stays in the
                accessibility tree at every breakpoint, so the button needs no
                aria-label that could contradict its visible text. */}
            <span className="sr-only sm:not-sr-only">Search</span>
            {/* Hidden from the a11y tree: it's a visual affordance, and any
                visible text not present in the aria-label breaks voice control
                ("click Search" must match the accessible name). */}
            <kbd
              aria-hidden="true"
              className="ml-2 hidden rounded bg-raised px-1.5 py-0.5 font-sans text-[0.6875rem] text-fg-secondary lg:inline"
            >
              ⌘K
            </kbd>
          </button>

          <AccountMenu />

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-grid size-11 place-items-center rounded-full text-fg-secondary transition-colors hover:text-fg lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div className="relative border-t border-line lg:hidden">
          {/* Collections appears here and in the account menu, but not in the
              desktop bar: it is a personal view rather than a section of the
              reference, and the bar is already at its width budget. */}
          <ul className="mx-auto max-w-(--container-page) px-6 py-2">
            {[...LINKS, { to: '/saved', label: 'Collections' }].map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-12 items-center text-body transition-colors',
                      isActive ? 'text-fg' : 'text-fg-secondary'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
