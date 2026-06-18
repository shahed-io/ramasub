/**
 * Rewrites Supabase Storage public object URLs to use the on-the-fly
 * image transformation endpoint so we serve appropriately-sized variants
 * instead of the originals (often 1–2 MB PNGs).
 *
 * Non-matching URLs (external CDNs, local /images/*, blob:, data:) pass through.
 */
const SUPABASE_PUBLIC_RE = /\/storage\/v1\/object\/public\//;

export function optimizeSupabaseImage(
  url: string | undefined | null,
  opts: { width?: number; quality?: number; resize?: "cover" | "contain" | "fill" } = {}
): string {
  if (!url) return "";
  if (!SUPABASE_PUBLIC_RE.test(url)) return url;
  const { width = 600, quality = 70, resize = "contain" } = opts;
  const transformed = url.replace(SUPABASE_PUBLIC_RE, "/storage/v1/render/image/public/");
  const sep = transformed.includes("?") ? "&" : "?";
  return `${transformed}${sep}width=${width}&quality=${quality}&resize=${resize}`;
}
