import { BusinessFormData } from "@/lib/types/business";

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

    // Already a full URL — return as is
    if (value.startsWith("http://") ||
        value.startsWith("https://")) {
      return value;
    }

    // Just a username — build full URL.
    // Strip a leading @ so e.g. "@myname" + "tiktok.com/@" doesn't
    // become a double "@@", and an empty handle stays empty.
    const handle = value.replace(/^@/, "");
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
      // Drop any trailing slash/query the username wouldn't include.
      return stripped.slice(base.length).replace(/[/?#].*$/, "");
    }
  }

  // Not a recognised full URL — assume it's already a handle.
  return value.replace(/^@/, "");
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