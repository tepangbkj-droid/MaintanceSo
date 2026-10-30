/* dough-report.js — Logika + PDF "Laporan Lama Ngembang Dough" (tanpa library, jalan di browser & APK WebView).
 * API: window.DoughReport = { STD, SLOTS, evaluate, fmtDur, fmtDT, greeting, buildCaption, buildPdf }
 *  - evaluate(photos)         -> hasil durasi + status (ok/short/long/na) tiap tahap
 *  - buildPdf(rep, images)    -> Uint8Array PDF. images = { slotKey: Uint8Array(JPEG) }
 * Standar (ubah di STD bila SOP berubah): thawing 1-2 jam, proofing 1,5-3,5 jam, resting minimal 10 menit.
 */
(function (root) {
  'use strict';
  var STD = {
    thaw: { min: 60, max: 120, label: '1 - 2 jam', name: 'Thawing' },
    proof: { min: 90, max: 210, label: '1,5 - 3,5 jam', name: 'Proofing' },
    rest: { min: 10, max: null, label: 'min. 10 menit', name: 'Resting' },
    doughTemp: 20
  };
  // Urutan foto yang wajib. Setiap foto diberi cap tanggal & jam di aplikasi.
  var SLOTS = [
    { k: 'ed', stage: 'Input ED', label: 'Foto ED di plastik' },
    { k: 'thawStart', stage: 'Thawing', label: 'Foto dough saat mulai thawing' },
    { k: 'thawRoom', stage: 'Thawing', label: 'Foto suhu ruang (mulai thawing)' },
    { k: 'thawEnd', stage: 'Thawing', label: 'Foto dough setelah suhu 20\u00B0C' },
    { k: 'thawEndRoom', stage: 'Thawing', label: 'Foto suhu ruang (dough sudah 20\u00B0C)' },
    { k: 'proofRoom', stage: 'Proofing', label: 'Foto suhu ruangan' },
    { k: 'proofStart', stage: 'Proofing', label: 'Foto dough masuk proofing' },
    { k: 'proofEnd', stage: 'Proofing', label: 'Foto dough sesuai standar (penggaris proofing)' },
    { k: 'afterProof', stage: 'Proofing', label: 'Foto dough setelah keluar proofing' },
    { k: 'bakeTimer', stage: 'Baking', label: 'Foto timer baking' },
    { k: 'bakeTemp', stage: 'Baking', label: 'Foto suhu baking' },
    { k: 'restRoom', stage: 'Resting', label: 'Foto suhu ruang (resting)' },
    { k: 'restStart', stage: 'Resting', label: 'Foto dough baru keluar oven (penggaris gawang Tarobun)' },
    { k: 'restEnd', stage: 'Resting', label: 'Foto termo gun: roti sudah suhu ruang' }
  ];

  var TZ = 'Asia/Jakarta';
  function fmtDT(ms) {
    if (!ms) return '-';
    try {
      var s = new Date(ms).toLocaleString('id-ID', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      return s.replace(',', '').replace(/(\d{2})\.(\d{2})\.(\d{2})$/, '$1:$2:$3');
    } catch (e) { return new Date(ms).toISOString(); }
  }
  function fmtHM(ms) { var s = fmtDT(ms); return s === '-' ? s : s.replace(/^.*?(\d{2}:\d{2}:\d{2})$/, '$1'); }
  function fmtDur(sec) {
    if (sec === null || sec === undefined || isNaN(sec)) return '-';
    sec = Math.max(0, Math.round(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return h + ' jam ' + m + ' mnt';
    if (m > 0) return m + ' mnt' + (s ? ' ' + s + ' dtk' : '');
    return s + ' dtk';
  }
  function greeting(ms) {
    var h = 12;
    try { h = parseInt(new Date(ms || Date.now()).toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }), 10); } catch (e) { }
    if (h >= 4 && h < 11) return 'pagi';
    if (h >= 11 && h < 15) return 'siang';
    if (h >= 15 && h < 18) return 'sore';
    return 'malam';
  }
  function judge(sec, std) {
    if (sec === null || sec === undefined) return 'na';
    if (sec < std.min * 60) return 'short';
    if (std.max !== null && sec > std.max * 60) return 'long';
    return 'ok';
  }
  function gap(sec, std, st) {
    if (st === 'short') return 'kurang ' + fmtDur(std.min * 60 - sec);
    if (st === 'long') return 'lebih ' + fmtDur(sec - std.max * 60);
    return '';
  }
  function dur(a, b) { return (a && b && a.ts && b.ts) ? Math.round((b.ts - a.ts) / 1000) : null; }
  // photos: { slotKey: { ts, ... } }
  function evaluate(photos) {
    photos = photos || {};
    var out = {};
    [['thaw', 'thawStart', 'thawEnd'], ['proof', 'proofStart', 'proofEnd'], ['rest', 'restStart', 'restEnd']].forEach(function (d) {
      var std = STD[d[0]], a = photos[d[1]], b = photos[d[2]], sec = dur(a, b), st = judge(sec, std);
      out[d[0]] = { key: d[0], name: std.name, std: std, sec: sec, status: st, gap: gap(sec, std, st), start: a ? a.ts : null, end: b ? b.ts : null };
    });
    out.total = { sec: dur(photos.thawStart, photos.restEnd) };
    out.bad = ['thaw', 'proof', 'rest'].filter(function (k) { return out[k].status === 'short' || out[k].status === 'long'; }).length;
    out.done = ['thaw', 'proof', 'rest'].filter(function (k) { return out[k].status !== 'na'; }).length;
    out.allOk = out.bad === 0 && out.done === 3;
    return out;
  }
  function statusWord(st) { return st === 'ok' ? 'SESUAI' : st === 'short' ? 'KURANG' : st === 'long' ? 'LEBIH' : '-'; }

  // Teks yang dikirim ke Telegram (ikut jadi keterangan PDF). Maks 1024 karakter.
  function buildCaption(rep, ev, ccList, nowMs) {
    var L = [];
    var head = 'Selamat ' + greeting(nowMs) + ', saya ingin menginformasikan lama Ngembang Dough' + (ev.allOk ? ' (semua tahap sesuai standar)' : ' yang tidak sesuai standar');
    L.push(head, '');
    L.push('Store : ' + (rep.storeName || '-'));
    L.push('Nama pelapor : ' + (rep.pelapor || '-'));
    L.push('Kode ED : ' + (rep.kodeEd || '-'));
    L.push('ED FD : ' + (rep.edFd || '-'));
    L.push('');
    ['thaw', 'proof', 'rest'].forEach(function (k) {
      var r = ev[k];
      var line = r.name + ' : ' + fmtDur(r.sec) + ' (standar ' + r.std.label + ') - ' + (r.status === 'ok' ? 'SESUAI' : r.status === 'na' ? 'belum lengkap' : 'TIDAK SESUAI, ' + r.gap);
      L.push((r.status === 'ok' ? '\u2705 ' : r.status === 'na' ? '\u2753 ' : '\u274C ') + line);
    });
    L.push('Total thawing sampai resting : ' + fmtDur(ev.total.sec));
    if (rep.notes) L.push('', 'Catatan : ' + String(rep.notes).slice(0, 200));
    L.push('', 'Laporan lengkap + foto ada di PDF terlampir.');
    if (ccList && ccList.length) L.push('CC ' + ccList.map(function (u) { return '@' + u; }).join(' '));
    var s = L.join('\n');
    return s.length > 1000 ? s.slice(0, 997) + '...' : s;
  }

  // ================= PDF =================
  var PW = 595.28, PH = 841.89, MX = 36, TOP = 36, BOT = 44;
  var C = {
    brand: [0.357, 0.129, 0.714], brandDark: [0.247, 0.078, 0.553], ink: [0.12, 0.14, 0.19], mute: [0.42, 0.45, 0.5],
    line: [0.86, 0.88, 0.91], soft: [0.965, 0.96, 0.99], ok: [0.02, 0.47, 0.34], okBg: [0.9, 0.97, 0.93],
    bad: [0.75, 0.13, 0.2], badBg: [0.99, 0.91, 0.92], warn: [0.7, 0.4, 0.02], warnBg: [0.995, 0.95, 0.85], white: [1, 1, 1], gray: [0.93, 0.94, 0.96]
  };
  var WR = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  var WB = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
  var CP1252 = { 0x2013: 0x96, 0x2014: 0x97, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2026: 0x85, 0x20AC: 0x80, 0xB0: 0xB0 };
  function enc(s) {
    s = String(s === null || s === undefined ? '' : s).replace(/[\u0000-\u001f]/g, ' ').replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF\uFE0F\u200D]/gu, '');
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 32 && c <= 126) out += s[i];
      else if (c >= 160 && c <= 255) out += s[i];
      else if (CP1252[c]) out += String.fromCharCode(CP1252[c]);
      else out += '?';
    }
    return out;
  }
  function wchar(code, bold) { return (code >= 32 && code <= 126) ? (bold ? WB : WR)[code - 32] : 556; }
  function tw(s, size, bold) { var w = 0; for (var i = 0; i < s.length; i++) w += wchar(s.charCodeAt(i), bold); return w * size / 1000; }
  function pdfStr(s) { return '(' + s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ')'; }
  function fmt(n) { return (Math.round(n * 100) / 100).toString(); }
  function col(c) { return fmt(c[0]) + ' ' + fmt(c[1]) + ' ' + fmt(c[2]); }
  function wrap(text, size, bold, maxW) {
    var raw = enc(text).split(/\s+/).filter(Boolean), lines = [], cur = '';
    raw.forEach(function (w) {
      while (tw(w, size, bold) > maxW) {
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
  // Ambil ukuran JPEG dari header SOF
  function jpegInfo(u8) {
    if (!u8 || u8.length < 4 || u8[0] !== 0xFF || u8[1] !== 0xD8) return null;
    var i = 2, n = u8.length;
    while (i + 4 < n) {
      if (u8[i] !== 0xFF) { i++; continue; }
      var m = u8[i + 1];
      if (m === 0xFF) { i++; continue; }
      if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
      var len = (u8[i + 2] << 8) | u8[i + 3];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        if (i + 9 >= n) return null;
        return { h: (u8[i + 5] << 8) | u8[i + 6], w: (u8[i + 7] << 8) | u8[i + 8], n: u8[i + 9] };
      }
      if (len < 2) return null;
      i += 2 + len;
    }
    return null;
  }

  function Doc() { this.pages = []; this.imgs = []; this.cur = null; this.curImgs = null; this.newPage(); }
  Doc.prototype.newPage = function () { this.cur = []; this.curImgs = {}; this.pages.push({ ops: this.cur, imgs: this.curImgs }); this.y = PH - TOP; };
  Doc.prototype.op = function (s) { this.cur.push(s); };
  Doc.prototype.rect = function (x, y, w, h, fill, stroke, lw) {
    var s = '';
    if (fill) s += col(fill) + ' rg ';
    if (stroke) s += col(stroke) + ' RG ' + fmt(lw || 0.6) + ' w ';
    s += fmt(x) + ' ' + fmt(y) + ' ' + fmt(w) + ' ' + fmt(h) + ' re ' + (fill && stroke ? 'B' : fill ? 'f' : 'S');
    this.op(s);
  };
  Doc.prototype.text = function (x, y, s, size, bold, color, align, maxW) {
    s = enc(s);
    if (maxW) { while (s.length > 1 && tw(s, size, bold) > maxW) s = s.slice(0, -1); }
    var w = tw(s, size, bold);
    if (align === 'right') x -= w; else if (align === 'center') x -= w / 2;
    this.op('BT ' + col(color || C.ink) + ' rg /' + (bold ? 'F2' : 'F1') + ' ' + fmt(size) + ' Tf ' + fmt(x) + ' ' + fmt(y) + ' Td ' + pdfStr(s) + ' Tj ET');
  };
  Doc.prototype.addImage = function (u8, info) { this.imgs.push({ u8: u8, info: info }); return this.imgs.length - 1; };
  Doc.prototype.drawImage = function (idx, x, y, w, h) {
    this.curImgs[idx] = true;
    this.op('q ' + fmt(w) + ' 0 0 ' + fmt(h) + ' ' + fmt(x) + ' ' + fmt(y) + ' cm /Im' + idx + ' Do Q');
  };
  Doc.prototype.build = function (meta) {
    var objs = [], np = this.pages.length, self = this;
    function add(head, stream) { objs.push({ head: head, stream: stream }); return objs.length; }
    add('<< /Type /Catalog /Pages 2 0 R >>');
    add('');                                   // 2 = Pages (diisi di bawah)
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');       // 3
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');  // 4
    add('<< /Title ' + pdfStr(enc(meta.title)) + ' /Author (So Mandiri Hub) /Creator (So Mandiri Hub) /Producer (So Mandiri Hub) >>'); // 5
    var imgIds = this.imgs.map(function (im) {
      var cs = im.info.n === 1 ? '/DeviceGray' : im.info.n === 4 ? '/DeviceCMYK /Decode [1 0 1 0 1 0 1 0]' : '/DeviceRGB';
      return add('<< /Type /XObject /Subtype /Image /Width ' + im.info.w + ' /Height ' + im.info.h + ' /ColorSpace ' + cs + ' /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.u8.length + ' >>', im.u8);
    });
    var kids = [];
    this.pages.forEach(function (pg) {
      var content = pg.ops.join('\n');
      var cid = add('<< /Length ' + content.length + ' >>', content);
      var xo = Object.keys(pg.imgs).map(function (k) { return '/Im' + k + ' ' + imgIds[+k] + ' 0 R'; }).join(' ');
      var pid = add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>' + (xo ? ' /XObject << ' + xo + ' >>' : '') + ' >> /Contents ' + cid + ' 0 R >>');
      kids.push(pid + ' 0 R');
    });
    objs[1].head = '<< /Type /Pages /Count ' + np + ' /Kids [' + kids.join(' ') + '] >>';
    var parts = [], len = 0, offs = [];
    function pushStr(s) { var b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; parts.push(b); len += b.length; }
    function pushBin(b) { parts.push(b); len += b.length; }
    pushStr('%PDF-1.4\n');
    objs.forEach(function (o, i) {
      offs.push(len);
      pushStr((i + 1) + ' 0 obj\n' + o.head + '\n');
      if (o.stream !== undefined) { pushStr('stream\n'); if (typeof o.stream === 'string') pushStr(o.stream); else pushBin(o.stream); pushStr('\nendstream\n'); }
      pushStr('endobj\n');
    });
    var xref = len;
    var x = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offs.forEach(function (f) { x += ('0000000000' + f).slice(-10) + ' 00000 n \n'; });
    x += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R /Info 5 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    pushStr(x);
    var out = new Uint8Array(len), p = 0;
    parts.forEach(function (b) { out.set(b, p); p += b.length; });
    return out;
  };

  function statusColors(st) {
    if (st === 'ok') return { fg: C.ok, bg: C.okBg };
    if (st === 'short' || st === 'long') return { fg: C.bad, bg: C.badBg };
    return { fg: C.mute, bg: C.gray };
  }

  // rep: { storeName, pelapor, kodeEd, edFd, createdAt, notes, photos:{k:{ts}} }
  function buildPdf(rep, images) {
    images = images || {};
    var ev = evaluate(rep.photos), d = new Doc(), now = rep.createdAt || Date.now();
    var CW = PW - 2 * MX;
    // ---- Header
    d.rect(0, PH - 74, PW, 74, C.brand);
    d.text(MX, PH - 36, 'LAPORAN LAMA NGEMBANG DOUGH', 18, true, C.white);
    d.text(MX, PH - 56, 'So Mandiri Hub  -  dibuat ' + fmtDT(now) + ' WIB', 9, false, [0.9, 0.86, 0.98]);
    var y = PH - 74 - 22;
    // ---- Sapaan
    var intro = 'Selamat ' + greeting(now) + ', saya ingin menginformasikan lama Ngembang Dough' + (ev.allOk ? ' (semua tahap sesuai standar).' : ' yang tidak sesuai standar.');
    wrap(intro, 10, false, CW).forEach(function (l) { d.text(MX, y, l, 10, false, C.ink); y -= 14; });
    y -= 6;
    // ---- Info
    var info = [['Store', rep.storeName], ['Nama pelapor', rep.pelapor], ['Kode ED', rep.kodeEd], ['ED FD', rep.edFd]];
    var ih = 14 + info.length * 17;
    d.rect(MX, y - ih, CW, ih, C.soft, C.line, 0.6);
    var iy = y - 18;
    info.forEach(function (r) {
      d.text(MX + 12, iy, r[0], 9.5, true, C.mute);
      d.text(MX + 110, iy, ':  ' + (r[1] || '-'), 10, true, C.ink, 'left', CW - 130);
      iy -= 17;
    });
    y -= ih + 14;
    // ---- Kesimpulan
    var bad = ev.bad;
    var vtxt = ev.done < 3 ? 'DATA BELUM LENGKAP (' + ev.done + ' dari 3 tahap terukur)' : (ev.allOk ? 'SEMUA TAHAP SESUAI STANDAR' : bad + ' TAHAP TIDAK SESUAI STANDAR');
    var vc = ev.done < 3 ? statusColors('na') : (ev.allOk ? statusColors('ok') : statusColors('short'));
    d.rect(MX, y - 30, CW, 30, vc.bg, vc.fg, 0.8);
    d.text(PW / 2, y - 20, vtxt, 12.5, true, vc.fg, 'center');
    y -= 30 + 16;
    // ---- Tabel durasi
    var cols = [{ t: 'Tahap', w: 74 }, { t: 'Mulai', w: 104 }, { t: 'Selesai', w: 104 }, { t: 'Durasi aktual', w: 86 }, { t: 'Standar', w: 78 }, { t: 'Hasil', w: CW - 446 }];
    var cx = MX;
    d.rect(MX, y - 20, CW, 20, C.brand);
    cols.forEach(function (c) { d.text(cx + 6, y - 13.5, c.t, 8.5, true, C.white); cx += c.w; });
    y -= 20;
    ['thaw', 'proof', 'rest'].forEach(function (k, idx) {
      var r = ev[k], sc = statusColors(r.status), rh = 34;
      d.rect(MX, y - rh, CW, rh, idx % 2 ? C.soft : C.white, C.line, 0.4);
      var x0 = MX;
      d.text(x0 + 6, y - 20, r.name, 10, true, C.ink); x0 += cols[0].w;
      d.text(x0 + 6, y - 14, r.start ? fmtDT(r.start).replace(/ \d{4} /, ' ').replace(/^(\d{2} \w+) /, '$1  ') : '-', 8, false, C.ink, 'left', cols[1].w - 8); x0 += cols[1].w;
      d.text(x0 + 6, y - 14, r.end ? fmtDT(r.end).replace(/ \d{4} /, ' ').replace(/^(\d{2} \w+) /, '$1  ') : '-', 8, false, C.ink, 'left', cols[2].w - 8); x0 += cols[2].w;
      d.text(x0 + 6, y - 20, fmtDur(r.sec), 10, true, sc.fg, 'left', cols[3].w - 8); x0 += cols[3].w;
      d.text(x0 + 6, y - 20, r.std.label, 8.5, false, C.ink, 'left', cols[4].w - 8); x0 += cols[4].w;
      d.rect(x0 + 4, y - 24, cols[5].w - 8, 16, sc.bg);
      d.text(x0 + cols[5].w / 2, y - 19.5, statusWord(r.status), 8.5, true, sc.fg, 'center');
      if (r.gap) d.text(x0 + cols[5].w / 2, y - 31, r.gap, 6.5, false, sc.fg, 'center', cols[5].w - 4);
      y -= rh;
    });
    y -= 12;
    d.text(MX, y, 'Total thawing sampai resting selesai : ' + fmtDur(ev.total.sec), 9.5, true, C.ink); y -= 14;
    var bt = rep.photos && rep.photos.bakeTimer, bp = rep.photos && rep.photos.bakeTemp;
    d.text(MX, y, 'Baking : foto timer ' + (bt ? fmtHM(bt.ts) : '-') + '   |   foto suhu baking ' + (bp ? fmtHM(bp.ts) : '-'), 9.5, false, C.ink); y -= 14;
    d.text(MX, y, 'Standar : thawing ' + STD.thaw.label + ', proofing ' + STD.proof.label + ', resting ' + STD.rest.label + '. Suhu dough target ' + STD.doughTemp + '\u00B0C.', 8.5, false, C.mute); y -= 16;
    if (rep.notes) {
      d.text(MX, y, 'Catatan pelapor', 9, true, C.mute); y -= 12;
      wrap(rep.notes, 9.5, false, CW).slice(0, 6).forEach(function (l) { d.text(MX, y, l, 9.5, false, C.ink); y -= 12; });
    }
    // ---- Foto (2 kolom x 3 baris per halaman)
    var GAP = 14, CWd = (CW - GAP) / 2, IMG_H = 160, CELL_H = IMG_H + 44, per = 6;
    var list = SLOTS.map(function (s, i) { return { s: s, i: i, p: rep.photos && rep.photos[s.k] }; });
    var idxInPage = 0;
    list.forEach(function (it, n) {
      if (n % per === 0) { d.newPage(); d.text(MX, PH - TOP - 4, 'Foto Bukti Proses (setiap foto berstempel tanggal & jam)', 11, true, C.brandDark); d.y = PH - TOP - 22; }
      var col = n % 2, row = Math.floor((n % per) / 2);
      var x = MX + col * (CWd + GAP), top = d.y - row * (CELL_H + 8);
      d.rect(x, top - CELL_H, CWd, CELL_H, C.white, C.line, 0.6);
      var bx = x + 4, by = top - 4 - IMG_H, bw = CWd - 8;
      var u8 = images[it.s.k], inf = u8 ? jpegInfo(u8) : null;
      if (inf && inf.w > 0 && inf.h > 0) {
        var sc = Math.min(bw / inf.w, IMG_H / inf.h), w = inf.w * sc, h = inf.h * sc;
        d.rect(bx, by, bw, IMG_H, C.gray);
        d.drawImage(d.addImage(u8, inf), bx + (bw - w) / 2, by + (IMG_H - h) / 2, w, h);
      } else {
        d.rect(bx, by, bw, IMG_H, C.gray);
        d.text(bx + bw / 2, by + IMG_H / 2, it.p ? 'Foto tidak dapat dimuat' : 'Foto belum diambil', 9, false, C.mute, 'center');
      }
      var cy = by - 12;
      d.text(bx + 2, cy, (it.i + 1) + '. ' + it.s.stage, 8, true, C.brand, 'left', bw - 4); cy -= 10;
      wrap(it.s.label, 8, true, bw - 4).slice(0, 2).forEach(function (l) { d.text(bx + 2, cy, l, 8, true, C.ink); cy -= 9.5; });
      d.text(bx + 2, by - 38, it.p ? fmtDT(it.p.ts) + ' WIB' : '-', 8, false, C.mute, 'left', bw - 4);
    });
    // ---- Footer
    var total = d.pages.length;
    d.pages.forEach(function (pg, i) {
      pg.ops.push('BT ' + col(C.mute) + ' rg /F1 8 Tf ' + MX + ' 24 Td ' + pdfStr(enc('Laporan Lama Ngembang Dough - ' + (rep.storeName || '') + ' - ' + fmtDT(now) + ' WIB')) + ' Tj ET');
      var t = 'Hal ' + (i + 1) + ' / ' + total;
      pg.ops.push('BT ' + col(C.mute) + ' rg /F1 8 Tf ' + fmt(PW - MX - tw(t, 8, false)) + ' 24 Td ' + pdfStr(t) + ' Tj ET');
    });
    return d.build({ title: 'Laporan Ngembang Dough - ' + (rep.storeName || '') });
  }

  root.DoughReport = { STD: STD, SLOTS: SLOTS, evaluate: evaluate, fmtDur: fmtDur, fmtDT: fmtDT, fmtHM: fmtHM, greeting: greeting, buildCaption: buildCaption, buildPdf: buildPdf, statusWord: statusWord };
})(typeof window !== 'undefined' ? window : this);
