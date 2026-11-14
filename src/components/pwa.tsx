"use client";

import { useEffect, useState } from "react";

interface InstallPrompt extends Event {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let installPrompt: InstallPrompt | null = null;

export function PwaRuntime() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const savePrompt = (event: Event) => {
      event.preventDefault();
      installPrompt = event as InstallPrompt;
      window.dispatchEvent(new Event("forma-install-available"));
    };
    const clearPrompt = () => {
      installPrompt = null;
      window.dispatchEvent(new Event("forma-install-available"));
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("beforeinstallprompt", savePrompt);
    window.addEventListener("appinstalled", clearPrompt);
    if ("serviceWorker" in navigator && window.isSecureContext && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // Online use is still available if registration is blocked.
      });
    }
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("beforeinstallprompt", savePrompt);
      window.removeEventListener("appinstalled", clearPrompt);
    };
  }, []);

  return offline ? <div role="status" className="border-b line bg-[var(--lift)] px-4 py-2 text-center text-sm">
    Koneksi terputus. Sambungkan kembali sebelum menyimpan.
  </div> : null;
}

export function InstallForma() {
  const [available, setAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const update = () => {
      setAvailable(Boolean(installPrompt));
      setInstalled(display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    };
    const installed = () => { setInstalled(true); };
    update();
    window.addEventListener("forma-install-available", update);
    window.addEventListener("appinstalled", installed);
    display.addEventListener("change", update);
    return () => {
      window.removeEventListener("forma-install-available", update);
      window.removeEventListener("appinstalled", installed);
      display.removeEventListener("change", update);
    };
  }, []);

  async function install() {
    const prompt = installPrompt;
    if (!prompt) return;
    setBusy(true);
    try {
      await prompt.prompt();
      if ((await prompt.userChoice).outcome === "accepted") setInstalled(true);
    } catch {
      // The browser menu remains available.
    } finally {
      installPrompt = null;
      setAvailable(false);
      setBusy(false);
    }
  }

  return <section className="card grid gap-3">
    <h2>Pasang FORMA di HP</h2>
    {installed ? <p className="caption muted" role="status">FORMA sudah dipasang.</p> : <>
      {available && <button type="button" className="btn btn-primary justify-self-start" disabled={busy}
        onClick={install}>Pasang FORMA</button>}
      <p className="caption muted">Di Chrome Android, buka menu ⋮ lalu pilih <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke layar utama</strong>. Di Safari iPhone, gunakan Bagikan, lalu Tambah ke Layar Utama.</p>
      <p className="caption muted">Jurnal dan penyimpanan memerlukan internet. Saat offline, FORMA menampilkan petunjuk untuk menyambung kembali.</p>
    </>}
  </section>;
}
