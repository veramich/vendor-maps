"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";

interface Props {
  src: string;
  businessName: string;
}

export default function BannerImage({ src, businessName }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const photos = [{ cloudinary_url: src }];

  return (
    <>
      <button
        type="button"
        onClick={() => setActiveIndex(0)}
        aria-label={`View ${businessName} cover photo`}
        className="w-full h-56 bg-gray-100 overflow-hidden
          block cursor-pointer focus:outline-none"
      >
        <img
          src={src}
          alt={businessName}
          className="w-full h-full object-cover
            hover:opacity-95 transition-opacity"
        />
      </button>

      <Lightbox
        photos={photos}
        businessName={businessName}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
      />
    </>
  );
}
