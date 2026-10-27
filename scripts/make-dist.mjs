// Menyalin HANYA file yang dibutuhkan web ke folder dist/ (dipakai Cloudflare Pages: build command `node scripts/make-dist.mjs`, output `dist`).
// File sumber/build (index.source.html, psikotes.src.html, tailwind*, scripts, .github, dll) TIDAK ikut dipublikasikan.
import { cpSync, rmSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const SKIP = new Set(['dist', 'node_modules', '.git', '.github', 'scripts', 'package.json', 'package-lock.json', 'vercel.json', 'dependabot.yml', 'index.source.html', 'psikotes.src.html', 'tailwind.psikotes.config.cjs', 'README.md']);
const SKIP_EXT = ['.patch', '.md', '.cjs'];
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
let n = 0;
for (const name of readdirSync('.')) {
  if (SKIP.has(name) || SKIP_EXT.some((e) => name.endsWith(e))) continue;
  cpSync(name, join('dist', name), { recursive: true });
  n += statSync(name).isDirectory() ? 0 : 1;
}
console.log('dist siap, file di root:', n);
