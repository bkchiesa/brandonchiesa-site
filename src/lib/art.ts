import type { RoomId } from "./site";
import { withBase } from "./site";

/**
 * Look v2 asset hooks. Swap Pixel→Ink finals onto these exact public/ paths.
 * Do not rename — components read only these filenames.
 */
export const ART = {
  intro: {
    coast: "art/intro_01_coast.png",
    piedmont: "art/intro_02_piedmont.png",
    blueridge: "art/intro_03_blueridge.png",
  },
  menuDesktop: "art/menu_doors_desktop.png",
  doors: {
    work: "art/door_work.png",
    make: "art/door_make.png",
    go: "art/door_go.png",
    roots: "art/door_roots.png",
    now: "art/door_now.png",
  } satisfies Record<RoomId, string>,
  icons: {
    work: "art/icon_work.png",
    make: "art/icon_make.png",
    go: "art/icon_go.png",
    roots: "art/icon_roots.png",
    now: "art/icon_now.png",
  } satisfies Record<RoomId, string>,
  heroes: {
    work: "art/room_hero_work.png",
    make: "art/room_hero_make.png",
    go: "art/room_hero_go.png",
  } satisfies Partial<Record<RoomId, string>>,
} as const;

/** Pixel QA HOLD — names only. Do not import these into components. */
export const ART_HOLD_NAMES = ["menu_doors_mobile.png", "room_hero_roots.png"] as const;

export function artUrl(rel: string): string {
  return withBase(rel);
}
