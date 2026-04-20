-- 016_indexes.sql

-- Businesses
CREATE INDEX businesses_type_idx
ON businesses(type);

CREATE INDEX businesses_sub_type_idx
ON businesses(sub_type);

CREATE INDEX businesses_status_idx
ON businesses(status);

CREATE INDEX businesses_brand_idx
ON businesses(brand_id);

CREATE INDEX businesses_claim_status_idx
ON businesses(claim_status);

CREATE INDEX businesses_price_tier_idx
ON businesses(price_tier);

-- Full text search
-- covers name, description, category together
CREATE INDEX businesses_search_idx
ON businesses
USING GIN (
  (
    COALESCE(name, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(category, '')
  )
  gin_trgm_ops
);

-- Amenities
-- allows fast array contains queries
CREATE INDEX businesses_payment_options_idx
ON businesses USING GIN(payment_options);

CREATE INDEX businesses_ordering_methods_idx
ON businesses USING GIN(ordering_methods);

CREATE INDEX businesses_dietary_options_idx
ON businesses USING GIN(dietary_options);

CREATE INDEX businesses_business_amenities_idx
ON businesses USING GIN(business_amenities);

-- Locations
-- most critical index in entire schema
-- powers all map and proximity queries
CREATE INDEX locations_coordinates_idx
ON locations USING GIST(coordinates);

CREATE INDEX locations_business_idx
ON locations(business_id);

CREATE INDEX locations_city_state_idx
ON locations(city, state);

CREATE INDEX locations_neighborhood_idx
ON locations(neighborhood);

CREATE INDEX locations_active_area_idx
ON locations(is_active_area);

-- Business hours
CREATE INDEX business_hours_business_idx
ON business_hours(business_id);

CREATE INDEX business_hours_day_idx
ON business_hours(day_of_week);

-- Market schedules
CREATE INDEX market_schedules_business_idx
ON market_schedules(business_id);

CREATE INDEX market_schedules_day_idx
ON market_schedules(day_of_week);

-- Popup events
-- already has GIST index from 007
-- add business lookup index
CREATE INDEX popup_events_business_idx
ON popup_events(business_id);

CREATE INDEX popup_events_parent_market_idx
ON popup_events(parent_market_id);

-- Business images
CREATE INDEX business_images_business_idx
ON business_images(business_id);

CREATE INDEX business_images_primary_idx
ON business_images(business_id, is_primary);

-- Vendor spaces
CREATE INDEX vendor_spaces_business_idx
ON vendor_spaces(business_id);

CREATE INDEX vendor_spaces_available_idx
ON vendor_spaces(vendor_space_available);

-- Vendor fees
CREATE INDEX vendor_fees_business_idx
ON vendor_fees(business_id);

-- Reviews
CREATE INDEX reviews_business_idx
ON reviews(business_id);

CREATE INDEX reviews_user_idx
ON reviews(user_id);

CREATE INDEX reviews_status_idx
ON reviews(status);

CREATE INDEX reviews_stars_idx
ON reviews(stars);

-- Review responses
CREATE INDEX review_responses_review_idx
ON review_responses(review_id);

CREATE INDEX review_responses_owner_idx
ON review_responses(owner_id);

-- Saved businesses
CREATE INDEX saved_businesses_user_idx
ON saved_businesses(user_id);

CREATE INDEX saved_businesses_business_idx
ON saved_businesses(business_id);

CREATE INDEX saved_businesses_collection_idx
ON saved_businesses(user_id, collection);

-- Claims
CREATE INDEX claims_business_idx
ON claims(business_id);

CREATE INDEX claims_user_idx
ON claims(user_id);

CREATE INDEX claims_status_idx
ON claims(status);

-- Listing views
CREATE INDEX listing_views_business_idx
ON listing_views(business_id);

CREATE INDEX listing_views_user_idx
ON listing_views(user_id);

CREATE INDEX listing_views_viewed_at_idx
ON listing_views(viewed_at);

CREATE INDEX listing_views_source_idx
ON listing_views(source);