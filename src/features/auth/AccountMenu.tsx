import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, LogOut, Monitor, Moon, ShieldCheck, Sun, User as UserIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useTheme, type ThemePreference } from '@/features/theme/useTheme';
import { useFavorites } from '@/features/user/collections';
import { useAuth } from './useAuth';

const THEMES: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
];

/**
 * Account and preferences menu.
 *
 * Also hosts the theme control, because a settings popover is where people
 * look for it and the nav has no room for a third standalone button.
 */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const { user, available, isAdmin, signIn, signOut, error } = useAuth();
  const { preference, setTheme } = useTheme();
  const { favorites, synced } = useFavorites();

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Dismiss on outside click or Escape — a popover that only closes via its
  // own trigger feels broken.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="grid size-11 place-items-center rounded-full text-fg-secondary transition-colors hover:bg-card hover:text-fg"
      >
        <span className="sr-only">Account and preferences</span>
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="size-7 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <UserIcon size={18} aria-hidden="true" />
        )}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            aria-label="Account and preferences"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-(--radius-sheet) border border-line-strong bg-elevated shadow-(--shadow-sheet)"
          >
            <div className="border-b border-line p-4">
              <p className="text-overline uppercase text-fg-tertiary">Appearance</p>
              <div
                className="mt-3 flex gap-1"
                role="radiogroup"
                aria-label="Colour theme"
              >
                {THEMES.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={preference === value}
                    onClick={() => setTheme(value)}
                    className={cn(
                      'flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-xl border text-[0.6875rem] transition-colors',
                      preference === value
                        ? 'border-line-glow bg-card text-fg'
                        : 'border-line text-fg-secondary hover:text-fg'
                    )}
                  >
                    <Icon size={15} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Link
              to="/saved"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center gap-3 px-4 text-caption text-fg-secondary transition-colors hover:bg-card hover:text-fg"
            >
              <Bookmark size={16} aria-hidden="true" />
              Saved
              <span className="tnum ml-auto text-fg-tertiary">{favorites.length}</span>
            </Link>

            {/* Shown only to accounts whose token carries the admin claim, so
                the entry point stays invisible to everyone else. The claim is
                still re-checked by the route guard and by firestore.rules —
                hiding a link is presentation, not access control. */}
            {isAdmin ? (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center gap-3 px-4 text-caption text-fg-secondary transition-colors hover:bg-card hover:text-fg"
              >
                <ShieldCheck size={16} aria-hidden="true" />
                Admin
              </Link>
            ) : null}

            {available ? (
              <div className="border-t border-line p-4">
                {user ? (
                  <>
                    <p className="truncate text-caption text-fg">{user.displayName ?? user.email}</p>
                    <p className="mt-0.5 text-[0.6875rem] text-fg-tertiary">
                      {synced ? 'Saved items sync to this account' : 'Signed in'}
                    </p>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-xl border border-line px-3 text-caption text-fg-secondary transition-colors hover:text-fg"
                    >
                      <LogOut size={15} aria-hidden="true" /> Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[0.6875rem] text-fg-tertiary">
                      Optional. Sign in only to sync saved items across devices.
                    </p>
                    <button
                      type="button"
                      onClick={() => void signIn()}
                      className="mt-3 min-h-11 w-full rounded-xl bg-fg px-3 text-caption font-medium text-deep transition-colors hover:bg-white"
                    >
                      Sign in with Google
                    </button>
                  </>
                )}
                {error ? (
                  <p role="alert" className="mt-2 text-[0.6875rem] text-danger">
                    {error}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="border-t border-line p-4 text-[0.6875rem] text-fg-tertiary">
                Saved items are stored on this device. Configure Firebase to enable sync.
              </p>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
