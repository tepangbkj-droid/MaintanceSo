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
    { id: 'r06', stage: 0, label: 'Suhu dan RH ruangan', photo: 'opt', optional: true, fields: [{ k: 't', l: 'Suhu', u: DEG }, { k: 'rh', l: 'RH', u: '%' }] },
    { id: 'r07', stage: 0, label: 'Waktu total thawing', photo: 0, auto: true, fields: [{ k: 'm', l: 'Waktu total', u: 'menit' }] },
    { id: 'r08', stage: 1, label: 'Letak tray trial dan existing di dalam proofer', photo: 1 },
    { id: 'r09', stage: 1, label: 'Suhu dan RH proofer (setting dan aktual)', photo: 1, fields: [{ k: 'st', l: 'Suhu setting', u: DEG }, { k: 'sr', l: 'RH setting', u: '%' }, { k: 'at', l: 'Suhu aktual', u: DEG }, { k: 'ar', l: 'RH aktual', u: '%' }] },
    { id: 'r10', stage: 1, label: 'Waktu total proofing', photo: 0, auto: true, fields: [{ k: 'm', l: 'Waktu total', u: 'menit' }], extra: EXTRA_PROOF, maxMin: 70 },
    { id: 'r11', stage: 1, label: 'Foto frozen dough trial diukur dengan penggaris gawang sebanyak 3 pcs setelah proofing', photo: 1, measure: 'pt', mlabel: 'after proofing' },
    { id: 'r12', stage: 1, label: 'Foto frozen dough existing diukur dengan penggaris gawang sebanyak 3 pcs setelah proofing', photo: 1, measure: 'pe', mlabel: 'after proofing' },
    { id: 'r13', stage: 2, label: 'Suhu oven preheat', photo: 1, fields: [{ k: 't', l: 'Suhu', u: DEG }] },
    { id: 'r14', stage: 2, label: 'Suhu oven setting', photo: 1, fields: [{ k: 't', l: 'Suhu', u: DEG }] },
    { id: 'r15', stage: 2, label: 'Suhu oven aktual (1 menit terakhir)', photo: 1, fields: [{ k: 't', l: 'Suhu', u: DEG }] },
    { id: 'r16', stage: 2, label: 'Waktu baking:', photo: 0, auto: true, fields: [{ k: 'm', l: 'Waktu', u: 'menit' }] },
    { id: 'r17', stage: 3, label: 'Penempatan roti pada tiap tray (trial)', photo: 1 },
    { id: 'r18', stage: 3, label: 'Penempatan roti pada tiap tray (existing)', photo: 1 },
    { id: 'r19', stage: 3, label: 'Foto roti trial diukur dengan penggaris gawang sebanyak 3 pcs per tray', photo: 1, measure: 'bt', mlabel: 'after baking' },
    { id: 'r20', stage: 3, label: 'Foto roti existing diukur dengan penggaris gawang sebanyak 3 pcs per tray', photo: 1, measure: 'be', mlabel: 'after baking' }
  ];
  var PCS = 3; // jumlah pcs yang diukur = jumlah foto per item ukur
  var MEAS_ROWS = 5; // tabel di protokol memuat 5 baris; minimal 3 pcs wajib diisi

  // Kunci foto: item biasa = id (mis. 'r01'); item ukur = id+'a','b','c' (satu foto per pcs). Slot server tetap 'rnd_'+kunci.
  function photoKeys(row) {
    if (!row.photo) return [];
    if (!row.measure) return [row.id];
    var out = []; for (var i = 0; i < PCS; i++) out.push(row.id + 'abc'.charAt(i)); return out;
  }
  function allPhotoKeys() { var out = []; ROWS.forEach(function (r) { photoKeys(r).forEach(function (k) { out.push(k); }); }); return out; }
  function rowByKey(k) { for (var i = 0; i < ROWS.length; i++) if (photoKeys(ROWS[i]).indexOf(k) >= 0) return ROWS[i]; return null; }
  // Waktu otomatis dari jam foto (jam server bila ada): awal = foto paling awal dari 'from', akhir = foto paling awal dari 'to'.
  var AUTO = {
    r07: { from: ['r01', 'r02'], to: ['r08'], note: 'Otomatis: dari foto penempatan frozen dough di tray sampai foto tray masuk proofer.' },
    r10: { from: ['r08'], to: ['r11a', 'r11b', 'r11c', 'r12a', 'r12b', 'r12c'], note: 'Otomatis: dari foto tray masuk proofer sampai foto ukur setelah proofing.' },
    r16: { from: ['r14'], to: ['r17', 'r18'], note: 'Otomatis: dari foto suhu oven setting (roti masuk oven) sampai foto penempatan roti setelah baking.' }
  };
  function photoTs(rep, k) { var p = rep.photos && rep.photos[k]; return p && p.ts ? p.ts : 0; }
  function earliest(rep, keys) { var v = keys.map(function (k) { return photoTs(rep, k); }).filter(Boolean); return v.length ? Math.min.apply(null, v) : 0; }
  function autoMin(rep, id) {
    var a = AUTO[id]; if (!a) return null;
    var st = earliest(rep, a.from), en = earliest(rep, a.to);
    if (!st || !en || en <= st) return null;
    return Math.max(1, Math.round((en - st) / 60000));
  }

  // ---------- Util isian ----------
  function normNum(s) { return String(s === null || s === undefined ? '' : s).replace(',', '.').replace(/[^0-9.\-]/g, '').slice(0, 7); }
  function isNum(v) { return /^-?\d+(\.\d+)?$/.test(String(v === null || v === undefined ? '' : v).trim()); }
  function getVal(rep, id, k) {
    if (k === 'm' && AUTO[id]) { var am = autoMin(rep, id); return am === null ? '' : String(am); }
    var o = rep.vals && rep.vals[id]; var v = o && o[k]; return v === undefined || v === null ? '' : String(v); }
  function measRows(rep, key) { var a = (rep.meas && rep.meas[key]) || []; var out = []; for (var i = 0; i < MEAS_ROWS; i++) out.push(a[i] || { d: '', t: '' }); return out; }
  function measFilled(rep, key) { return measRows(rep, key).filter(function (r) { return isNum(r.d) && isNum(r.t); }).length; }
  function missing(rep) {
    var out = [];
    if (!String(rep.pelapor || '').trim()) out.push('Nama pelapor');
    if (!rep.tipe) out.push('Tipe store');
    ROWS.forEach(function (r) {
      var need = [];
      if (r.photo === 1) { var pk = photoKeys(r), pm = pk.filter(function (k) { return !(rep.photos && rep.photos[k]); }).length; if (pm) need.push(pk.length > 1 ? 'foto ' + PCS + ' pcs (kurang ' + pm + ')' : 'foto'); }
      (r.fields || []).forEach(function (f) { if (!r.optional && !isNum(getVal(rep, r.id, f.k))) need.push(r.auto ? 'waktu otomatis belum terhitung (cek urutan foto)' : f.l); });
      if (r.measure && measFilled(rep, r.measure) < PCS) need.push('ukuran ' + PCS + ' pcs');
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
    var uHead = b64u8(LOGO_HEAD), iHead = jpegInfo(uHead);
    var idxHead = d.addImage(uHead, iHead);
    function onPage(i, fn) { var sc = d.cur, si = d.curImgs; d.cur = d.pages[i].ops; d.curImgs = d.pages[i].imgs; try { fn(); } finally { d.cur = sc; d.curImgs = si; } }
    function newBodyPage() { d.newPage(); y = BODY_TOP; }
    function need(h) { if (y - h < BOT) newBodyPage(); }
    function bar(text) { need(40); d.rect(26, y - 24, 543, 24, DARK, GL, 1.4); d.text(36, y - 16.5, text, 11, false, WHITE); y -= 24; }

    // ===== Isi protokol: hanya halaman 6-10 dokumen asli =====
    y = BODY_TOP;
    function heading(txt, x, size, mk) { need(size + 40); marks[mk] = d.pages.length; d.text(x, y - size, txt, size, true, INK); y -= size + 9; }
    function flow(lines, x, size, lh, color) { lines.forEach(function (ln) { need(lh); y = drawRich(d, x, y, [ln], size, lh, color); }); }
    function para(txt, x, w, size, lh) { flow(rich(txt, size, w), x, size, lh); y -= 8; }
    // tabel metode
    (function () {
      var rows = [['Besaran Trial', ['70 pcs dough trial']], ['Brand & Varian', ['Frozen Dough Taro Bun']],
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
      var pks = photoKeys(row), pics = [], missN = 0, hH = vL.length * LH;
      pks.forEach(function (k, pi2) {
        var u = images[k], inf = u ? jpegInfo(u) : null;
        if (inf) {
          var sc = Math.min((FW[2] - 2 * PAD) / inf.w, (pks.length > 1 ? 86 : 124) / inf.h), lab = pks.length > 1 ? 'Pcs ' + (pi2 + 1) : '';
          pics.push({ u8: u, inf: inf, dw: inf.w * sc, dh: inf.h * sc, lab: lab });
          hH += 4 + (lab ? LH : 0) + inf.h * sc;
        } else if (row.photo === 1) missN++;
      });
      if (missN) hH += 4 + LH;
      var nt = String((rep.notes && rep.notes[row.id]) || '').trim(), nL = nt ? rich(nt, FS, FW[3] - 2 * PAD) : [], cH = 0, mh = null;
      if (row.measure) { mh = rich('Catat diameter dan tinggi ' + row.mlabel + ':', FS, FW[3] - 2 * PAD); cH = mh.length * LH + 3 + 14 + MEAS_ROWS * 14.5; }
      if (nL.length) cH += (cH ? 4 : 0) + nL.length * LH;
      return { pl: pl, ex: ex, vL: vL, pics: pics, missN: missN, nL: nL, mh: mh, h: Math.max(pH, hH, cH, 16) + 2 * PAD };
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
      L.pics.forEach(function (pc) {
        hy -= 4;
        if (pc.lab) { d.text(fcol(2) + PAD, hy - FS * 0.88, pc.lab, FS, true, INK); hy -= LH; }
        var idx = d.addImage(pc.u8, pc.inf), ix = fcol(2) + PAD + ((FW[2] - 2 * PAD) - pc.dw) / 2;
        d.drawImage(idx, ix, hy - pc.dh, pc.dw, pc.dh); d.rect(ix, hy - pc.dh, pc.dw, pc.dh, null, PH_BORDER, 0.4);
        hy -= pc.dh;
      });
      if (L.missN) { hy -= 4; drawRich(d, fcol(2) + PAD, hy, rich('(foto belum diambil: ' + L.missN + ')', FS, FW[2] - 2 * PAD), FS, LH, [0.7, 0.13, 0.2]); }
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
    flow(rich('Dokumen ini dibuat otomatis oleh aplikasi So Mandiri Hub dari isian pelapor. Foto berstempel tanggal dan jam saat diambil. Waktu thawing, proofing, dan baking dihitung otomatis dari jam foto. Satuan diameter dan tinggi: cm.', 8, 467), 58, 8, 11, MUTE);

    // ===== Header setiap halaman =====
    var total = d.pages.length;
    for (var pi = 0; pi < total; pi++) (function (i) {
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

  root.DoughRnd = { ROWS: ROWS, STAGES: STAGES, TYPES: TYPES, MEAS_ROWS: MEAS_ROWS, PCS: PCS, AUTO: AUTO, photoKeys: photoKeys, allPhotoKeys: allPhotoKeys, rowByKey: rowByKey, autoMin: autoMin, guessType: guessType, typeLabel: typeLabel, normNum: normNum, isNum: isNum, missing: missing, measFilled: measFilled, buildPdf: buildPdf, buildCaption: buildCaption };
})(typeof window !== 'undefined' ? window : this);
