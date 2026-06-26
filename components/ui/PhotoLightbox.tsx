"use client";

import { useState } from "react";
import Image from "next/image";
import { CLD } from "@/lib/utils/cldUrl";
import Lightbox, { type LightboxPhoto } from "./Lightbox";

interface Props {
  photos: LightboxPhoto[];
  businessName: string;
}

export default function PhotoLightbox({ photos, businessName }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Lightbox shows photos full-screen, so it gets the larger hero variant; the
  // grid thumbnails below are tiny, so they get the small thumb variant. Both
  // are Cloudinary-sized so the browser never downloads the raw master.
  const lightboxPhotos = photos.map((p) => ({
    ...p,
    cloudinary_url: CLD.hero(p.cloudinary_url),
  }));

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((img, i) => (
          <button
            key={img.id ?? i}
            onClick={() => setActiveIndex(i)}
            className="relative aspect-square rounded-xl
              overflow-hidden bg-gray-100 cursor-pointer
              focus:outline-none"
          >
            <Image
              src={CLD.square(img.cloudinary_url)}
              alt={businessName}
              fill
              sizes="(max-width: 640px) 33vw, 200px"
              className="object-cover
                hover:opacity-90 transition-opacity"
              unoptimized
            />
          </button>
        ))}
      </div>

      <Lightbox
        photos={lightboxPhotos}
        businessName={businessName}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
      />
    </>
  );
}
