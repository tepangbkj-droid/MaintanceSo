/* ojt-rekap.js — Pembuat PDF "Rekap Hasil Ujian OJT" (tanpa library, jalan di browser & APK WebView).
 * Pakai:  OjtRekapPdf.download(people, { title, storeLabel, filename })
 * `people` = array dari /api/ojt/people (Store Leader) atau /api/ojt/overview (Admin):
 *   { name, storeName, stages:{bakery:{result,score,note,at},...}, finished, finishedAt, finalNote,
 *     status:{canProceed,label}, tests:[{title,status,score,at,remedial,prevScore}] }
 * Watermark "By So Mandiri Hub" diagonal di setiap halaman + footer.
 */
(function (root) {
  'use strict';
  var PW = 595.28, PH = 841.89, MX = 36, TOP = 36, BOT = 48;
  var WATERMARK = 'By So Mandiri Hub';
  var C = {
    brand: [0.357, 0.129, 0.714], brandDark: [0.247, 0.078, 0.553], ink: [0.12, 0.14, 0.19], mute: [0.42, 0.45, 0.5],
    line: [0.86, 0.88, 0.91], soft: [0.965, 0.96, 0.99], ok: [0.02, 0.47, 0.34], okBg: [0.9, 0.97, 0.93],
    bad: [0.75, 0.13, 0.2], badBg: [0.99, 0.91, 0.92], warn: [0.7, 0.4, 0.02], warnBg: [0.995, 0.95, 0.85], white: [1, 1, 1]
  };
  // Lebar huruf Helvetica & Helvetica-Bold (ASCII 32..126, satuan 1/1000 em)
  var WR = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  var WB = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
  var CP1252 = { 0x2013: 0x96, 0x2014: 0x97, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2026: 0x85, 0x20AC: 0x80 };

  // teks -> string byte WinAnsi (karakter di luar jangkauan jadi '?', emoji dibuang)
  function enc(s) {
    s = String(s === null || s === undefined ? '' : s).replace(/[\u0000-\u001f]/g, ' ').replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF\uFE0F\u200D]/gu, '');
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 32 && c <= 126) out += s[i];
      else if (c >= 160 && c <= 255) out += s[i];
      else if (CP1252[c]) out += String.fromCharCode(CP1252[c]);
      else if (c === 9 || c === 10 || c === 13) out += ' ';
      else out += '?';
    }
    return out;
  }
  function wchar(code, bold) {
    if (code >= 32 && code <= 126) return (bold ? WB : WR)[code - 32];
    return 556;
  }
  function tw(s, size, bold) { var w = 0; for (var i = 0; i < s.length; i++) w += wchar(s.charCodeAt(i), bold); return w * size / 1000; }
  function pdfStr(s) { return '(' + s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ')'; }
  function fmt(n) { return (Math.round(n * 100) / 100).toString(); }
  function col(c) { return fmt(c[0]) + ' ' + fmt(c[1]) + ' ' + fmt(c[2]); }
  // bungkus teks per lebar
  function wrap(text, size, bold, maxW) {
    var raw = enc(text).split(/\s+/).filter(Boolean), lines = [], cur = '';
    raw.forEach(function (w) {
      while (tw(w, size, bold) > maxW) { // kata terlalu panjang: potong
        var k = w.length; while (k > 1 && tw(w.slice(0, k), size, bold) > maxW) k--;
        if (cur) { lines.push(cur); cur = ''; }
        lines.push(w.slice(0, k)); w = w.slice(k);
      }
      var t = cur ? cur + ' ' + w : w;
      if (tw(t, size, bold) <= maxW) cur = t; else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }

  function Doc() { this.pages = []; this.cur = null; this.newPage(); }
  Doc.prototype.newPage = function () { this.cur = []; this.pages.push(this.cur); this.y = PH - TOP; return this.cur; };
  Doc.prototype.op = function (s) { this.cur.push(s); };
  Doc.prototype.rect = function (x, y, w, h, fill, stroke, lw) {
    var s = '';
    if (fill) s += col(fill) + ' rg ';
    if (stroke) s += col(stroke) + ' RG ' + fmt(lw || 0.6) + ' w ';
    s += fmt(x) + ' ' + fmt(y) + ' ' + fmt(w) + ' ' + fmt(h) + ' re ' + (fill && stroke ? 'B' : fill ? 'f' : 'S');
    this.op(s);
  };
  Doc.prototype.line = function (x1, y1, x2, y2, c, lw) { this.op(col(c) + ' RG ' + fmt(lw || 0.6) + ' w ' + fmt(x1) + ' ' + fmt(y1) + ' m ' + fmt(x2) + ' ' + fmt(y2) + ' l S'); };
  Doc.prototype.text = function (x, y, s, size, bold, color, align, maxW) {
    s = enc(s);
    if (maxW) { while (s.length > 1 && tw(s, size, bold) > maxW) s = s.slice(0, -1); }
    var w = tw(s, size, bold);
    if (align === 'right') x -= w; else if (align === 'center') x -= w / 2;
    this.op('BT ' + col(color || C.ink) + ' rg /' + (bold ? 'F2' : 'F1') + ' ' + fmt(size) + ' Tf ' + fmt(x) + ' ' + fmt(y) + ' Td ' + pdfStr(s) + ' Tj ET');
  };
  Doc.prototype.build = function (meta) {
    var objs = [], n = this.pages.length;
    function add(s) { objs.push(s); return objs.length; }
    add('<< /Type /Catalog /Pages 2 0 R >>');                         // 1
    var kids = []; for (var i = 0; i < n; i++) kids.push((7 + i * 2) + ' 0 R');
    add('<< /Type /Pages /Count ' + n + ' /Kids [' + kids.join(' ') + '] >>'); // 2
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');      // 3
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'); // 4
    add('<< /Type /ExtGState /ca 0.10 /CA 0.10 >>');                  // 5 (transparansi watermark)
    add('<< /Title ' + pdfStr(enc(meta.title)) + ' /Author (So Mandiri Hub) /Creator (So Mandiri Hub) /Producer (So Mandiri Hub) >>'); // 6
    for (var p = 0; p < n; p++) {
      var wm = WATERMARK, size = 50, ang = 45 * Math.PI / 180, cs = Math.cos(ang), sn = Math.sin(ang);
      var w = tw(wm, size, true), cx = PW / 2, cy = PH / 2;
      var x0 = cx - (w / 2) * cs, y0 = cy - (w / 2) * sn - size * 0.3;
      var water = 'q /GS1 gs BT ' + col(C.brandDark) + ' rg /F2 ' + size + ' Tf ' + fmt(cs) + ' ' + fmt(sn) + ' ' + fmt(-sn) + ' ' + fmt(cs) + ' ' + fmt(x0) + ' ' + fmt(y0) + ' Tm ' + pdfStr(wm) + ' Tj ET Q';
      var water2 = 'q /GS1 gs BT ' + col(C.brandDark) + ' rg /F2 20 Tf ' + fmt(cs) + ' ' + fmt(sn) + ' ' + fmt(-sn) + ' ' + fmt(cs) + ' 60 150 Tm ' + pdfStr(wm) + ' Tj ET Q';
      var water3 = 'q /GS1 gs BT ' + col(C.brandDark) + ' rg /F2 20 Tf ' + fmt(cs) + ' ' + fmt(sn) + ' ' + fmt(-sn) + ' ' + fmt(cs) + ' 330 480 Tm ' + pdfStr(wm) + ' Tj ET Q';
      var content = this.pages[p].join('\n') + '\n' + water + '\n' + water2 + '\n' + water3;
      var cobj = add('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream'); // 7+2p
      // urutan: halaman (7+2p) harus mendahului isi? kita tetapkan: konten = 7+2p, halaman = 8+2p -> sesuaikan Kids di bawah
      add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /ExtGState << /GS1 5 0 R >> >> /Contents ' + cobj + ' 0 R >>');
    }
    // Kids harus menunjuk objek halaman (8+2p)
    var kids2 = []; for (var k = 0; k < n; k++) kids2.push((8 + k * 2) + ' 0 R');
    objs[1] = '<< /Type /Pages /Count ' + n + ' /Kids [' + kids2.join(' ') + '] >>';
    var out = '%PDF-1.4\n', offs = [];
    for (var o = 0; o < objs.length; o++) { offs.push(out.length); out += (o + 1) + ' 0 obj\n' + objs[o] + '\nendobj\n'; }
    var xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offs.forEach(function (f) { out += ('0000000000' + f).slice(-10) + ' 00000 n \n'; });
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R /Info 6 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    var bytes = new Uint8Array(out.length);
    for (var b = 0; b < out.length; b++) bytes[b] = out.charCodeAt(b) & 255;
    return bytes;
  };

  // ---------- util data ----------
  function fmtDate(ms) { try { return ms ? new Date(ms).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'; } catch (e) { return '-'; } }
  function testsOf(p) {
    if (Array.isArray(p.tests) && p.tests.length) return p.tests;
    if (p.tes && p.tes.score !== null && p.tes.score !== undefined) return [{ title: p.tes.title || 'Tes', status: 'completed', score: p.tes.score, at: p.tes.at }];
    return [];
  }
  function avg(arr) { arr = arr.filter(function (x) { return typeof x === 'number' && isFinite(x); }); return arr.length ? Math.round(arr.reduce(function (a, b) { return a + b; }, 0) / arr.length * 10) / 10 : null; }
  var STAGES = [['bakery', 'Bakery'], ['filler', 'Filler'], ['kasir', 'Kasir']];
  function examAvg(p) { return avg(testsOf(p).filter(function (t) { return t.status === 'completed' && t.score !== null && t.score !== undefined; }).map(function (t) { return Number(t.score); })); }
  function slAvg(p) { return avg(STAGES.map(function (s) { var x = (p.stages || {})[s[0]]; return x ? Number(x.score) : null; })); }
  function nilai(v) { return v === null || v === undefined ? '-' : String(v); }

  // ---------- layout ----------
  function pageHeader(d, opt, first) {
    if (first) {
      d.rect(0, PH - 96, PW, 96, C.brand);
      d.rect(0, PH - 100, PW, 4, C.brandDark);
      d.text(MX, PH - 44, 'REKAP HASIL UJIAN OJT', 22, true, C.white);
      d.text(MX, PH - 64, opt.storeLabel, 11, false, [0.9, 0.86, 1]);
      d.text(MX, PH - 80, 'Dicetak ' + fmtDate(Date.now()) + '  |  ' + opt.count + ' peserta', 9, false, [0.85, 0.8, 1]);
      d.text(PW - MX, PH - 44, 'So Mandiri Hub', 11, true, C.white, 'right');
      d.text(PW - MX, PH - 60, 'Tarobun', 9, false, [0.9, 0.86, 1], 'right');
      d.y = PH - 118;
    } else {
      d.rect(0, PH - 30, PW, 30, C.brand);
      d.text(MX, PH - 20, 'Rekap Hasil Ujian OJT', 10, true, C.white);
      d.text(PW - MX, PH - 20, opt.storeLabel, 9, false, [0.9, 0.86, 1], 'right', 300);
      d.y = PH - 50;
    }
  }
  function ensure(d, opt, h) { if (d.y - h < BOT) { d.newPage(); pageHeader(d, opt, false); } }
  function chip(d, x, y, label, fg, bg) {
    var w = tw(enc(label), 8, true) + 12;
    d.rect(x, y - 3, w, 13, bg); d.text(x + 6, y + 0.5, label, 8, true, fg);
    return w;
  }

  function summaryTable(d, opt, people) {
    var cols = [{ t: 'No', w: 24, a: 'center' }, { t: 'Nama', w: 150 }, { t: 'Penempatan', w: 110 }, { t: 'Rata2 Ujian', w: 62, a: 'center' }, { t: 'Rata2 SL', w: 54, a: 'center' }, { t: 'Keputusan', w: 119.28 }];
    ensure(d, opt, 60);
    d.text(MX, d.y, 'Ringkasan Peserta', 13, true, C.brandDark); d.y -= 10;
    var drawHead = function () {
      d.rect(MX, d.y - 18, PW - 2 * MX, 18, C.brand);
      var x = MX; cols.forEach(function (c) { d.text(c.a === 'center' ? x + c.w / 2 : x + 5, d.y - 12.5, c.t, 8.5, true, C.white, c.a === 'center' ? 'center' : 'left'); x += c.w; });
      d.y -= 18;
    };
    drawHead();
    people.forEach(function (p, i) {
      if (d.y - 20 < BOT) { d.newPage(); pageHeader(d, opt, false); drawHead(); }
      var st = p.status || {}, row = [String(i + 1), p.name, p.storeName || p.storeId || '-', nilai(examAvg(p)), nilai(slAvg(p)), st.canProceed ? 'Bisa lanjut' : 'Belum bisa lanjut'];
      if (i % 2 === 0) d.rect(MX, d.y - 20, PW - 2 * MX, 20, C.soft);
      var x = MX;
      cols.forEach(function (c, ci) {
        var color = ci === 5 ? (st.canProceed ? C.ok : C.warn) : C.ink;
        d.text(c.a === 'center' ? x + c.w / 2 : x + 5, d.y - 13.5, row[ci], 8.5, ci === 1 || ci === 5, color, c.a === 'center' ? 'center' : 'left', c.w - 10);
        x += c.w;
      });
      d.y -= 20;
    });
    d.line(MX, d.y, PW - MX, d.y, C.line, 0.8);
    d.y -= 22;
  }

  function personBlock(d, opt, p, no) {
    var W = PW - 2 * MX, st = p.status || {}, tests = testsOf(p);
    var noteW = W - 24 - 70 - 48 - 22;
    // hitung tinggi
    var stageRows = STAGES.map(function (s) {
      var x = (p.stages || {})[s[0]];
      var lines = wrap(x && x.note ? x.note : '-', 8.5, false, noteW);
      return { label: s[1], x: x, lines: lines, h: Math.max(20, lines.length * 11 + 9) };
    });
    var finalLines = wrap(p.finalNote || 'Belum ada evaluasi akhir.', 8.5, false, W - 24);
    var testH = Math.max(1, tests.length) * 19 + 18;
    var stageH = stageRows.reduce(function (a, r) { return a + r.h; }, 0) + 18;
    var total = 52 + 16 + testH + 16 + stageH + 14 + 14 + finalLines.length * 11 + 14 + 14;
    ensure(d, opt, Math.min(total, 400));
    var top = d.y;
    // kartu
    d.rect(MX, d.y - 46, W, 46, C.soft, C.line, 0.8);
    d.rect(MX, d.y - 46, 5, 46, C.brand);
    d.text(MX + 16, d.y - 19, no + '. ' + p.name, 13, true, C.ink, 'left', W - 150);
    d.text(MX + 16, d.y - 35, 'Penempatan: ' + (p.storeName || p.storeId || '-'), 9.5, false, C.mute, 'left', W - 150);
    var okk = !!st.canProceed, lbl = okk ? 'BISA LANJUT' : 'BELUM BISA LANJUT';
    var cw = tw(lbl, 8, true) + 14;
    d.rect(MX + W - cw - 10, d.y - 24, cw, 16, okk ? C.okBg : C.warnBg, okk ? C.ok : C.warn, 0.6);
    d.text(MX + W - cw - 10 + cw / 2, d.y - 19, lbl, 8, true, okk ? C.ok : C.warn, 'center');
    d.y -= 62;

    // skor ujian
    d.text(MX + 2, d.y, 'SKOR UJIAN YANG DIKERJAKAN', 9, true, C.brandDark); d.y -= 6;
    d.rect(MX, d.y - 15, W, 15, C.brandDark);
    d.text(MX + 8, d.y - 10.5, 'Nama Ujian', 8, true, C.white); d.text(MX + W - 200, d.y - 10.5, 'Skor', 8, true, C.white, 'center'); d.text(MX + W - 160, d.y - 10.5, 'Status', 8, true, C.white); d.text(MX + W - 8, d.y - 10.5, 'Tanggal', 8, true, C.white, 'right');
    d.y -= 15;
    if (!tests.length) {
      d.rect(MX, d.y - 19, W, 19, C.white, C.line, 0.5); d.text(MX + 8, d.y - 13, 'Belum ada ujian yang dikerjakan.', 8.5, false, C.mute); d.y -= 19;
    } else tests.forEach(function (t, i) {
      var done = t.status === 'completed', sc = done && t.score !== null && t.score !== undefined ? String(t.score) : '-';
      var stt = done ? (t.remedial ? 'Remedial' + (t.prevScore !== null && t.prevScore !== undefined ? ' (sblm ' + t.prevScore + ')' : '') : 'Selesai') : (t.status === 'blocked' ? 'Terblokir' : 'Berjalan');
      d.rect(MX, d.y - 19, W, 19, i % 2 ? C.soft : C.white, C.line, 0.5);
      d.text(MX + 8, d.y - 13, t.title || 'Tes', 8.5, false, C.ink, 'left', W - 230);
      var scn = Number(sc); var scol = sc === '-' ? C.mute : (scn >= 70 ? C.ok : scn >= 50 ? C.warn : C.bad);
      d.text(MX + W - 200, d.y - 13, sc, 10, true, scol, 'center');
      d.text(MX + W - 160, d.y - 13, stt, 8, false, C.ink, 'left', 96);
      d.text(MX + W - 8, d.y - 13, fmtDate(t.at), 8, false, C.mute, 'right');
      d.y -= 19;
    });
    d.y -= 12;

    // evaluasi SL
    ensure(d, opt, stageH + 40);
    d.text(MX + 2, d.y, 'EVALUASI STORE LEADER (SL)', 9, true, C.brandDark); d.y -= 6;
    d.rect(MX, d.y - 15, W, 15, C.brandDark);
    d.text(MX + 8, d.y - 10.5, 'Stage', 8, true, C.white); d.text(MX + 82, d.y - 10.5, 'Hasil', 8, true, C.white); d.text(MX + 152, d.y - 10.5, 'Nilai', 8, true, C.white); d.text(MX + 200, d.y - 10.5, 'Catatan SL', 8, true, C.white);
    d.y -= 15;
    stageRows.forEach(function (r, i) {
      d.rect(MX, d.y - r.h, W, r.h, i % 2 ? C.soft : C.white, C.line, 0.5);
      d.text(MX + 8, d.y - 13, r.label, 9, true, C.ink);
      if (r.x) {
        var lolos = r.x.result === 'lolos';
        d.rect(MX + 80, d.y - 16, 50, 13, lolos ? C.okBg : C.badBg);
        d.text(MX + 105, d.y - 12.5, lolos ? 'Lolos' : 'Belum Lolos', 7.5, true, lolos ? C.ok : C.bad, 'center');
        d.text(MX + 152, d.y - 13, nilai(r.x.score), 10, true, C.ink);
      } else { d.text(MX + 82, d.y - 13, 'Belum dinilai', 8, false, C.mute); }
      r.lines.forEach(function (ln, li) { d.text(MX + 200, d.y - 13 - li * 11, ln, 8.5, false, C.ink); });
      d.y -= r.h;
    });
    d.y -= 10;
    var fh = finalLines.length * 11 + 28;
    ensure(d, opt, fh + 10);
    d.rect(MX, d.y - fh, W, fh, C.white, C.line, 0.8);
    d.text(MX + 10, d.y - 13, 'Evaluasi Akhir Store Leader', 8.5, true, C.brandDark);
    if (p.finished) d.text(MX + W - 10, d.y - 13, 'Selesai OJT ' + fmtDate(p.finishedAt), 8, false, C.ok, 'right');
    finalLines.forEach(function (ln, li) { d.text(MX + 10, d.y - 26 - li * 11, ln, 8.5, false, C.ink); });
    d.y -= fh + 8;
    d.text(MX + 2, d.y, 'Keputusan: ' + (st.label || '-'), 8.5, true, okk ? C.ok : C.warn, 'left', W - 4);
    d.y -= 24;
    void top;
  }

  function footers(d, opt) {
    var n = d.pages.length;
    for (var i = 0; i < n; i++) {
      d.cur = d.pages[i];
      d.line(MX, 34, PW - MX, 34, C.line, 0.6);
      d.text(MX, 22, 'Dokumen rahasia internal - dibuat otomatis oleh So Mandiri Hub', 7.5, false, C.mute);
      d.text(PW - MX, 22, 'Halaman ' + (i + 1) + ' / ' + n, 7.5, false, C.mute, 'right');
    }
  }

  function build(people, options) {
    options = options || {};
    var list = (people || []).slice().sort(function (a, b) { return String(a.storeName || '').localeCompare(String(b.storeName || ''), 'id') || String(a.name || '').localeCompare(String(b.name || ''), 'id'); });
    var stores = {}; list.forEach(function (p) { stores[p.storeName || p.storeId || '-'] = 1; });
    var sk = Object.keys(stores);
    var opt = { storeLabel: options.storeLabel || (sk.length === 1 ? sk[0] : sk.length + ' outlet'), count: list.length, title: options.title || 'Rekap Hasil Ujian OJT' };
    var d = new Doc();
    pageHeader(d, opt, true);
    // kartu ringkas
    var ok = list.filter(function (p) { return p.status && p.status.canProceed; }).length;
    var boxes = [['Total Peserta', list.length, C.brandDark], ['Bisa Lanjut', ok, C.ok], ['Belum Bisa', list.length - ok, C.warn], ['Rata2 Ujian', nilai(avg(list.map(examAvg))), C.ink]];
    var bw = (PW - 2 * MX - 3 * 8) / 4;
    boxes.forEach(function (b, i) {
      var x = MX + i * (bw + 8);
      d.rect(x, d.y - 44, bw, 44, C.soft, C.line, 0.8);
      d.text(x + bw / 2, d.y - 24, String(b[1]), 18, true, b[2], 'center');
      d.text(x + bw / 2, d.y - 38, b[0], 8, false, C.mute, 'center');
    });
    d.y -= 62;
    if (list.length > 1) summaryTable(d, opt, list);
    list.forEach(function (p, i) { personBlock(d, opt, p, i + 1); });
    footers(d, opt);
    return d.build(opt);
  }

  // ---- Simpan/bagikan file di APK (WebView tidak bisa mengunduh blob:) ----
  function bytesToBase64(u8) {
    var s = '', i, step = 0x8000;
    for (i = 0; i < u8.length; i += step) s += String.fromCharCode.apply(null, u8.subarray(i, i + step));
    return btoa(s);
  }
  function capPlugin(name) {
    var C = root.Capacitor;
    if (!C) return null;
    return (C.Plugins && C.Plugins[name]) || (typeof C.registerPlugin === 'function' ? C.registerPlugin(name) : null);
  }
  function isNativeApp() { var C = root.Capacitor; return !!(C && C.isNativePlatform && C.isNativePlatform()); }
  // Tulis ke cache aplikasi lalu buka lembar Bagikan Android (Simpan ke File / Drive / WhatsApp).
  // Butuh plugin @capacitor/filesystem + @capacitor/share (ada di APK versi baru). Resolve false bila plugin tidak ada.
  function saveNative(blob, name) {
    if (!isNativeApp()) return Promise.resolve(false);
    var Fs = capPlugin('Filesystem'), Sh = capPlugin('Share');
    if (!Fs || !Sh) return Promise.resolve(false);
    return blob.arrayBuffer().then(function (buf) {
      return Fs.writeFile({ path: name, data: bytesToBase64(new Uint8Array(buf)), directory: 'CACHE', recursive: true });
    }).then(function (w) {
      return Sh.share({ title: name, url: w.uri, dialogTitle: 'Simpan / bagikan file' });
    }).then(function () { return true; }, function (e) {
      var m = String((e && (e.message || e.errorMessage)) || e || '');
      if (/cancel|dismiss/i.test(m)) return true;   // pengguna menutup lembar Bagikan
      return false;                                   // plugin belum ada di APK lama -> pakai cara biasa
    });
  }
  function browserDownload(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click();
    setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) { } }, 4000);
  }
  // Dipakai juga oleh fitur unduh lain (CSV, dll): window.TbSaveFile(blob, namaFile)
  function saveFile(blob, name, onFail) {
    if (!isNativeApp()) { browserDownload(blob, name); return; }
    saveNative(blob, name).then(function (ok) {
      if (ok) return;
      browserDownload(blob, name);
      if (typeof onFail === 'function') onFail('Perbarui aplikasi (APK) ke versi terbaru agar bisa menyimpan file.');
    });
  }
  root.TbSaveFile = saveFile;

  function download(people, options) {
    options = options || {};
    var bytes = build(people, options);
    var name = options.filename || ('Rekap-OJT-' + new Date().toISOString().slice(0, 10) + '.pdf');
    var blob = new Blob([bytes], { type: 'application/pdf' });
    saveFile(blob, name, options.onFail);
    return blob;
  }

  root.OjtRekapPdf = { build: build, download: download };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.OjtRekapPdf;
})(typeof window !== 'undefined' ? window : globalThis);
