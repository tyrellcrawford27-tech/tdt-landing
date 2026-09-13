import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';

// Derivatives only: keep the user's original exports untouched.
const output = new URL('../public/how-it-works/', import.meta.url);
await mkdir(output, { recursive: true });
if (!process.argv.includes('--jaiden-avatar-only') && !process.argv.includes('--andre-avatar-only')) {
for (const [source, name] of [['Account.png', 'community'], ['final-meet.png', 'final-meet'], ['final-per.png', 'final-per']]) {
  const original = new URL(`../public/${source}`, import.meta.url);
  const target = new URL(`${name}.webp`, output);
  await sharp(original.pathname).resize({ width: 1500, withoutEnlargement: true }).webp({ quality: 85, effort: 6 }).toFile(target.pathname);
  const before = (await stat(original)).size, after = (await stat(target)).size;
  console.log(`${source}: ${before} → ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller)`);
}
// The same example avatars from Account.png, sized for 40px @2x instead
// of making every bubble download the full 5200px community screenshot.
for (const [name, area] of [
  ['avatar-training', { left: 4854, top: 58, width: 287, height: 287 }],
  ['avatar-player', { left: 3400, top: 4140, width: 175, height: 175 }],
]) {
  await sharp(new URL('../public/Account.png', import.meta.url).pathname).extract(area).resize(80, 80).webp({ quality: 85 }).toFile(new URL(`${name}.webp`, output).pathname);
}
}
// 40px avatar at double pixel density, preserving the uploaded original.
const jaidenSource = new URL('../public/jaiden-pfp.png', import.meta.url);
const jaidenTarget = new URL('avatar-jaiden.webp', output);
await sharp(jaidenSource.pathname).rotate().resize(80, 80, { fit: 'cover' }).webp({ quality: 85, effort: 6 }).toFile(jaidenTarget.pathname);
console.log(`Jaiden avatar: ${(await stat(jaidenSource)).size} → ${(await stat(jaidenTarget)).size} bytes`);
const andreSource = new URL('../public/Andre-Narciso.jpeg', import.meta.url);
await sharp(andreSource.pathname).rotate().extract({ left: 210, top: 140, width: 800, height: 800 }).resize(104, 104).webp({ quality: 85, effort: 6 }).toFile(new URL('avatar-andre.webp', output).pathname);
console.log(`Andre avatar: ${(await stat(andreSource)).size} → ${(await stat(new URL('avatar-andre.webp', output))).size} bytes`);
