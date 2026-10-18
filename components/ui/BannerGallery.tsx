"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { CLD } from "@/lib/utils/cldUrl";
import Lightbox, { type LightboxPhoto } from "./Lightbox";

interface Props {
  photos: LightboxPhoto[];
  businessName: string;
}

// The cover banner doubles as the listing's photo gallery: a full-width
// scroll-snap strip the visitor swipes through, where tapping any slide opens
// the Lightbox at that photo. Native scrolling does the swiping (momentum,
// snapping, trackpad gestures), so there's no touch math here; mouse users
// get prev/next arrows on hover instead.
export default function BannerGallery({ photos, businessName }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  // Slide currently showing in the banner.
  const [current, setCurrent] = useState(0);
  // Photo open in the Lightbox, or null when closed.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const multiple = photos.length > 1;

  // The banner is a 4:3 frame (the native shape of most phone photos, so
  // landscape shots show uncropped) capped at the page's max-w-lg content
  // column. Slides render at up to 512px wide and get the card variant; the
  // Lightbox blows photos up full-screen, so it gets the larger hero variant.
  // Both are Cloudinary-sized so we never ship the raw master to the browser.
  const lightboxPhotos = photos.map((p) => ({
    ...p,
    cloudinary_url: CLD.hero(p.cloudinary_url),
  }));

  const scrollToSlide = (
    i: number,
    behavior: ScrollBehavior = "smooth"
  ) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior });
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== current) setCurrent(i);
  };

  // Closing the Lightbox leaves the banner on whichever photo the visitor
  // navigated to there, so the two views stay in step.
  const setLightboxIndex = (i: number | null) => {
    if (i === null && activeIndex !== null) {
      scrollToSlide(activeIndex, "auto");
    }
    setActiveIndex(i);
  };

  return (
    <>
      <div
        role={multiple ? "region" : undefined}
        aria-roledescription={multiple ? "carousel" : undefined}
        aria-label={multiple ? `${businessName} photos` : undefined}
        className="group relative w-full max-w-lg mx-auto aspect-[4/3]
          bg-gray-100"
      >
        <div
          ref={trackRef}
          onScroll={multiple ? onScroll : undefined}
          className="flex h-full overflow-x-auto overflow-y-hidden
            snap-x snap-mandatory overscroll-x-contain
            [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((photo, i) => (
            <button
              key={photo.id ?? i}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={
                multiple
                  ? `View photo ${i + 1} of ${photos.length}`
                  : `View ${businessName} cover photo`
              }
              className="relative w-full h-full flex-shrink-0
                snap-center snap-always bg-gray-100 overflow-hidden
                block cursor-pointer focus:outline-none"
            >
              <Image
                src={CLD.card(photo.cloudinary_url)}
                alt={businessName}
                fill
                sizes="(max-width: 512px) 100vw, 512px"
                className="object-cover
                  hover:opacity-95 transition-opacity"
                unoptimized
              />
            </button>
          ))}
        </div>

        {multiple && (
          <>
            {/* Prev / next — only for mouse users; touch users swipe. */}
            {current > 0 && (
              <button
                type="button"
                onClick={() => scrollToSlide(current - 1)}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2
                  hidden pointer-fine:flex items-center justify-center
                  w-8 h-8 rounded-full bg-white/90 text-black shadow-sm
                  opacity-0 group-hover:opacity-100
                  focus-visible:opacity-100 transition-opacity"
              >
                <svg width="16" height="16"
                  viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
            )}
            {current < photos.length - 1 && (
              <button
                type="button"
                onClick={() => scrollToSlide(current + 1)}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2
                  hidden pointer-fine:flex items-center justify-center
                  w-8 h-8 rounded-full bg-white/90 text-black shadow-sm
                  opacity-0 group-hover:opacity-100
                  focus-visible:opacity-100 transition-opacity"
              >
                <svg width="16" height="16"
                  viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            )}

            {/* Position dots */}
            <div
              aria-hidden="true"
              className="absolute bottom-3 left-1/2 -translate-x-1/2
                flex items-center gap-1.5 rounded-full bg-black/30
                px-2 py-1.5 pointer-events-none"
            >
              {photos.map((photo, i) => (
                <span
                  key={photo.id ?? i}
                  className={`h-1.5 rounded-full transition-all
                    ${i === current
                      ? "w-4 bg-white"
                      : "w-1.5 bg-white/60"
                    }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Lightbox
        photos={lightboxPhotos}
        businessName={businessName}
        activeIndex={activeIndex}
        setActiveIndex={setLightboxIndex}
      />
    </>
  );
}
