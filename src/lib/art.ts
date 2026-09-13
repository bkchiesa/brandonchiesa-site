import type { RoomId } from "./site";
import { withBase } from "./site";

/**
 * Look v2 asset hooks. Swap finals onto these exact public/ paths.
 * Do not rename — components read only these filenames.
 */
export const ART = {
  intro: {
    coast: "art/intro_01_coast.png",
    /** Same pixels as coast — kept for older filename references. */
    newportNews: "art/intro_01_newport_news.png",
    piedmont: "art/intro_02_piedmont.png",
    blueridge: "art/intro_03_blueridge.png",
  },
  /** Locked desktop look reference / fallback. Interactive doors use `doors`. */
  menuDesktop: "art/menu_doors_desktop.png",
  /** Vertical door plate for narrow viewports. */
  menuMobile: "art/menu_doors_mobile.png",
  /** Five-up icon strip reference. Not used for click targets. */
  menuIconPlates: "art/menu_icon_plates.png",
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
    roots: "art/room_hero_roots.png",
  } satisfies Partial<Record<RoomId, string>>,
  /**
   * Look v3 video-shell chrome.
   * Blots: hold current contact until Pixel PASSes r3 (rounder / wetter) into
   * `finals/v3/menu/` → copy onto these exact public/ paths.
   * Leather: prefer `leatherPanel` (`leather_panel.png`) when present.
   * Do not use `leather_pad.png` or `leather_pad_flat.png` — rejected pad props.
   */
  v3: {
    blots: {
      work: "art/v3/blot_work.png",
      make: "art/v3/blot_make.png",
      go: "art/v3/blot_go.png",
      roots: "art/v3/blot_roots.png",
      now: "art/v3/blot_now.png",
    } satisfies Record<RoomId, string>,
    /** One-line swap: Pixel r3 flat leather texture fill. */
    leatherPanel: "art/v3/leather_panel.png",
  },
} as const;

export const VIDEO = {
  intro: "video/intro.mp4",
  loop: "video/loop.mp4",
  introPoster: "video/intro.jpg",
  loopPoster: "video/loop.jpg",
} as const;

export function artUrl(rel: string): string {
  return withBase(rel);
}
