"use client";

import { startTransition, useActionState, useState, type SubmitEvent } from "react";
import type { FormState } from "@/lib/actions";

export function useActionForm(action: (state: FormState, data: FormData) => Promise<FormState>) {
  const [state, dispatch, pending] = useActionState(action, {});
  const [offlineError, setOfflineError] = useState(false);
  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setOfflineError(!navigator.onLine);
    if (!navigator.onLine) return;
    const data = new FormData(event.currentTarget, (event.nativeEvent as globalThis.SubmitEvent).submitter);
    startTransition(() => dispatch(data));
  }
  return { state: offlineError ? { error: "Sedang offline. Sambungkan kembali lalu coba simpan lagi." } : state, pending, form: { action: dispatch, onSubmit } };
}
