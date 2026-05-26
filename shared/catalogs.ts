// Static catalogs used by the admin landing-page builder and consumer flow.
// Carriers are a *catalog* of names — they do not promise Hexure availability.
// Final carrier availability is validated when sandbox credentials are connected.

export type StateOption = {
  code: string;
  name: string;
  kind: "state" | "district" | "territory";
};

export const US_STATES: StateOption[] = [
  { code: "AL", name: "Alabama", kind: "state" },
  { code: "AK", name: "Alaska", kind: "state" },
  { code: "AZ", name: "Arizona", kind: "state" },
  { code: "AR", name: "Arkansas", kind: "state" },
  { code: "CA", name: "California", kind: "state" },
  { code: "CO", name: "Colorado", kind: "state" },
  { code: "CT", name: "Connecticut", kind: "state" },
  { code: "DE", name: "Delaware", kind: "state" },
  { code: "FL", name: "Florida", kind: "state" },
  { code: "GA", name: "Georgia", kind: "state" },
  { code: "HI", name: "Hawaii", kind: "state" },
  { code: "ID", name: "Idaho", kind: "state" },
  { code: "IL", name: "Illinois", kind: "state" },
  { code: "IN", name: "Indiana", kind: "state" },
  { code: "IA", name: "Iowa", kind: "state" },
  { code: "KS", name: "Kansas", kind: "state" },
  { code: "KY", name: "Kentucky", kind: "state" },
  { code: "LA", name: "Louisiana", kind: "state" },
  { code: "ME", name: "Maine", kind: "state" },
  { code: "MD", name: "Maryland", kind: "state" },
  { code: "MA", name: "Massachusetts", kind: "state" },
  { code: "MI", name: "Michigan", kind: "state" },
  { code: "MN", name: "Minnesota", kind: "state" },
  { code: "MS", name: "Mississippi", kind: "state" },
  { code: "MO", name: "Missouri", kind: "state" },
  { code: "MT", name: "Montana", kind: "state" },
  { code: "NE", name: "Nebraska", kind: "state" },
  { code: "NV", name: "Nevada", kind: "state" },
  { code: "NH", name: "New Hampshire", kind: "state" },
  { code: "NJ", name: "New Jersey", kind: "state" },
  { code: "NM", name: "New Mexico", kind: "state" },
  { code: "NY", name: "New York", kind: "state" },
  { code: "NC", name: "North Carolina", kind: "state" },
  { code: "ND", name: "North Dakota", kind: "state" },
  { code: "OH", name: "Ohio", kind: "state" },
  { code: "OK", name: "Oklahoma", kind: "state" },
  { code: "OR", name: "Oregon", kind: "state" },
  { code: "PA", name: "Pennsylvania", kind: "state" },
  { code: "RI", name: "Rhode Island", kind: "state" },
  { code: "SC", name: "South Carolina", kind: "state" },
  { code: "SD", name: "South Dakota", kind: "state" },
  { code: "TN", name: "Tennessee", kind: "state" },
  { code: "TX", name: "Texas", kind: "state" },
  { code: "UT", name: "Utah", kind: "state" },
  { code: "VT", name: "Vermont", kind: "state" },
  { code: "VA", name: "Virginia", kind: "state" },
  { code: "WA", name: "Washington", kind: "state" },
  { code: "WV", name: "West Virginia", kind: "state" },
  { code: "WI", name: "Wisconsin", kind: "state" },
  { code: "WY", name: "Wyoming", kind: "state" },
  { code: "DC", name: "District of Columbia", kind: "district" },
  { code: "PR", name: "Puerto Rico", kind: "territory" },
  { code: "VI", name: "U.S. Virgin Islands", kind: "territory" },
  { code: "GU", name: "Guam", kind: "territory" },
  { code: "MP", name: "Northern Mariana Islands", kind: "territory" },
  { code: "AS", name: "American Samoa", kind: "territory" },
];

