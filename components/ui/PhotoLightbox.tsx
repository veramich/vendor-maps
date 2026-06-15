"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";

interface Props {
  photos: any[];
  businessName: string;
}

export default function PhotoLightbox({ photos, businessName }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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

      <Lightbox
        photos={photos}
        businessName={businessName}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
      />
    </>
  );
}
