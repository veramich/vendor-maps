import { BusinessFormData } from "@/lib/types/business";

// Turn whatever the user put in a prefixed handle field into a bare username.
// The field shows e.g. "tiktok.com/@" as a label, so people paste the whole
// domain after it ("tiktok.com/@myname" or "www.tiktok.com/@myname"). Left as-is
// that becomes "https://tiktok.com/@tiktok.com/@myname", which TikTok bounces to
// its homepage. We strip a leading protocol, www, any known social host, and a
// leading @, then drop a trailing slash/query — leaving just "myname".
const KNOWN_SOCIAL_HOSTS =
  /^(?:instagram|facebook|fb|tiktok|twitter|x|youtube|youtu\.be)\.com\/@?/i;

export const normalizeHandle = (value: string): string => {
  if (!value) return "";
  let handle = value.trim();

  // A pasted full URL: strip protocol + optional www, then a known host prefix.
  if (/^https?:\/\//i.test(handle)) {
    handle = handle.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  }
  handle = handle.replace(/^www\./i, "");
  handle = handle.replace(KNOWN_SOCIAL_HOSTS, "");

  // Bare handle form: leading @ and any trailing path/query the username omits.
  handle = handle.replace(/^@/, "").replace(/[/?#].*$/, "");
  return handle;
};

export type SocialUrls = {
  website:   string;
  instagram: string;
  facebook:  string;
  tiktok:    string;
  twitter:   string;
  youtube:   string;
  videoUrl:  string;
};

// Ensures all social links are valid full URLs
// before submitting to the database
export const buildSocialUrls = (
  formData: BusinessFormData
): SocialUrls => {
  const ensureFullUrl = (
    value: string,
    baseUrl: string
  ): string => {
    if (!value) return "";

    // A full URL pointing at some other host (e.g. a Linktree in a profile
    // field) — leave it alone. A full URL of a KNOWN social host falls through
    // to normalizeHandle so it's rebuilt cleanly against baseUrl instead of
    // being double-prefixed.
    if (
      (value.startsWith("http://") || value.startsWith("https://")) &&
      !KNOWN_SOCIAL_HOSTS.test(
        value.replace(/^https?:\/\//i, "").replace(/^www\./i, "")
      )
    ) {
      return value;
    }

    // Reduce whatever was entered (bare handle, @handle, or a pasted same-host
    // URL) to just the username, then build the canonical link. Empty stays
    // empty so the link is hidden rather than pointing at the bare homepage.
    const handle = normalizeHandle(value);
    if (!handle) return "";
    return `${baseUrl}${handle}`;
  };

  return {
    website:   formData.website || "",

    instagram: ensureFullUrl(
      formData.instagram,
      "https://instagram.com/"
    ),

    facebook:  ensureFullUrl(
      formData.facebook,
      "https://facebook.com/"
    ),

    tiktok:    ensureFullUrl(
      formData.tiktok,
      "https://tiktok.com/@"
    ),

    twitter:   ensureFullUrl(
      formData.twitter,
      "https://twitter.com/"
    ),

    youtube:   ensureFullUrl(
      formData.youtube,
      "https://youtube.com/@"
    ),

    videoUrl:  formData.videoUrl || "",
  };
};

// The reverse of buildSocialUrls' prefixing: turn a stored full URL back into
// the bare username the prefixed inputs (Step6Media) expect. The edit form
// pre-fills from the saved row, where these fields are full URLs like
// "https://tiktok.com/@myname" — without this the input would show the whole
// URL after the "tiktok.com/@" label, and re-saving could mangle the link.
const SOCIAL_BASES: Record<string, string[]> = {
  instagram: ["instagram.com/"],
  facebook:  ["facebook.com/"],
  tiktok:    ["tiktok.com/@", "tiktok.com/"],
  twitter:   ["twitter.com/", "x.com/"],
  youtube:   ["youtube.com/@", "youtube.com/"],
};

export const extractSocialHandle = (
  field: keyof typeof SOCIAL_BASES,
  value: string
): string => {
  if (!value) return "";

  // Strip protocol + optional www so we can match the bare host/path.
  const stripped = value
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "");

  for (const base of SOCIAL_BASES[field]) {
    if (stripped.startsWith(base)) {
      // normalizeHandle heals a legacy row where the host was double-pasted
      // (e.g. "tiktok.com/@tiktok.com/@myname"): drop the extra host, keep the
      // real username. A clean row is unaffected.
      return normalizeHandle(stripped.slice(base.length));
    }
  }

  // Not a recognised full URL — assume it's already a handle.
  return normalizeHandle(value);
};

export const extractSocialHandles = <T extends Record<string, unknown>>(
  data: T
): T => {
  const out: Record<string, unknown> = { ...data };
  for (const field of Object.keys(SOCIAL_BASES) as (keyof typeof SOCIAL_BASES)[]) {
    if (typeof out[field] === "string") {
      out[field] = extractSocialHandle(field, out[field] as string);
    }
  }
  return out as T;
};