-- 017_triggers.sql

-- 1. Auto update updated_at timestamp
-- runs on every UPDATE across all tables

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brands_updated_at
BEFORE UPDATE ON brands
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER businesses_updated_at
BEFORE UPDATE ON businesses
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER locations_updated_at
BEFORE UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER market_schedules_updated_at
BEFORE UPDATE ON market_schedules
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER popup_events_updated_at
BEFORE UPDATE ON popup_events
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER vendor_spaces_updated_at
BEFORE UPDATE ON vendor_spaces
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER vendor_fees_updated_at
BEFORE UPDATE ON vendor_fees
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER review_responses_updated_at
BEFORE UPDATE ON review_responses
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER claims_updated_at
BEFORE UPDATE ON claims
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Auto update business rating
-- runs when a review is inserted or updated

CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE businesses SET
    avg_rating   = (
      SELECT COALESCE(AVG(stars), 0)::DECIMAL(2,1)
      FROM reviews
      WHERE business_id = NEW.business_id
      AND status = 'approved'
    ),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE business_id = NEW.business_id
      AND status = 'approved'
    )
  WHERE id = NEW.business_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_update_rating
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_business_rating();

-- 3. Auto update description search vector
-- runs when a business name, description
-- or category is inserted or updated

CREATE OR REPLACE FUNCTION update_description_search()
RETURNS TRIGGER AS $$
BEGIN
  NEW.description_search =
    setweight(
      to_tsvector('english',
        COALESCE(NEW.name, '')
      ), 'A'
    ) ||
    setweight(
      to_tsvector('english',
        COALESCE(NEW.category, '')
      ), 'B'
    ) ||
    setweight(
      to_tsvector('english',
        COALESCE(NEW.description, '')
      ), 'C'
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_search_update
BEFORE INSERT OR UPDATE ON businesses
FOR EACH ROW EXECUTE FUNCTION update_description_search();

-- 4. Auto set expires_at on businesses
-- when a popup_event is inserted
-- sets the business expires_at to match
-- the event end time

CREATE OR REPLACE FUNCTION sync_popup_expiry()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE businesses SET
    expires_at = upper(NEW.event_range)
  WHERE id = NEW.business_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER popup_sync_expiry
AFTER INSERT OR UPDATE ON popup_events
FOR EACH ROW EXECUTE FUNCTION sync_popup_expiry();

-- 5. Auto set claim resolved_at
-- when claim status changes to
-- approved or rejected

CREATE OR REPLACE FUNCTION update_claim_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected')
  AND OLD.status = 'pending' THEN
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER claims_resolved_at
BEFORE UPDATE ON claims
FOR EACH ROW EXECUTE FUNCTION update_claim_resolved_at();