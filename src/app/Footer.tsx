import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/primitives';
import { groupedCategories } from '@shared/taxonomy';

/**
 * Footer.
 *
 * Carries the CC BY-SA attribution site-wide. Content derived from Wikipedia
 * is share-alike licensed, so the notice is a licence obligation rather than
 * a courtesy — per-entry sources are additionally listed on each detail page.
 */
export function Footer() {
  const groups = groupedCategories().slice(0, 4);

  return (
    <footer className="mt-section border-t border-line bg-base/40 no-print">
      <Container className="py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div>
            <p className="text-[0.9375rem] font-semibold text-fg">
              Arsenal<span className="text-fg-tertiary"> Atlas</span>
            </p>
            <p className="mt-3 max-w-[36ch] text-caption text-fg-secondary">
              An encyclopedia of the world&rsquo;s military equipment, built for people who want
              the detail.
            </p>
          </div>

          {groups.map(({ group, categories }) => (
            <nav key={group} aria-label={group}>
              <h2 className="text-overline uppercase text-fg-tertiary">{group}</h2>
              <ul className="mt-4 space-y-2">
                {categories.slice(0, 5).map((category) => (
                  <li key={category.slug}>
                    <Link
                      to={`/category/${category.slug}`}
                      className="text-caption text-fg-secondary transition-colors hover:text-fg"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 border-t border-line pt-8">
          <p className="max-w-[80ch] text-caption text-fg-tertiary">
            Article text is adapted from{' '}
            <a
              href="https://en.wikipedia.org"
              className="underline decoration-line-strong underline-offset-2 transition-colors hover:text-fg-secondary"
              rel="noopener noreferrer"
              target="_blank"
            >
              Wikipedia
            </a>{' '}
            and is available under the{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              className="underline decoration-line-strong underline-offset-2 transition-colors hover:text-fg-secondary"
              rel="license noopener noreferrer"
              target="_blank"
            >
              CC BY-SA 4.0
            </a>{' '}
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
