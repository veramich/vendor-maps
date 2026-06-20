-- Records whether the submitter said "this is my business" (vs adding
-- someone else's) on the first step of the add-business form.
--
-- When true: the submitter could add a logo and the claiming process is
-- auto-started at submit (claim_status set to 'pending' and, if they were
-- signed in, a row inserted into claims). When false: it's a community
-- submission of someone else's business, left 'unclaimed' for the real owner
-- to claim later. Defaults to false to match existing rows.
ALTER TABLE businesses
  ADD COLUMN submitted_as_owner BOOLEAN NOT NULL DEFAULT false;
