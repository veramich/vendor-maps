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
    transformation: [
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
  });

  return {
    url:      result.secure_url,
    publicId: result.public_id,
  };
};