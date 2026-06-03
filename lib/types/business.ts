export type BusinessType =
  | "small_business"
  | "event";

export type BusinessSubType =
  | "permanent_location"
  | "no_location"
  | "market"
  | "pop_up";

export type DetailedSubType =
  | "street_vendor"
  | "food_truck"
  | "home_based"
  | "market_based"
  | "pop_up_based"
  | "other"
  | null;

export type BusinessCategory =
  | "Food"
  | "Coffee"
  | "Candy"
  | "Fresh Fruit"
  | "Beverages"
  | "Flowers"
  | "Desserts"
  | "Other"
  | "Personal Care"
  | "Wellness"
  | "Fitness"
  | "Event Services"
  | "Custom Designs"
  | "Handmade"
  | "Event"
  | "Merchandise"
  | "General Services"
  | "Apparel"
  | "Produce"
  | "Event Space"
  | "Collectables"
  | "Jewelry"
  | "Art";

export type PriceTier = 1 | 2 | 3 | 4;

// An already-uploaded photo, as returned by the edit GET endpoint.
export type ExistingImage = {
  id:  string;
  url: string;
};

export type BusinessHours = {
  dayOfWeek:      string;
  openTime:       string;
  closeTime:      string;
  closesNextDay:  boolean;
  isClosed:       boolean;
  hoursVary:      boolean;
  seasonStart:    string;
  seasonEnd:      string;
};

export type MarketSchedule = {
  dayOfWeek:      string;
  recurrenceType: string;
  anchorDate:     string;  // next/first occurrence the vendor picked
  startTime:      string;
  endTime:        string;
  closesNextDay:  boolean;
  isNightMarket:  boolean;
  seasonStart:    string;
  seasonEnd:      string;
};

export type PopUpEvent = {
  eventName:  string;
  startDate:  string;
  startTime:  string;
  endDate:    string;
  endTime:    string;
  closesNextDay: boolean;
  isNightMarket: boolean;
  notes:      string;
};

export type VendorSpace = {
  vendorSpaceAvailable: boolean;
  spaceSizes:           string[];
  vendorTypes:          string[];
  hasWaitlist:          boolean;
  hasHolds:             boolean;
  signupLink:           string;
  note:                 string;
};

export type VendorFee = {
  feeType:     string;
  amount:      number | null;
  isFree:      boolean;
  description: string;
};

export type BusinessFormData = {
  // Step 1 — top level type
  type:           BusinessType | null;

  // Step 2 — business type (small business: detailedSubType is the user's
  // direct choice; subType is derived at submit from noFixedLocation.
  // events: subType is "market" | "pop_up", detailedSubType stays null)
  subType:        BusinessSubType | null;
  detailedSubType: DetailedSubType;

  // Step 3 — location
  // when true the business is directory-only with no map marker; this is the
  // source of truth that derives subType (no_location vs permanent_location)
  noFixedLocation: boolean;
  // cross streets (all except market and pop_up)
  street1:        string;
  street2:        string;
  // full address (market and pop_up only)
  streetAddress:  string;
  // shared location fields
  city:           string;
  state:          string;
  stateCode:      string;
  zip:            string;
  neighborhood:   string;
  lat:            number | null;
  lng:            number | null;

  // Step 4 — business info
  name:           string;
  category:       BusinessCategory | null;
  description:    string;
  logoUrl:        string;

  // Event admission
  isFreeEntry:    boolean;
  admissionPrice: string;

  // Step 5 — details
  // pricing
  priceTier:          PriceTier | null;
  priceContext:       string;
  // amenities
  paymentOptions:     string[];
  orderingMethods:    string[];
  dietaryOptions:     string[];
  businessAmenities:  string[];
  locationAmenities:  string[];
  // hours (small business)
  hours:              BusinessHours[];
  hoursSubjectToChange:   boolean;
  // schedule (market)
  marketSchedules:    MarketSchedule[];
  // event (pop_up)
  popUpEvent:         PopUpEvent | null;
  // vendor space (market and pop_up only)
  vendorSpace:        VendorSpace | null;
  vendorFees:         VendorFee[];

  // Step 6 — media and contact
  // newly-added photos to upload
  images:    File[];
  // already-uploaded photos (edit flow only); empty in the add flow
  existingImages: ExistingImage[];
  // Authoritative gallery order as tokens — an existing image id, or
  // "new:<i>" for the i-th entry of `images`. The first token is the cover.
  // Empty until the user reorders; the form then defaults to existing-then-new.
  imageOrder: string[];
  videoUrl:  string;
  website:   string;
  instagram: string;
  facebook:  string;
  tiktok:    string;
  twitter:   string;
  youtube:   string;
  phone:     string;
  email:     string;

  // Chain tracking
  isChainLocation:  boolean;
  brandId:          string | null;
  locationNickname: string;

  // Server-side status (read-only, populated from API)
  status: string;
  // "unclaimed" | "pending" | "claimed" — gates owner-only features like
  // the logo upload. Read-only, populated from API.
  claim_status: string;
};

