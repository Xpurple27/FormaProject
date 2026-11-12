import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "./brand";
import { AuthForm } from "./auth-form";
import { Feedback } from "./feedback";
import { getSession } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/env";

export async function AuthPage({ mode, confirmationFailed = false }: { mode: "login" | "signup"; confirmationFailed?: boolean }) {
  if (await getSession()) redirect("/beranda");
  const configured = Boolean(supabaseConfig());
  const login = mode === "login";
  return <div className="auth-layout">
    <div className="auth-panel"><Brand /><div>
      <p className="max-w-md text-5xl leading-tight font-semibold tracking-tight">Catat asupan. Kenali kebiasaanmu.</p>
      <p className="mt-5 max-w-sm muted">Pantau energi dan makro dari makanan yang kamu catat setiap hari.</p>
    </div></div>
    <main id="isi" className="auth-main">
      <div className="mb-8 min-[760px]:hidden"><Brand /></div>
      <section className="card">
        <h1 className="text-3xl">{login ? "Masuk ke FORMA" : "Buat akun FORMA"}</h1>
        {confirmationFailed && <div className="mt-4"><Feedback error="Tautan konfirmasi tidak berlaku atau sudah digunakan. Jika sudah mengonfirmasi, silakan masuk." /></div>}
        {configured ? <div className="mt-6"><AuthForm mode={mode} /></div> :
          <p className="notice mt-5">Koneksi Supabase belum dikonfigurasi. Ikuti petunjuk penyiapan FORMA untuk mengaktifkan akun dan penyimpanan.</p>}
        <p className="mt-5 caption muted">{login ? "Belum punya akun? " : "Sudah punya akun? "}
          <Link href={login ? "/daftar" : "/masuk"} className="accent font-semibold underline">{login ? "Daftar" : "Masuk"}</Link>
        </p>
      </section>
    </main>
  </div>;
}
