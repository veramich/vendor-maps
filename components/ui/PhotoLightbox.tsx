"use client";

import { useState } from "react";
import Image from "next/image";
import Lightbox, { type LightboxPhoto } from "./Lightbox";

interface Props {
  photos: LightboxPhoto[];
  businessName: string;
}

export default function PhotoLightbox({ photos, businessName }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
              src={img.cloudinary_url}
              alt={businessName}
              fill
              sizes="(max-width: 640px) 33vw, 200px"
              className="object-cover
                hover:opacity-90 transition-opacity"
            />
          </button>
        ))}
      </div>

      <Lightbox
        photos={photos}
        businessName={businessName}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
      />
    </>
  );
}
