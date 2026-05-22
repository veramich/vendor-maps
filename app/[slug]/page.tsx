import { notFound } from "next/navigation";
import sql from "@/lib/db";
import Link from "next/link";
import SaveButton from "@/components/ui/SaveButton";
import OwnerResponse from "@/components/ui/OwnerResponse";
import { headers } from "next/dist/server/request/headers";
import { auth } from "@/lib/auth";


async function getBusinessBySlug(slug: string) {
  try {
    const result = await sql`
      SELECT
        b.*,
        l.street_1,
        l.street_2,
        l.street_address,
        l.city,
        l.state,
        l.state_code,
        l.zip,
        l.neighborhood,
        l.show_exact_address,
        l.exact_address,
        l.location_amenities,
        ST_X(l.coordinates) as lng,
        ST_Y(l.coordinates) as lat,
        br.name as brand_name,
        br.logo_url as brand_logo
      FROM businesses b
      LEFT JOIN locations l
        ON l.business_id = b.id
      LEFT JOIN brands br
        ON br.id = b.brand_id
      WHERE b.slug = ${slug}
    `;

    if (!result || result.length === 0) return null;

    const business = result[0];

    const images = await sql`
      SELECT *
      FROM business_images
      WHERE business_id = ${business.id}
      ORDER BY is_primary DESC, display_order ASC
    `;

    const hours = await sql`
      SELECT *
      FROM business_hours
      WHERE business_id = ${business.id}
      ORDER BY
        CASE day_of_week
          WHEN 'monday'    THEN 1
          WHEN 'tuesday'   THEN 2
          WHEN 'wednesday' THEN 3
          WHEN 'thursday'  THEN 4
          WHEN 'friday'    THEN 5
          WHEN 'saturday'  THEN 6
          WHEN 'sunday'    THEN 7
        END
    `;

    const schedules = await sql`
      SELECT *
      FROM market_schedules
      WHERE business_id = ${business.id}
    `;

    const popupResult = await sql`
      SELECT *,
        lower(event_range) as start_time,
        upper(event_range) as end_time
      FROM popup_events
      WHERE business_id = ${business.id}
      AND upper(event_range) > NOW()
      LIMIT 1
    `;
    const popupEvent = popupResult[0] || null;

    const reviews = await sql`
      SELECT
        r.*,
        rr.response_text,
        rr.created_at as response_date
      FROM reviews r
      LEFT JOIN review_responses rr
        ON rr.review_id = r.id
      WHERE r.business_id = ${business.id}
      AND r.status = 'approved'
      ORDER BY r.created_at DESC
      LIMIT 10
    `;

    let otherLocations: any[] = [];
    if (business.brand_id) {
      otherLocations = await sql`
        SELECT
          b.id,
          b.slug,
          b.name,
          b.location_nickname,
          b.avg_rating,
          l.city,
          l.neighborhood,
          l.street_1,
          l.street_2
        FROM businesses b
        LEFT JOIN locations l
          ON l.business_id = b.id
        WHERE b.brand_id = ${business.brand_id}
        AND b.id != ${business.id}
        AND b.status = 'listed'
      `;
    }

    return {
      business,
      images,
      hours,
      schedules,
      popupEvent,
      reviews,
      otherLocations,
    };

  } catch (error) {
    console.error("Error fetching business:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const data = await getBusinessBySlug(slug);

  if (!data) return { title: "Business Not Found" };

  return {
    title: `${data.business.name} — Vendor Maps`,
    description:
      data.business.description?.slice(0, 160) ||
      `Find ${data.business.name} on Vendor Maps`,
    openGraph: {
      title: `${data.business.name} — Vendor Maps`,
      description:
        data.business.description?.slice(0, 160) || "",
      images: data.images[0]?.cloudinary_url
        ? [{ url: data.images[0].cloudinary_url }]
        : [],
    },
  };
}

const PRICE_TIER_LABELS: Record<number, string> = {
  1: "$",
  2: "$$",
  3: "$$$",
  4: "$$$$",
};

const SUB_TYPE_LABELS: Record<string, string> = {
  street_vendor:      "Street Vendor",
  food_truck:         "Food Truck",
  home_based:         "Home Based",
  market_based:       "Market Based",
  pop_up_based:       "Pop-Up Based",
  catering_only:      "Catering",
  shipping_only:      "Shipping",
  permanent_location: "Permanent Location",
  market:             "Market",
  pop_up:             "Pop-Up Event",
};

const DAY_LABELS: Record<string, string> = {
  monday:    "Monday",
  tuesday:   "Tuesday",
  wednesday: "Wednesday",
  thursday:  "Thursday",
  friday:    "Friday",
  saturday:  "Saturday",
  sunday:    "Sunday",
};

export default async function BusinessProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const data = await getBusinessBySlug(slug);

  if (!data) notFound();

  const session = await auth.api.getSession({
    headers: await headers(),
  }).catch(() => null);

  const isAdmin = session?.user?.id === process.env.ADMIN_USER_ID;
  if (data.business.status !== "listed" && !isAdmin) notFound();

  const {
    business,
    images,
    hours,
    schedules,
    popupEvent,
    reviews,
    otherLocations,
  } = data;

  const isOwner =
    session?.user?.id === business.claimed_by &&
    business.claim_status === "claimed";

  const address =
    business.show_exact_address && business.exact_address
      ? business.exact_address
      : business.street_1 && business.street_2
      ? `${business.street_1} & ${business.street_2}`
      : business.street_address || "";

  const coverImage =
    images.find((img: any) => img.is_primary) ||
    images[0];

  return (
    <div className="min-h-screen bg-white pb-8">

      {/* Cover image */}
      {coverImage ? (
        <div className="w-full h-56 bg-gray-100
          overflow-hidden">
          <img
            src={coverImage.cloudinary_url}
            alt={business.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-56 bg-gray-100
          flex items-center justify-center">
          <svg width="48" height="48"
            viewBox="0 0 24 24" fill="none"
            stroke="#d1d5db" strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <rect x="3" y="3" width="18"
              height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4">

        {/* Business header */}
        <div className="py-5 border-b border-gray-100">
          <div className="flex items-start gap-3">

            {(business.logo_url ||
              business.brand_logo) && (
              <img
                src={
                  business.logo_url ||
                  business.brand_logo
                }
                alt={business.name}
                className="w-16 h-16 rounded-xl
                  object-cover border-2
                  border-gray-100 flex-shrink-0"
              />
            )}

            <div className="flex-1">
              <h1 className="text-xl font-semibold
                text-black">
                {business.name}
              </h1>

              {business.brand_name &&
                business.brand_name !==
                  business.name && (
                <p className="text-sm text-gray-400">
                  Part of {business.brand_name}
                </p>
              )}

              <div className="flex items-center
                flex-wrap gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  {business.category}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-500">
                  {SUB_TYPE_LABELS[
                    business.sub_type
                  ] || ""}
                </span>
                {business.price_tier && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs
                      text-gray-500">
                      {PRICE_TIER_LABELS[
                        business.price_tier
                      ]}
                    </span>
                  </>
                )}
              </div>

              {business.review_count > 0 && (
                <div className="flex items-center
                  gap-1 mt-1">
                  <span className="text-sm text-black">
                    ★
                  </span>
                  <span className="text-sm font-medium
                    text-black">
                    {Number(business.avg_rating)
                      .toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-400">
                    ({business.review_count} reviews)
                  </span>
                </div>
              )}
            </div>

            {/* Claim / Verified */}
            <div className="flex flex-col items-end
              gap-2 flex-shrink-0">
              {business.claim_status === "unclaimed" && (
                <Link
                  href={`/claim/${business.id}`}
                  className="text-xs text-gray-400
                    border border-gray-200 rounded-lg
                    px-3 py-1.5 hover:bg-gray-50
                    transition"
                >
                  Claim
                </Link>
              )}
              {business.claim_status === "pending" && (
                <span className="text-xs
                  text-orange-500 border
                  border-orange-200 rounded-lg
                  px-3 py-1.5">
                  Claim Pending
                </span>
              )}
              {business.claim_status === "claimed" && (
                <div className="flex items-center
                  gap-1">
                  <svg width="14" height="14"
                    viewBox="0 0 24 24" fill="none"
                    stroke="#22c55e" strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1
                      1-5.93-9.14"/>
                    <polyline
                      points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span className="text-xs
                    text-green-600">
                    Verified
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Save button */}
          <div className="mt-4">
            <SaveButton businessId={business.id} />
          </div>
        </div>

        {/* Location */}
        {address && (
          <div className="py-5 border-b
            border-gray-100">
            <h2 className="text-sm font-semibold
              text-black mb-2">
              Location
            </h2>
            <div className="flex items-start gap-2">
              <svg width="16" height="16"
                viewBox="0 0 24 24" fill="none"
                stroke="#FF7300" strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0 mt-0.5">
                <path d="M21 10c0 7-9 13-9 13S3
                  17 3 10a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <div>
                <p className="text-sm text-black">
                  {address}
                </p>
                <p className="text-xs text-gray-500">
                  {business.neighborhood
                    ? `${business.neighborhood}, `
                    : ""}
                  {business.city},{" "}
                  {business.state_code}
                  {business.zip
                    ? ` ${business.zip}`
                    : ""}
                </p>
                {!business.show_exact_address && (
                  <p className="text-xs text-gray-400
                    mt-1">
                    Cross streets shown for privacy
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {business.description && (
          <div className="py-5 border-b
            border-gray-100">
            <h2 className="text-sm font-semibold
              text-black mb-2">
              About
            </h2>
            <p className="text-sm text-gray-600
              leading-relaxed">
              {business.description}
            </p>
          </div>
        )}

        {/* Hours */}
        {hours.length > 0 && (
          <div className="py-5 border-b
            border-gray-100">
            <h2 className="text-sm font-semibold
              text-black mb-3">
              Hours
            </h2>
            {hours.some((h: any) => h.hours_vary) ? (
              <p className="text-sm text-gray-500">
                Hours posted weekly on social media
              </p>
            ) : (
              <div className="space-y-2">
                {hours.map((h: any) => (
                  <div
                    key={h.day_of_week}
                    className="flex justify-between
                      text-sm"
                  >
                    <span className="text-black">
                      {DAY_LABELS[h.day_of_week]}
                    </span>
                    <span className="text-gray-500">
                      {h.is_closed
                        ? "Closed"
                        : h.hours_vary
                        ? "Varies"
                        : `${h.open_time} — ${h.close_time}${h.closes_next_day ? " (next day)" : ""}`
                      }
                    </span>
                  </div>
                ))}
              </div>
            )}
            {business.hours_subject_to_change && (
              <p className="text-xs text-amber-600
                mt-2">
                ⚠ Hours subject to change
              </p>
            )}
          </div>
        )}

        {/* Market schedule */}
        {schedules.length > 0 && (
          <div className="py-5 border-b
            border-gray-100">
            <h2 className="text-sm font-semibold
              text-black mb-3">
              Schedule
            </h2>
            <div className="space-y-3">
              {schedules.map((s: any, i: number) => (
                <div key={i}>
                  <p className="text-sm font-medium
                    text-black capitalize">
                    {s.day_of_week} —{" "}
                    {s.recurrence_type === "weekly"
                      ? "Every week"
                      : s.recurrence_type === "biweekly"
                      ? "Every other week"
                      : s.recurrence_type
                          .replace("monthly_", "")
                          .replace("_", " ") +
                        " of month"
                    }
                    {s.is_night_market && " 🌙"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {s.start_time} — {s.end_time}
                  </p>
                  {(s.season_start || s.season_end) && (
                    <p className="text-xs text-gray-400">
                      {new Date(s.season_start)
                        .toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      {" — "}
                      {new Date(s.season_end)
                        .toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pop-up event */}
        {popupEvent && (
          <div className="py-5 border-b
            border-gray-100">
            <h2 className="text-sm font-semibold
              text-black mb-3">
              Upcoming Event
            </h2>
            <div className="bg-orange-50 border
              border-orange-200 rounded-xl p-4">
              {popupEvent.event_name && (
                <p className="text-sm font-medium
                  text-black mb-1">
                  {popupEvent.event_name}
                </p>
              )}
              <p className="text-sm text-gray-600">
                {new Date(popupEvent.start_time)
                  .toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
              </p>
              <p className="text-sm text-gray-600">
                {new Date(popupEvent.start_time)
                  .toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                {" — "}
                {new Date(popupEvent.end_time)
                  .toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                {popupEvent.is_night_market && " 🌙"}
              </p>
            </div>
          </div>
        )}

        {/* Amenities */}
        {(business.payment_options?.length > 0 ||
          business.ordering_methods?.length > 0 ||
          business.dietary_options?.length > 0 ||
          business.business_amenities?.length > 0 ||
          business.location_amenities?.length > 0) && (
          <div className="py-5 border-b
            border-gray-100">
            <h2 className="text-sm font-semibold
              text-black mb-4">
              Amenities
            </h2>
            <div className="space-y-4">
              {business.payment_options?.length > 0 && (
                <AmenityGroup
                  label="Payment"
                  items={business.payment_options}
                />
              )}
              {business.ordering_methods?.length > 0 && (
                <AmenityGroup
                  label="Ordering"
                  items={business.ordering_methods}
                />
              )}
              {business.dietary_options?.length > 0 && (
                <AmenityGroup
                  label="Dietary"
                  items={business.dietary_options}
                />
              )}
              {business.business_amenities?.length > 0 && (
                <AmenityGroup
                  label="Business"
                  items={business.business_amenities}
                />
              )}
              {business.location_amenities?.length > 0 && (
                <AmenityGroup
                  label="Location"
                  items={business.location_amenities}
                />
              )}
            </div>
          </div>
        )}

        {/* Image gallery */}
        {images.length > 1 && (
          <div className="py-5 border-b
            border-gray-100">
            <h2 className="text-sm font-semibold
              text-black mb-3">
              Photos
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img: any) => (
                <div
                  key={img.id}
                  className="aspect-square rounded-xl
                    overflow-hidden bg-gray-100"
                >
                  <img
                    src={img.cloudinary_url}
                    alt={business.name}
                    className="w-full h-full
                      object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="py-5 border-b border-gray-100">
          <h2 className="text-sm font-semibold
            text-black mb-3">
            Contact
          </h2>
          <div className="space-y-3">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="flex items-center gap-3
                  text-sm text-black"
              >
                <svg width="16" height="16"
                  viewBox="0 0 24 24" fill="none"
                  stroke="#6b7280" strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0
                    1-2.18 2 19.79 19.79 0 0
                    1-8.63-3.07 19.5 19.5 0 0
                    1-6-6 19.79 19.79 0 0
                    1-3.07-8.67A2 2 0 0 1
                    4.11 2h3a2 2 0 0 1 2 1.72
                    12.84 12.84 0 0 0 .7 2.81
                    2 2 0 0 1-.45 2.11L8.09
                    9.91a16 16 0 0 0 6 6l1.27-1.27
                    a2 2 0 0 1 2.11-.45 12.84
                    12.84 0 0 0 2.81.7A2 2 0 0
                    1 22 16.92z"/>
                </svg>
                {business.phone}
              </a>
            )}
            {business.email && (
              <a
                href={`mailto:${business.email}`}
                className="flex items-center gap-3
                  text-sm text-black"
              >
                <svg width="16" height="16"
                  viewBox="0 0 24 24" fill="none"
                  stroke="#6b7280" strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2
                    2v12c0 1.1-.9 2-2 2H4c-1.1
                    0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                {business.email}
              </a>
            )}
            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3
                  text-sm text-black"
              >
                <svg width="16" height="16"
                  viewBox="0 0 24 24" fill="none"
                  stroke="#6b7280" strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12"
                    x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1
                    4 10 15.3 15.3 0 0 1-4 10
                    15.3 15.3 0 0 1-4-10
                    15.3 15.3 0 0 1 4-10z"/>
                </svg>
                Website
              </a>
            )}
            <div className="flex gap-2 flex-wrap">
              {business.instagram && (
                <SocialLink
                  href={business.instagram}
                  label="Instagram"
                />
              )}
              {business.facebook && (
                <SocialLink
                  href={business.facebook}
                  label="Facebook"
                />
              )}
              {business.tiktok && (
                <SocialLink
                  href={business.tiktok}
                  label="TikTok"
                />
              )}
              {business.twitter && (
                <SocialLink
                  href={business.twitter}
                  label="Twitter"
                />
              )}
              {business.youtube && (
                <SocialLink
                  href={business.youtube}
                  label="YouTube"
                />
              )}
            </div>
          </div>
        </div>

        {/* Other locations */}
        {otherLocations.length > 0 && (
          <div className="py-5 border-b
            border-gray-100">
            <h2 className="text-sm font-semibold
              text-black mb-3">
              Other Locations
            </h2>
            <div className="space-y-2">
              {otherLocations.map((loc: any) => (
                <Link
                  key={loc.id}
                  href={`/${loc.slug || loc.id}`}
                  className="block border
                    border-gray-100 rounded-xl p-3
                    hover:border-gray-200 transition"
                >
                  <p className="text-sm font-medium
                    text-black">
                    {loc.location_nickname || loc.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {loc.neighborhood || loc.city}
                    {loc.street_1 && loc.street_2
                      ? ` · ${loc.street_1} & ${loc.street_2}`
                      : ""
                    }
                  </p>
                  {loc.avg_rating > 0 && (
                    <p className="text-xs text-gray-400">
                      ★{" "}
                      {Number(loc.avg_rating).toFixed(1)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="py-5">
          <div className="flex items-center
            justify-between mb-4">
            <h2 className="text-sm font-semibold
              text-black">
              Reviews
              {business.review_count > 0 && (
                <span className="text-gray-400
                  font-normal ml-1">
                  ({business.review_count})
                </span>
              )}
            </h2>
            <Link
              href={`/${slug}/review`}
              className="text-xs text-black underline"
            >
              Write a review
            </Link>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">
                No reviews yet
              </p>
              <p className="text-xs text-gray-300
                mt-1">
                Be the first to review
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {reviews.map((review: any) => (
                <div
                  key={review.id}
                  className="border-b border-gray-100
                    pb-5 last:border-0"
                >
                  <div className="flex items-center
                    justify-between mb-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(star => (
                        <span
                          key={star}
                          className={`text-sm
                            ${star <= review.stars
                              ? "text-black"
                              : "text-gray-200"
                            }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(review.created_at)
                        .toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      {review.is_edited && " (edited)"}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700
                    leading-relaxed">
                    {review.review_text}
                  </p>

                  {review.helpful_count > 0 && (
                    <p className="text-xs text-gray-400
                      mt-2">
                      👍 {review.helpful_count} found
                      this helpful
                    </p>
                  )}

                  <OwnerResponse
                    reviewId={review.id}
                    businessSlug={slug}
                    existingResponse={
                      review.response_text || undefined
                    }
                    isOwner={isOwner}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function AmenityGroup({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item: string) => (
          <span
            key={item}
            className="text-xs bg-gray-100
              text-gray-700 px-3 py-1 rounded-full"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function SocialLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs border border-gray-200
        rounded-full px-3 py-1.5 text-black
        hover:bg-gray-50 transition"
    >
      {label}
    </a>
  );
}