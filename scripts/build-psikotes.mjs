// Kompilasi halaman psikotes agar CSP bisa script-src 'self' (tanpa 'unsafe-eval' / 'unsafe-inline' / CDN).
// Sumber  : psikotes.src.html  (JSX + Tailwind CDN, JANGAN dihapus; edit psikotes di file ini)
// Hasil   : psikotes.html, psikotes.app.js, psikotes.patch.js, psikotes.css  (+ CSP psikotes di vercel.json)
// Jalankan: lewat GitHub Actions "Build psikotes", atau lokal:
//   npm i --no-save esbuild@0.24.0 tailwindcss@3.4.14 && node scripts/build-psikotes.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { transformSync } from 'esbuild';

const src = readFileSync('psikotes.src.html', 'utf8');

// 1) skrip inline biasa (patch DOM) dan skrip JSX
const scripts = [...src.matchAll(/<script(?<attrs>[^>]*)>(?<body>[\s\S]*?)<\/script>/g)]
  .filter((m) => !/\bsrc=/.test(m.groups.attrs));
const jsx = scripts.find((m) => /text\/babel/.test(m.groups.attrs));
const patch = scripts.find((m) => !/text\/babel/.test(m.groups.attrs) && /removeChild/.test(m.groups.body));
if (!jsx || !patch) throw new Error('Skrip JSX / patch DOM tidak ditemukan di psikotes.src.html');

const out = transformSync(jsx.groups.body, { loader: 'jsx', jsx: 'transform', target: 'es2019', minify: true });
writeFileSync('psikotes.app.js', out.code);
writeFileSync('psikotes.patch.js', patch.groups.body.trim() + '\n');

// 2) CSS: Tailwind dikompilasi (bukan CDN) + <style> inline dipindah ke file
const style = (src.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
writeFileSync('tmp-psikotes-in.css', `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n${style}\n`);
writeFileSync('tailwind.psikotes.config.cjs', `module.exports = {
  content: ['./psikotes.src.html', './psikotes.app.js'],
  theme: { extend: {
    colors: { brand: { purple: '#6D28D9', dark: '#1E1B4B' } },
    fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'], display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'sans-serif'] },
  } },
};\n`);
execFileSync('npx', ['tailwindcss', '-c', 'tailwind.psikotes.config.cjs', '-i', 'tmp-psikotes-in.css', '-o', 'psikotes.css', '--minify'], { stdio: 'inherit' });

// 3) HTML akhir
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; media-src 'self' blob: data:; connect-src 'self' https://tarobun-api.tepangbkj8.workers.dev; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'";
const V = '?v=' + new Date().toISOString().slice(0, 10).replace(/-/g, '');
let html = src
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, `<meta http-equiv="Content-Security-Policy" content="${CSP}">`)
  .replace(/<script src="https:\/\/[^"]*"[^>]*><\/script>\s*/g, '')
  .replace(/<link rel="stylesheet" href="https:\/\/unpkg\.com[^"]*">\s*/g, '')
  .replace(/<script>[\s\S]*?<\/script>\s*/g, (m) => (/removeChild/.test(m) || /tailwind\.config/.test(m) ? '' : m))
  .replace(/<style>[\s\S]*?<\/style>/, '')
  .replace(/<script type="text\/babel">[\s\S]*?<\/script>/, '');
const head = `<link rel="stylesheet" href="vendor/fonts.css${V}">\n<link rel="stylesheet" href="psikotes.css${V}">\n`;
const tail = ['vendor/react.production.min.js', 'vendor/react-dom.production.min.js', 'vendor/lucide.min.js', 'psikotes.patch.js', 'psikotes.app.js']
  .map((f) => `<script src="${f}${V}"></script>`).join('\n') + '\n';
html = html.replace('</head>', head + '</head>').replace('</body>', tail + '</body>');
writeFileSync('psikotes.html', html);

// 4) header CSP di vercel.json untuk /psikotes.html
const vj = JSON.parse(readFileSync('vercel.json', 'utf8'));
const rule = vj.headers.find((h) => h.source === '/psikotes.html');
rule.headers.find((h) => h.key === 'Content-Security-Policy').value = CSP;
writeFileSync('vercel.json', JSON.stringify(vj, null, 2) + '\n');
console.log('OK: psikotes.html + psikotes.app.js + psikotes.patch.js + psikotes.css + vercel.json');
