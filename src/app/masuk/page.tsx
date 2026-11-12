import { AuthPage } from "@/components/auth-page";

export const metadata = { title: "Masuk" };
export default async function Login({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return <AuthPage mode="login" confirmationFailed={(await searchParams).status === "konfirmasi-gagal"} />;
}
