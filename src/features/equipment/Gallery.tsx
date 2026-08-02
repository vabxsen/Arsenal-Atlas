import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { sizedImage } from '@shared/images';
import type { ImageRef } from '@shared/schema';

/**
 * Fullscreen gallery viewer.
 *
 * Accessibility contract:
 *   - focus is trapped inside the dialog and restored to the trigger on close
 *   - arrows navigate, Escape closes, +/- zoom
 *   - every image carries its licence and author, which CC BY-SA requires
 */
export function GalleryViewer({
  images,
  startIndex,
  onClose,
  title,
}: {
  images: ImageRef[];
  startIndex: number;
  onClose: () => void;
  title: string;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const prefersReduced = useReducedMotion() ?? false;

  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const current = images[index];
  const count = images.length;

  const go = useCallback(
    (delta: number) => {
      setZoomed(false);
      setIndex((i) => (i + delta + count) % count);
    },
    [count]
  );

  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
      restoreFocusRef.current?.focus();
    };
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
      case 'ArrowRight':
        event.preventDefault();
        go(1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        go(-1);
        break;
      case '+':
      case '=':
        event.preventDefault();
        setZoomed(true);
        break;
      case '-':
        event.preventDefault();
        setZoomed(false);
        break;
      case 'Tab': {
        // Trap focus: this dialog covers the whole viewport, so tabbing out
        // would strand the user on invisible content behind it.
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables?.length) break;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
        break;
      }
      default:
        break;
    }
  };

  if (!current) return null;

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} gallery, image ${index + 1} of ${count}`}
      tabIndex={-1}
      className="fixed inset-0 z-100 flex flex-col bg-deep/97 outline-none backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onKeyDown={onKeyDown}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <p className="tnum text-caption text-fg-tertiary">
          {index + 1} / {count}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            className="grid size-11 place-items-center rounded-full text-fg-secondary transition-colors hover:bg-card hover:text-fg"
            aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
            aria-pressed={zoomed}
          >
            {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-full text-fg-secondary transition-colors hover:bg-card hover:text-fg"
            aria-label="Close gallery"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
        {count > 1 ? (
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 z-10 grid size-12 place-items-center rounded-full border border-line bg-card/80 text-fg-secondary backdrop-blur transition-colors hover:text-fg sm:left-6"
            aria-label="Previous image"
          >
            <ChevronLeft size={22} />
          </button>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.img
            key={current.url}
            // The one surface whose entire purpose is looking closely at the
            // image, so it asks for the largest rendition the source supports
            // rather than a flat 1280 — at DPR 2 a near-fullscreen viewer wants
            // ~2560. Passing the source width keeps Commons from being asked to
            // upscale a small original into a bucket it cannot fill.
            src={sizedImage(current.url, 1920, current.width)}
            alt={current.caption ?? `${title}, image ${index + 1}`}
            className={cn(
              'max-h-full max-w-full object-contain',
              zoomed ? 'cursor-zoom-out scale-150' : 'cursor-zoom-in'
            )}
            onClick={() => setZoomed((z) => !z)}
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: zoomed ? 1.5 : 1 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          />
        </AnimatePresence>

        {count > 1 ? (
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 z-10 grid size-12 place-items-center rounded-full border border-line bg-card/80 text-fg-secondary backdrop-blur transition-colors hover:text-fg sm:right-6"
            aria-label="Next image"
          >
            <ChevronRight size={22} />
          </button>
        ) : null}
      </div>

      <div className="shrink-0 px-5 py-4">
        {current.caption ? (
          <p className="mx-auto mb-3 max-w-3xl text-center text-caption text-fg-secondary">
            {current.caption}
          </p>
        ) : null}
        <ImageCredit image={current} className="justify-center" />

        {count > 1 ? (
          <ul className="mt-4 flex justify-center gap-2 overflow-x-auto pb-1">
            {images.map((image, i) => (
              <li key={image.url}>
                <button
                  type="button"
                  onClick={() => {
                    setZoomed(false);
                    setIndex(i);
                  }}
                  className={cn(
                    'size-14 shrink-0 overflow-hidden rounded-lg border transition-all duration-200',
                    i === index
                      ? 'border-fg opacity-100'
                      : 'border-line opacity-50 hover:opacity-90'
                  )}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === index}
                >
                  <img
                    src={sizedImage(image.url, 330, image.width)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </motion.div>
  );
}

/** Licence and author line. Required by CC BY-SA for every reused image. */
export function ImageCredit({ image, className }: { image: ImageRef; className?: string }) {
  return (
    <p className={cn('flex flex-wrap items-center gap-x-2 text-[0.6875rem] text-fg-tertiary', className)}>
      {image.attribution ? <span>{image.attribution}</span> : null}
      {image.licenseUrl ? (
        <a
          href={image.licenseUrl}
          target="_blank"
          rel="license noopener noreferrer"
          className="underline decoration-line-strong underline-offset-2 hover:text-fg-secondary"
        >
          {image.license}
        </a>
      ) : (
        <span>{image.license}</span>
      )}
      {image.descriptionUrl ? (
        <a
          href={image.descriptionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-line-strong underline-offset-2 hover:text-fg-secondary"
        >
          Source
        </a>
      ) : null}
    </p>
  );
}