export type CarrierCatalogEntry = {
  // Canonical display name used as the storage key on landing pages today.
  name: string;
  // Short slug-like identifier we can later map to a Hexure carrier code.
  code: string;
  // Alternate names / parent companies; useful for matching against agent data.
  aliases?: string[];
  // AM Best rating where commonly published. Used as a placeholder default
  // in the mock quote generator — actual ratings should come from Hexure.
  amBestRating?: string;
};

// Comparative life-quoting carrier catalog. This is *not* a promise that
// every carrier here is wired up in Hexure — UI copy should make that clear.
export const CARRIER_CATALOG: CarrierCatalogEntry[] = [
  { name: "AIG / Corebridge Financial", code: "corebridge", aliases: ["AIG", "Corebridge", "American General"], amBestRating: "A" },
  { name: "Allianz Life", code: "allianz-life", aliases: ["Allianz"], amBestRating: "A+" },
  { name: "American Equity", code: "american-equity", aliases: ["American Equity Investment Life"], amBestRating: "A-" },
  { name: "American National", code: "american-national", aliases: ["ANICO", "American National Insurance Company"], amBestRating: "A" },
  { name: "Americo", code: "americo", amBestRating: "A" },
  { name: "Ameritas", code: "ameritas", amBestRating: "A" },
  { name: "Assurity", code: "assurity", aliases: ["Assurity Life"], amBestRating: "A-" },
  { name: "Athene", code: "athene", amBestRating: "A" },
  { name: "Banner Life / Legal & General America", code: "banner-life", aliases: ["Banner Life", "Legal & General America", "LGA", "William Penn"], amBestRating: "A+" },
  { name: "Brighthouse Financial", code: "brighthouse", aliases: ["Brighthouse"], amBestRating: "A" },
  { name: "Cincinnati Life", code: "cincinnati-life", aliases: ["Cincinnati Life Insurance Company"], amBestRating: "A+" },
  { name: "Columbus Life", code: "columbus-life", aliases: ["Columbus Life Insurance"], amBestRating: "A+" },
  { name: "Equitable", code: "equitable", aliases: ["Equitable Financial", "AXA"], amBestRating: "A+" },
  { name: "F&G", code: "fg", aliases: ["Fidelity & Guaranty Life", "FGL"], amBestRating: "A-" },
  { name: "Fidelity Life", code: "fidelity-life", aliases: ["Fidelity Life Association"], amBestRating: "A-" },
  { name: "Foresters Financial", code: "foresters", aliases: ["Foresters"], amBestRating: "A" },
  { name: "Gerber Life", code: "gerber-life", aliases: ["Gerber Life Insurance Company"], amBestRating: "A" },
  { name: "Global Atlantic", code: "global-atlantic", aliases: ["Global Atlantic Financial Group", "Forethought"], amBestRating: "A" },
  { name: "Great American Life", code: "great-american-life", aliases: ["Great American", "MassMutual Ascend"], amBestRating: "A+" },
  { name: "Guardian Life", code: "guardian", aliases: ["Guardian", "The Guardian Life Insurance Company"], amBestRating: "A++" },
  { name: "Illinois Mutual", code: "illinois-mutual", amBestRating: "A-" },
  { name: "John Hancock", code: "john-hancock", aliases: ["John Hancock Life"], amBestRating: "A+" },
  { name: "Lafayette Life", code: "lafayette-life", aliases: ["Lafayette Life Insurance Company"], amBestRating: "A+" },
  { name: "Lincoln Financial", code: "lincoln-financial", aliases: ["Lincoln", "Lincoln National", "Lincoln Benefit Life"], amBestRating: "A" },
  { name: "MassMutual", code: "massmutual", aliases: ["Mass Mutual", "Massachusetts Mutual Life Insurance Company", "MassMutual Ascend"], amBestRating: "A++" },
  { name: "Midland National", code: "midland-national", aliases: ["Midland National Life"], amBestRating: "A+" },
  { name: "Minnesota Life / Securian", code: "securian", aliases: ["Securian", "Securian Financial", "Minnesota Life"], amBestRating: "A+" },
  { name: "Mutual of Omaha", code: "mutual-of-omaha", aliases: ["Mutual of Omaha Insurance Company"], amBestRating: "A+" },
  { name: "National Life Group", code: "national-life-group", aliases: ["National Life", "Life Insurance Company of the Southwest", "LSW"], amBestRating: "A" },
  { name: "Nationwide", code: "nationwide", aliases: ["Nationwide Life"], amBestRating: "A" },
  { name: "New York Life", code: "new-york-life", aliases: ["NYLIC"], amBestRating: "A++" },
  { name: "North American", code: "north-american", aliases: ["North American Company for Life and Health"], amBestRating: "A+" },
  { name: "Northwestern Mutual", code: "northwestern-mutual", aliases: ["Northwestern"], amBestRating: "A++" },
  { name: "OneAmerica", code: "oneamerica", aliases: ["State Life", "American United Life", "AUL"], amBestRating: "A+" },
  { name: "Pacific Life", code: "pacific-life", aliases: ["Pacific Life Insurance Company"], amBestRating: "A+" },
  { name: "Penn Mutual", code: "penn-mutual", aliases: ["The Penn Mutual Life Insurance Company"], amBestRating: "A+" },
  { name: "Principal", code: "principal", aliases: ["Principal Financial Group", "Principal National Life"], amBestRating: "A+" },
  { name: "Protective", code: "protective", aliases: ["Protective Life", "West Coast Life"], amBestRating: "A+" },
  { name: "Prudential", code: "prudential", aliases: ["Prudential Financial", "PRUCO"], amBestRating: "A+" },
  { name: "Royal Neighbors of America", code: "royal-neighbors", amBestRating: "A-" },
  { name: "Sagicor", code: "sagicor", aliases: ["Sagicor Life Insurance Company"], amBestRating: "A-" },
  { name: "SBLI", code: "sbli", aliases: ["Savings Bank Life Insurance", "The Savings Bank Mutual Life Insurance Company"], amBestRating: "A" },
  { name: "Security Mutual", code: "security-mutual", aliases: ["Security Mutual Life Insurance Company of New York"], amBestRating: "A-" },
  { name: "State Farm", code: "state-farm", aliases: ["State Farm Life"], amBestRating: "A++" },
  { name: "Symetra", code: "symetra", aliases: ["Symetra Life Insurance Company"], amBestRating: "A" },
  { name: "Thrivent", code: "thrivent", aliases: ["Thrivent Financial"], amBestRating: "A++" },
  { name: "Transamerica", code: "transamerica", aliases: ["Transamerica Life Insurance Company"], amBestRating: "A" },
  { name: "TruStage", code: "trustage", aliases: ["CMFG Life", "CUNA Mutual"], amBestRating: "A" },
  { name: "United of Omaha", code: "united-of-omaha", aliases: ["United of Omaha Life Insurance Company"], amBestRating: "A+" },
  { name: "USAA Life", code: "usaa-life", aliases: ["USAA"], amBestRating: "A++" },
  { name: "Western & Southern", code: "western-southern", aliases: ["Western & Southern Financial Group", "Western and Southern"], amBestRating: "A+" },
  { name: "William Penn", code: "william-penn", aliases: ["William Penn Life Insurance Company of New York"], amBestRating: "A+" },
  { name: "Zurich North America", code: "zurich-na", aliases: ["Zurich"], amBestRating: "A+" },
];

// Lookup helpers for matching free-form carrier names back to a catalog entry.

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findCarrierEntry(name: string): CarrierCatalogEntry | undefined {
  const target = normalizeForMatch(name);
  for (const entry of CARRIER_CATALOG) {
    if (normalizeForMatch(entry.name) === target) return entry;
    if (normalizeForMatch(entry.code) === target) return entry;
    if (entry.aliases?.some((alias) => normalizeForMatch(alias) === target)) return entry;
  }
  return undefined;
}

export function findStateOption(value: string): StateOption | undefined {
  const target = value.trim().toLowerCase();
  if (!target) return undefined;
  return US_STATES.find((option) => option.code.toLowerCase() === target || option.name.toLowerCase() === target);
}
