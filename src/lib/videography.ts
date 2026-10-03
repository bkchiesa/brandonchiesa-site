import rawInventory from "../data/youtube_inventory.json";
import { YOUTUBE_CHANNELS } from "./site";

/**
 * Single inventory the Videography room reads.
 *
 * Site copy: `src/data/youtube_inventory.json`
 * Guido box (when dropped): `/workspace/brandon-site-art/finals/v3/videography/youtube_inventory.json`
 *
 * Hot-swap: overwrite the site JSON with Guido’s file. Same schema.
 * `videography.astro` does not change.
 *
 * Videos: title, url, thumb, channelHandle (alias `channel`), published, videoId (alias `id`).
 * Missing url/thumb are derived from videoId. Missing title becomes "Video".
 */

export type ChannelHandle = string;

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

interface RawChannel {
  handle?: string;
  channelId?: string;
  url?: string;
  title?: string;
}

interface RawVideo {
  videoId?: string;
  id?: string;
  title?: string;
  url?: string;
  thumb?: string;
  published?: string;
  channelHandle?: string;
  channel?: string;
}

interface RawInventory {
  channels?: RawChannel[];
  videos?: RawVideo[];
}

export function hqThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** Privacy-enhanced player. Cookies stay off until play. */
export function nocookieEmbed(videoId: string, autoplay = false): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
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

function knownChannel(handle: string): YoutubeChannel | undefined {
  const match = YOUTUBE_CHANNELS.find((channel) => channel.handle === handle);
  if (!match) return undefined;
  return {
    handle: match.handle,
    channelId: match.channelId,
    url: match.href,
    title: handle,
  };
}

export function parseInventory(raw: RawInventory): {
  channels: YoutubeChannel[];
  videos: VideoItem[];
} {
  const videos = (raw.videos ?? []).flatMap((item) => {
    const videoId = item.videoId || item.id;
    const channelHandle = item.channelHandle || item.channel;
    if (!videoId || !channelHandle) return [];
    return [
      {
        videoId,
        title: item.title?.trim() || "Video",
        url: item.url || `https://www.youtube.com/watch?v=${videoId}`,
        thumb: item.thumb || hqThumb(videoId),
        published: item.published || "",
        channelHandle,
      },
    ];
  });

  const fromFile = (raw.channels ?? [])
    .map((channel) => {
      const handle = channel.handle;
      if (!handle) return undefined;
      const known = knownChannel(handle);
      return {
        handle,
        channelId: channel.channelId || known?.channelId || "",
        url: channel.url || known?.url || `https://www.youtube.com/${handle}`,
        title: channel.title || known?.title || handle,
      } satisfies YoutubeChannel;
    })
    .filter((channel): channel is YoutubeChannel => Boolean(channel));

  const handles = fromFile.length
    ? fromFile.map((channel) => channel.handle)
    : [...new Set(videos.map((video) => video.channelHandle))];

  const channels = handles.map((handle) => {
    const listed = fromFile.find((channel) => channel.handle === handle);
    if (listed) return listed;
    return (
      knownChannel(handle) ?? {
        handle,
        channelId: "",
        url: `https://www.youtube.com/${handle}`,
        title: handle,
      }
    );
  });

  return { channels, videos };
}

export const youtubeInventory = parseInventory(rawInventory as RawInventory);

export function videoSections(): ChannelSection[] {
  return youtubeInventory.channels.map((channel) => ({
    channel,
    videos: youtubeInventory.videos
      .filter((video) => video.channelHandle === channel.handle)
      .slice()
      .sort((a, b) => Date.parse(b.published) - Date.parse(a.published)),
  }));
}
