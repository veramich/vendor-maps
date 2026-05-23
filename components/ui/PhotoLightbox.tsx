"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Props {
  photos: any[];
  businessName: string;
}

export default function PhotoLightbox({ photos, businessName }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const close = () => setActiveIndex(null);

  const prev = useCallback(() => {
    setActiveIndex(i =>
      i === null ? null : (i - 1 + photos.length) % photos.length
    );
  }, [photos.length]);

  const next = useCallback(() => {
    setActiveIndex(i =>
      i === null ? null : (i + 1) % photos.length
    );
  }, [photos.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeIndex, prev, next]);

  useEffect(() => {
    document.body.style.overflow =
      activeIndex !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [activeIndex]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
    touchStartX.current = null;
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setActiveIndex(i)}
            className="aspect-square rounded-xl
              overflow-hidden bg-gray-100 cursor-pointer
              focus:outline-none"
          >
            <img
              src={img.cloudinary_url}
              alt={businessName}
              className="w-full h-full object-cover
                hover:opacity-90 transition-opacity"
            />
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95
            flex items-center justify-center"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Counter */}
          <div className="absolute top-4 left-4
            text-white text-sm font-medium">
            {activeIndex + 1} / {photos.length}
          </div>

          {/* Close */}
          <button
            onClick={close}
            aria-label="Close"
            className="absolute top-4 right-4
              text-white p-2 rounded-full
              hover:bg-white/10 transition"
          >
            <svg width="24" height="24"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* Image */}
          <img
            src={photos[activeIndex].cloudinary_url}
            alt={businessName}
            className="max-w-full max-h-full
              object-contain px-12"
          />

          {/* Prev */}
          {photos.length > 1 && (
            <button
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2
                -translate-y-1/2 text-white p-3
                rounded-full hover:bg-white/10 transition"
            >
              <svg width="24" height="24"
                viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          )}

          {/* Next */}
          {photos.length > 1 && (
            <button
              onClick={next}
              aria-label="Next photo"
              className="absolute right-2 top-1/2
                -translate-y-1/2 text-white p-3
                rounded-full hover:bg-white/10 transition"
            >
              <svg width="24" height="24"
                viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          )}
        </div>
      )}
    </>
  );
}
