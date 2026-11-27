import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ABOUT_DESCRIPTION, ABOUT_OPENER, ABOUT_PARAGRAPHS, ABOUT_TITLE, ABOUT_VIEWS } from "../data/about";
import {
  BANKING_INTRO,
  BREAK_EVEN_DESCRIPTION,
  DISCLAIMER_PAGE_DESCRIPTION,
  DSCR_DESCRIPTION,
  LOAN_DESCRIPTION,
  PFS_DESCRIPTION,
  SBA_DESCRIPTION,
  SBA_GUIDE_DESCRIPTION,
  TEMPLATES_PAGE_DESCRIPTION,
} from "../data/banking/copy";
import { AREA_SERVED, PERSON_ID, WEBSITE_ID, personJsonLd, websiteJsonLd } from "./seo";
import { SITE_BIO_LEAD, SITE_NAME, SITE_TAGLINE, rooms } from "./site";

const DASH = /[\u2013\u2014]/;

const SCHEMA_TYPES = new Set([
  "Person",
  "Organization",
  "CollegeOrUniversity",
  "Place",
  "WebSite",
  "WebPage",
  "WebApplication",
  "CollectionPage",
  "BreadcrumbList",
  "ItemList",
  "ListItem",
  "Offer",
]);

function titled(title: string): string {
  return `${title} \u2014 ${SITE_NAME}`;
}

function walkTypes(value: unknown, found: string[]): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => walkTypes(item, found));
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record["@type"] === "string") found.push(record["@type"]);
  Object.values(record).forEach((item) => walkTypes(item, found));
}

