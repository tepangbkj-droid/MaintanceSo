/*
  Pengecek update APK Tarobun.
  Taruh file ini di repo WEB (sejajar index.html), lalu panggil dari halaman utama.
  Hanya aktif di dalam aplikasi Android (bukan di browser biasa).
  Membaca /apk/version.json yang dikirim otomatis oleh workflow Build APK.

  HARDENING (2026-10):
  - Path APK divalidasi ketat (hanya /apk/<nama>.apk) dan version.json WAJIB memuat sha256 yang valid.
  - Saat tombol Update ditekan, APK diunduh dulu lalu hash SHA-256-nya dicocokkan dengan version.json;
    hanya bila cocok baru dibuka untuk dipasang. (Catatan: Android tetap memverifikasi tanda tangan APK
    saat memasang pembaruan; pengecekan hash ini lapisan tambahan.)
*/
(function () {
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;

  var APK_RE = /^\/apk\/[A-Za-z0-9._-]+\.apk$/;
  var SHA_RE = /^[a-f0-9]{64}$/;
  var MAX_APK_BYTES = 150 * 1024 * 1024;

  async function cekUpdate() {
    try {
      var info = await C.Plugins.App.getInfo();
      var terpasang = parseInt(info.build, 10);

      var r = await fetch('/apk/version.json', { cache: 'no-store' });
      if (!r.ok) return;
      var j = await r.json();
      var terbaru = parseInt(j.versionCode, 10);
      if (isNaN(terbaru) || isNaN(terpasang) || terbaru <= terpasang) return;

      if (!APK_RE.test(String(j.apk))) return;
      var sha = String(j.sha256 || '').toLowerCase();
      if (!SHA_RE.test(sha)) return; // tanpa hash valid -> jangan tawarkan update
      tampilkanBanner(location.origin + j.apk, j.versionName || ('v' + terbaru), sha);
    } catch (e) { /* diam saja bila offline */ }
  }

  async function sha256Hex(buf) {
    var d = await crypto.subtle.digest('SHA-256', buf);
    return Array.prototype.map.call(new Uint8Array(d), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  function tampilkanBanner(url, versi, sha) {
    if (document.getElementById('update-apk-banner')) return;
    var b = document.createElement('div');
    b.id = 'update-apk-banner';
    b.style.cssText =
      'position:fixed;left:12px;right:12px;bottom:16px;z-index:99999;background:#6D28D9;color:#fff;' +
      'padding:14px 16px;border-radius:14px;font:600 14px sans-serif;display:flex;gap:12px;' +
      'align-items:center;justify-content:space-between;box-shadow:0 8px 24px rgba(0,0,0,.35)';
    var t = document.createElement('span');
    t.textContent = 'Update aplikasi tersedia (' + versi + ')';
    var tombol = document.createElement('button');
    tombol.textContent = 'Update';
    tombol.style.cssText =
      'background:#fff;color:#6D28D9;border:0;padding:8px 16px;border-radius:10px;font-weight:700';
    tombol.onclick = async function () {
      tombol.disabled = true;
      tombol.textContent = 'Memeriksa\u2026';
      try {
        var r = await fetch(url, { cache: 'no-store' });
        var len = parseInt(r.headers.get('Content-Length') || '0', 10);
        if (!r.ok || len > MAX_APK_BYTES) throw new Error('unduhan gagal');
        var buf = await r.arrayBuffer();
        if (buf.byteLength > MAX_APK_BYTES || (await sha256Hex(buf)) !== sha) throw new Error('hash tidak cocok');
        C.Plugins.Browser.open({ url: url });
        tombol.textContent = 'Update';
        tombol.disabled = false;
      } catch (e) {
        t.textContent = 'Update dibatalkan: file tidak lolos verifikasi. Hubungi admin.';
        tombol.remove();
      }
    };
    var x = document.createElement('button');
    x.textContent = '\u2715';
    x.setAttribute('aria-label', 'Tutup');
    x.style.cssText = 'background:none;border:0;color:#fff;font-size:16px';
    x.onclick = function () { b.remove(); };
    b.appendChild(t); b.appendChild(tombol); b.appendChild(x);
    document.body.appendChild(b);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cekUpdate);
  else cekUpdate();
})();
