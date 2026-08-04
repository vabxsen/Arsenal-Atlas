import { Reveal } from '@/components/motion/Reveal';
import { Container } from '@/components/ui/primitives';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { WebGLShader } from '@/components/ui/WebGLShader';
import { paletteStore } from '@/features/search/store';
import { corpusStats } from '@/lib/aggregates';
import type { ListingEntry } from '@/lib/data';
import { heroReveal } from '@/lib/motion';
import { HeroStats } from './HeroStats';

/**
 * Hero.
 *
 * Composition taken from the 21st.dev shader demo: a full-bleed animated
 * fragment shader, a double-ruled box holding centred type, a status dot, and
 * a single glass button. The photograph that used to fill this section is gone
 * — the shader is the background now.
 *
 * Three things are load-bearing for `npm run verify:contrast`, which samples
 * the composited pixels behind text and asserts against `#main h1`,
 * `#main p.text-overline` and `#main p.text-body` — via `querySelector`, so it
 * takes the FIRST match in the document, and it screenshots only the top 900px.
 * So the overline stays a `<p class="text-overline">` and the blurb stays a
 * `<p class="text-body">`, both ahead of any other such element in DOM order
 * and both above the fold. Drop either class and the assertion does not fail —
 * it prints SKIP and still exits 0, silently removing the coverage.
 *
 * The demo sets its type directly on the shader. That does not survive
 * measurement here: the wave runs bright through the vertical centre, which is
 * exactly where a centred box puts its heading. The box carries a scrim for
 * that reason and no other — see the note on it below.
 */
export function Hero({ entries }: { entries: ListingEntry[] | undefined }) {
  const stats = entries ? corpusStats(entries) : undefined;

  return (
    <section className="on-dark relative isolate flex min-h-dvh items-center justify-center overflow-hidden">
      {/* The shader fills the section, not the viewport. The original pins it
          `fixed`, which would leave it painting behind every other route. */}
      <div className="absolute inset-0 z-0">
        <WebGLShader />
      </div>

      {/* Darkens the frame edges so the box is not competing with the
          brightest part of the wave, and so the section resolves into the page
          background rather than ending on a hard line. */}
      <div aria-hidden="true" className="field-vignette absolute inset-0 z-10" />

      <Container className="relative z-20">
        <Reveal variants={heroReveal} variantKey="heroReveal">
          {/* Two rules, one inside the other, as in the original. */}
          <div className="mx-auto w-full max-w-3xl border border-line-strong p-2">
            {/*
              The scrim is the one departure from the demo, and it is measured
              rather than preferred. The shader's wave peaks at full-intensity
              red/green/blue across the vertical centre; white text sitting
              directly on it measured below the 4.5:1 floor the axe gate
              enforces. A near-opaque backdrop keeps the effect visible around
              the box while the type stays legible inside it.
            */}
            <div className="relative overflow-hidden border border-line-strong bg-scrim/70 px-6 py-12 backdrop-blur-md sm:px-10">
              <p className="text-center text-overline uppercase text-fg-tertiary">
                An encyclopedia of military equipment
              </p>

              <h1 className="mt-4 text-center text-display font-extrabold tracking-tighter text-fg">
                Explore the World&rsquo;s Military Arsenal
              </h1>

              <p className="mx-auto mt-5 max-w-[52ch] text-center text-body text-fg-secondary">
                Specifications, history, and imagery for the firearms, armour, aircraft, and
                vessels that define modern warfare.
              </p>

              {/* The demo's availability indicator, carrying something true —
                  the span is derived, so it cannot go stale. */}
              {stats ? (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <span className="relative flex size-3 items-center justify-center">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-success" />
                  </span>
                  <p className="tnum text-caption text-success">
                    Live index · {stats.earliest}&ndash;{stats.latest}
                  </p>
                </div>
              ) : null}

              <div className="mt-9 flex justify-center">
                <LiquidButton
                  size="xl"
                  onClick={() => paletteStore.open()}
                  className="border border-line-strong text-fg"
                >
                  Search the arsenal
                </LiquidButton>
              </div>

              {/*
                Inside the box, not floating on the shader beneath it.
                The wave runs bright and diagonal across the lower frame, and
                it crossed the stats exactly — "44 CATEGORIES" was unreadable
                against the white band. verify:contrast never saw it, because
                its targets are the heading, overline and blurb; this is the
                failure class a gate cannot cover, only a screenshot.

                Moving them in also retires a redundancy: the status line above
                was reprinting the same entry and nation counts.
              */}
              <div className="mt-10 border-t border-line pt-8">
                <HeroStats entries={entries} />
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
