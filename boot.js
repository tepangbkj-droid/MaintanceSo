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

// PEMANTAU MUAT AWAL (2026-10): kalau aplikasi gagal/lama tampil, laporkan ke Admin (menu Monitoring)
// dan beri tombol "Muat ulang" ke user. Berdiri sendiri (tidak butuh React) supaya tetap jalan
// walau app.js / CDN gagal dimuat.
(function () {
  var API = 'https://tarobun-api.tepangbkj8.workers.dev', sent = {};
  function did() { try { var d = localStorage.getItem('tbmon_did'); if (!d) { d = (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 24); localStorage.setItem('tbmon_did', d); } return d; } catch (e) { return 'nols' + Date.now().toString(36); } }
  function rep(msg, stack) {
    if (sent[msg]) return; sent[msg] = 1;
    try { fetch(API + '/api/monitor/report', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, keepalive: true, body: JSON.stringify({ events: [{ kind: 'boot', message: msg, stack: stack || '', path: location.pathname, deviceId: did(), appVer: '20261020', ua: navigator.userAgent.slice(0, 160) }] }) }).catch(function () {}); } catch (e) {}
  }
  window.addEventListener('error', function (e) {
    if (!document.getElementById('boot-splash')) return;
    var t = e && e.target;
    if (t && t.tagName === 'LINK' && /tailwind\.css/.test(t.href || '')) rep('Gagal memuat tailwind.css');
    else if (t && t.tagName === 'SCRIPT') rep('Gagal memuat script: ' + String(t.src || '').split('?')[0].slice(0, 120));
    else if (e && e.message && !/^Script error/i.test(e.message)) rep('Error saat memuat: ' + e.message, (e.filename || '') + ':' + (e.lineno || 0));
  }, true);
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
      btn.addEventListener('click', function () { location.reload(); });
      t.appendChild(btn);
    }
  }, 20000);
})();
