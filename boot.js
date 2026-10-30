// Dipindah dari <script> inline index.html (CSP tanpa unsafe-inline). Dimuat sinkron sebelum app.js.
  // ==========================================
  // FIX: konflik lucide.createIcons() vs React DOM reconciliation
  // ==========================================
  // lucide.createIcons() mengganti elemen <i data-lucide="..."> LANGSUNG di DOM nyata
  // (di luar sepengetahuan React) menjadi <svg>. React tetap menyimpan elemen <i> lama
  // di Fiber tree miliknya. Begitu React nanti perlu menghapus/memindah bagian itu (mis.
  // tab berpindah, list berubah, komponen unmount), React memanggil
  // parentNode.removeChild(elemenLamaYangSudahDiganti) -- tapi elemen itu SUDAH TIDAK ADA
  // di DOM (sudah diganti Lucide), sehingga browser melempar:
  //   "NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed
  //    is not a child of this node."
  // Ini SELALU tertangkap oleh AppErrorBoundary sebagai "kendala tampilan" walau
  // sebenarnya tidak ada bug pada data/logika aplikasi sama sekali -- murni konflik dua
  // library yang sama-sama memanipulasi DOM.
  //
  // Perbaikan MENYELURUH (mengganti seluruh ikon jadi komponen React lucide-react) butuh
  // menyentuh ribuan baris JSX, terlalu berisiko dilakukan sekaligus. Solusi standar &
  // aman yang dipakai di sini: buat removeChild/insertBefore "defensif" -- kalau node yang
  // diminta dihapus/disisipkan TERNYATA bukan child dari parent tsb (karena sudah
  // diubah pihak lain di luar React), JANGAN lempar error, cukup diam saja (tidak ada apa
  // pun yang perlu dihapus/dipindah lagi). Ini tidak mengubah tampilan/perilaku apa pun
  // yang terlihat pengguna -- hanya mencegah crash akibat DOM sudah berubah duluan.
  (function () {
    const origRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function (child) {
      if (child.parentNode !== this) {
        if (console && console.warn) {
          console.warn('[Tarobun] Diabaikan: removeChild pada node yang sudah tidak jadi child (biasanya akibat lucide.createIcons()).', child);
        }
        return child;
      }
      return origRemoveChild.call(this, child);
    };

    const origInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (newNode, refNode) {
      if (refNode && refNode.parentNode !== this) {
        if (console && console.warn) {
          console.warn('[Tarobun] Diabaikan: insertBefore dengan referenceNode yang sudah tidak jadi child (biasanya akibat lucide.createIcons()).', refNode);
        }
        return this.appendChild(newNode);
      }
      return origInsertBefore.call(this, newNode, refNode);
    };
  })();

