// Builds schema.org JSON-LD for a business profile page so Google can surface
// rich results (name, address, geo, hours, rating) and Event listings.
//
// Design notes:
//  - Address: street is only emitted when show_exact_address is true, matching
//    the same privacy gating the visible page uses — we never leak a hidden
//    exact address into structured data.
//  - aggregateRating is omitted entirely when review_count is 0; Google rejects
//    an aggregateRating with no reviews.
//  - Empty / null fields are stripped so the output stays valid.

const BASE_URL = "https://vendormaps.net";

// schema.org day URIs keyed by our day_of_week values.
const SCHEMA_DAYS: Record<string, string> = {
  monday: "https://schema.org/Monday",
  tuesday: "https://schema.org/Tuesday",
  wednesday: "https://schema.org/Wednesday",
  thursday: "https://schema.org/Thursday",
  friday: "https://schema.org/Friday",
  saturday: "https://schema.org/Saturday",
  sunday: "https://schema.org/Sunday",
};

interface BusinessData {
  business: any;
  images: any[];
  hours: any[];
  popupEvents: any[];
}

// Drop null / undefined / empty-array / empty-object keys so the emitted JSON
// only carries fields we actually have values for.
function prune<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    ) {
      continue;
    }
    out[key] = value;
  }
  return out as T;
}

function buildAddress(b: any) {
  return prune({
    "@type": "PostalAddress",
    // Only expose a street when the listing opts into showing the exact address.
    streetAddress:
      b.show_exact_address && b.exact_address
        ? b.exact_address
        : b.show_exact_address
        ? b.street_address || undefined
        : undefined,
    addressLocality: b.city || undefined,
    addressRegion: b.state_code || b.state || undefined,
    postalCode: b.zip || undefined,
    addressCountry: "US",
  });
}

function buildGeo(b: any) {
  if (b.lat == null || b.lng == null) return undefined;
  return {
    "@type": "GeoCoordinates",
    latitude: b.lat,
    longitude: b.lng,
  };
}

function buildOpeningHours(hours: any[]) {
  return hours
    .filter((h) => !h.is_closed && !h.hours_vary && h.open_time && h.close_time)
    .map((h) =>
      prune({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: SCHEMA_DAYS[h.day_of_week],
        // open_time / close_time come back as "HH:MM:SS"; trim to "HH:MM".
        opens: String(h.open_time).slice(0, 5),
        closes: String(h.close_time).slice(0, 5),
      })
    )
    .filter((spec) => spec.dayOfWeek);
}

function buildAggregateRating(b: any) {
  if (!b.review_count || b.review_count < 1 || !b.avg_rating) return undefined;
  return {
    "@type": "AggregateRating",
    ratingValue: Number(b.avg_rating),
    reviewCount: b.review_count,
  };
}

export function buildBusinessJsonLd(data: BusinessData) {
  const { business: b, images, hours, popupEvents } = data;

  const url = `${BASE_URL}/${b.slug}`;
  const image = images
    .map((img) => img.cloudinary_url)
    .filter(Boolean);

  const sameAs = [
    b.website,
    b.instagram,
    b.facebook,
    b.tiktok,
    b.twitter,
    b.youtube,
  ].filter(Boolean);

  const address = buildAddress(b);
  const geo = buildGeo(b);

  // An "event"-type business maps to schema.org/Event; everything else is a
  // LocalBusiness. For events we anchor start/end on the soonest upcoming date.
  if (b.type === "event") {
    const next = popupEvents[0];
    return prune({
      "@context": "https://schema.org",
      "@type": "Event",
      name: b.name,
      description: b.description || undefined,
      url,
      image,
      startDate: next?.start_time
        ? new Date(next.start_time).toISOString()
        : undefined,
      endDate: next?.end_time
        ? new Date(next.end_time).toISOString()
        : undefined,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode:
        "https://schema.org/OfflineEventAttendanceMode",
      location: prune({
        "@type": "Place",
        name: b.name,
        address: Object.keys(address).length > 1 ? address : undefined,
        geo,
      }),
    });
  }

  return prune({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: b.name,
    description: b.description || undefined,
    url,
    image,
    telephone: b.phone || undefined,
    email: b.email || undefined,
    priceRange: b.price_tier ? "$".repeat(b.price_tier) : undefined,
    address: Object.keys(address).length > 1 ? address : undefined,
    geo,
    openingHoursSpecification: buildOpeningHours(hours),
    aggregateRating: buildAggregateRating(b),
    sameAs,
  });
}
