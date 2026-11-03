/* ============================================================================
 * dough-rnd.js  --  Laporan Dough RnD (Protokol Trial In Store Frozen Dough, Yeast 200%)
 * Modul mandiri: window.DoughRnd
 *   - SLOTS / KATEGORI / helper waktu
 *   - validate(form, photos)   -> pesan error pertama ('' bila lengkap)
 *   - evaluate(form)           -> durasi thawing / proofing / baking + status
 *   - buildText(rep)           -> teks HASIL PENGAMATAN untuk pesan Telegram
 *   - buildCaption(rep, cc)    -> caption singkat untuk dokumen PDF
 *   - buildPdf(rep, images)    -> Uint8Array PDF (meniru layout Work Instruction Agrinesia)
 * Tidak butuh library PDF eksternal (penulis PDF kecil di dalam file ini, foto JPEG di-embed langsung).
 * ========================================================================== */
(function () {
  'use strict';

  var PRODUCT = 'Frozen Dough Taro Bun';
  var TRIAL_TITLE = 'TRIAL IN STORE FROZEN DOUGH (YEAST 200%), 12 STORE';
  var KATEGORI = ['Store Panas', 'Store Dingin', 'Store Suhu Ruang'];
  var PROOF_MAX = 70;

  // ---- 15 slot foto (req = wajib). Pasangan TRIAL / EXISTING dipisah supaya jelas di PDF ----
  var SLOTS = [
    { k: 'thawTrayTrial', stage: 'Thawing', label: 'Penempatan dough TRIAL di tray', req: true },
    { k: 'thawTrayExist', stage: 'Thawing', label: 'Penempatan dough EXISTING di tray', req: true },
    { k: 'thawTroli', stage: 'Thawing', label: 'Letak tray trial & existing di troli', req: true },
    { k: 'thawTempTrial', stage: 'Thawing', label: 'Termo gun: suhu permukaan dough TRIAL', req: true },
    { k: 'thawTempExist', stage: 'Thawing', label: 'Termo gun: suhu permukaan dough EXISTING', req: true },
    { k: 'thawRoom', stage: 'Thawing', label: 'Suhu & RH ruangan (jika ada alatnya)', req: false },
    { k: 'proofInside', stage: 'Proofing', label: 'Letak tray trial & existing di dalam proofer', req: true },
    { k: 'proofPanel', stage: 'Proofing', label: 'Panel suhu & RH proofer', req: true },
    { k: 'proofRulerTrial', stage: 'Proofing', label: 'TRIAL diukur penggaris gawang (3 pcs) setelah proofing', req: true },
    { k: 'proofRulerExist', stage: 'Proofing', label: 'EXISTING diukur penggaris gawang (3 pcs) setelah proofing', req: true },
    { k: 'ovenPanel', stage: 'Baking', label: 'Panel / termometer oven (opsional)', req: false },
    { k: 'bakeTrayTrial', stage: 'Setelah baking', label: 'Penempatan roti TRIAL di tray', req: true },
    { k: 'bakeTrayExist', stage: 'Setelah baking', label: 'Penempatan roti EXISTING di tray', req: true },
    { k: 'bakeRulerTrial', stage: 'Setelah baking', label: 'Roti TRIAL diukur penggaris gawang (3 pcs)', req: true },
    { k: 'bakeRulerExist', stage: 'Setelah baking', label: 'Roti EXISTING diukur penggaris gawang (3 pcs)', req: true }
  ];

  var REQ_FIELDS = [
    ['thawTempTrial', 'suhu permukaan dough TRIAL setelah thawing'],
    ['thawTempExist', 'suhu permukaan dough EXISTING setelah thawing'],
    ['thawStart', 'jam mulai thawing'], ['thawEnd', 'jam selesai thawing'],
    ['proofTempSet', 'suhu proofer (setting)'], ['proofTempAct', 'suhu proofer (aktual)'],
    ['proofRHSet', 'RH proofer (setting)'], ['proofRHAct', 'RH proofer (aktual)'],
    ['proofStart', 'jam mulai proofing'], ['proofEnd', 'jam selesai proofing'],
    ['ovenPreheat', 'suhu oven preheat'], ['ovenSetting', 'suhu oven setting'],
    ['ovenActual', 'suhu oven aktual (1 menit terakhir)'], ['bakeMin', 'waktu baking (menit)']
  ];
  var MEASURES = [
    ['proofTrial', 'diameter & tinggi TRIAL setelah proofing'],
    ['proofExist', 'diameter & tinggi EXISTING setelah proofing'],
    ['bakeTrial', 'diameter & tinggi roti TRIAL setelah baking'],
    ['bakeExist', 'diameter & tinggi roti EXISTING setelah baking']
  ];

  // ---------------------------------------------------------------- helper umum
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var MONL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var DAYL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function wib(ts) { return new Date((ts || Date.now()) + 7 * 3600000); }
  function fmtDT(ts) { var d = wib(ts); return p2(d.getUTCDate()) + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear() + ' ' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()); }
  function fmtHM(ts) { var d = wib(ts); return p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()); }
  function fmtDateLong(ts) { var d = wib(ts); return DAYL[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MONL[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function trim(v) { return String(v === undefined || v === null ? '' : v).trim(); }
  function num(v) { var n = parseFloat(String(v === undefined || v === null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
  function minutesBetween(a, b) {
    var m1 = /^(\d{1,2}):(\d{2})$/.exec(trim(a)), m2 = /^(\d{1,2}):(\d{2})$/.exec(trim(b));
    if (!m1 || !m2) return null;
    var d = (+m2[1] * 60 + +m2[2]) - (+m1[1] * 60 + +m1[2]);
    if (d < 0) d += 1440;
    return d;
  }
  function fmtDur(min) {
    if (min === null || min === undefined) return '-';
    var h = Math.floor(min / 60), m = min % 60;
    return h ? (h + ' jam' + (m ? ' ' + m + ' menit' : '')) : (m + ' menit');
  }
  function avg(rows, idx) {
    var s = 0, n = 0;
    (rows || []).forEach(function (r) { var v = num(r && r[idx]); if (v !== null) { s += v; n++; } });
    return n ? s / n : null;
  }
  function f1(v) { return v === null || v === undefined ? '-' : (Math.round(v * 100) / 100).toString().replace('.', ','); }
  function withUnit(v, u) { return trim(v) ? trim(v) + ' ' + u : '-'; }
  function checkpoint(kategori) { return kategori === 'Store Panas' ? 50 : 60; }

  function evaluate(f) {
    var thaw = minutesBetween(f.thawStart, f.thawEnd);
    var proof = minutesBetween(f.proofStart, f.proofEnd);
    var cp = checkpoint(f.kategori);
    var status = proof === null ? 'na' : (proof > PROOF_MAX ? 'long' : 'ok');
    return { thaw: thaw, proof: proof, checkpoint: cp, proofStatus: status, bake: num(f.bakeMin) };
  }

  function validate(f, photos) {
    var k, i, j, r;
    if (!trim(f.pelapor)) return 'Isi Nama pelapor dulu.';
    if (KATEGORI.indexOf(f.kategori) < 0) return 'Pilih Kategori Store (Panas / Dingin / Suhu Ruang).';
    for (i = 0; i < REQ_FIELDS.length; i++) {
      k = REQ_FIELDS[i];
      if (!trim(f[k[0]])) return 'Isi ' + k[1] + ' dulu.';
    }
    for (i = 0; i < MEASURES.length; i++) {
      r = f[MEASURES[i][0]] || [];
      for (j = 0; j < 3; j++) {
        if (num(r[j] && r[j][0]) === null || num(r[j] && r[j][1]) === null) return 'Lengkapi ' + MEASURES[i][1] + ' (3 pcs: diameter & tinggi).';
      }
    }
    var miss = SLOTS.filter(function (s) { return s.req && !(photos && photos[s.k]); });
    if (miss.length) return 'Masih ' + miss.length + ' foto wajib belum diambil. Berikutnya: ' + miss[0].stage + ' - ' + miss[0].label;
    return '';
  }

  // ---------------------------------------------------------------- teks Telegram
  function buildText(rep) {
    var f = rep.form, ev = evaluate(f), L = [];
    L.push('HASIL PENGAMATAN - LAPORAN DOUGH RND');
    L.push('Trial in Store Frozen Dough (Yeast 200%)');
    L.push('Store: ' + rep.storeName + ' (' + f.kategori + ')');
    L.push('Tanggal: ' + fmtDateLong(rep.createdAt));
    L.push('Pelapor: ' + f.pelapor);
    L.push('Brand & Varian: ' + PRODUCT + ' | 70 pcs dough trial');
    L.push('');
    L.push('THAWING');
    L.push('- Suhu permukaan dough: TRIAL ' + withUnit(f.thawTempTrial, '°C') + ' | EXISTING ' + withUnit(f.thawTempExist, '°C'));
    L.push('- Suhu & RH ruangan: ' + (trim(f.roomTemp) || trim(f.roomRH) ? withUnit(f.roomTemp, '°C') + ' / ' + withUnit(f.roomRH, '%') : '-'));
    L.push('- Waktu thawing: ' + f.thawStart + ' - ' + f.thawEnd + ' (' + fmtDur(ev.thaw) + ')');
    if (trim(f.placeTrial)) L.push('- Penempatan trial: ' + trim(f.placeTrial));
    if (trim(f.placeExist)) L.push('- Penempatan existing: ' + trim(f.placeExist));
    L.push('');
    L.push('PROOFING');
    L.push('- Proofer setting: ' + withUnit(f.proofTempSet, '°C') + ' / RH ' + withUnit(f.proofRHSet, '%'));
    L.push('- Proofer aktual: ' + withUnit(f.proofTempAct, '°C') + ' / RH ' + withUnit(f.proofRHAct, '%'));
    L.push('- Waktu proofing: ' + f.proofStart + ' - ' + f.proofEnd + ' (' + fmtDur(ev.proof) + ')' + (ev.proofStatus === 'long' ? ' - MELEBIHI maks ' + PROOF_MAX + ' menit!' : ''));
    L.push('- Acuan cek: menit ke-' + ev.checkpoint + ', maks ' + PROOF_MAX + ' menit');
    L.push('- Dimensi setelah proofing (rata-rata 3 pcs, cm):');
    L.push('   TRIAL    D ' + f1(avg(f.proofTrial, 0)) + ' | T ' + f1(avg(f.proofTrial, 1)));
    L.push('   EXISTING D ' + f1(avg(f.proofExist, 0)) + ' | T ' + f1(avg(f.proofExist, 1)));
    L.push('');
    L.push('BAKING');
    L.push('- Oven: preheat ' + withUnit(f.ovenPreheat, '°C') + ' | setting ' + withUnit(f.ovenSetting, '°C') + ' | aktual 1 menit terakhir ' + withUnit(f.ovenActual, '°C'));
    L.push('- Waktu baking: ' + withUnit(f.bakeMin, 'menit'));
    L.push('- Dimensi roti setelah baking (rata-rata 3 pcs, cm):');
    L.push('   TRIAL    D ' + f1(avg(f.bakeTrial, 0)) + ' | T ' + f1(avg(f.bakeTrial, 1)));
    L.push('   EXISTING D ' + f1(avg(f.bakeExist, 0)) + ' | T ' + f1(avg(f.bakeExist, 1)));
    if (trim(f.placeBakeTrial)) L.push('- Penempatan roti trial: ' + trim(f.placeBakeTrial));
    if (trim(f.placeBakeExist)) L.push('- Penempatan roti existing: ' + trim(f.placeBakeExist));
    if (trim(f.notes)) { L.push(''); L.push('Keterangan: ' + trim(f.notes)); }
    L.push('');
    L.push('Detail lengkap + foto ada di PDF yang dikirim di atas.');
    return L.join('\n');
  }

  function buildCaption(rep, cc) {
    var f = rep.form;
    var c = 'LAPORAN DOUGH RND - Trial in Store Frozen Dough (Yeast 200%)\n' +
      'Store: ' + rep.storeName + ' (' + f.kategori + ')\n' +
      'Tanggal: ' + fmtDateLong(rep.createdAt) + '\n' +
      'Pelapor: ' + f.pelapor + '\n' +
      'Dokumen PDF berisi hasil pengamatan + foto TRIAL vs EXISTING.';
    if (cc && cc.length) c += '\nCC: ' + cc.map(function (u) { return '@' + u; }).join(' ');
    return c.slice(0, 1000);
  }

  // ================================================================ PENULIS PDF MINI
  var RW = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015,
    667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333,
    556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  var BW = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975,
    722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333,
    556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

  function enc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
      .replace(/\u00A0/g, ' ').replace(/[^\x20-\x7E\xB0\n]/g, '?');
  }
  function esc(s) { return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
  function wOf(s, size, bold) {
    var t = bold ? BW : RW, w = 0, i, c;
    for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); w += (c >= 32 && c <= 126) ? t[c - 32] : (c === 176 ? 400 : 556); }
    return w * size / 1000;
  }
  function wrap(s, size, bold, maxW) {
    var out = [];
    enc(s).split('\n').forEach(function (par) {
      var words = par.split(' '), line = '';
      words.forEach(function (w) {
        while (wOf(w, size, bold) > maxW && w.length > 1) { // kata terlalu panjang: potong paksa
          var cut = w.length - 1;
          while (cut > 1 && wOf(w.slice(0, cut), size, bold) > maxW) cut--;
          if (line) { out.push(line); line = ''; }
          out.push(w.slice(0, cut)); w = w.slice(cut);
        }
        var t = line ? line + ' ' + w : w;
        if (!line || wOf(t, size, bold) <= maxW) line = t; else { out.push(line); line = w; }
      });
      out.push(line);
    });
    return out;
  }
  function col(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map(function (v) { return v.toFixed(3); }).join(' ');
  }
  function n2(v) { return (Math.round(v * 100) / 100).toString(); }

  var PW = 595, PH = 842;

  function Page(header) { this.ops = []; this.imgs = {}; this.header = header; }
  Page.prototype.rect = function (x, y, w, h, o) {
    o = o || {};
    var s = '';
    if (o.fill) s += col(o.fill) + ' rg ';
    if (o.stroke) s += col(o.stroke) + ' RG ' + n2(o.lw || 0.6) + ' w ';
    s += n2(x) + ' ' + n2(PH - y - h) + ' ' + n2(w) + ' ' + n2(h) + ' re ' + (o.fill && o.stroke ? 'B' : (o.fill ? 'f' : 'S'));
    this.ops.push(s);
  };
  Page.prototype.line = function (x1, y1, x2, y2, lw, color) {
    this.ops.push(col(color || '#000000') + ' RG ' + n2(lw || 0.6) + ' w ' + n2(x1) + ' ' + n2(PH - y1) + ' m ' + n2(x2) + ' ' + n2(PH - y2) + ' l S');
  };
  Page.prototype.text = function (s, x, y, size, bold, color) {
    s = enc(s).replace(/\n/g, ' ');
    this.ops.push(col(color || '#000000') + ' rg BT /' + (bold ? 'F2' : 'F1') + ' ' + n2(size) + ' Tf ' + n2(x) + ' ' + n2(PH - y) + ' Td (' + esc(s) + ') Tj ET');
  };
  Page.prototype.ctext = function (s, y, size, bold, color) { this.text(s, (PW - wOf(enc(s), size, bold)) / 2, y, size, bold, color); };
  Page.prototype.rtext = function (s, xr, y, size, bold, color) { this.text(s, xr - wOf(enc(s), size, bold), y, size, bold, color); };
  Page.prototype.image = function (id, x, y, w, h) {
    this.imgs[id] = true;
    this.ops.push('q ' + n2(w) + ' 0 0 ' + n2(h) + ' ' + n2(x) + ' ' + n2(PH - y - h) + ' cm /Im' + id + ' Do Q');
  };

  function jpegInfo(b) {
    var i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xFF) { i++; continue; }
      var m = b[i + 1];
      if (m === 0xFF) { i++; continue; }
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8], n: b[i + 9] };
      }
      i += 2 + ((b[i + 2] << 8) | b[i + 3]);
    }
    return null;
  }
  function strBytes(s) { var u = new Uint8Array(s.length), i; for (i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; }

  // ---------------------------------------------------------------- layout dokumen
  function Layout(images) {
    this.pages = []; this.imgList = []; this.imgId = {}; this.images = images || {};
    this.y = 0; this.p = null;
  }
  Layout.prototype.newPage = function (header) {
    this.p = new Page(header !== false); this.pages.push(this.p);
    this.y = header === false ? 40 : 120;
  };
  Layout.prototype.img = function (key) {
    if (this.imgId[key] !== undefined) return this.imgList[this.imgId[key]];
    var b = this.images[key], info = b && jpegInfo(b);
    if (!info) { this.imgId[key] = -1; return null; }
    var rec = { key: key, bytes: b, w: info.w, h: info.h, cs: info.n === 1 ? 'DeviceGray' : 'DeviceRGB', id: this.imgList.length };
    this.imgList.push(rec); this.imgId[key] = rec.id;
    return rec;
  };
  Layout.prototype.imgOk = function (key) { return !!(key && this.images[key] && this.img(key)); };

  var GREEN = '#4F6228', LGREEN = '#9BBB59', BRAND = '#0B9444', GOLD = '#D4A96A';
  var X0 = 40, TW = 515, BOTTOM = 800;

  function drawHeader(p, n, N, createdAt) {
    p.rect(X0, 28, TW, 76, { stroke: '#000000', lw: 0.8 });
    p.text('Agrinesia', 52, 56, 20, true, BRAND);
    p.text('caring & sharing', 54, 66, 6.5, false, '#888888');
    p.text('Work Instruction', 285, 46, 11, true, '#000000');
    var xs = [X0, 100, 300, 400, X0 + TW], rows = [['Nama Divisi', 'Research and Development', 'No. Form', ''], ['Judul', 'Protokol Trial : Laporan Dough RnD', 'Revisi ke', '0'], ['', '', 'Tanggal diterbitkan', fmtDateLong(createdAt)], ['', '', 'Halaman', n + ' dari ' + N]];
    var y0 = 66, rh = 9.5, r, c;
    for (r = 0; r < 4; r++) {
      var yy = y0 + r * rh;
      p.line(r < 2 ? X0 : 300, yy, X0 + TW, yy, 0.5);
      for (c = 0; c < 4; c++) {
        if (rows[r][c]) p.text(rows[r][c], xs[c] + 3, yy + 7, 6.8, c === 3 && r === 3, '#000000');
      }
    }
    p.line(X0, y0 + 4 * rh, X0 + TW, y0 + 4 * rh, 0.5);
    p.line(100, y0, 100, y0 + 2 * rh, 0.5); p.line(300, y0, 300, y0 + 4 * rh, 0.5); p.line(400, y0, 400, y0 + 4 * rh, 0.5);
    p.line(X0, 110, X0 + TW, 110, 2, LGREEN);
  }

  function sectionBar(L, title) {
    if (L.y + 30 > BOTTOM) L.newPage();
    L.p.rect(X0, L.y, TW, 20, { fill: GREEN });
    L.p.text(title, X0 + 8, L.y + 14, 10.5, true, '#FFFFFF');
    L.y += 28;
  }

  function kvTable(L, rows) {
    var w1 = 140, w2 = TW - 140;
    rows.forEach(function (r) {
      var lines = wrap(r[1], 8.5, false, w2 - 10), h = Math.max(18, lines.length * 11 + 8);
      if (L.y + h > BOTTOM) L.newPage();
      L.p.rect(X0, L.y, w1, h, { stroke: '#000000', lw: 0.6 });
      L.p.rect(X0 + w1, L.y, w2, h, { stroke: '#000000', lw: 0.6 });
      L.p.text(r[0], X0 + 5, L.y + 12, 8.5, true, '#000000');
      lines.forEach(function (ln, i) { L.p.text(ln, X0 + w1 + 5, L.y + 12 + i * 11, 8.5, false, '#000000'); });
      L.y += h;
    });
    L.y += 12;
  }

  var CW = [58, 150, 150, 157];
  function obsHeader(L) {
    var x = X0, h = 18;
    ['Tahapan', 'Parameter yang diamati', 'Hasil pengamatan', 'Catatan'].forEach(function (t, i) {
      L.p.rect(x, L.y, CW[i], h, { fill: '#D9D9D9', stroke: '#000000', lw: 0.6 });
      L.p.text(t, x + 4, L.y + 12, 8.5, true, '#000000');
      x += CW[i];
    });
    L.y += h;
  }

  function measureBlock(rows) { return rows; }

  function obsRow(L, r, state) {
    var LH = 10.5;
    var pl = wrap(r.param, 8, false, CW[1] - 8);
    var rl = r.res ? wrap(r.res, 8, false, CW[2] - 8) : [];
    var imgRec = r.img && L.imgOk(r.img) ? L.img(r.img) : null, iw = 0, ih = 0;
    if (imgRec) {
      iw = CW[2] - 12; ih = iw * imgRec.h / imgRec.w;
      if (ih > 135) { ih = 135; iw = ih * imgRec.w / imgRec.h; }
    }
    var nl = r.note ? wrap(r.note, 7.5, false, CW[3] - 8) : [];
    var ml = r.measure ? wrap(r.measure.title, 7.5, false, CW[3] - 8) : [];
    var h1 = pl.length * LH + 8;
    var h2 = rl.length * LH + (imgRec ? ih + 8 : 0) + 8;
    var h3 = nl.length * 9.5 + (r.measure ? ml.length * 9.5 + 6 + 13 * 4 + 8 : 0) + 8;
    var h = Math.max(h1, h2, h3, 22);

    if (L.y + h > BOTTOM) {
      L.p.line(X0, L.y, X0 + CW[0], L.y, 0.6);
      L.newPage(); obsHeader(L); state.prev = null;
    }
    var y = L.y, x1 = X0 + CW[0], x2 = x1 + CW[1], x3 = x2 + CW[2];
    var newGroup = state.prev !== r.stage;
    // kolom Tahapan (sel gabungan per tahap)
    L.p.line(X0, y, X0, y + h, 0.6); L.p.line(x1, y, x1, y + h, 0.6);
    if (newGroup) {
      L.p.line(X0, y, x1, y, 0.6);
      wrap(r.stage, 8, true, CW[0] - 8).forEach(function (ln, i) { L.p.text(ln, X0 + 4, y + 12 + i * LH, 8, true, '#000000'); });
    }
    if (r.last) L.p.line(X0, y + h, x1, y + h, 0.6);
    L.p.rect(x1, y, CW[1], h, { stroke: '#000000', lw: 0.6 });
    L.p.rect(x2, y, CW[2], h, { stroke: '#000000', lw: 0.6 });
    L.p.rect(x3, y, CW[3], h, { stroke: '#000000', lw: 0.6 });
    pl.forEach(function (ln, i) { L.p.text(ln, x1 + 4, y + 11 + i * LH, 8, false, '#000000'); });
    var cy = y + 11;
    rl.forEach(function (ln) { L.p.text(ln, x2 + 4, cy, 8, false, '#000000'); cy += LH; });
    if (imgRec) { L.p.image(imgRec.id, x2 + (CW[2] - iw) / 2, cy - 4, iw, ih); }
    cy = y + 10;
    nl.forEach(function (ln) { L.p.text(ln, x3 + 4, cy, 7.5, false, '#000000'); cy += 9.5; });
    if (r.measure) {
      ml.forEach(function (ln) { L.p.text(ln, x3 + 4, cy, 7.5, false, '#000000'); cy += 9.5; });
      cy += 2;
      var mw = (CW[3] - 12) / 2, mx = x3 + 6;
      ['Diameter (cm)', 'Tinggi (cm)'].forEach(function (t, i) {
        L.p.rect(mx + i * mw, cy, mw, 13, { fill: '#F2F2F2', stroke: '#000000', lw: 0.5 });
        L.p.text(t, mx + i * mw + 3, cy + 9, 7, true, '#000000');
      });
      cy += 13;
      for (var k = 0; k < 3; k++) {
        var row = (r.measure.rows || [])[k] || [];
        for (var c = 0; c < 2; c++) {
          L.p.rect(mx + c * mw, cy, mw, 13, { stroke: '#000000', lw: 0.5 });
          L.p.text(trim(row[c]) || '-', mx + c * mw + 3, cy + 9, 7.5, false, '#000000');
        }
        cy += 13;
      }
    }
    state.prev = r.stage;
    L.y += h;
  }

  function buildRows(f, ev) {
    var R = [], T = 'Setelah thawing', P = 'Saat proofing dalam proofer', B = 'Saat baking', A = 'Setelah baking';
    var roomTxt = (trim(f.roomTemp) || trim(f.roomRH)) ? 'Suhu: ' + withUnit(f.roomTemp, '°C') + '\nRH: ' + withUnit(f.roomRH, '%') : 'Tidak ada data (alat tidak tersedia)';
    R.push({ stage: T, param: 'Penempatan frozen dough trial pada tiap tray', res: trim(f.placeTrial), img: 'thawTrayTrial' });
    R.push({ stage: T, param: 'Penempatan frozen dough existing pada tiap tray', res: trim(f.placeExist), img: 'thawTrayExist' });
    R.push({ stage: T, param: 'Letak tray trial dan existing di troli', res: '', img: 'thawTroli' });
    R.push({ stage: T, param: 'Suhu permukaan frozen dough trial setelah thawing', res: withUnit(f.thawTempTrial, '°C'), img: 'thawTempTrial' });
    R.push({ stage: T, param: 'Suhu permukaan frozen dough existing setelah thawing', res: withUnit(f.thawTempExist, '°C'), img: 'thawTempExist' });
    R.push({ stage: T, param: 'Suhu dan RH ruangan', res: roomTxt, img: 'thawRoom' });
    R.push({ stage: T, param: 'Waktu total thawing', res: 'Mulai ' + f.thawStart + ' WIB\nSelesai ' + f.thawEnd + ' WIB\nTotal: ' + fmtDur(ev.thaw), last: true });

    R.push({ stage: P, param: 'Letak tray trial dan existing di dalam proofer', res: '', img: 'proofInside' });
    R.push({ stage: P, param: 'Suhu dan RH proofer (setting dan aktual)', res: 'Setting: ' + withUnit(f.proofTempSet, '°C') + ' / RH ' + withUnit(f.proofRHSet, '%') + '\nAktual: ' + withUnit(f.proofTempAct, '°C') + ' / RH ' + withUnit(f.proofRHAct, '%'), img: 'proofPanel' });
    R.push({
      stage: P,
      param: 'Waktu total proofing\n(Notes: bila sample selesai proofing lebih cepat (ditandai dengan tercapainya target dimensi), maka hentikan proses proofing)\nRange waktu proofing:\n- Suhu panas: perhatikan proofing saat menit ke-50\n- Suhu dingin dan suhu medium: perhatikan proofing saat menit ke-60\n- Maksimum waktu proofing: 70 menit',
      res: 'Mulai ' + f.proofStart + ' WIB\nSelesai ' + f.proofEnd + ' WIB\nTotal: ' + fmtDur(ev.proof),
      note: (f.kategori + ': cek saat menit ke-' + ev.checkpoint + '. ') + (ev.proofStatus === 'long' ? 'MELEBIHI batas maksimum ' + PROOF_MAX + ' menit.' : 'Dalam batas maksimum ' + PROOF_MAX + ' menit.')
    });
    R.push({ stage: P, param: 'Foto frozen dough trial diukur dengan penggaris gawang sebanyak 3 pcs setelah proofing', res: '', img: 'proofRulerTrial', measure: { title: 'Catat diameter dan tinggi after proofing (TRIAL):', rows: f.proofTrial } });
    R.push({ stage: P, param: 'Foto frozen dough existing diukur dengan penggaris gawang sebanyak 3 pcs setelah proofing', res: '', img: 'proofRulerExist', measure: { title: 'Catat diameter dan tinggi after proofing (EXISTING):', rows: f.proofExist }, last: true });

    R.push({ stage: B, param: 'Suhu oven preheat', res: withUnit(f.ovenPreheat, '°C') });
    R.push({ stage: B, param: 'Suhu oven setting', res: withUnit(f.ovenSetting, '°C') });
    R.push({ stage: B, param: 'Suhu oven aktual (1 menit terakhir)', res: withUnit(f.ovenActual, '°C'), img: 'ovenPanel' });
    R.push({ stage: B, param: 'Waktu baking:', res: withUnit(f.bakeMin, 'menit'), last: true });

    R.push({ stage: A, param: 'Penempatan roti pada tiap tray (trial)', res: trim(f.placeBakeTrial), img: 'bakeTrayTrial' });
    R.push({ stage: A, param: 'Penempatan roti pada tiap tray (existing)', res: trim(f.placeBakeExist), img: 'bakeTrayExist' });
    R.push({ stage: A, param: 'Foto roti trial diukur dengan penggaris gawang sebanyak 3 pcs per tray', res: '', img: 'bakeRulerTrial', measure: { title: 'Catat diameter dan tinggi after baking (TRIAL):', rows: f.bakeTrial } });
    R.push({ stage: A, param: 'Foto roti existing diukur dengan penggaris gawang sebanyak 3 pcs per tray', res: '', img: 'bakeRulerExist', measure: { title: 'Catat diameter dan tinggi after baking (EXISTING):', rows: f.bakeExist }, last: true });
    return R;
  }

  function recapTable(L, f) {
    var w = [150, 120, 122, 123];
    var heads = ['Tahap', 'Sampel', 'Diameter rata-rata (cm)', 'Tinggi rata-rata (cm)'];
    function head() {
      var x = X0; heads.forEach(function (t, i) { L.p.rect(x, L.y, w[i], 18, { fill: '#D9D9D9', stroke: '#000000', lw: 0.6 }); L.p.text(t, x + 4, L.y + 12, 8, true, '#000000'); x += w[i]; });
      L.y += 18;
    }
    if (L.y + 18 * 7 > BOTTOM) L.newPage();
    head();
    function row(cells, bold) {
      var x = X0; cells.forEach(function (t, i) { L.p.rect(x, L.y, w[i], 17, { stroke: '#000000', lw: 0.6 }); L.p.text(t, x + 4, L.y + 11.5, 8, bold, '#000000'); x += w[i]; });
      L.y += 17;
    }
    function diff(a, b) { return (a === null || b === null) ? '-' : ((a - b) >= 0 ? '+' : '') + f1(a - b); }
    [['Setelah proofing', f.proofTrial, f.proofExist], ['Setelah baking', f.bakeTrial, f.bakeExist]].forEach(function (g) {
      var dT = avg(g[1], 0), tT = avg(g[1], 1), dE = avg(g[2], 0), tE = avg(g[2], 1);
      row([g[0], 'TRIAL', f1(dT), f1(tT)], false);
      row(['', 'EXISTING', f1(dE), f1(tE)], false);
      row(['', 'Selisih (Trial - Existing)', diff(dT, dE), diff(tT, tE)], true);
    });
    L.y += 12;
  }

  function cover(L, rep) {
    var p = L.p, f = rep.form;
    p.text('FOR INTERNAL USE ONLY', 40, 44, 7, true, '#333333');
    p.rtext('SISTEM MANAJEMEN MUTU', 555, 74, 11, true, '#000000');
    p.rtext('LEVEL - 3', 555, 96, 13, true, '#000000');
    var bx = 305, by = 108, bw = 250, rows = [['No. Dokumen', ''], ['Revisi Ke -', '0'], ['Tanggal Diterbitkan', fmtDateLong(rep.createdAt)], ['Halaman', '1 dari ' + (rep.totalPages || '')]];
    rows.forEach(function (r, i) {
      var h = i === 0 ? 30 : 17, yy = by + (i === 0 ? 0 : 30 + (i - 1) * 17);
      p.rect(bx, yy, 105, h, { stroke: '#000000', lw: 0.6 }); p.rect(bx + 105, yy, bw - 105, h, { stroke: '#000000', lw: 0.6 });
      p.text(r[0], bx + 4, yy + 12, 8, false, '#000000');
      if (r[1]) p.text(r[1], bx + 109, yy + 12, 8, i === 3, '#000000');
    });
    p.ctext('Agrinesia', 330, 62, true, BRAND);
    p.ctext('caring & sharing', 358, 16, false, GOLD);
    p.line(40, 430, 555, 430, 3, LGREEN);
    p.ctext('WORK INSTRUCTION', 480, 24, true, GREEN);
    p.ctext('LAPORAN HASIL TRIAL', 518, 20, true, GREEN);
    p.ctext('TRIAL IN STORE FROZEN DOUGH (YEAST', 556, 17, true, GREEN);
    p.ctext('200%), 12 STORE', 580, 17, true, GREEN);
    p.line(40, 612, 555, 612, 3, LGREEN);
    p.ctext('Laporan Dough RnD', 650, 14, true, '#333333');
    var info = [['Store', rep.storeName + ' (' + f.kategori + ')'], ['Tanggal', fmtDateLong(rep.createdAt)], ['Pelapor', f.pelapor], ['Varian', PRODUCT]];
    info.forEach(function (r, i) { p.text(r[0], 150, 680 + i * 15, 9.5, true, '#000000'); p.text(': ' + r[1], 215, 680 + i * 15, 9.5, false, '#000000'); });
    p.ctext('PT AGRINESIA RAYA, (Kawasan Industri Sentul Olympic CBD Jalan Cahaya Raya Blok L Leuwinutug Kec. Citeureup,', 770, 7.5, false, '#555555');
    p.ctext('Kabupaten Bogor, Jawa Barat 16810)', 781, 7.5, false, '#555555');
  }

  function assemble(L) {
    var objs = [null, null, null, null], pageIds = [];
    function add(parts) { objs.push(parts); return objs.length; }
    var imgObj = L.imgList.map(function (im) {
      return add(['<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /' + im.cs + ' /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.bytes.length + ' >>\nstream\n', im.bytes, '\nendstream']);
    });
    L.pages.forEach(function (pg) {
      var content = pg.ops.join('\n');
      var cid = add(['<< /Length ' + content.length + ' >>\nstream\n', content, '\nendstream']);
      var xo = Object.keys(pg.imgs).map(function (i) { return '/Im' + i + ' ' + imgObj[+i] + ' 0 R'; }).join(' ');
      pageIds.push(add(['<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ' + xo + ' >> >> /Contents ' + cid + ' 0 R >>']));
    });
    objs[0] = ['<< /Type /Catalog /Pages 2 0 R >>'];
    objs[1] = ['<< /Type /Pages /Kids [' + pageIds.map(function (i) { return i + ' 0 R'; }).join(' ') + '] /Count ' + pageIds.length + ' >>'];
    objs[2] = ['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
    objs[3] = ['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
    var chunks = [], offs = [], pos = 0;
    function push(x) { var b = typeof x === 'string' ? strBytes(x) : x; chunks.push(b); pos += b.length; }
    push('%PDF-1.4\n');
    objs.forEach(function (parts, i) { offs[i] = pos; push((i + 1) + ' 0 obj\n'); parts.forEach(push); push('\nendobj\n'); });
    var xr = pos;
    var x = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offs.forEach(function (o) { x += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    x += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF';
    push(x);
    var out = new Uint8Array(pos), o = 0;
    chunks.forEach(function (c) { out.set(c, o); o += c.length; });
    return out;
  }

  function buildPdf(rep, images) {
    var f = rep.form, ev = evaluate(f), L = new Layout(images);
    L.newPage(false); cover(L, rep);
    L.newPage(true);
    sectionBar(L, '1. Informasi Trial');
    kvTable(L, [
      ['Hari, Tanggal', fmtDateLong(rep.createdAt)],
      ['Lokasi / Store', rep.storeName + ' (' + f.kategori + ')'],
      ['Pelapor', f.pelapor],
      ['Besaran Trial', '70 pcs dough trial'],
      ['Brand & Varian', PRODUCT],
      ['Variabel Trial', 'Frozen dough Yeast 200% (TRIAL) dibandingkan dengan EXISTING'],
      ['Validator', 'R&D, QC, Store crew']
    ]);
    sectionBar(L, '2. Form Pengambilan Data / Hasil Pengamatan');
    obsHeader(L);
    var st = { prev: null };
    buildRows(f, ev).forEach(function (r) { obsRow(L, r, st); });
    L.y += 14;
    sectionBar(L, '3. Rekap Dimensi (rata-rata 3 pcs)');
    recapTable(L, f);
    sectionBar(L, '4. Keterangan Pelapor');
    var nl = wrap(trim(f.notes) || '-', 8.5, false, TW - 12), nh = nl.length * 11 + 10;
    if (L.y + nh > BOTTOM) L.newPage();
    L.p.rect(X0, L.y, TW, nh, { stroke: '#000000', lw: 0.6 });
    nl.forEach(function (ln, i) { L.p.text(ln, X0 + 6, L.y + 13 + i * 11, 8.5, false, '#000000'); });
    L.y += nh + 14;
    if (L.y + 60 > BOTTOM) L.newPage();
    L.p.text('Dibuat oleh,', X0, L.y + 8, 8.5, false, '#000000');
    L.p.text(f.pelapor, X0, L.y + 50, 9, true, '#000000');
    L.p.text('Store ' + rep.storeName + ' | dikirim ' + fmtDT(rep.createdAt) + ' WIB', X0, L.y + 61, 7.5, false, '#555555');
    var N = L.pages.length;
    L.pages.forEach(function (pg, i) { if (pg.header) drawHeader(pg, i + 1, N, rep.createdAt); });
    // nomor halaman sampul ("1 dari N") ditulis ulang setelah total diketahui
    var cp = L.pages[0];
    cp.rect(bx0(), 108 + 30 + 2 * 17, 145, 17, { fill: '#FFFFFF' });
    cp.rect(305 + 105, 108 + 30 + 2 * 17, 145, 17, { stroke: '#000000', lw: 0.6 });
    cp.text('1 dari ' + N, 305 + 109, 108 + 30 + 2 * 17 + 12, 8, true, '#000000');
    return assemble(L);
  }
  function bx0() { return 305 + 105; }

  window.DoughRnd = {
    PRODUCT: PRODUCT, TITLE: TRIAL_TITLE, KATEGORI: KATEGORI, SLOTS: SLOTS, PROOF_MAX: PROOF_MAX,
    REQ_FIELDS: REQ_FIELDS, MEASURES: MEASURES,
    fmtDT: fmtDT, fmtHM: fmtHM, fmtDateLong: fmtDateLong, fmtDur: fmtDur, minutesBetween: minutesBetween,
    avg: avg, f1: f1, evaluate: evaluate, validate: validate, checkpoint: checkpoint,
    buildText: buildText, buildCaption: buildCaption, buildPdf: buildPdf
  };
})();