// PEMANTAU MUAT AWAL + PERBAIKI-DIRI CACHE (2026-10-22)
// Berdiri sendiri (tidak butuh React) supaya tetap jalan walau app.js / vendor gagal dimuat.
// - Kalau versi aplikasi berubah: cache lama dibersihkan otomatis (login/kunci akses TIDAK dihapus).
// - Kalau aplikasi macet/gagal tampil: cache dihapus, file dimuat ulang paksa dari server, halaman reload sendiri
//   (maksimal 1x per 5 menit supaya tidak looping). Bila masih macet, tampil tombol "Muat ulang".
(function () {
  var BUILD = '20261022';
  var API = (/(^|\.)somandiritarobun\.my\.id$/.test(location.hostname) ? 'https://api.somandiritarobun.my.id' : 'https://tarobun-api.tepangbkj8.workers.dev'), sent = {};
  var K_BUILD = 'tb_build', K_HEAL = 'tb_heal_at', HEAL_GAP = 5 * 60 * 1000;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function did() { try { var d = localStorage.getItem('tbmon_did'); if (!d) { d = (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 24); localStorage.setItem('tbmon_did', d); } return d; } catch (e) { return 'nols' + Date.now().toString(36); } }
  function rep(msg, stack) {
    if (sent[msg]) return; sent[msg] = 1;
    try { fetch(API + '/api/monitor/report', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, keepalive: true, body: JSON.stringify({ events: [{ kind: 'boot', message: msg, stack: stack || '', path: location.pathname, deviceId: did(), appVer: BUILD, ua: navigator.userAgent.slice(0, 160) }] }) }).catch(function () {}); } catch (e) {}
  }
  function safe(p) { return Promise.resolve(p).catch(function () {}); }

  // Hapus semua Cache Storage (BUKAN localStorage: sesi login & kunci akses tetap aman).
  function wipeCaches() {
    try { if (window.caches && caches.keys) return safe(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })); } catch (e) {}
    return Promise.resolve();
  }
  function unregisterSW() {
    try { if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) return safe(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })); } catch (e) {}
    return Promise.resolve();
  }
  // Ambil ulang file penting dari server dengan melewati cache HTTP browser (menimpa 404/versi basi yang tersimpan).
  function refetchAssets() {
    var urls = [location.pathname || '/'];
    try {
      var els = document.querySelectorAll('script[src],link[rel="stylesheet"][href],link[rel="manifest"][href]');
      for (var i = 0; i < els.length; i++) {
        var u = els[i].src || els[i].href;
        if (u && u.indexOf(location.origin) === 0) urls.push(u);
      }
    } catch (e) {}
    return Promise.all(urls.map(function (u) { return safe(fetch(u, { cache: 'reload' })); }));
  }

  var healing = false;
  function canPersist() { lsSet('tb_probe', '1'); return lsGet('tb_probe') === '1'; }
  function heal(reason) {
    if (healing || !canPersist()) return false;
    var last = parseInt(lsGet(K_HEAL) || '0', 10) || 0;
    if (Date.now() - last < HEAL_GAP) return false; // sudah dicoba baru-baru ini: jangan looping
    healing = true; lsSet(K_HEAL, String(Date.now()));
    rep('Auto-perbaiki cache: ' + reason);
    var done = false;
    function go() { if (done) return; done = true; try { location.reload(); } catch (e) {} }
    setTimeout(go, 8000); // pengaman: reload walau ada langkah yang menggantung
    wipeCaches().then(unregisterSW).then(refetchAssets).then(go);
    return true;
  }
  window.__tbHeal = heal;

  // 1) Versi aplikasi berubah -> bersihkan cache lama (tanpa menyentuh login).
  try {
    if (canPersist() && lsGet(K_BUILD) !== BUILD) {
      lsSet(K_BUILD, BUILD);
      var controlled = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
      if (controlled) heal('versi baru ' + BUILD); // halaman dilayani Service Worker lama -> muat ulang sekali
      else wipeCaches();
    }
  } catch (e) {}

  // 2) Gagal memuat file / library belum ada -> perbaiki otomatis.
  window.addEventListener('error', function (e) {
    if (!document.getElementById('boot-splash')) return;
    var t = e && e.target;
    if (t && t.tagName === 'LINK' && /tailwind\.css/.test(t.href || '')) { rep('Gagal memuat tailwind.css'); heal('tailwind.css gagal'); }
    else if (t && t.tagName === 'SCRIPT') {
      var src = String(t.src || '');
      // Beacon analitik Cloudflare disuntik otomatis & diblokir CSP: BUKAN kerusakan aplikasi, abaikan (jangan hapus cache/reload).
      if (/cloudflareinsights\.com/i.test(src)) return;
      rep('Gagal memuat script: ' + src.split('?')[0].slice(0, 120));
      // Hanya perbaiki cache bila yang gagal adalah file aplikasi sendiri, bukan skrip pihak ketiga.
      if (src.indexOf(location.origin + '/') === 0) heal('script gagal dimuat');
    }
    else if (e && e.message && !/^Script error/i.test(e.message)) {
      rep('Error saat memuat: ' + e.message, (e.filename || '') + ':' + (e.lineno || 0));
      if (/(React|ReactDOM|lucide|qrcode) is not defined/i.test(e.message)) heal('library belum termuat');
    }
  }, true);

  // 3) Macet di layar pembuka: 10 dtk -> perbaiki otomatis; 20 dtk -> tombol manual.
  setTimeout(function () {
    if (document.getElementById('boot-splash')) { rep('Aplikasi belum tampil setelah 10 detik'); heal('macet 10 detik'); }
  }, 10000);
  setTimeout(function () {
    var el = document.getElementById('boot-splash'); if (!el) return;
    rep('Aplikasi belum tampil setelah 20 detik');
    var t = el.lastElementChild && el.lastElementChild.lastElementChild;
    if (t) {
      t.textContent = 'Memuat lebih lama dari biasanya.';
      t.appendChild(document.createElement('br'));
      var btn = document.createElement('button');
      btn.textContent = 'Muat ulang';
      btn.style.cssText = 'margin-top:10px;padding:8px 18px;border:0;border-radius:10px;background:#fff;color:#581c87;font-weight:700;font-size:13px;';
      btn.addEventListener('click', function () {
        lsSet(K_HEAL, '0'); // tombol manual selalu boleh memperbaiki
        if (!heal('tombol muat ulang')) location.reload();
      });
      t.appendChild(btn);
    }
  }, 20000);
})();