export const INITIAL_FORM_DATA: BusinessFormData = {
  type:             null,
  subType:          null,
  detailedSubType: null,
  noFixedLocation:  false,
  street1:          "",
  street2:          "",
  streetAddress:    "",
  city:             "",
  state:            "",
  stateCode:        "",
  zip:              "",
  neighborhood:     "",
  lat:              null,
  lng:              null,
  name:             "",
  category:         null,
  description:      "",
  logoUrl:          "",
  isFreeEntry:    true,
  admissionPrice: "",
  priceTier:        null,
  priceContext:     "",
  paymentOptions:   [],
  orderingMethods:  [],
  dietaryOptions:   [],
  businessAmenities: [],
  locationAmenities: [],
  hours:            [],
  hoursSubjectToChange: false,
  marketSchedules:  [],
  popUpEvent:       null,
  vendorSpace:      null,
  vendorFees:       [],
  images:           [],
  existingImages:   [],
  imageOrder:       [],
  videoUrl:         "",
  website:          "",
  instagram:        "",
  facebook:         "",
  tiktok:           "",
  twitter:          "",
  youtube:          "",
  phone:            "",
  email:            "",
  isChainLocation:  false,
  brandId:          null,
  locationNickname: "",
  status:           "",
  claim_status:     "",
};

// Price tier labels per business sub type
export const PRICE_CONTEXT: Record<string, string> = {
  street_vendor:      "per item",
  food_truck:         "per plate or item",
  home_based:         "per item or order",
  market_based:       "per item",
  pop_up_based:       "per item",
  other:              "per item",
  market:             "per item or entry",
  pop_up:             "per item or entry",
  permanent_location: "per item",
};

// Price tier display labels
export const PRICE_TIERS: {
  tier: PriceTier;
  label: string;
  description: string;
}[] = [
  { tier: 1, label: "$",    description: "Under $5"   },
  { tier: 2, label: "$$",   description: "$5 - $15"   },
  { tier: 3, label: "$$$",  description: "$15 - $30"  },
  { tier: 4, label: "$$$$", description: "Above $30"  },
];

// Days of week
export const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

// Amenity options
export const PAYMENT_OPTIONS = [
  "Cash",
  "Credit Card",
  "Debit Card",
  "Apple Pay",
  "Google Pay",
  "Venmo",
  "Zelle",
  "CashApp",
  "Tap to Pay"
];

export const ORDERING_METHODS = [
  "Walk Up",
  "Online Order",
  "Phone Order",
  "Text to Order",
  "Direct Message to Order",
  "App Order",
  "Advance Order",
  "Catering Request",
];

export const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten Free",
  "Halal",
  "Kosher",
  "Nut Free",
  "Dairy Free",
  "Organic",
];

export const LOCATION_AMENITIES = [
  "Parking Lot",
  "Street Parking",
  "ADA Accessible",
  "Outdoor Seating",
  "Restrooms Nearby",
  "Dog Friendly",
  "Covered Area",
];

export const BUSINESS_AMENITIES = [
  "Delivery",
  "Shipping",
  "Custom Orders",
  "Wholesale",
  "Gift Wrapping",
  "Loyalty Program",
  "Catering",
  "Bulk Orders",
];

// Vendor types for markets
export const VENDOR_TYPES = [
  "Apparel",
  "Art",
  "Beverages",
  "Candy",
  "Coffee",
  "Collectables",
  "Custom Designs",
  "Desserts",
  "Event",
  "Event Services",
  "Event Space",
  "Fitness",
  "Flowers",
  "Food",
  "Fresh Fruit",
  "General Services",
  "Handmade",
  "Jewelry",
  "Merchandise",
  "Personal Care",
  "Produce",
  "Wellness",
  "Other",
];

// Small-business sub types, with display labels (mirrors Step2bSubType).
// Event sub types (market / pop_up) are surfaced via the Events filter instead.
export const BUSINESS_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "street_vendor", label: "Street Vendor" },
  { value: "food_truck",    label: "Food Truck" },
  { value: "home_based",    label: "Home Based" },
  { value: "market_based",  label: "Market Based" },
  { value: "pop_up_based",  label: "Pop-Up Based" },
  { value: "other",         label: "Other" },
];

// Categories
export const CATEGORIES: BusinessCategory[] = [
  "Apparel",
  "Art",
  "Beverages",
  "Candy",
  "Coffee",
  "Collectables",
  "Custom Designs",
  "Desserts",
  "Event",
  "Event Services",
  "Event Space",
  "Fitness",
  "Flowers",
  "Food",
  "Fresh Fruit",
  "General Services",
  "Handmade",
  "Jewelry",
  "Merchandise",
  "Personal Care",
  "Produce",
  "Wellness",
  "Other",
];