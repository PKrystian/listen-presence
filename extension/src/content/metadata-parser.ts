import type { TrackSnapshot } from '../shared/protocol';
import { normalizeImageUrl, normalizeTrackUrl, trimText } from '../shared/validation';

export type MediaSessionMetadataLike = {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  artwork?: Array<{ src?: string | null }> | null;
};

type MediaElementLike = {
  currentTime: number;
  duration: number;
  paused: boolean;
  ended: boolean;
};

const text = (root: ParentNode, selectors: string[]): string => {
  for (const selector of selectors) {
    const value = root.querySelector(selector)?.textContent;
    if (value?.trim()) {
      return trimText(value);
    }
  }
  return '';
};

const attribute = (root: ParentNode, selectors: string[], name: string): string => {
  for (const selector of selectors) {
    const value = root.querySelector(selector)?.getAttribute(name);
    if (value?.trim()) {
      return value.trim();
    }
  }
  return '';
};

const splitByline = (value: string): { artist: string; album: string } => {
  const parts = value
    .split(/\s*[•·|]\s*/)
    .map((part) => trimText(part))
    .filter(Boolean);
  return {
    artist: parts[0] ?? '',
    album: parts[1] ?? '',
  };
};

const getTrackUrl = (document: Document, locationHref: string): string => {
  const href = attribute(
    document,
    [
      'ytmusic-player-bar a[href*="/watch"]',
      'ytmusic-player-bar a[href*="watch?v="]',
      'ytmusic-player-bar .title a',
    ],
    'href',
  );
  const candidate = href || locationHref;
  try {
    const url = new URL(candidate, locationHref);
    return normalizeTrackUrl(url.toString()) || normalizeTrackUrl(locationHref);
  } catch {
    return '';
  }
};

const getImageUrl = (
  document: Document,
  mediaSessionMetadata?: MediaSessionMetadataLike,
): string => {
  const image =
    attribute(
      document,
      [
        'ytmusic-player-bar img',
        '#song-image img',
        'ytmusic-player-bar [style*="background-image"]',
      ],
      'src',
    ) ||
    mediaSessionMetadata?.artwork?.[0]?.src ||
    '';
  return normalizeImageUrl(image);
};

const getMedia = (document: Document): MediaElementLike | undefined => {
  const media = document.querySelector('video, audio');
  if (!media) {
    return undefined;
  }
  return media as unknown as MediaElementLike;
};

export const readMediaSessionMetadata = (
  mediaSession?: MediaSession | null,
): MediaSessionMetadataLike | undefined => {
  const metadata = mediaSession?.metadata;
  if (!metadata) {
    return undefined;
  }
  return {
    title: metadata.title,
    artist: metadata.artist,
    album: metadata.album,
    artwork: metadata.artwork?.map((item) => ({ src: item.src })),
  };
};

export const extractTrackSnapshot = (
  document: Document,
  locationHref: string,
  mediaSessionMetadata?: MediaSessionMetadataLike,
  playbackState?: MediaSession['playbackState'],
): TrackSnapshot | null => {
  const media = getMedia(document);
  const title = trimText(
    text(document, [
      'ytmusic-player-bar .title',
      '.title.ytmusic-player-bar',
      '#player-bar-title',
    ]) ||
      mediaSessionMetadata?.title ||
      '',
  );
  if (!title) {
    return null;
  }

  const byline = text(document, ['ytmusic-player-bar .byline', 'ytmusic-player-bar .subtitle']);
  const bylineParts = splitByline(byline);
  const artist = trimText(
    text(document, ['ytmusic-player-bar .byline a:first-child', '[data-testid="player-artist"]']) ||
      bylineParts.artist ||
      mediaSessionMetadata?.artist ||
      '',
  );
  const album = trimText(
    text(document, ['ytmusic-player-bar .byline a:last-child', '[data-testid="player-album"]']) ||
      bylineParts.album ||
      mediaSessionMetadata?.album ||
      '',
  );
  const trackUrl = getTrackUrl(document, locationHref);
  const imageUrl = getImageUrl(document, mediaSessionMetadata);

  const position = media?.currentTime ?? 0;
  const duration = media?.duration ?? 0;
  const isPlaying = media ? !media.paused && !media.ended : playbackState === 'playing';
  const trackId = (() => {
    try {
      return new URL(trackUrl || locationHref).searchParams.get('v') ?? '';
    } catch {
      return '';
    }
  })();

  return {
    title,
    artist,
    album,
    imageUrl,
    trackUrl,
    trackId,
    isPlaying,
    position: Number.isFinite(position) ? Math.max(position, 0) : 0,
    duration: Number.isFinite(duration) ? Math.max(duration, 0) : 0,
  };
};
