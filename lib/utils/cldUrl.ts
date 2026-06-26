// Inject Cloudinary delivery transforms into a stored secure_url. We store the
// plain upload URL (https://res.cloudinary.com/<cloud>/image/upload/v123/...)
// and add size/quality/format transforms at delivery time by splicing them in
// right after "/upload/". Serving a pre-sized image (e.g. a 88px thumb) instead
// of the full master is the main bandwidth saver — paired with `unoptimized`
// on next/image so Vercel's optimizer doesn't re-process what Cloudinary
// already sized.
//
// `transform` is a raw Cloudinary transformation string, e.g.
//   "w_88,h_88,c_fill,g_auto"
// q_auto + f_auto are always appended, so callers only pass sizing/cropping.

export function cldUrl(
  url: string | null | undefined,
  transform: string
): string {
  if (!url) return "";

  const marker = "/upload/";
  const idx = url.indexOf(marker);
  // Not a Cloudinary upload URL (or already transformed in a way we don't
  // recognize) — return untouched so callers degrade gracefully.
  if (idx === -1) return url;

  const t = [transform, "q_auto", "f_auto"].filter(Boolean).join(",");
  const head = url.slice(0, idx + marker.length);
  const tail = url.slice(idx + marker.length);
  return `${head}${t}/${tail}`;
}

// Preset transforms for the sizes the app actually renders, so call sites stay
// consistent and we only ever materialize a handful of derived images. Sizes
// are @2x of the rendered box for crisp display on retina screens.
export const CLD = {
  // 44px logo/avatar boxes in the directory + event lists (@2x = 88px).
  thumb: (url?: string | null) => cldUrl(url, "w_88,h_88,c_fill,g_auto"),
  // ~200px square gallery-grid thumbnails (@2x = 400px).
  square: (url?: string | null) => cldUrl(url, "w_400,h_400,c_fill,g_auto"),
  // Card cover image in list views (~ full-width-ish small card).
  card: (url?: string | null) => cldUrl(url, "w_800,c_fill,g_auto"),
  // Hero / cover photo on the business detail page.
  hero: (url?: string | null) => cldUrl(url, "w_1600,c_limit"),
} as const;
