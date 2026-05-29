// Community resources for vendors and home based
// businesses. Posted by anyone, moderated before
// going live, and auto hidden once expired.

export type ResourceFlyer = {
  url:      string;
  publicId: string;
};

// How a resource is delivered / attended.
export type DeliveryMode = "online" | "in_person" | "both";

export const DELIVERY_MODES: { value: DeliveryMode; label: string }[] = [
  { value: "online",    label: "Online" },
  { value: "in_person", label: "In person" },
  { value: "both",      label: "Online & in person" },
];

export function deliveryModeLabel(mode: string): string {
  return (
    DELIVERY_MODES.find((m) => m.value === mode)?.label ?? "Online & in person"
  );
}

// What shape the resource's dates take.
//   deadline — a single last day (e.g. grant apply-by)
//   range    — runs across start..end (e.g. a 3-day seminar)
//   window   — applications open then close (start..end)
//   always   — no dates, always available
export type TimingType = "deadline" | "range" | "window" | "always";

export const TIMING_TYPES: {
  value: TimingType;
  label: string;
  hint: string;
}[] = [
  {
    value: "deadline",
    label: "Deadline to apply",
    hint: "A single last day to apply or sign up",
  },
  {
    value: "range",
    label: "Runs on set dates",
    hint: "Happens across a span of days, like a seminar",
  },
  {
    value: "window",
    label: "Application window",
    hint: "Applications open on one date and close on another",
  },
  {
    value: "always",
    label: "Always available",
    hint: "No specific dates",
  },
];

// Shape returned to public listing / cards
export type Resource = {
  id:              string;
  resourceType:    string;
  title:           string;
  description:     string | null;
  deliveryMode:    DeliveryMode;
  timingType:      TimingType;
  alwaysAvailable: boolean;
  startDate:       string | null;  // ISO date (YYYY-MM-DD)
  endDate:         string | null;
  availability:    string;
  availabilityCutoff: string | null;
  signupUrl:       string | null;
  walkInWelcome:   boolean;
  contacts:        string[];
  websites:        string[];
  socialUrls:      string[];
  flyers:          ResourceFlyer[];

  // Optional location (powers city / state filtering)
  streetAddress:   string | null;
  city:            string | null;
  state:           string | null;
  stateCode:       string | null;

  status:          string;
  createdAt:       string;
};

// Shape the add-resource form builds and submits
export type ResourceFormData = {
  resourceType:    string;
  title:           string;
  description:     string;
  deliveryMode:    DeliveryMode;

  // Timing
  // timingType drives which date inputs show and how
  // they're labelled; alwaysAvailable / startDate /
  // endDate are the values actually stored.
  timingType:      TimingType;
  alwaysAvailable: boolean;
  startDate:       string;
  endDate:         string;

  // Availability
  availability:    string;
  // Legacy structured cut-off — folded into timingType
  // in the UI, kept so older data round-trips cleanly.
  hasCutoff:       boolean;
  availabilityCutoff: string;

  // Sign up online
  signupOnline:    boolean;  // drives whether signupUrl shows
  signupUrl:       string;

  // Walk in
  walkInWelcome:   boolean;

  // Location (optional)
  streetAddress:   string;
  city:            string;
  state:           string;
  stateCode:       string;
  latitude:        number | null;
  longitude:       number | null;

  // Contact / links — repeatable
  contacts:        string[];
  websites:        string[];
  socialUrls:      string[];

  // Flyers (client side files before upload)
  flyers:          File[];

  // Spam honeypot — must stay empty
  honeypot:        string;
};

export const INITIAL_RESOURCE_FORM: ResourceFormData = {
  resourceType:       "",
  title:              "",
  description:        "",
  deliveryMode:       "both",
  timingType:         "deadline",
  alwaysAvailable:    false,
  startDate:          "",
  endDate:            "",
  availability:       "",
  hasCutoff:          false,
  availabilityCutoff: "",
  signupOnline:       false,
  signupUrl:          "",
  walkInWelcome:      false,
  streetAddress:      "",
  city:               "",
  state:              "",
  stateCode:          "",
  latitude:           null,
  longitude:          null,
  contacts:           [""],
  websites:           [""],
  socialUrls:         [""],
  flyers:             [],
  honeypot:           "",
};

// Common resource types offered as quick picks.
// Posters can also type their own.
export const RESOURCE_TYPE_SUGGESTIONS = [
  "Available Grants",
  "Free Seminars",
  "Legal Help",
  "Permits & Licensing",
  "Business Classes",
  "Funding & Loans",
  "Health & Safety",
  "Networking Events",
  "Marketing Help",
  "Other",
];

export const MAX_FLYERS = 2;
export const MAX_CONTACTS = 5;
export const MAX_WEBSITES = 5;
export const MAX_SOCIAL_LINKS = 5;

// US states for the address state dropdown
export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];
