-- Tracks whether a location's map pin came from a verified owner opting in to
-- show their exact address (022), rather than from cross streets given at
-- submit. Turning that toggle back off has to retract the pin — hiding the
-- address while leaving a marker on the owner's home would defeat the point —
-- but it must not clear coordinates the listing was submitted with.
--
-- Defaults to false so every existing row is treated as submit-derived and
-- keeps its pin.

ALTER TABLE locations
ADD COLUMN pin_from_exact_address BOOLEAN NOT NULL DEFAULT false;
