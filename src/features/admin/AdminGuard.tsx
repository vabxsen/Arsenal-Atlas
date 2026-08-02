import { KeyRound, Loader2, RefreshCw, ShieldAlert, ShieldX } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button, Container } from '@/components/ui/primitives';
import { useAuth } from '@/features/auth/useAuth';

/**
 * The admin route guard.
 *
 * This is a *usability* gate, not the security boundary. Anyone can read this
 * bundle and route themselves past it; what stops them writing is
 * `firestore.rules`, which checks the same `admin` custom claim server-side on
 * every operation. The guard exists so a non-admin gets an explanation instead
 * of a screen of permission-denied errors.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { available, loading, user, isAdmin, claimsLoading, signIn, refreshClaims } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  if (!available) {
    return (
      <Notice
        Icon={ShieldAlert}
        title="Firebase is not configured"
        body="The admin dashboard writes to Firestore, so it needs credentials. Copy .env.example to .env.local and either fill in a project or set VITE_USE_EMULATORS=true and run npm run emulators."
      />
    );
  }

  if (loading || (user && claimsLoading)) {
    return (
      <Notice
        Icon={Loader2}
        spin
        title="Checking access"
        body="Reading the admin claim from your ID token."
      />
    );
  }

  if (!user) {
    return (
      <Notice
        Icon={KeyRound}
        title="Sign in to continue"
        body="The dashboard is restricted to accounts carrying the admin claim."
      >
        <Button onClick={() => void signIn()}>Sign in with Google</Button>
      </Notice>
    );
  }

  if (!isAdmin) {
    return (
      <Notice
        Icon={ShieldX}
        title="This account is not an admin"
        body={`Signed in as ${user.email ?? user.uid}. The admin claim is granted server-side with the Admin SDK — setCustomUserClaims(uid, { admin: true }) — and an already-issued token keeps its old claims for up to an hour. If the claim was just granted, refresh the token.`}
      >
        <Button
          variant="secondary"
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true);
            void refreshClaims().finally(() => setRefreshing(false));
          }}
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : undefined} aria-hidden="true" />
          {refreshing ? 'Refreshing…' : 'Refresh token'}
        </Button>
      </Notice>
    );
  }

  return <>{children}</>;
}

function Notice({
  Icon,
  title,
  body,
  spin,
  children,
}: {
  Icon: typeof ShieldAlert;
  title: string;
  body: string;
  spin?: boolean;
  children?: ReactNode;
}) {
  return (
    <Container className="pb-32 pt-nav">
      <div className="mx-auto mt-24 max-w-[52ch] rounded-(--radius-card) border border-line bg-card px-6 py-14 text-center">
        <Icon
          size={26}
          className={spin ? 'mx-auto animate-spin text-fg-tertiary' : 'mx-auto text-fg-tertiary'}
          aria-hidden="true"
        />
        <h1 className="mt-5 text-h3 text-fg">{title}</h1>
        <p className="mt-3 text-caption leading-relaxed text-fg-secondary">{body}</p>
        {children ? <div className="mt-8 flex justify-center">{children}</div> : null}
      </div>
    </Container>
  );
}
