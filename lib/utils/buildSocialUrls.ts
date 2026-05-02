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

    // Just a username — build full URL
    return `${baseUrl}${value}`;
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
      "https://youtube.com/"
    ),

    videoUrl:  formData.videoUrl || "",
  };
};