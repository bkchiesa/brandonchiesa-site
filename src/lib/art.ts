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
   * Leather (Pixel chrome PASS): prefer `leatherPadFlat` as the room-card
   * fill. `leatherPadVeil` sits behind the card. `leatherPad` (3D prop) is
   * available but not the default. `leatherPanel` is a texture-only fallback.
   * Blot anim: state folders under `art/v3/anim/{intro,passive,active}/`.
   * Ignore legacy `art/v3/anim/{door}/` mirrors.
   * Blot contact/sprites are still in revise (r3 liquid/rounded incoming) —
   * keep these filenames; do not treat current stills as final.
   * Menu: data-label-mode="in-blot" | "on-plate" | "under".
   */
  v3: {
    blots: {
      work: "art/v3/blot_work.png",
      make: "art/v3/blot_make.png",
      go: "art/v3/blot_go.png",
      roots: "art/v3/blot_roots.png",
      now: "art/v3/blot_now.png",
    } satisfies Record<RoomId, string>,
    /** Preferred card fill — flat leather texture panel (not the 3D pad). */
    leatherPadFlat: "art/v3/leather_pad_flat.png",
    /** Soft contrast plate behind the card. */
    leatherPadVeil: "art/v3/leather_pad_veil.png",
    /** 3D desk-pad prop. Available; do not use as the default card. */
    leatherPad: "art/v3/leather_pad.png",
    /** Texture-only fallback if the flat pad is missing. */
    leatherPanel: "art/v3/leather_panel.png",
    /**
     * Pixel/Ink drop folders (not served). Copy onto the public paths above.
     * menu → blot_*.png + anim/{intro,passive,active}/
     * cards → leather_pad_flat.png (+ veil)
     */
    finals: {
      menu: "finals/v3/menu/",
      cards: "finals/v3/cards/",
    },
  },
} as const;

const INTRO_IX = [0, 1, 2, 3, 4, 5] as const;
const PASSIVE_IX = [0, 1, 2, 3, 4, 5, 6, 7] as const;
const ACTIVE_IX = [0, 1, 2, 3, 4, 5] as const;

/** Canonical: `anim/intro/blot_{id}_intro_00..05.png` */
export function blotIntroFrames(id: RoomId): string[] {
  return INTRO_IX.map((i) => `art/v3/anim/intro/blot_${id}_intro_0${i}.png`);
}

/** Canonical: `anim/passive/blot_{id}_passive_00..07.png` */
export function blotPassiveFrames(id: RoomId): string[] {
  return PASSIVE_IX.map((i) => `art/v3/anim/passive/blot_${id}_passive_0${i}.png`);
}

/** Canonical: `anim/active/blot_{id}_active_00..05.png` */
export function blotActiveFrames(id: RoomId): string[] {
  return ACTIVE_IX.map((i) => `art/v3/anim/active/blot_${id}_active_0${i}.png`);
}

/** Canonical: `anim/active/blot_{id}_selected.png` */
export function blotSelectedStill(id: RoomId): string {
  return `art/v3/anim/active/blot_${id}_selected.png`;
}

export const VIDEO = {
  intro: "video/intro.mp4",
  loop: "video/loop.mp4",
  introPoster: "video/intro.jpg",
  loopPoster: "video/loop.jpg",
} as const;

export function artUrl(rel: string): string {
  return withBase(rel);
}
