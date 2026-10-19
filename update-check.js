/*
  Pengecek update APK Tarobun.
  Taruh file ini di repo WEB (sejajar index.html), lalu panggil dari halaman utama.
  Hanya aktif di dalam aplikasi Android (bukan di browser biasa).
  Membaca /apk/version.json yang dikirim otomatis oleh workflow Build APK.
*/
(function () {
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;

  async function cekUpdate() {
    try {
      var info = await C.Plugins.App.getInfo();
      var terpasang = parseInt(info.build, 10);

      var r = await fetch('/apk/version.json', { cache: 'no-store' });
      if (!r.ok) return;
      var j = await r.json();
      var terbaru = parseInt(j.versionCode, 10);
      if (isNaN(terbaru) || isNaN(terpasang) || terbaru <= terpasang) return;

      // Hanya terima unduhan dari folder /apk/ situs sendiri
      if (String(j.apk).indexOf('/apk/') !== 0) return;
      tampilkanBanner(location.origin + j.apk, j.versionName || ('v' + terbaru));
    } catch (e) { /* diam saja bila offline */ }
  }

  function tampilkanBanner(url, versi) {
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
    tombol.onclick = function () { C.Plugins.Browser.open({ url: url }); };
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
