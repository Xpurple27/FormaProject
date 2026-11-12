"use client";

export default function PrivateError({ reset }: { reset: () => void }) {
  return <section className="card grid gap-3 justify-items-start">
    <h1 className="text-2xl">Data belum bisa dimuat</h1>
    <p role="alert" className="muted">Periksa koneksi dan coba lagi.</p>
    <button onClick={reset} className="btn btn-primary">Coba lagi</button>
  </section>;
}
