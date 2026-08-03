import { Link } from 'react-router-dom';
import { Reveal } from '@/components/motion/Reveal';
import { Container } from '@/components/ui/primitives';
import { useDocumentMeta } from '@/lib/seo';

export default function NotFoundPage() {
  useDocumentMeta({
    title: 'Page Not Found | Arsenal Atlas',
    description: 'The page you were looking for does not exist.',
  });

  return (
    <Container className="flex min-h-dvh flex-col justify-center py-32">
      <Reveal>
        <p className="text-overline uppercase text-fg-tertiary">404</p>
        <h1 className="mt-6 max-w-[14ch] text-h1 text-fg">Nothing here</h1>
        <p className="mt-6 max-w-[48ch] text-body text-fg-secondary">
          That page does not exist. Try searching for what you had in mind, or start from the
          collection.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-full bg-fg px-6 text-[0.9375rem] font-medium text-deep transition-colors hover:bg-white"
          >
            Home
          </Link>
          <Link
            to="/browse"
            className="inline-flex min-h-11 items-center rounded-full bg-elevated px-6 text-[0.9375rem] font-medium text-fg transition-colors hover:bg-raised"
          >
            Browse everything
          </Link>
        </div>
      </Reveal>
    </Container>
  );
}
