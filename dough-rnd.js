/* dough-rnd.js - Laporan Dough RnD: "Protokol Trial In Store Frozen Dough (Yeast 200%)" diisi per store, hasil PDF
 * mengikuti dokumen protokol asli (sampul, log revisi, pengesahan, daftar isi, isi protokol, form pengambilan data
 * yang terisi nilai + foto trial/existing). Memakai mesin PDF dari dough-report.js (tanpa library).
 * API: window.DoughRnd = { ROWS, STAGES, TYPES, guessType, normNum, missing, buildPdf, buildCaption }
 */
(function (root) {
  'use strict';
  var DR = root.DoughReport;
  if (!DR || !DR._pdf) { try { console.error('dough-rnd.js: dough-report.js belum termuat'); } catch (e) { } return; }
  var P = DR._pdf, Doc = P.Doc, tw = P.tw, enc = P.enc, jpegInfo = P.jpegInfo, fmt = P.fmt, col = P.col, PW = P.PW, PH = P.PH;
  var LOGO_COVER='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';
var LOGO_HEAD='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';

  function b64u8(b64) { var bin = atob(b64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }

  var DARK = [0.31, 0.384, 0.157], GL = [0.608, 0.733, 0.349], INK = [0.1, 0.1, 0.1], BLK = [0, 0, 0],
    GRAY = [0.85, 0.85, 0.85], YEL = [1, 1, 0], MUTE = [0.42, 0.45, 0.5], WHITE = [1, 1, 1], PH_BORDER = [0.7, 0.7, 0.7];

  // ---------- Data protokol ----------
  var TYPES = [{ k: 'panas', label: 'Store Panas' }, { k: 'dingin', label: 'Store Dingin' }, { k: 'ruang', label: 'Store Suhu Ruang' }];
  var LOKASI = {
    panas: ['JPM Dukuh Atas', 'St Kranji', 'St Tangerang', 'St Tambun'],
    dingin: ['LWKW', 'LBS Jl Baru', 'AEON Sentul', 'Green Pramuka'],
    ruang: ['Botani Square', 'Atrium Senen', 'LWAS', 'AEON Deltamas']
  };
  var GUESS = { panas: ['dukuh atas', 'kranji', 'tangerang', 'tambun'], dingin: ['lwkw', 'lbs', 'sentul', 'pramuka'], ruang: ['botani', 'senen', 'lwas', 'deltamas'] };
  function guessType(name) {
    var n = String(name || '').toLowerCase();
    for (var i = 0; i < TYPES.length; i++) { var g = GUESS[TYPES[i].k]; for (var j = 0; j < g.length; j++) if (n.indexOf(g[j]) >= 0) return TYPES[i].k; }
    return '';
  }
  function typeLabel(k) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].k === k) return TYPES[i].label; return '-'; }

  var STAGES = ['Setelah thawing', 'Saat proofing dalam proofer', 'Saat baking', 'Setelah baking'];
  var DEG = '\u00B0C';
  var EXTRA_PROOF = '==(**Notes**: bila sample selesai proofing lebih cepat (ditandai dengan tercapainya target dimensi), maka hentikan proses proofing)==\n**Range waktu proofing:**\n- Suhu panas: perhatikan proofing saat **menit ke-50**\n- Suhu dingin dan suhu medium: perhatikan proofing saat **menit ke-60**\n- Maksimum waktu proofing: **70 menit**';
  // photo: 1 = wajib, 'opt' = opsional, 0 = tanpa foto. Slot foto di server: 'rnd_' + id (huruf kecil/angka).
  var ROWS = [
    { id: 'r01', stage: 0, label: 'Penempatan frozen dough trial pada tiap tray', photo: 1 },
    { id: 'r02', stage: 0, label: 'Penempatan frozen dough existing pada tiap tray', photo: 1 },
    { id: 'r03', stage: 0, label: 'Letak tray trial dan existing di troli', photo: 1 },
    { id: 'r04', stage: 0, label: 'Suhu permukaan frozen dough trial setelah thawing', photo: 1, fields: [{ k: 't', l: 'Suhu permukaan', u: DEG }] },
    { id: 'r05', stage: 0, label: 'Suhu permukaan frozen dough existing setelah thawing', photo: 1, fields: [{ k: 't', l: 'Suhu permukaan', u: DEG }] },
    { id: 'r06', stage: 0, label: 'Suhu dan RH ruangan (jika ada)', photo: 'opt', optional: true, fields: [{ k: 't', l: 'Suhu', u: DEG }, { k: 'rh', l: 'RH', u: '%' }] },
    { id: 'r07', stage: 0, label: 'Waktu total thawing', photo: 0, fields: [{ k: 'm', l: 'Waktu total', u: 'menit' }] },
    { id: 'r08', stage: 1, label: 'Letak tray trial dan existing di dalam proofer', photo: 1 },
    { id: 'r09', stage: 1, label: 'Suhu dan RH proofer (setting dan aktual)', photo: 1, fields: [{ k: 'st', l: 'Suhu setting', u: DEG }, { k: 'sr', l: 'RH setting', u: '%' }, { k: 'at', l: 'Suhu aktual', u: DEG }, { k: 'ar', l: 'RH aktual', u: '%' }] },
    { id: 'r10', stage: 1, label: 'Waktu total proofing', photo: 0, fields: [{ k: 'm', l: 'Waktu total', u: 'menit' }], extra: EXTRA_PROOF, maxMin: 70 },
    { id: 'r11', stage: 1, label: 'Foto frozen dough trial diukur dengan penggaris gawang sebanyak 3 pcs setelah proofing', photo: 1, measure: 'pt', mlabel: 'after proofing' },
    { id: 'r12', stage: 1, label: 'Foto frozen dough existing diukur dengan penggaris gawang sebanyak 3 pcs setelah proofing', photo: 1, measure: 'pe', mlabel: 'after proofing' },
    { id: 'r13', stage: 2, label: 'Suhu oven preheat', photo: 0, fields: [{ k: 't', l: 'Suhu', u: DEG }] },
    { id: 'r14', stage: 2, label: 'Suhu oven setting', photo: 0, fields: [{ k: 't', l: 'Suhu', u: DEG }] },
    { id: 'r15', stage: 2, label: 'Suhu oven aktual (1 menit terakhir)', photo: 0, fields: [{ k: 't', l: 'Suhu', u: DEG }] },
    { id: 'r16', stage: 2, label: 'Waktu baking:', photo: 0, fields: [{ k: 'm', l: 'Waktu', u: 'menit' }] },
    { id: 'r17', stage: 3, label: 'Penempatan roti pada tiap tray (trial)', photo: 1 },
    { id: 'r18', stage: 3, label: 'Penempatan roti pada tiap tray (existing)', photo: 1 },
    { id: 'r19', stage: 3, label: 'Foto roti trial diukur dengan penggaris gawang sebanyak 3 pcs per tray', photo: 1, measure: 'bt', mlabel: 'after baking' },
    { id: 'r20', stage: 3, label: 'Foto roti existing diukur dengan penggaris gawang sebanyak 3 pcs per tray', photo: 1, measure: 'be', mlabel: 'after baking' }
  ];
  var MEAS_ROWS = 5; // tabel di protokol memuat 5 baris; minimal 3 pcs wajib diisi

  // ---------- Util isian ----------
  function normNum(s) { return String(s === null || s === undefined ? '' : s).replace(',', '.').replace(/[^0-9.\-]/g, '').slice(0, 7); }
  function isNum(v) { return /^-?\d+(\.\d+)?$/.test(String(v === null || v === undefined ? '' : v).trim()); }
  function getVal(rep, id, k) { var o = rep.vals && rep.vals[id]; var v = o && o[k]; return v === undefined || v === null ? '' : String(v); }
  function measRows(rep, key) { var a = (rep.meas && rep.meas[key]) || []; var out = []; for (var i = 0; i < MEAS_ROWS; i++) out.push(a[i] || { d: '', t: '' }); return out; }
  function measFilled(rep, key) { return measRows(rep, key).filter(function (r) { return isNum(r.d) && isNum(r.t); }).length; }
  function missing(rep) {
    var out = [];
    if (!String(rep.pelapor || '').trim()) out.push('Nama pelapor');
    if (!rep.tipe) out.push('Tipe store');
    ROWS.forEach(function (r) {
      var need = [];
      if (r.photo === 1 && !(rep.photos && rep.photos[r.id])) need.push('foto');
      (r.fields || []).forEach(function (f) { if (!r.optional && !isNum(getVal(rep, r.id, f.k))) need.push(f.l); });
      if (r.measure && measFilled(rep, r.measure) < 3) need.push('ukuran min. 3 pcs');
      if (need.length) out.push(r.label + ' (' + need.join(', ') + ')');
    });
    return out;
  }

  // ---------- Teks kaya: **tebal**  ==sorot kuning== ----------
  function toks(text) {
    var out = [], b = false, h = false;
    String(text).split(/(\*\*|==)/).forEach(function (p) { if (p === '**') b = !b; else if (p === '==') h = !h; else if (p) out.push({ t: p, b: b, h: h }); });
    return out;
  }
  function rich(text, size, maxW) {
    var lines = [], cur = [], curW = 0, sp = tw(' ', size, false), pend = false;
    toks(text).forEach(function (tk) {
      tk.t.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { pend = true; return; }
        var w = tw(enc(part), size, tk.b), sw = (cur.length && pend) ? sp : 0;
        if (cur.length && curW + sw + w > maxW) { lines.push(cur); cur = []; curW = 0; sw = 0; }
        cur.push({ t: part, b: tk.b, h: tk.h, x: curW + sw, w: w, sw: sw });
        curW += sw + w; pend = false;
      });
    });
    if (cur.length) lines.push(cur);
    return lines.length ? lines : [[]];
  }
  function drawRich(d, x, top, lines, size, lh, color) {
    var y = top;
    lines.forEach(function (ln) {
      var base = y - size * 0.88;
      ln.forEach(function (w, i) {
        var prev = ln[i - 1];
        if (w.h) { var ex = (prev && prev.h) ? w.sw : 0; d.rect(x + w.x - ex, base - size * 0.22, w.w + ex, size * 1.15, YEL, null); }
      });
      ln.forEach(function (w) { d.text(x + w.x, base, w.t, size, w.b, color || INK); });
      y -= lh;
    });
    return y;
  }
  function hline(d, x1, x2, y, c, lw) { d.op(col(c) + ' RG ' + fmt(lw) + ' w ' + fmt(x1) + ' ' + fmt(y) + ' m ' + fmt(x2) + ' ' + fmt(y) + ' l S'); }
  function vline(d, x, y1, y2, c, lw) { d.op(col(c) + ' RG ' + fmt(lw) + ' w ' + fmt(x) + ' ' + fmt(y1) + ' m ' + fmt(x) + ' ' + fmt(y2) + ' l S'); }
  function pageOf(d, xRight, yBase, i, n, size) {
    var a = String(i), b = String(n), wa = tw(a, size, true), wm = tw(' dari ', size, false), wb = tw(b, size, true), x = xRight - (wa + wm + wb);
    d.text(x, yBase, a, size, true, INK); d.text(x + wa, yBase, ' dari ', size, false, INK); d.text(x + wa + wm, yBase, b, size, true, INK);
  }
  function longDate(ms) {
    try { return new Date(ms).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return new Date(ms).toISOString().slice(0, 10); }
  }

  // ---------- PDF ----------
  function buildPdf(rep, images) {
    images = images || {};
    var d = new Doc(), y = 0, BOT = 46, BODY_TOP = PH - 172, marks = {};
    var uHead = b64u8(LOGO_HEAD), uCover = b64u8(LOGO_COVER), iHead = jpegInfo(uHead), iCover = jpegInfo(uCover);
    var idxHead = d.addImage(uHead, iHead), idxCover = d.addImage(uCover, iCover);
    function onPage(i, fn) { var sc = d.cur, si = d.curImgs; d.cur = d.pages[i].ops; d.curImgs = d.pages[i].imgs; try { fn(); } finally { d.cur = sc; d.curImgs = si; } }
    function newBodyPage() { d.newPage(); y = BODY_TOP; }
    function need(h) { if (y - h < BOT) newBodyPage(); }
    function bar(text) { need(40); d.rect(26, y - 24, 543, 24, DARK, GL, 1.4); d.text(36, y - 16.5, text, 11, false, WHITE); y -= 24; }

    // ===== Halaman 1: sampul =====
    d.rect(18, 34, 562, 773, null, GL, 1.6);
    d.text(36, PH - 53, 'FOR INTERNAL USE ONLY', 6.5, true, INK);
    d.text(558, PH - 84, 'SISTEM MANAJEMEN MUTU', 10, true, INK, 'right');
    d.text(558, PH - 108, 'LEVEL \u2013 3', 12.5, true, INK, 'right');
    var cT = [118, 155, 168, 180, 196], cLab = ['No. Dokumen', 'Revisi Ke -', 'Tanggal Diterbitkan', 'Halaman'];
    for (var ci = 0; ci < 4; ci++) {
      d.rect(292, PH - cT[ci + 1], 270, cT[ci + 1] - cT[ci], null, BLK, 0.6);
      d.text(296, PH - cT[ci] - (ci === 0 ? 11 : 9.5), cLab[ci], 7.5, false, INK);
    }
    vline(d, 397, PH - 118, PH - 196, BLK, 0.6);
    d.drawImage(idxCover, 97.6, PH - 268 - 131.9, 400, 131.9);
    hline(d, 18, 580, PH - 408, GL, 2.2); hline(d, 18, 580, PH - 575, GL, 2.2);
    d.text(PW / 2, PH - 452, 'WORK INSTRUCTION', 20, true, DARK, 'center');
    d.text(PW / 2, PH - 488, 'PROTOKOL TRIAL :', 20, true, DARK, 'center');
    d.text(PW / 2, PH - 528, 'TRIAL IN STORE FROZEN DOUGH (YEAST', 21, true, DARK, 'center');
    d.text(PW / 2, PH - 553, '200%), 12 STORE', 21, true, DARK, 'center');
    d.text(PW / 2, PH - 625, 'PT AGRINESIA RAYA, (Kawasan Industri Sentul Olympic CBD Jalan Cahaya Raya Blok L Leuwinutug Kec. Citeureup,', 8.2, false, [0.25, 0.28, 0.25], 'center');
    d.text(PW / 2, PH - 638, 'Kabupaten Bogor, Jawa Barat 16810)', 8.2, false, [0.25, 0.28, 0.25], 'center');

    // ===== Halaman 2: log revisi =====
    d.newPage(); y = BODY_TOP; bar('Log Catatan Revisi'); y -= 26;
    (function () {
      var fx = 70, fw = 454, blockH = 86, H1 = 22, H2 = 22, RH = 17, NB = 9, total = blockH + H1 + H2 + NB * RH;
      d.rect(fx, y - total, fw, total, null, BLK, 1);
      d.drawImage(idxHead, fx + 14, y - 14 - 35.4, 100, 35.4);
      d.text(fx + 229, y - 38, 'PT AGRINESIA RAYA', 11, true, INK, 'center');
      d.text(fx + 229, y - 52, 'LOG REVISI SOP', 11, true, INK, 'center');
      var ty = y - blockH, W = [26, 87, 52, 56, 187, 46], X = [0]; W.forEach(function (w, i) { X.push(X[i] + w); });
      hline(d, fx, fx + fw, ty, BLK, 0.8);
      d.text(fx + X[4] / 2, ty - 15, 'PERUBAHAN', 9.5, true, INK, 'center');
      hline(d, fx, fx + X[4], ty - H1, BLK, 0.8);
      ['NO', 'TANGGAL', 'SECTION', 'HALAMAN'].forEach(function (t, i) { d.text(fx + X[i] + W[i] / 2, ty - H1 - 15, t, 9, true, INK, 'center'); });
      d.text(fx + X[4] + W[4] / 2, ty - 26, 'URAIAN PERUBAHAN', 9, true, INK, 'center');
      d.text(fx + X[5] + W[5] / 2, ty - 26, 'PARAF', 9, true, INK, 'center');
      hline(d, fx, fx + fw, ty - H1 - H2, BLK, 0.8);
      [1, 2, 3].forEach(function (i) { vline(d, fx + X[i], ty - H1, y - total, BLK, 0.8); });
      [4, 5].forEach(function (i) { vline(d, fx + X[i], ty, y - total, BLK, 0.8); });
      for (var r = 1; r < NB; r++) hline(d, fx, fx + fw, ty - H1 - H2 - r * RH, BLK, 0.6);
      var by = ty - H1 - H2;
      d.text(fx + X[0] + W[0] / 2, by - 12, '1', 9, false, INK, 'center');
      d.text(fx + X[1] + 4, by - 12, '15 Januari 2024', 9, false, INK);
      d.text(fx + X[4] + 4, by - 12, 'Rev : 0 Dokumen Baru', 9, false, INK);
      d.text(fx + X[4] + 12, by - RH - 12, '-', 9, false, INK);
    })();

    // ===== Halaman 3: pengesahan =====
    d.newPage(); y = BODY_TOP; bar('Lembar Pengesahan'); y -= 34;
    [['Disiapkan oleh:', 'R Rani Oktaviani', 'R&D Supervisor'], ['Diperiksa oleh:', 'Tiaranissa I.F.S.P', 'R&D Manager'], ['Disetujui oleh:', 'Tiaranissa I.F.S.P', 'R&D Manager']].forEach(function (b) {
      d.text(70, y, b[0], 11, true, DARK); y -= 10;
      var W = [113, 107, 109, 125], X = [70]; W.forEach(function (w, i) { X.push(X[i] + w); });
      ['Nama', 'Jabatan', 'Tanda Tangan', 'Tanggal'].forEach(function (t, i) { d.rect(X[i], y - 20, W[i], 20, DARK, GL, 0.8); d.text(X[i] + W[i] / 2, y - 14, t, 10, true, WHITE, 'center'); });
      y -= 20;
      for (var i = 0; i < 4; i++) d.rect(X[i], y - 62, W[i], 62, null, BLK, 0.8);
      d.text(X[0] + 6, y - 34, b[1], 10, true, INK, 'left', W[0] - 10);
      d.text(X[1] + 6, y - 34, b[2], 10, true, INK, 'left', W[1] - 10);
      d.text(X[3] + W[3] / 2, y - 34, '27 Oktober 2026', 10, true, INK, 'center');
      y -= 62 + 34;
    });

    // ===== Halaman 4: daftar isi (isi diisi di akhir) =====
    d.newPage(); y = BODY_TOP; bar('Daftar Isi');

    // ===== Isi protokol =====
    newBodyPage();
    function heading(txt, x, size, mk) { need(size + 40); marks[mk] = d.pages.length; d.text(x, y - size, txt, size, true, INK); y -= size + 9; }
    function flow(lines, x, size, lh, color) { lines.forEach(function (ln) { need(lh); y = drawRich(d, x, y, [ln], size, lh, color); }); }
    function para(txt, x, w, size, lh) { flow(rich(txt, size, w), x, size, lh); y -= 8; }
    heading('1.  UMUM', 80, 11, 's1');
    heading('1.1.  Latar Belakang', 107, 10.5, 's11');
    para('Untuk memastikan bahwa adanya pergantian bahan baku tidak mempengaruhi mutu produk akhir, kami melakukan uji secara aktual di store. Pengujian dilakukan dengan metode aktual di lapangan, sehingga dapat diketahui hasilnya dibandingkan dengan existing.', 72, 452, 10.5, 14.5);
    heading('1.2.  Tujuan', 107, 10.5, 's12');
    para('Trial ini bertujuan mengonfirmasi parameter proses dan parameter mutu produk akhir frozen dough di kondisi aktual.', 72, 452, 10.5, 14.5);
    heading('1.3.  Ruang Lingkup', 107, 10.5, 's13');
    para('Variabel trial yang digunakan adalah coklat compound dan proses trial dilaksanakan di store St Poris, JPM Dukuh Atas, dan St Bogor 1.', 72, 452, 10.5, 14.5);
    heading('2.  METODE', 80, 11, 's2');
    para('Trial akan dilakukan dengan detail sebagai berikut:', 72, 452, 10.5, 14.5);
    // tabel metode
    (function () {
      var lok = [];
      TYPES.forEach(function (t, i) { if (i) lok.push(''); lok.push({ b: 1, t: (i + 1) + '. ' + t.label }); LOKASI[t.k].forEach(function (s, j) { lok.push((j + 1) + '. ' + s); }); });
      var rows = [['Hari, Tanggal', ['Rabu, 4 November 2026']], ['Lokasi', lok], ['Besaran Trial', ['70 pcs dough trial']], ['Brand & Varian', ['Frozen Dough Taro Bun']],
        ['Permintaan Sample Hasil Trial', ['N/A']], ['Sampling Size AQL', ['N/A']], ['Perhitungan', ['N/A']], ['Validator', ['R&D, QC, Store crew']]];
      var X = 72, W1 = 115, W2 = 338;
      rows.forEach(function (r) {
        var ll = rich(r[0], 10, W1 - 14), h = Math.max(ll.length * 13.5, r[1].length * 13.5) + 14;
        need(h);
        d.rect(X, y - h, W1, h, null, BLK, 0.8); d.rect(X + W1, y - h, W2, h, null, BLK, 0.8);
        drawRich(d, X + 7, y - 7, ll, 10, 13.5, INK);
        r[1].forEach(function (ln, i) { var o = typeof ln === 'string' ? { t: ln } : ln; if (o.t) d.text(X + W1 + 7, y - 7 - i * 13.5 - 10 * 0.88, o.t, 10, !!o.b, INK); });
        y -= h;
      });
      y -= 16;
    })();
    // 2.1 tata cara
    need(60); marks.s21 = d.pages.length; d.text(58, y - 10.5, '2.1.', 10.5, true, INK); d.text(94, y - 10.5, 'Tata cara pelaksanaan', 10.5, true, INK); y -= 19;
    function item(lvl, label, txt) {
      var LX = [90, 126, 163][lvl], TX = [108, 145, 173][lvl];
      var ls = rich(txt, 10, 524 - TX);
      need(14);
      if (label) d.text(LX, y - 10 * 0.88, label, 10, lvl === 0 && label === '' ? true : false, INK);
      flow(ls, TX, 10, 13.5);
    }
    para('Trial ini akan dilakukan dengan metode proofing:', 90, 434, 10, 13.5); y += 4;
    para('**1. Proofing standar di proofer**', 90, 434, 10, 13.5); y += 4;
    para('**Proofing standar**', 90, 434, 10, 13.5); y += 4;
    item(0, '1.', 'Letakkan frozen dough di atas tray dengan detail berikut:'); item(1, 'a.', '1 tray trial'); item(1, 'b.', '1 tray existing');
    item(0, '2.', 'Lakukan thawing sesuai dengan kondisi aktual di store.');
    item(0, '3.', 'Catat dan foto beberapa parameter berikut:'); item(1, 'a.', 'Penempatan frozen dough pada tray'); item(1, 'b.', 'Letak tray trial dan existing di troli'); item(1, 'c.', 'Suhu dan RH ruangan (jika ada)');
    item(0, '4.', 'Setelah thawing dan dimasukkan ke proofer, catat dan foto parameter berikut:');
    item(1, 'a.', 'Waktu total thawing'); item(1, 'b.', 'Penempatan frozen dough pada tray'); item(1, 'c.', 'Letak tray trial dan existing di dalam proofer');
    item(1, 'd.', 'Suhu permukaan frozen dough sebelum masuk proofer'); item(1, 'e.', 'Suhu dan RH proofer (setting dan aktual)');
    item(1, 'f.', 'Waktu total proofing ==(**Notes**: bila sample selesai proofing lebih cepat (ditandai dengan tercapainya target dimensi), maka hentikan proses proofing)==');
    need(14); d.text(145, y - 10 * 0.88, 'Range waktu proofing:', 10, true, INK); y -= 13.5;
    item(2, '-', 'Suhu panas: perhatikan proofing saat **menit ke-50**'); item(2, '-', 'Suhu dingin dan suhu medium: perhatikan proofing saat **menit ke-60**'); item(2, '-', 'Maksimum waktu proofing: **70 menit**');
    item(1, 'g.', 'Foto frozen dough diukur dengan penggaris gawang sebanyak 3 pcs per tray (trial dan existing) saat ready to bake (sebelum diberi topping)');
    item(0, '5.', 'Setelah itu, panggang roti menggunakan setting existing. Catat parameter oven sebagai berikut:');
    item(1, 'a.', 'Suhu oven preheat:'); item(1, 'b.', 'Suhu oven setting:'); item(1, 'c.', 'Suhu oven aktual 1 menit terakhir:'); item(1, 'd.', 'Waktu oven:');
    item(0, '6.', 'Setelah baking, foto dan catat parameter berikut:');
    item(1, 'a.', 'Penempatan roti pada tiap tray'); item(1, 'b.', 'Foto roti diukur dengan penggaris gawang sebanyak 3 pcs per tray (trial dan existing)');
    y -= 12;

    // ===== 2.2 Form pengambilan data (terisi) =====
    need(150); marks.s22 = d.pages.length; d.text(58, y - 10.5, '2.2.', 10.5, true, INK); d.text(94, y - 10.5, 'Form pengambilan data', 10.5, true, INK); y -= 22;
    var photosMeta = rep.photos || {}, tsAll = [], sigN = 0, photoN = 0;
    Object.keys(photosMeta).forEach(function (k) { var m = photosMeta[k]; if (m && m.ts) { tsAll.push(m.ts); photoN++; if (m.sig) sigN++; } });
    var tMin = tsAll.length ? Math.min.apply(null, tsAll) : (rep.createdAt || Date.now()), tMax = tsAll.length ? Math.max.apply(null, tsAll) : tMin;
    (function () {
      var info = [['Store', rep.storeName || '-'], ['Tipe store', typeLabel(rep.tipe)], ['Nama pelapor', rep.pelapor || '-'], ['Tanggal pelaksanaan', longDate(tMin)],
        ['Waktu foto', DR.fmtDT(tMin) + '  s/d  ' + DR.fmtDT(tMax) + ' WIB'], ['Cap waktu foto', sigN + ' dari ' + photoN + ' foto memakai jam server']];
      info.forEach(function (r) {
        need(18); d.rect(58, y - 17, 110, 17, GRAY, BLK, 0.6); d.rect(168, y - 17, 357, 17, null, BLK, 0.6);
        d.text(63, y - 12, r[0], 9, true, INK); d.text(173, y - 12, r[1], 9, false, INK, 'left', 347); y -= 17;
      });
      y -= 12;
    })();

    var FX = 58, FW = [52, 128, 172, 115], PAD = 5, LH = 10.6, FS = 8.6;
    function fcol(i) { var x = FX; for (var k = 0; k < i; k++) x += FW[k]; return x; }
    function formHeader() {
      d.rect(FX, y - 20, 467, 20, GRAY, BLK, 0.7);
      ['Tahapan', 'Parameter yang diamati', 'Hasil pengamatan', 'Catatan'].forEach(function (t, i) { d.text(fcol(i) + PAD, y - 13.5, t, 9, true, INK); if (i) vline(d, fcol(i), y, y - 20, BLK, 0.7); });
      y -= 20;
    }
    function layout(row) {
      var pl = rich(row.label, FS, FW[1] - 2 * PAD), pH = pl.length * LH, ex = [];
      if (row.extra) row.extra.split('\n').forEach(function (s) { var ind = 0; if (/^- /.test(s)) { s = s.slice(2); ind = 8; } var ls = rich(s, FS, FW[1] - 2 * PAD - ind); ex.push({ ind: ind, ls: ls, dash: ind > 0 }); pH += 3 + ls.length * LH; });
      var vL = [];
      (row.fields || []).forEach(function (f) {
        var v = getVal(rep, row.id, f.k), s = f.l + ': ' + (v !== '' ? v + ' ' + f.u : '-');
        if (row.maxMin && f.k === 'm' && isNum(v) && parseFloat(v) > row.maxMin) s += '  (melebihi maks. ' + row.maxMin + ' menit)';
        vL = vL.concat(rich(s, FS, FW[2] - 2 * PAD));
      });
      var u8 = images[row.id], inf = u8 ? jpegInfo(u8) : null, dw = 0, dh = 0, miss = null;
      if (inf) { var sc = Math.min((FW[2] - 2 * PAD) / inf.w, 124 / inf.h); dw = inf.w * sc; dh = inf.h * sc; }
      else if (row.photo === 1) miss = rich('(foto belum diambil)', FS, FW[2] - 2 * PAD);
      var hH = vL.length * LH + (inf ? (vL.length ? 4 : 0) + dh : (miss ? (vL.length ? 4 : 0) + LH : 0));
      var nt = String((rep.notes && rep.notes[row.id]) || '').trim(), nL = nt ? rich(nt, FS, FW[3] - 2 * PAD) : [], cH = 0, mh = null;
      if (row.measure) { mh = rich('Catat diameter dan tinggi ' + row.mlabel + ' (cm):', FS, FW[3] - 2 * PAD); cH = mh.length * LH + 3 + 14 + MEAS_ROWS * 14.5; }
      if (nL.length) cH += (cH ? 4 : 0) + nL.length * LH;
      return { pl: pl, ex: ex, vL: vL, u8: u8, inf: inf, dw: dw, dh: dh, miss: miss, nL: nL, mh: mh, h: Math.max(pH, hH, cH, 16) + 2 * PAD };
    }
    function closeStage() { hline(d, FX, FX + FW[0], y, BLK, 0.7); }
    need(20 + 60); formHeader();
    var firstOnPage = true;
    ROWS.forEach(function (row, ri) {
      var L = layout(row);
      if (y - L.h < BOT) { closeStage(); newBodyPage(); formHeader(); firstOnPage = true; }
      var prev = ROWS[ri - 1], next = ROWS[ri + 1];
      var firstInGroup = !prev || prev.stage !== row.stage || firstOnPage, lastInGroup = !next || next.stage !== row.stage;
      var top = y, h = L.h;
      vline(d, FX, top, top - h, BLK, 0.7); vline(d, FX + FW[0], top, top - h, BLK, 0.7);
      if (firstInGroup) { hline(d, FX, FX + FW[0], top, BLK, 0.7); drawRich(d, FX + PAD - 1, top - PAD, rich(STAGES[row.stage], FS, FW[0] - 2 * PAD + 2), FS, LH, INK); }
      if (lastInGroup) hline(d, FX, FX + FW[0], top - h, BLK, 0.7);
      for (var c = 1; c < 4; c++) d.rect(fcol(c), top - h, FW[c], h, null, BLK, 0.7);
      // parameter
      var py = drawRich(d, fcol(1) + PAD, top - PAD, L.pl, FS, LH, INK);
      L.ex.forEach(function (e) {
        py -= 3;
        if (e.dash) d.text(fcol(1) + PAD, py - FS * 0.88, '-', FS, false, INK);
        py = drawRich(d, fcol(1) + PAD + e.ind, py, e.ls, FS, LH, INK);
      });
      // hasil
      var hy = drawRich(d, fcol(2) + PAD, top - PAD, L.vL, FS, LH, INK);
      if (L.inf) {
        if (L.vL.length) hy -= 4;
        var idx = d.addImage(L.u8, L.inf), ix = fcol(2) + PAD + ((FW[2] - 2 * PAD) - L.dw) / 2;
        d.drawImage(idx, ix, hy - L.dh, L.dw, L.dh); d.rect(ix, hy - L.dh, L.dw, L.dh, null, PH_BORDER, 0.4);
      } else if (L.miss) {
        if (L.vL.length) hy -= 4;
        drawRich(d, fcol(2) + PAD, hy, L.miss, FS, LH, [0.7, 0.13, 0.2]);
      }
      // catatan
      var cy = top - PAD;
      if (L.mh) {
        cy = drawRich(d, fcol(3) + PAD, cy, L.mh, FS, LH, INK) - 3;
        var mx = fcol(3) + PAD, mw = FW[3] - 2 * PAD, half = mw / 2;
        d.rect(mx, cy - 14, half, 14, null, BLK, 0.6); d.rect(mx + half, cy - 14, half, 14, null, BLK, 0.6);
        d.text(mx + half / 2, cy - 10, 'Diameter', 7.8, true, INK, 'center'); d.text(mx + half * 1.5, cy - 10, 'Tinggi', 7.8, true, INK, 'center');
        cy -= 14;
        measRows(rep, row.measure).forEach(function (m) {
          d.rect(mx, cy - 14.5, half, 14.5, null, BLK, 0.6); d.rect(mx + half, cy - 14.5, half, 14.5, null, BLK, 0.6);
          if (isNum(m.d)) d.text(mx + half / 2, cy - 10.3, String(m.d), 8.4, false, INK, 'center');
          if (isNum(m.t)) d.text(mx + half * 1.5, cy - 10.3, String(m.t), 8.4, false, INK, 'center');
          cy -= 14.5;
        });
        cy -= 4;
      }
      if (L.nL.length) drawRich(d, fcol(3) + PAD, cy, L.nL, FS, LH, INK);
      y = top - h; firstOnPage = false;
    });
    closeStage();
    y -= 14; need(30);
    flow(rich('Dokumen ini dibuat otomatis oleh aplikasi So Mandiri Hub dari isian pelapor. Foto berstempel tanggal dan jam saat diambil.', 8, 467), 58, 8, 11, MUTE);

    // ===== Daftar isi =====
    var total = d.pages.length;
    onPage(3, function () {
      var ty = BODY_TOP - 24 - 34;
      [[0, '1. UMUM', 's1'], [1, '1.1. Latar Belakang', 's11'], [1, '1.2. Tujuan', 's12'], [1, '1.3. Ruang Lingkup', 's13'], [0, '2. METODE', 's2'], [1, '2.1. Tata cara pelaksanaan', 's21'], [1, '2.2. Form pengambilan data', 's22']].forEach(function (e) {
        d.text(e[0] ? 106 : 84, ty, e[1], 10.5, true, INK); d.text(524, ty, String(marks[e[2]] || '-'), 10.5, true, INK, 'right'); ty -= 20;
      });
    });
    // ===== Header halaman 2..N + nomor halaman sampul =====
    onPage(0, function () { pageOf(d, 558, PH - 190, 1, total, 7.5); });
    for (var pi = 1; pi < total; pi++) (function (i) {
      onPage(i, function () {
        var x0 = 54, W = 489, top = PH - 50, H = 88, y1 = top - 39, rh = 12.3;
        d.rect(x0, top - H, W, H, null, BLK, 0.8);
        hline(d, x0, x0 + W, y1, BLK, 0.8); hline(d, x0, x0 + W, y1 - rh, BLK, 0.8);
        hline(d, x0 + 232, x0 + W, y1 - 2 * rh, BLK, 0.8); hline(d, x0 + 232, x0 + W, y1 - 3 * rh, BLK, 0.8);
        vline(d, x0 + 63, y1, top - H, BLK, 0.8); vline(d, x0 + 232, y1, top - H, BLK, 0.8); vline(d, x0 + 330, y1, top - H, BLK, 0.8);
        d.drawImage(idxHead, x0 + 8, top - 6 - 25.5, 72, 25.5);
        d.text(300, top - 24, 'Work Instruction', 11, true, INK, 'center');
        d.text(x0 + 4, y1 - 9.3, 'Nama Divisi', 8, false, INK); d.text(x0 + 67, y1 - 9.3, 'Research and Development', 8, false, INK); d.text(x0 + 236, y1 - 9.3, 'No. Form', 8, false, INK);
        d.text(x0 + 4, y1 - rh - 9.3, 'Judul', 8, false, INK); d.text(x0 + 67, y1 - rh - 9.3, 'Protokol Trial : ', 8, false, INK);
        d.text(x0 + 67 + tw('Protokol Trial : ', 8, false), y1 - rh - 9.3, 'Judul Trial', 8, true, INK);
        d.text(x0 + 236, y1 - rh - 9.3, 'Revisi ke', 8, false, INK); d.text(x0 + 236, y1 - 2 * rh - 9.3, 'Tanggal diterbitkan', 8, false, INK);
        d.text(x0 + 236, y1 - 3 * rh - 9.3, 'Halaman', 8, false, INK); d.text(x0 + 334, y1 - 3 * rh - 9.3, '', 8, false, INK);
        var s = String(i + 1), n = String(total); d.text(x0 + 334, y1 - 3 * rh - 9.3, s, 8, true, INK); d.text(x0 + 334 + tw(s, 8, true), y1 - 3 * rh - 9.3, ' dari ', 8, false, INK); d.text(x0 + 334 + tw(s, 8, true) + tw(' dari ', 8, false), y1 - 3 * rh - 9.3, n, 8, true, INK);
        hline(d, 27, 573, PH - 150, GL, 2);
      });
    })(pi);
    return d.build({ title: 'Laporan Dough RnD - Trial In Store Frozen Dough (Yeast 200%) - ' + (rep.storeName || '') });
  }

  // Keterangan singkat yang dikirim bersama PDF (maks 1024 karakter)
  function buildCaption(rep, cc) {
    var L = ['Laporan Dough RnD - Trial In Store Frozen Dough (Yeast 200%)', ''];
    L.push('Store : ' + (rep.storeName || '-'), 'Tipe store : ' + typeLabel(rep.tipe), 'Nama pelapor : ' + (rep.pelapor || '-'));
    var m = function (id) { var v = getVal(rep, id, 'm'); return v ? v + ' menit' : '-'; };
    L.push('', 'Thawing: ' + m('r07') + ' | Proofing: ' + m('r10') + ' (maks. 70 menit) | Baking: ' + m('r16'));
    L.push('', 'Dokumen lengkap beserta foto trial dan existing terlampir (PDF).');
    if (cc && cc.length) L.push('', 'CC: ' + cc.map(function (u) { return '@' + u; }).join(' '));
    var s = L.join('\n'); return s.length > 1000 ? s.slice(0, 997) + '...' : s;
  }

  root.DoughRnd = { ROWS: ROWS, STAGES: STAGES, TYPES: TYPES, MEAS_ROWS: MEAS_ROWS, guessType: guessType, typeLabel: typeLabel, normNum: normNum, isNum: isNum, missing: missing, measFilled: measFilled, buildPdf: buildPdf, buildCaption: buildCaption };
})(typeof window !== 'undefined' ? window : this);
