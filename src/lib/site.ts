export const SITE_NAME = "Brandon Chiesa";
export const SITE_TAGLINE = "Banker. Builder. Explorer. Rooted in Curiosity.";
export const SITE_TAGLINE_LEAD = "Banker. Builder. Explorer.";
export const SITE_TAGLINE_ROOTED = "Rooted in Curiosity.";
export const SITE_DESCRIPTION =
  "Personal living-archive of Brandon Chiesa — rooms for career, coding, videography, and contact. A personal site, not affiliated with any employer.";
export const SITE_BIO_LEAD =
  "Brandon Chiesa is a business banker and Vice President for First Citizens Bank in the Charlottesville and Central Virginia markets.";
export const SITE_BIO = `${SITE_BIO_LEAD} He’s also a maker, an investor, and a community servant — a founding board member of Dolly Parton’s Imagination Library of Fluvanna County, a media director at his church, and a tech-focused venture investor with the Charlottesville Angel Network.`;
export const SITE_CANONICAL = "https://brandonchiesa.com/";

export const DOJO_URL = "https://bkchiesa.github.io/Sensei-mooses-dojo/";
export const ITALY_URL = "https://bkchiesa.github.io/Chiesa-italy-2026/";
export const LINKEDIN_URL = "https://www.linkedin.com/in/bkchiesa";
export const X_URL = "https://x.com/bkchiesa";
export const X_HANDLE = "@bkchiesa";

export const YOUTUBE_CHANNELS = [
  {
    handle: "@brandonchiesa3886",
    href: "https://www.youtube.com/@brandonchiesa3886",
    channelId: "UC0UMcc4XeZtjTkLwp0qdEMw",
  },
  {
    handle: "@chiesab",
    href: "https://www.youtube.com/@chiesab",
    channelId: "UC6xX6wSpdGnXZGPguF89Tsw",
  },
] as const;

export type RoomId = "career" | "coding" | "videography" | "contact";
export type LetteredRoomId = Exclude<RoomId, "contact">;

export interface Room {
  id: RoomId;
  letter?: "A" | "B" | "C";
  name: string;
  blurb: string;
  path: string;
}

export const rooms: Room[] = [
  {
    id: "career",
    letter: "A",
    name: "Career",
    blurb: "Trust & community",
    path: "career/",
  },
  {
    id: "coding",
    letter: "B",
    name: "Coding",
    blurb: "Apps & builds",
    path: "coding/",
  },
  {
    id: "videography",
    letter: "C",
    name: "Videography",
    blurb: "Travel films",
    path: "videography/",
  },
  {
    id: "contact",
    name: "Contact",
    blurb: "X and LinkedIn",
    path: "contact/",
  },
];

export function withBase(path = ""): string {
  const base = import.meta.env.BASE_URL;
  const normalized = path.replace(/^\//, "");
  if (!normalized) return base;
  if (normalized.includes(".") && !normalized.endsWith("/")) {
    return `${base}${normalized}`;
  }
  return `${base}${normalized}${normalized.endsWith("/") ? "" : "/"}`;
}

export const SITE_DISCLAIMER =
  "This is a personal site and is not affiliated with any employer.";
