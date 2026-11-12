import type { FormState } from "@/lib/actions";

export function Feedback({ error, message }: FormState) {
  if (error) return <p role="alert" className="notice notice-error">{error}</p>;
  if (message) return <p role="status" className="notice">{message}</p>;
  return null;
}
