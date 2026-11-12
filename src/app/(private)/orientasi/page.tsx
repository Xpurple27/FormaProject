import { redirect } from "next/navigation";
import { Onboarding } from "@/components/onboarding";
import { DEFAULT_TIMEZONE, localNow } from "@/lib/dates";
import { getProfile } from "@/lib/supabase/server";

export const metadata = { title: "Pengaturan awal" };
export default async function OnboardingPage() {
  if (await getProfile()) redirect("/beranda");
  return <Onboarding today={localNow(DEFAULT_TIMEZONE).date} />;
}
