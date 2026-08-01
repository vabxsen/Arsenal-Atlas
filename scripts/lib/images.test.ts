/**
 * Verifies generated Wikimedia thumbnail URLs actually resolve.
 * Run: npx tsx scripts/lib/images.test.ts
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { wikimediaSrcSet, wikimediaThumb } from '../../shared/images.ts';
import type { Equipment } from '../../shared/schema.ts';

const entries = JSON.parse(
  await readFile(join(process.cwd(), 'data', 'equipment.json'), 'utf8')
) as Equipment[];

const samples = entries
  .filter((e) => e.images.hero?.url)
  .slice(0, 6)
  .map((e) => ({ name: e.name, url: e.images.hero!.url, width: e.images.hero!.width }));

let ok = 0;
let failed = 0;

for (const sample of samples) {
  const thumb = wikimediaThumb(sample.url, 800);
  if (!thumb) {
    console.log(`FAIL  ${sample.name}: not thumbnailable\n      ${sample.url}`);
    failed++;
    continue;
  }

  const res = await fetch(thumb, {
    method: 'HEAD',
    headers: { 'User-Agent': 'ArsenalAtlas/0.1 (thumbnail verification)' },
  });

  const status = res.ok ? 'OK  ' : 'FAIL';
  if (res.ok) ok++;
  else failed++;
  console.log(`${status}  ${sample.name.padEnd(28)} ${res.status}  ${res.headers.get('content-type') ?? ''}`);
  if (!res.ok) console.log(`      ${thumb}`);
}

console.log(`\nsrcset sample:\n${wikimediaSrcSet(samples[0]!.url, samples[0]!.width)}`);
console.log(`\n${ok} ok, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
