import { isPhotoName, PHOTO_BUCKET } from "@/lib/progress-photos";
import { getSession } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  const [{ file }, session] = await Promise.all([params, getSession()]);
  if (!session || !isPhotoName(file)) return new Response(null, { status: 404, headers });
  const { data, error } = await session.client.storage.from(PHOTO_BUCKET).download(session.userId + "/" + file);
  if (error || !data) return new Response(null, { status: 404, headers });
  return new Response(data, { headers: { ...headers, "Content-Type": "image/jpeg", "Content-Disposition": 'inline; filename="forma-' + file + '"' } });
}
