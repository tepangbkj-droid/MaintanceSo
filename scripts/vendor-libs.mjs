// Unduh library pihak ketiga SEKALI lalu simpan di repo web (folder vendor/), supaya situs tidak lagi
// memuat kode dari unpkg/cdnjs (CSP bisa script-src 'self'). Jalankan dari folder repo web (Node 18+):
//   node scripts/vendor-libs.mjs
// Lalu commit folder vendor/. Ulangi hanya bila ingin menaikkan versi (ubah nomor versi di bawah).
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const OUT = 'vendor';
const JS = [
  ['https://unpkg.com/react@18.3.1/umd/react.production.min.js', 'react.production.min.js'],
  ['https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js', 'react-dom.production.min.js'],
  ['https://unpkg.com/lucide@0.383.0/dist/umd/lucide.min.js', 'lucide.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js', 'qrcode.min.js'],
];
const FONT_CSS = [
  ['inter', '5.0.16', [400, 500, 600, 700]],
  ['plus-jakarta-sans', '5.0.16', [600, 700, 800]],
];

const hashes = [];
async function get(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
async function save(rel, buf) {
  const dest = path.join(OUT, rel);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  hashes.push(`sha384-${createHash('sha384').update(buf).digest('base64')}  ${rel}`);
  console.log('OK', rel, buf.length, 'bytes');
}

// Ambil hanya subset "latin" (cukup untuk Bahasa Indonesia), hanya woff2, URL font ditulis ulang ke lokal.
export function transformFontCss(css, pkg, cssUrl) {
  const faces = css.match(/@font-face\s*\{[^}]*\}/g) || [];
  const files = [];
  const out = [];
  for (const face of faces) {
    const m = face.match(/url\(\s*['"]?([^'")]+\.woff2)['"]?\s*\)/);
    if (!m || !/-latin-\d+-(normal|italic)\.woff2$/.test(m[1])) continue;
    const abs = new URL(m[1], cssUrl).toString();
    const name = path.posix.basename(m[1]);
    files.push([abs, `fonts/${pkg}/${name}`]);
    out.push(face.replace(/src:[^;]*;/, `src: url(fonts/${pkg}/${name}) format('woff2');`));
  }
  return { css: out.join('\n'), files };
}

async function main() {
  for (const [url, name] of JS) await save(name, await get(url));
  let allCss = '/* Dihasilkan scripts/vendor-libs.mjs - jangan diedit manual */\n';
  for (const [pkg, ver, weights] of FONT_CSS) {
    for (const w of weights) {
      const cssUrl = `https://unpkg.com/@fontsource/${pkg}@${ver}/${w}.css`;
      const { css, files } = transformFontCss((await get(cssUrl)).toString('utf8'), pkg, cssUrl);
      if (!files.length) throw new Error(`Tidak ada font latin ditemukan di ${cssUrl}`);
      for (const [abs, rel] of files) await save(rel, await get(abs));
      allCss += css + '\n';
    }
  }
  await save('fonts.css', Buffer.from(allCss));
  await writeFile(path.join(OUT, 'SHA384.txt'), hashes.join('\n') + '\n');
  console.log('\nSelesai. Commit folder vendor/ lalu deploy.');
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
