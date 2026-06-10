-- 033_notifications.sql
-- In-app notifications for logged-in users.
--
-- Design notes:
--   * Trigger logic (what creates a notification) is kept separate
--     from delivery (web push, native push later). This table is the
--     shared data model both consume, so the "app vs web" question
--     never requires schema changes.
--   * user_id is a Better Auth user id (TEXT), same as other
--     user-scoped tables (saved_businesses, etc.).
--   * type drives how the client renders the row + which icon/link.
--   * data holds type-specific payload (business_id, slug, etc.) so
--     we never need a new column per notification kind.

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient (Better Auth user id)
  user_id     TEXT NOT NULL,

  -- What kind of notification this is. Drives icon, copy, and link.
  type        TEXT NOT NULL
    CHECK (type IN (
      'submission_approved',
      'submission_rejected',
      'submission_duplicate'
    )),

  -- Human-readable copy shown in the notification center.
  title       TEXT NOT NULL,
  body        TEXT,

  -- Where clicking the notification should take the user.
  link        TEXT,

  -- Type-specific payload (business_id, slug, etc.).
  -- Lets us add new notification types without new columns.
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- NULL until the user reads it.
  read_at     TIMESTAMP,

  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- List a user's notifications, newest first.
CREATE INDEX notifications_user_created_idx
  ON notifications(user_id, created_at DESC);

-- Fast unread-count / unread-badge lookups.
CREATE INDEX notifications_user_unread_idx
  ON notifications(user_id)
  WHERE read_at IS NULL;
