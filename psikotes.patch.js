// ==========================================
  // FIX: konflik lucide.createIcons() vs React DOM reconciliation
  // (SAMA seperti perbaikan di index.html -- halaman ini juga memakai
  // scheduleLucideIcons()/lucide.createIcons() di useEffect tiap render,
  // jadi rentan bug yang sama persis: React mencoba removeChild/insertBefore
  // elemen <i data-lucide> yang SUDAH diganti Lucide jadi <svg> di luar
  // sepengetahuan React, browser melempar NotFoundError, dan karena
  // sebelumnya TIDAK ada ErrorBoundary di halaman ini, error tsb membuat
  // SELURUH render React gagal -- hasilnya layar putih kosong total.
  // Patch ini membuat removeChild/insertBefore "defensif": kalau node yang
  // diminta dihapus/disisipkan ternyata bukan child dari parent tsb, jangan
  // lempar error, cukup diam saja. Tidak mengubah tampilan apa pun yang
  // terlihat pengguna -- hanya mencegah crash akibat DOM sudah berubah duluan.
  // ==========================================
  (function () {
    const origRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function (child) {
      if (child.parentNode !== this) {
        if (console && console.warn) {
          console.warn('[Psikotes] Diabaikan: removeChild pada node yang sudah tidak jadi child (biasanya akibat lucide.createIcons()).', child);
        }
        return child;
      }
      return origRemoveChild.call(this, child);
    };

    const origInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (newNode, refNode) {
      if (refNode && refNode.parentNode !== this) {
        if (console && console.warn) {
          console.warn('[Psikotes] Diabaikan: insertBefore dengan referenceNode yang sudah tidak jadi child (biasanya akibat lucide.createIcons()).', refNode);
        }
        return this.appendChild(newNode);
      }
      return origInsertBefore.call(this, newNode, refNode);
    };
  })();
