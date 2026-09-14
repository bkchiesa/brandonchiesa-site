import inventory from "../data/youtube_inventory.json";

/** Guido inventory — swap `src/data/youtube_inventory.json` only; layout stays. */
export type ChannelHandle = (typeof inventory.channels)[number]["handle"];

export interface YoutubeChannel {
  handle: ChannelHandle;
  channelId: string;
  url: string;
  title: string;
}

export interface VideoItem {
  videoId: string;
  title: string;
  url: string;
  thumb: string;
  published: string;
  channelHandle: ChannelHandle;
}

export interface ChannelSection {
  channel: YoutubeChannel;
  videos: VideoItem[];
}

export const youtubeInventory = inventory as {
  channels: YoutubeChannel[];
  videos: VideoItem[];
};

export function hqThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function channelAnchor(handle: ChannelHandle): string {
  return handle.replace(/^@/, "");
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

/** House HUD date: `28 JUL 2026`. */
export function formatPublished(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${day} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function videoSections(): ChannelSection[] {
  return youtubeInventory.channels.map((channel) => ({
    channel,
    videos: youtubeInventory.videos
      .filter((video) => video.channelHandle === channel.handle)
      .slice()
      .sort((a, b) => Date.parse(b.published) - Date.parse(a.published)),
  }));
}
