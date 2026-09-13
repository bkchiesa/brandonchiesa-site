export const SITE_NAME = "Brandon Chiesa";
export const SITE_TAGLINE = "Builder. Explorer. Rooted in curiosity.";
export const SITE_DESCRIPTION =
  "Personal living-archive of Brandon Chiesa — rooms for work, making, travel films, family roots, and field notes. A personal site, not affiliated with First Citizens Bank.";
export const SITE_CANONICAL = "https://bkchiesa.github.io/brandonchiesa-site/";

export const DOJO_URL = "https://bkchiesa.github.io/Sensei-mooses-dojo/";

export const YOUTUBE_CHANNELS = [
  {
    handle: "@brandonchiesa3886",
    href: "https://www.youtube.com/@brandonchiesa3886",
  },
  {
    handle: "@chiesab",
    href: "https://www.youtube.com/@chiesab",
  },
] as const;

export type RoomId = "work" | "make" | "go" | "roots" | "now";

export interface Room {
  id: RoomId;
  letter: "A" | "B" | "C" | "D" | "E";
  name: string;
  blurb: string;
  path: string;
}

export const rooms: Room[] = [
  {
    id: "work",
    letter: "A",
    name: "Work",
    blurb: "Trust & community",
    path: "work/",
  },
  {
    id: "make",
    letter: "B",
    name: "Make",
    blurb: "Apps & builds",
    path: "make/",
  },
  {
    id: "go",
    letter: "C",
    name: "Go",
    blurb: "Travel films",
    path: "go/",
  },
  {
    id: "roots",
    letter: "D",
    name: "Roots",
    blurb: "Family tree",
    path: "roots/",
  },
  {
    id: "now",
    letter: "E",
    name: "Now",
    blurb: "Field notes",
    path: "now/",
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

export const BANK_DISCLAIMER =
  "This is a personal website. It is not affiliated with, and does not represent, First Citizens Bank.";
