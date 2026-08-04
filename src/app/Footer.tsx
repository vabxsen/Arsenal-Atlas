import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/primitives';
import { DATA_VALUE } from '@/components/ui/styles';
import { categoryCounts, corpusStats } from '@/lib/aggregates';
import { useListing } from '@/lib/data';
import { getCategory } from '@shared/taxonomy';

/**
 * Footer.
 *
 * Carries the CC BY-SA attribution site-wide. Content derived from Wikipedia
 * is share-alike licensed, so the notice is a licence obligation rather than a
 * courtesy — per-entry sources are additionally listed on each detail page.
 * Do not remove it.
 *
 * The category columns used to be `groupedCategories().slice(0, 4)` with
 * `categories.slice(0, 5)` inside — arbitrary truncation that hid 24 of 44
 * categories and four of nine groups behind nothing but array order, so
 * Aviation and Naval were simply absent from every page on the site. The
 * columns are purposeful now, and the one that lists categories ranks them by
 * how many entries they actually hold.
 */
export function Footer() {
  const { data: entries } = useListing();

  const stats = entries ? corpusStats(entries) : undefined;
  const topCategories = entries
    ? [...categoryCounts(entries).entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([slug, count]) => ({ slug, count, name: getCategory(slug)?.name ?? slug }))
    : [];

  return (
    <footer className="mt-section no-print">
      {/* The measurement rule marks the page edge rather than a border doing
          it — the same device the timeline scale uses. */}
      <div aria-hidden="true" className="field-rule h-2 w-full" />

      <Container className="py-16">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div>
            <p className="text-[0.9375rem] font-semibold text-fg">
              Arsenal<span className="text-fg-tertiary"> Atlas</span>
            </p>
            <p className="mt-3 max-w-[38ch] text-caption text-fg-secondary">
              An encyclopedia of the world&rsquo;s military equipment, built for people who want
              the detail.
            </p>

            {stats ? (
              <p className={`${DATA_VALUE} mt-6`}>
                {stats.entries} entries · {stats.countries} nations · {stats.earliest}–
                {stats.latest}
              </p>
            ) : null}
          </div>

          <FooterNav
            label="Explore"
            links={[
              { to: '/browse', label: 'Browse' },
              { to: '/conflicts', label: 'Conflicts' },
              { to: '/countries', label: 'Countries' },
              { to: '/timeline', label: 'Timeline' },
              { to: '/compare', label: 'Compare' },
              { to: '/saved', label: 'Collections' },
            ]}
          />

          <FooterNav
            label="Largest Categories"
            links={topCategories.map((category) => ({
              to: `/category/${category.slug}`,
              label: category.name,
              count: category.count,
            }))}
          />

          <div>
            <h2 className="text-overline uppercase text-fg-tertiary">Sources</h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <ExternalLink href="https://en.wikipedia.org">Wikipedia</ExternalLink>
              </li>
              <li>
                <ExternalLink href="https://commons.wikimedia.org">Wikimedia Commons</ExternalLink>
              </li>
              <li>
                <ExternalLink href="https://creativecommons.org/licenses/by-sa/4.0/">
                  CC BY-SA 4.0
                </ExternalLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-line pt-8">
          <p className="max-w-[80ch] text-caption text-fg-tertiary">
            Article text is adapted from{' '}
            <ExternalLink href="https://en.wikipedia.org" inline>
              Wikipedia
            </ExternalLink>{' '}
            and is available under the{' '}
            <ExternalLink href="https://creativecommons.org/licenses/by-sa/4.0/" inline license>
              CC BY-SA 4.0
            </ExternalLink>{' '}
            licence. Photography is courtesy of Wikimedia Commons and public-domain government
            sources; individual images carry their own licence and attribution, shown alongside
            each image. Arsenal Atlas is an educational reference and is not affiliated with any
            government or manufacturer.
          </p>
          <p className="tnum mt-6 text-caption text-fg-tertiary">
            &copy; {new Date().getFullYear()} Arsenal Atlas
          </p>
        </div>
      </Container>
    </footer>
  );
}

/** Each column is its own landmark, so the label must be unique — axe's
 *  landmark-unique rule fires on two <nav>s sharing an accessible name. */
function FooterNav({
  label,
  links,
}: {
  label: string;
  links: { to: string; label: string; count?: number }[];
}) {
  return (
    <nav aria-label={label}>
      <h2 className="text-overline uppercase text-fg-tertiary">{label}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="group inline-flex items-baseline gap-2 text-caption text-fg-secondary transition-colors hover:text-fg"
            >
              {link.label}
              {link.count !== undefined ? (
                <span className="tnum text-fg-tertiary">{link.count}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ExternalLink({
  href,
  children,
  inline = false,
  license = false,
}: {
  href: string;
  children: React.ReactNode;
  inline?: boolean;
  license?: boolean;
}) {
  return (
    <a
      href={href}
      rel={license ? 'license noopener noreferrer' : 'noopener noreferrer'}
      target="_blank"
      className={
        inline
          ? 'underline decoration-line-strong underline-offset-2 transition-colors hover:text-fg-secondary'
          : 'text-caption text-fg-secondary transition-colors hover:text-fg'
      }
    >
      {children}
    </a>
  );
}
