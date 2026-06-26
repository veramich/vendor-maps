import cloudinary from "@/lib/cloudinary";

export const uploadImage = async (
  file: File,
  folder: string
): Promise<{ url: string; publicId: string }> => {
  // Convert file to base64
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `vendor-maps/${folder}`,
    // Cap the STORED original so we never warehouse / deliver a 4000px phone
    // photo. crop:"limit" only shrinks images larger than the cap (never
    // upscales). Logos stay small; photos top out at 1600px wide. This is the
    // single biggest lever on Cloudinary bandwidth/storage credits — every
    // later derived size starts from this smaller master.
    transformation: [
      { width: 1600, crop: "limit" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
  });

  return {
    url:      result.secure_url,
    publicId: result.public_id,
  };
};