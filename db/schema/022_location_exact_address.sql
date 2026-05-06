ALTER TABLE locations
ADD COLUMN show_exact_address BOOLEAN DEFAULT false;

ALTER TABLE locations
ADD COLUMN exact_address TEXT;