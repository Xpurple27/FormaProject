"use client";

import { authAction } from "@/lib/actions";
import { Feedback } from "./feedback";
import { useActionForm } from "./use-action-form";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { state, pending, form } = useActionForm(authAction.bind(null, mode));
  return <form {...form} className="grid gap-4">
    <label className="label">Email<input className="field" type="email" name="email" autoComplete="email" maxLength={254} required /></label>
    <label className="label">Kata sandi<input className="field" type="password" name="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} maxLength={72} required /></label>
    {mode === "signup" && <p className="muted caption">Minimal 8 karakter.</p>}
    <Feedback {...state} />
    <button disabled={pending} className="btn btn-primary">{pending ? "Memproses…" : mode === "login" ? "Masuk" : "Buat akun"}</button>
  </form>;
}
