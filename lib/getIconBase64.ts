const cache: Record<string, string> = {};

export const getIconBase64 = async (
  iconFile: string
): Promise<string> => {
  // Return cached version if available
  if (cache[iconFile]) return cache[iconFile];

  const res = await fetch(`/icons/categories/${iconFile}.png`);
  const blob = await res.blob();

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      cache[iconFile] = base64;
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
};