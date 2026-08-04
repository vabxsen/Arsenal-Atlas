import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Nav } from '@/app/Nav';
import { Footer } from '@/app/Footer';
import { CommandPalette } from '@/features/search/CommandPalette';
import { useCommandPaletteShortcut } from '@/features/search/store';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { HomePage } from '@/features/home/HomePage';
import { Skeleton } from '@/components/ui/primitives';
import { DURATION, EASE_OUT_EXPO } from '@/lib/motion';

/**
 * Routes below the fold of the first paint are code-split. Home is bundled
 * eagerly because it is the landing route and splitting it would only add a
 * round-trip before the hero renders.
 */
const BrowsePage = lazy(() => import('@/features/browse/BrowsePage'));
const CategoryPage = lazy(() => import('@/features/browse/CategoryPage'));
const EquipmentPage = lazy(() => import('@/features/equipment/EquipmentPage'));
const ComparePage = lazy(() => import('@/features/compare/ComparePage'));
const CountriesPage = lazy(() => import('@/features/countries/CountriesPage'));
const TimelinePage = lazy(() => import('@/features/timeline/TimelinePage'));
const SavedPage = lazy(() => import('@/features/user/SavedPage'));
const NotFoundPage = lazy(() => import('@/features/misc/NotFoundPage'));
/**
 * The admin dashboard is one lazy chunk that pulls in the Firestore write
 * path. Splitting it matters more than the rest: a reader never loads it, and
 * a static import would undo the on-demand Firebase policy site-wide.
 */
const AdminPage = lazy(() => import('@/features/admin/AdminPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 },
  },
});

/** Restores the top of the page on navigation, as a browser would. */
function ScrollToTop() {
  const { pathname } = useLocation();
  const prefersReduced = useReducedMotion() ?? false;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  }, [pathname, prefersReduced]);

  return null;
}

/**
 * Moves focus to the main region after each route change so screen-reader and
 * keyboard users land in the new content instead of the top of the document.
 */
function FocusOnRouteChange() {
  const { pathname } = useLocation();
  useEffect(() => {
    const main = document.getElementById('main');
    if (main) {
      main.focus({ preventScroll: true });
    }
  }, [pathname]);
  return null;
}

/**
 * Route-loading placeholder.
 *
 * Echoes the shape every page actually has — a full-bleed hero, then a heading,
 * then a content grid — rather than a single squat block that resembles none of
 * them. A placeholder whose proportions do not match what replaces it reads as
 * a layout jump even when nothing actually shifts.
 */
function PageFallback() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-[52vh] w-full rounded-none" />
      <div className="mx-auto w-full max-w-(--container-page) px-6">
        <Skeleton className="mt-12 h-10 w-2/3 max-w-md" />
        <Skeleton className="mt-4 h-5 w-1/2 max-w-sm" />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const prefersReduced = useReducedMotion() ?? false;

  const variants = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
      };

  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={location.pathname}
        id="main"
        tabIndex={-1}
        className="min-h-dvh outline-none"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        transition={{
          duration: prefersReduced ? DURATION.instant : DURATION.base,
          ease: EASE_OUT_EXPO,
        }}
      >
        <Suspense fallback={<PageFallback />}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/equipment/:slug" element={<EquipmentPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/countries" element={<CountriesPage />} />
            <Route path="/countries/:iso3" element={<CountriesPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/admin/*" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </motion.main>
    </AnimatePresence>
  );
}

function Shell() {
  useCommandPaletteShortcut();

  return (
    <>
      <ScrollToTop />
      <FocusOnRouteChange />
      <Nav />
      <AnimatedRoutes />
      <Footer />
      <CommandPalette />
    </>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
