import { isPhotoName, PHOTO_BUCKET } from "@/lib/progress-photos";
import { getSession } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  const [{ file }, session] = await Promise.all([params, getSession()]);
  if (!session || !isPhotoName(file)) return new Response(null, { status: 404, headers });
  const bucket = session.client.storage.from(PHOTO_BUCKET);
  const path = session.userId + "/" + file;
  // The object can outlive its deletion in the Storage CDN. Authorize against live metadata first.
  const object = await bucket.info(path);
  if (object.error || !object.data) return new Response(null, { status: 404, headers });
  const { data, error } = await bucket.download(path, {}, { cache: "no-store" });
  if (error || !data) return new Response(null, { status: 404, headers });
  return new Response(data, { headers: { ...headers, "Content-Type": "image/jpeg", "Content-Disposition": 'inline; filename="forma-' + file + '"' } });
}
