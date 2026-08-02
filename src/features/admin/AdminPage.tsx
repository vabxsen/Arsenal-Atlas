import { lazy, Suspense } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { Container, Skeleton } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { useDocumentMeta } from '@/lib/seo';
import { useAuth } from '@/features/auth/useAuth';
import { AdminGuard } from './AdminGuard';

/**
 * The admin dashboard.
 *
 * Mounted as one lazy chunk under `/admin/*` and split again internally, so
 * none of it — nor the Firestore code it pulls in — is fetched by a visitor
 * who never opens it. The route is absent from the sitemap and the prerender,
 * and carries a noindex directive because, unlike every other route, it has no
 * prerendered shell whose head a crawler could read.
 */
const AdminOverview = lazy(() => import('./AdminOverview'));
const EquipmentList = lazy(() => import('./EquipmentList'));
const EquipmentEditor = lazy(() => import('./EquipmentEditor'));

const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/equipment', label: 'Equipment', end: false },
];

export default function AdminPage() {
  useDocumentMeta({
    title: 'Admin | Arsenal Atlas',
    description: 'Content administration for Arsenal Atlas.',
    robots: 'noindex, nofollow',
  });

  return (
    <div className="pb-32 pt-nav">
      <AdminGuard>
        <AdminChrome />
      </AdminGuard>
    </div>
  );
}

function AdminChrome() {
  const { user } = useAuth();

  return (
    <Container className="pt-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-overline uppercase text-fg-tertiary">Arsenal Atlas</p>
          <h1 className="mt-2 text-h2 text-fg">Admin</h1>
        </div>
        {user ? (
          <p className="text-caption text-fg-tertiary">
            {user.email ?? user.uid} · admin
          </p>
        ) : null}
      </header>

      <nav aria-label="Admin sections" className="mt-6 flex gap-1">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'inline-flex min-h-11 items-center rounded-full px-4 text-caption transition-colors',
                isActive
                  ? 'bg-card text-fg'
                  : 'text-fg-secondary hover:bg-card/60 hover:text-fg'
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-10">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="equipment" element={<EquipmentList />} />
            <Route path="equipment/:slug" element={<EquipmentEditor />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </Container>
  );
}

function NotFound() {
  return (
    <p className="rounded-(--radius-card) border border-dashed border-line px-6 py-16 text-center text-caption text-fg-tertiary">
      No such admin screen.
    </p>
  );
}
