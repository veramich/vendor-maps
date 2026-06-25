"use client";

import { useState } from "react";
import Image from "next/image";
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
        className="relative w-full h-56 bg-gray-100 overflow-hidden
          block cursor-pointer focus:outline-none"
      >
        <Image
          src={src}
          alt={businessName}
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover
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
