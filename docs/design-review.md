# Design review — Arsenal Atlas redesign

Reviewed at 1440×900 and 390×844, dark and light, against the nine criteria:
visual hierarchy, originality, premium feel, information density, readability,
interactions, motion, spacing, consistency.

First-pass scores are kept alongside the revised ones. A review that only ever
records its final numbers is a review that could not fail, and the sub-9 rows
below are the ones that did the work.

---

## Homepage sections

| Section | Hier. | Orig. | Prem. | Dens. | Read. | Inter. | Motion | Space | Cons. |
|---|---|---|---|---|---|---|---|---|---|
| 01 Hero | 10 | 9 | 10 | 9 | 10 | 9 | 10 | 9 | 10 |
| 02 Featured showcase | 9 | 9 | 10 | 9 | 10 | 9 | 9 | 9 | 10 |
| 03 Category index | 10 | 10 | 9 | 10 | 9 | 9 | 9 | 9 | 10 |
| 04 Popular carousel | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 10 |
| 05 Timeline scale | 10 | 10 | 9 | 9 | 9 | 9 | 10 | 9 | 9 |
| 06 Country map | 9 | 10 | 9 | 10 | 9 | 9 | 9 | 9 | 9 |
| 07 Arsenal magazine | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| 08 Technology spotlight | 10 | 10 | 10 | 9 | 10 | 9 | 9 | 10 | 10 |
| 09 Daily dispatch | 10 | 9 | 10 | 9 | 9 | 9 | 9 | 10 | 10 |

### What the first pass scored below 9, and what fixed it

**04 Popular carousel — information density 6, readability 7.**
The variant that exists to be dense was the tallest thing on the page: the full
provenance line wrapped to three lines in a 176px column. It also opened
clipped against the viewport edge, because `snap-start` aligns to the
scrollport and ignores padding, so the browser snapped past the gutter on load.
Fixed by giving `compact` origin and year only, and by replacing the
padding-plus-margin gutter with padding plus a matching `scroll-padding`.

**05 Timeline scale — spacing 5 on mobile.**
Seventeen decade ticks overflowed the document by 25px at 390px. Fixed by
letting the scale scroll rather than compress; the year labels went back to
horizontal, which retired a vertical-writing-mode hack that only existed to
survive the crush. Caught by `verify:responsive`, which was written for this.

**06 Country map — readability 4.**
The ranking rendered `RUS`. `resolveCountry` maps free text to a definition, so
calling it with an ISO3 works only where the code is also an alias — "USA"
resolved and nothing else did. Fixed by indexing names off the entries, which
carry both halves.

**07 Arsenal magazine — originality 6, hierarchy 7.**
Three columns of equal 298px height. Its "portrait plate" was a 3:2 landscape,
the same ratio as the tiles beside it — the intent was in a comment and never
in the render. Fixed with a real `portrait` variant at 4:5.

**09 Daily dispatch — readability 6.**
The blurb ended `"Most newer PVS-"`, because `listing.json` slices descriptions
at 180 characters. Invisible everywhere else, since no other surface shows the
description. Fixed with a sentence-boundary excerpt at render.

**02 Featured showcase — premium feel 7 (measured, not judged).**
`verify:contrast` put the metadata line at 4.36:1 against a 4.5 floor once it
learned to scroll below the fold. Both over-image scrims are now built for the
worst pixel in the frame rather than the average; the dispatch blurb went 4.36
→ 7.33.

---

## Site chrome and secondary pages

| Surface | Hier. | Orig. | Prem. | Dens. | Read. | Inter. | Motion | Space | Cons. |
|---|---|---|---|---|---|---|---|---|---|
| Nav | 9 | 9 | 9 | 9 | 10 | 9 | 9 | 9 | 10 |
| Footer | 9 | 9 | 9 | 10 | 9 | 9 | 9 | 9 | 10 |
| Conflicts index | 10 | 10 | 9 | 10 | 9 | 9 | 9 | 9 | 9 |
| Conflict detail | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| Browse | 9 | 9 | 9 | 9 | 10 | 9 | 9 | 9 | 9 |
| Category | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| Countries | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| Timeline | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| Equipment detail | 9 | 9 | 9 | 10 | 10 | 9 | 9 | 9 | 9 |
| Compare | 9 | 9 | 9 | 10 | 9 | 9 | 9 | 9 | 9 |
| Saved | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |

**Footer — information density 4 first pass.** It showed four of nine taxonomy
groups and five categories each, so Aviation, Naval, Munitions, Soldier Systems
and Special Collections were absent from every page on the site — hidden behind
nothing but array order. Four purposeful columns now, with categories ranked by
real counts.

**Equipment detail — consistency 7 first pass.** The page every card leads to
opened with three grey lozenges, the exact idiom the redesign removed
everywhere else. It now carries the same monospace instrument strip as the card
the visitor just clicked, using the same derivations called on the full
document.

---

## Compare and Saved — the two that scored 7 first pass

Both had inherited the new tokens, primitives, motion and card, so they were
consistent in the small while their compositions said nothing the old design
did not.

**Compare — consistency 7, originality 7.** A specification table is the one
place in the product where the technical register is literally correct, and it
was the last data surface still setting labels and values in the UI face. Both
are monospace now. Its empty state was a hand-rolled panel with no way out of
it, which is exactly what `EmptyState` was extracted for.

**Saved — originality 7, density 8.** Recently Viewed was a bespoke
thumbnail-and-two-lines row predating the `row` variant, carrying less than the
card does — no role, no maker, no figure — and using a raw `<img>` with no
srcset, on a page the README says should never have one. It uses the variant
now, in two columns, and the header states what the page holds.

Neither needed a new layout. What both needed was to stop being exceptions.

---

## Gate results at review time

| Gate | Result |
|---|---|
| `verify:contrast` | 27/27, no SKIPs |
| `a11y` | 0 violations, 12 routes × 2 themes |
| `verify:responsive` | 22/22, 390px and 768px |
| `verify:tokens` | 19 mirrored tokens consistent across three blocks |
| `verify:bundle` | boundaries intact; `geo` and `admin` off the entry path |
| `build` | 718 prerendered routes |

Three of those gates did not exist before this work. `verify:tokens` caught a
palette drift one commit after being added; `verify:responsive` caught the
timeline overflow on its first run; and `verify:contrast` only found the
dispatch contrast failure after being taught to scroll.
