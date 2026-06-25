-- 035_notification_types_claims_moderation.sql
-- Widen the notifications.type CHECK constraint to cover claim outcomes
-- and review/resource moderation, so those flows can emit in-app
-- notifications (and, via lib/notifications.ts, email) like submissions do.

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'submission_approved',
    'submission_rejected',
    'submission_duplicate',
    'claim_approved',
    'claim_rejected',
    'review_approved',
    'review_rejected',
    'resource_approved',
    'resource_rejected'
  ));
