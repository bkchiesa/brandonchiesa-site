import { ABOUT_OPENER } from "../data/about";
import { LINKEDIN_URL, SITE_CANONICAL, SITE_NAME, X_URL } from "./site";

/** Stable id so home and /about/ describe the same person. */
export const PERSON_ID = "https://brandonchiesa.com/#brandon-chiesa";
export const WEBSITE_ID = "https://brandonchiesa.com/#website";

export const AREA_SERVED = [
  "Charlottesville VA",
  "Albemarle County VA",
  "Fluvanna County VA",
  "Louisa County VA",
  "Greene County VA",
  "Nelson County VA",
  "Buckingham County VA",
  "Farmville VA",
  "Prince Edward County VA",
  "Cumberland County VA",
] as const;

export function personJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: SITE_NAME,
    url: SITE_CANONICAL,
    jobTitle: "Vice President and Business Banker",
    worksFor: {
      "@type": "Organization",
      name: "First Citizens Bank",
    },
    areaServed: AREA_SERVED.map((name) => ({
      "@type": "Place",
      name,
    })),
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: "Hampden-Sydney College",
    },
    sameAs: [LINKEDIN_URL, X_URL],
    description: ABOUT_OPENER,
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_CANONICAL,
    description: ABOUT_OPENER,
    publisher: {
      "@id": PERSON_ID,
    },
  };
}
