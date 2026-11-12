"use client";

import { startTransition, useActionState, type SubmitEvent } from "react";
import type { FormState } from "@/lib/actions";

export function useActionForm(action: (state: FormState, data: FormData) => Promise<FormState>) {
  const [state, dispatch, pending] = useActionState(action, {});
  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }
  return { state, pending, form: { action: dispatch, onSubmit } };
}
