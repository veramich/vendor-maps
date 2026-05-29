"use client";

import { useState, useEffect, useCallback } from "react";
import { Resource, deliveryModeLabel } from "@/lib/types/resource";

// "June 3, 2026"
function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day:   "numeric",
    year:  "numeric",
  });
}

const todayIso = () => new Date().toISOString().slice(0, 10);

function timeRangeLabel(r: Resource): string {
  if (r.alwaysAvailable || r.timingType === "always")
    return "Always available";

  const start = formatDate(r.startDate);
  const end = formatDate(r.endDate);

  if (r.timingType === "deadline") {
    return end ? `Apply by ${end}` : "";
  }

  if (r.timingType === "window") {
    if (!end) return start ? `Opens ${start}` : "";
    // Once the opening date has passed, it's open now.
    const open = !r.startDate || r.startDate <= todayIso();
    if (open) return `Open now · closes ${end}`;
    return start ? `Opens ${start} · closes ${end}` : `Closes ${end}`;
  }

  // range (and any legacy rows)
  if (start && end) return `${start} – ${end}`;
  if (end) return `Through ${end}`;
  return "";
}

// A small labelled row with an icon
function InfoRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-gray-600">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">
        {icon}
      </span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

// Compact icon + label chip used in the collapsed preview
function MetaChip({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500
      min-w-0">
      <span className="text-gray-400 flex-shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

const calendarIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const clockIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const modeIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);

const pinIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const phoneIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79
      0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79
      0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2
      1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0
      1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2
      2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0
      0 1 22 16.92z"/>
  </svg>
);

export default function ResourceCard({
  resource,
}: {
  resource: Resource;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const flyers = resource.flyers || [];

  const close = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, close]);

  const timeRange = timeRangeLabel(resource);
  const location = [resource.city, resource.stateCode]
    .filter(Boolean)
    .join(", ");
  const fullLocation = [
    resource.streetAddress,
    resource.city,
    resource.stateCode,
  ]
    .filter(Boolean)
    .join(", ");

  const hasActions =
    !!resource.signupUrl ||
    resource.websites.length > 0 ||
    resource.socialUrls.length > 0;

  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl
      overflow-hidden">

      <div className="p-4 space-y-3">

        {/* Header: type pill + title + date */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-block bg-black text-white text-xs
              font-medium px-2.5 py-1 rounded-full mb-1.5">
              {resource.resourceType}
            </span>
            <h2 className="text-base font-semibold text-black leading-snug
              break-words">
              {resource.title}
            </h2>
          </div>
          {timeRange && (
            <span className="flex items-center gap-1 text-xs text-gray-500
              whitespace-nowrap flex-shrink-0 mt-0.5">
              <span className="text-gray-400">{calendarIcon}</span>
              {timeRange}
            </span>
          )}
        </div>

        {/* One-line description preview */}
        {resource.description && (
          <p className="text-sm text-gray-600 truncate">
            {resource.description}
          </p>
        )}

        {/* Compact meta row: location + availability */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <MetaChip icon={modeIcon}>
            {deliveryModeLabel(resource.deliveryMode)}
          </MetaChip>
          {location && <MetaChip icon={pinIcon}>{location}</MetaChip>}
          {resource.availability && (
            <MetaChip icon={clockIcon}>{resource.availability}</MetaChip>
          )}
        </div>

        {/* Contact buttons */}
        {hasActions && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {resource.signupUrl && (
              <a
                href={resource.signupUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="bg-black text-white text-sm font-medium
                  px-3.5 py-1.5 rounded-lg hover:bg-gray-800 transition"
              >
                Sign up online
              </a>
            )}
            {resource.websites.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="border-2 border-gray-200 text-gray-700
                  text-sm font-medium px-3.5 py-1.5 rounded-lg
                  hover:border-gray-300 transition"
              >
                {resource.websites.length > 1
                  ? `Website ${i + 1}`
                  : "Website"}
              </a>
            ))}
            {resource.socialUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="border-2 border-gray-200 text-gray-700
                  text-sm font-medium px-3.5 py-1.5 rounded-lg
                  hover:border-gray-300 transition"
              >
                {resource.socialUrls.length > 1
                  ? `Social post ${i + 1}`
                  : "Social post"}
              </a>
            ))}
          </div>
        )}

        {/* Expanded detail */}
        {expanded && (
          <div className="space-y-4 pt-1">
            {/* Flyer(s) */}
            {flyers.length > 0 && (
              <div
                className={`grid gap-0.5 rounded-xl overflow-hidden ${
                  flyers.length > 1 ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {flyers.map((flyer, i) => (
                  <button
                    key={flyer.publicId || i}
                    onClick={() => setLightbox(i)}
                    className="aspect-[4/3] bg-gray-100 overflow-hidden
                      focus:outline-none"
                    aria-label={`View flyer ${i + 1}`}
                  >
                    <img
                      src={flyer.url}
                      alt={`${resource.title} flyer ${i + 1}`}
                      className="w-full h-full object-cover
                        hover:opacity-90 transition-opacity"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Full description */}
            {resource.description && (
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {resource.description}
              </p>
            )}

            {/* Key details */}
            <div className="space-y-2">
              {resource.walkInWelcome && (
                <InfoRow
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 4v6l5 2"/>
                      <circle cx="9" cy="4" r="1"/>
                      <path d="M9 7l-2 5 3 2v6"/>
                      <path d="M10 14l-3 6"/>
                    </svg>
                  }
                >
                  Walk-ins welcome
                </InfoRow>
              )}

              {fullLocation && (
                <InfoRow icon={pinIcon}>{fullLocation}</InfoRow>
              )}

              {resource.contacts.map((contact, i) => (
                <InfoRow key={i} icon={phoneIcon}>
                  {contact}
                </InfoRow>
              ))}
            </div>
          </div>
        )}

        {/* Expand / collapse toggle */}
        {(resource.description ||
          flyers.length > 0 ||
          resource.contacts.length > 0 ||
          resource.walkInWelcome ||
          fullLocation) && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium
              text-gray-500 hover:text-black transition"
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : "More details"}
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        )}
      </div>

      {/* Flyer lightbox */}
      {lightbox !== null && flyers[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center
            justify-center"
          onClick={close}
        >
          <button
            onClick={close}
            aria-label="Close"
            className="absolute top-4 right-4 text-white p-2
              rounded-full hover:bg-white/10 transition"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <img
            src={flyers[lightbox].url}
            alt={`${resource.title} flyer`}
            className="max-w-full max-h-full object-contain px-6"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
