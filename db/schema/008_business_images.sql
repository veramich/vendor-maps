CREATE TABLE business_images (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id)
                        ON DELETE CASCADE,

  -- Cloudinary fields
  cloudinary_public_id  TEXT NOT NULL,
  cloudinary_url        TEXT NOT NULL,
  blur_hash             TEXT,

  -- Image type
  image_type            TEXT NOT NULL DEFAULT 'gallery'
    CHECK (image_type IN ('gallery', 'flyer')),

  -- File info
  file_size_kb          INTEGER,

  -- Display
  display_order         INTEGER DEFAULT 0,
  is_primary            BOOLEAN DEFAULT false,

  created_at            TIMESTAMP DEFAULT NOW()
);