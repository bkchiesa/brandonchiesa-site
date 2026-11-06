import type { LetteredRoomId, RoomId } from "./site";
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
    career: "art/door_work.png",
    coding: "art/door_make.png",
    videography: "art/door_go.png",
  } satisfies Record<LetteredRoomId, string>,
  icons: {
    career: "art/icon_work.png",
    coding: "art/icon_make.png",
    videography: "art/icon_go.png",
  } satisfies Record<LetteredRoomId, string>,
  heroes: {
    career: "art/room_hero_work.png",
    coding: "art/room_hero_make.png",
    videography: "art/room_hero_go.png",
  } satisfies Partial<Record<RoomId, string>>,
  /**
   * Look v3 video-shell chrome.
   * Leather: `leatherPanel` only (`leather_panel.png`, 1600×900 cognac/espresso).
   * Brandon rejected the `leather_pad*` family. Do not wire `leather_panel_mock`.
   * A half-step lighter lift can overwrite the same filename if Brandon asks.
   * Blot anim: state folders under `art/v3/anim/{intro,passive,active}/`.
   * Ignore legacy `art/v3/anim/{door}/` mirrors.
   * Blot stills/anims stay on disk, unwired. Live menu is HTML mist labels
   * (PT Serif; see `public/art/v3/menu/MIST_MENU_SPECS.md`).
   */
  v3: {
    blots: {
      work: "art/v3/blot_work.png",
      make: "art/v3/blot_make.png",
      go: "art/v3/blot_go.png",
      roots: "art/v3/blot_roots.png",
      now: "art/v3/blot_now.png",
    },
    /** Room-card fill — Pixel PASS 1600×900 cognac/espresso. Same path for later lifts. */
    leatherPanel: "art/v3/leather_panel.png",
    /** Pixel PASS worn-brass underline strip (192×10). */
    mistUnderlineBrass: "art/v3/menu/mist_underline_brass.png",
    /** Optional repeat-x grain if the strip needs tiling. */
    mistUnderlineBrassTile: "art/v3/menu/mist_underline_brass_tile.png",
    /** Career interior brass rule (1200×6). Do not bake body copy into PNGs. */
    careerBrassRule: "art/v3/career/brass_rule.png",
    careerBrassRuleTile: "art/v3/career/brass_rule_tile.png",
    /** Coding feature stills. Pixel drop; do not invent art. */
    coding: {
      /** Feature 1 — Sensei Moose’s Dojo action still (Pixel PASS, 1600×900). */
      dojoActionStill: "art/v3/coding/dojo_action_still.png",
      /** Optional mobile crop; unwired. Pixel PASS 1080×1080. */
      dojoActionStillSquare: "art/v3/coding/dojo_action_still_square.png",
      /** Feature 2 — Brandon LOCK mockup (not a live Pages screenshot). */
      italyAppCard: "art/v3/coding/italy_app_card.jpeg",
    },
    /**
     * Pixel/Ink drop folders (not served). Copy onto the public paths above.
     * menu → blot_*.png + anim/{intro,passive,active}/
     * cards → leather_panel.png
     */
    finals: {
      menu: "finals/v3/menu/",
      cards: "finals/v3/cards/",
    },
  },
} as const;

/** Filename ids for unwired blot packs (not live room slugs). */
export type BlotId = "work" | "make" | "go" | "roots" | "now";

const INTRO_IX = [0, 1, 2, 3, 4, 5] as const;
const PASSIVE_IX = [0, 1, 2, 3, 4, 5, 6, 7] as const;
const ACTIVE_IX = [0, 1, 2, 3, 4, 5] as const;

/** Canonical: `anim/intro/blot_{id}_intro_00..05.png` */
export function blotIntroFrames(id: BlotId): string[] {
  return INTRO_IX.map((i) => `art/v3/anim/intro/blot_${id}_intro_0${i}.png`);
}

/** Canonical: `anim/passive/blot_{id}_passive_00..07.png` */
export function blotPassiveFrames(id: BlotId): string[] {
  return PASSIVE_IX.map((i) => `art/v3/anim/passive/blot_${id}_passive_0${i}.png`);
}

/** Canonical: `anim/active/blot_{id}_active_00..05.png` */
export function blotActiveFrames(id: BlotId): string[] {
  return ACTIVE_IX.map((i) => `art/v3/anim/active/blot_${id}_active_0${i}.png`);
}

/** Canonical: `anim/active/blot_{id}_selected.png` */
export function blotSelectedStill(id: BlotId): string {
  return `art/v3/anim/active/blot_${id}_selected.png`;
}

export const VIDEO = {
  loop: "video/loop.mp4",
  loopPoster: "video/loop.jpg",
} as const;

export function artUrl(rel: string): string {
  return withBase(rel);
}
