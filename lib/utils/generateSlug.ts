import sql from "@/lib/db";

const toSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
};

export const generateSlug = async (
  name: string,
  city?: string,
  neighborhood?: string
): Promise<string> => {
  const baseSlug = toSlug(name);

  const existing = await sql`
    SELECT id FROM businesses
    WHERE slug = ${baseSlug}
  `;
  if (existing.length === 0) return baseSlug;

  if (neighborhood) {
    const neighborhoodSlug =
      `${baseSlug}-${toSlug(neighborhood)}`;
    const existing2 = await sql`
      SELECT id FROM businesses
      WHERE slug = ${neighborhoodSlug}
    `;
    if (existing2.length === 0) return neighborhoodSlug;
  }

  if (city) {
    const citySlug = `${baseSlug}-${toSlug(city)}`;
    const existing3 = await sql`
      SELECT id FROM businesses
      WHERE slug = ${citySlug}
    `;
    if (existing3.length === 0) return citySlug;
  }

  if (city && neighborhood) {
    const fullSlug =
      `${baseSlug}-${toSlug(neighborhood)}-${toSlug(city)}`;
    const existing4 = await sql`
      SELECT id FROM businesses
      WHERE slug = ${fullSlug}
    `;
    if (existing4.length === 0) return fullSlug;
  }

  let counter = 2;
  while (true) {
    const numberedSlug = `${baseSlug}-${counter}`;
    const existing5 = await sql`
      SELECT id FROM businesses
      WHERE slug = ${numberedSlug}
    `;
    if (existing5.length === 0) return numberedSlug;
    counter++;
  }
};