describe("about copy", () => {
  it("opens with the service-area sentence and covers the public facts", () => {
    expect(ABOUT_OPENER).toBe(
      "Brandon Chiesa is a Vice President and Business Banker at First Citizens Bank, serving small businesses in Charlottesville, Albemarle, Fluvanna, Louisa, Greene, Nelson, Buckingham, Farmville, Prince Edward, and Cumberland.",
    );
    const bio = ABOUT_PARAGRAPHS.join(" ");
    expect(bio).toMatch(/over 20 years in banking/);
    expect(bio).toMatch(/BB&T/);
    expect(bio).toMatch(/Truist/);
    expect(bio).toMatch(/2008/);
    expect(bio).toMatch(/2021/);
    expect(bio).toMatch(/First Citizens Bank/);
    expect(bio).toMatch(/Hampden-Sydney College/);
    expect(bio).toMatch(/Community Investment Collaborative/);
    expect(bio).toMatch(/Loan Review Committee/);
    expect(bio).toMatch(/Charlottesville Angel Network/);
    expect(bio).toMatch(/Dolly Parton's Imagination Library of Fluvanna County/);
    expect(bio).toMatch(/Past President of the Fluvanna Ruritan Club/);
    expect(ABOUT_VIEWS).toBe("Views on this site are my own and not those of First Citizens Bank.");
  });

  it("has no em dashes or en dashes in new About copy", () => {
    const chunks = [ABOUT_OPENER, ABOUT_TITLE, ABOUT_DESCRIPTION, ABOUT_VIEWS, ...ABOUT_PARAGRAPHS];
    for (const chunk of chunks) expect(chunk).not.toMatch(DASH);
  });
});

describe("structured data", () => {
  it("uses one person id on the person and website graphs", () => {
    const person = personJsonLd();
    const website = websiteJsonLd();
    expect(person["@id"]).toBe(PERSON_ID);
    expect(person["@id"]).toBe("https://brandonchiesa.com/#brandon-chiesa");
    expect(website["@id"]).toBe(WEBSITE_ID);
    expect(website.publisher).toEqual({ "@id": PERSON_ID });
    expect(person.name).toBe("Brandon Chiesa");
    expect(person.url).toBe("https://brandonchiesa.com/");
    expect(person.jobTitle).toBe("Vice President and Business Banker");
    expect(person.worksFor).toEqual({ "@type": "Organization", name: "First Citizens Bank" });
    expect(person.alumniOf).toEqual({ "@type": "CollegeOrUniversity", name: "Hampden-Sydney College" });
    expect(person.sameAs).toEqual([
      "https://www.linkedin.com/in/bkchiesa",
      "https://x.com/bkchiesa",
    ]);
    expect(person.areaServed).toEqual(AREA_SERVED.map((name) => ({ "@type": "Place", name })));
  });

  it("parses as JSON and uses schema.org types", () => {
    for (const node of [personJsonLd(), websiteJsonLd()]) {
      const parsed = JSON.parse(JSON.stringify(node)) as Record<string, unknown>;
      expect(parsed["@context"]).toBe("https://schema.org");
      const types: string[] = [];
      walkTypes(parsed, types);
      expect(types.length).toBeGreaterThan(0);
      for (const type of types) expect(SCHEMA_TYPES.has(type)).toBe(true);
    }
  });
});

describe("page titles and descriptions", () => {
  it("gives every public page a unique title and description", () => {
    const titles = [
      `${SITE_NAME} \u2014 ${SITE_TAGLINE}`,
      titled("Career"),
      titled("Coding"),
      titled("Banking tools for business owners"),
      titled("Loan payment calculator"),
      titled("DSCR calculator"),
      titled("Break-even calculator"),
      titled("SBA quick-check"),
      titled("Templates and guides"),
      titled("SBA 7(a) and 504 prep guide"),
      titled("Personal financial statement walkthrough"),
      titled("Disclaimer"),
      titled("Videography"),
      titled("Contact"),
      titled("Lost in the woods"),
      ABOUT_TITLE,
    ];
    const descriptions = [
      SITE_BIO_LEAD,
      "Public bio of Brandon Chiesa: education, work, and community.",
      "Apps Brandon Chiesa builds: Sensei Moose’s Dojo, an anonymized Italy travel app, and more to come.",
      BANKING_INTRO,
      LOAN_DESCRIPTION,
      DSCR_DESCRIPTION,
      BREAK_EVEN_DESCRIPTION,
      SBA_DESCRIPTION,
      TEMPLATES_PAGE_DESCRIPTION,
      SBA_GUIDE_DESCRIPTION,
      PFS_DESCRIPTION,
      DISCLAIMER_PAGE_DESCRIPTION,
      "Films by Brandon Chiesa — church media, family travel, and journeys — from two YouTube channels.",
      "Reach Brandon Chiesa on X (@bkchiesa) and LinkedIn. A personal site, not affiliated with any employer.",
      "This room is not on the home plan.",
      ABOUT_DESCRIPTION,
    ];
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(titles).toHaveLength(descriptions.length);
  });

  it("keeps About out of the mist menu order", () => {
    expect(rooms.map((room) => room.name)).toEqual([
      "Career",
      "Coding",
      "Banking",
      "Videography",
      "Contact",
    ]);
  });
});

describe("robots.txt", () => {
  it("allows the named crawlers and points at sitemap.xml", () => {
    const robots = readFileSync(new URL("../../public/robots.txt", import.meta.url), "utf8");
    for (const agent of [
      "GPTBot",
      "ClaudeBot",
      "Claude-Web",
      "anthropic-ai",
      "Google-Extended",
      "PerplexityBot",
      "OAI-SearchBot",
      "ChatGPT-User",
      "Bingbot",
      "Googlebot",
    ]) {
      expect(robots).toContain(`User-agent: ${agent}`);
    }
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Sitemap: https://brandonchiesa.com/sitemap.xml");
    expect(robots).not.toMatch(/Disallow:/);
  });
});

describe("llms.txt", () => {
  it("leads with the About opener and links the About page", () => {
    const llms = readFileSync(new URL("../../public/llms.txt", import.meta.url), "utf8");
    expect(llms).toContain(ABOUT_OPENER);
    expect(llms).toContain("https://brandonchiesa.com/about/");
    expect(llms).toContain("https://brandonchiesa.com/sitemap.xml");
    const summary = llms.split("\n").slice(0, 8).join("\n");
    expect(summary).not.toMatch(DASH);
  });
});
