import type { TrackSnapshot } from '../shared/protocol';
import { normalizeImageUrl, normalizeTrackUrl, trimText } from '../shared/validation';

export type MediaSessionMetadataLike = {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  artwork?: Array<{ src?: string | null; sizes?: string | null | undefined }> | null;
};

type MediaElementLike = {
  currentTime: number;
  duration: number;
  paused: boolean;
  ended: boolean;
};

type PlaybackTime = {
  position: number;
  duration: number;
};

const playbackDurationMismatchSeconds = 2;
const playbackEndToleranceSeconds = 2;
const playbackPositionAgreementSeconds = 2;

const text = (root: ParentNode, selectors: string[]): string => {
  for (const selector of selectors) {
    const elements = Array.from(root.querySelectorAll(selector));
    const candidates = elements.filter((element) => !isHidden(element));
    for (const element of candidates.length > 0 ? candidates : elements) {
      const value = element.textContent;
      if (value?.trim()) {
        return trimText(value);
      }
    }
  }
  return '';
};

const attribute = (root: ParentNode, selectors: string[], name: string): string => {
  for (const selector of selectors) {
    const elements = Array.from(root.querySelectorAll(selector));
    const candidates = elements.filter((element) => !isHidden(element));
    for (const element of candidates.length > 0 ? candidates : elements) {
      const value = element.getAttribute(name);
      if (value?.trim()) {
        return value.trim();
      }
    }
  }
  return '';
};

const backgroundImage = (root: ParentNode, selectors: string[]): string => {
  for (const selector of selectors) {
    const elements = Array.from(root.querySelectorAll(selector));
    const candidates = elements.filter((element) => !isHidden(element));
    for (const element of candidates.length > 0 ? candidates : elements) {
      const style = element.getAttribute('style') ?? '';
      const match = style.match(/background-image\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/i);
      if (match?.[1]?.trim()) {
        return match[1].trim();
      }
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

const parseTime = (value: string): number | undefined => {
  const parts = value.trim().split(':').map(Number);
  if (
    parts.length < 2 ||
    parts.length > 3 ||
    parts.some((part) => !Number.isInteger(part) || part < 0)
  ) {
    return undefined;
  }
  const seconds = parts.at(-1) ?? 0;
  const minutes = parts.at(-2) ?? 0;
  const hours = parts.length === 3 ? (parts[0] ?? 0) : 0;
  if (seconds >= 60 || minutes >= 60) {
    return undefined;
  }
  return hours * 3600 + minutes * 60 + seconds;
};

const isHidden = (element: Element): boolean => {
  let current: Element | null = element;
  while (current) {
    if (current.hasAttribute('hidden') || current.getAttribute('aria-hidden') === 'true') {
      return true;
    }
    const style = current.ownerDocument.defaultView?.getComputedStyle(current);
    if (
      style &&
      (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')
    ) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
};

const parseDisplayedPlayback = (value: string): PlaybackTime | undefined => {
  const parts = value.trim().split(/\s*\/\s*/);
  if (parts.length !== 2) {
    return undefined;
  }
  const position = parseTime(parts[0] ?? '');
  const duration = parseTime(parts[1] ?? '');
  if (position === undefined || duration === undefined || duration <= 0 || position > duration) {
    return undefined;
  }
  return { position, duration };
};

const getDisplayedPlayback = (document: Document): PlaybackTime | undefined => {
  const selectors = [
    'ytmusic-player-bar .left-controls span.time-info.ytmusic-player-bar',
    'ytmusic-player-bar .time-info',
    'ytmusic-player-bar [class*="time-info"]',
  ];
  const elements = Array.from(
    new Set(selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)))),
  );
  const candidates = elements
    .map((element) => ({ element, playback: parseDisplayedPlayback(element.textContent ?? '') }))
    .filter((candidate): candidate is { element: Element; playback: PlaybackTime } =>
      Boolean(candidate.playback),
    )
    .filter((candidate) => !isHidden(candidate.element));
  const laidOut = candidates.filter(({ element }) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  for (const candidate of laidOut.length > 0 ? laidOut : candidates) {
    return candidate.playback;
  }
  return undefined;
};

const getMediaPlayback = (media: MediaElementLike | undefined): PlaybackTime | undefined => {
  if (
    !media ||
    !Number.isFinite(media.currentTime) ||
    media.currentTime < 0 ||
    !Number.isFinite(media.duration) ||
    media.duration <= 0 ||
    media.currentTime > media.duration + playbackDurationMismatchSeconds
  ) {
    return undefined;
  }
  return {
    position: media.currentTime,
    duration: media.duration,
  };
};

const choosePlayback = (
  mediaPlayback: PlaybackTime | undefined,
  displayedPlayback: PlaybackTime | undefined,
): PlaybackTime | undefined => {
  if (!mediaPlayback) {
    return displayedPlayback;
  }
  if (!displayedPlayback) {
    return mediaPlayback;
  }

  if (
    Math.abs(mediaPlayback.duration - displayedPlayback.duration) < playbackDurationMismatchSeconds
  ) {
    const displayedRemaining = displayedPlayback.duration - displayedPlayback.position;
    const mediaRemaining = mediaPlayback.duration - mediaPlayback.position;
    if (
      displayedRemaining <= playbackEndToleranceSeconds &&
      mediaRemaining > playbackEndToleranceSeconds
    ) {
      return mediaPlayback;
    }
    if (
      Math.abs(mediaPlayback.position - displayedPlayback.position) <=
      playbackPositionAgreementSeconds
    ) {
      return mediaPlayback;
    }
  }

  return displayedPlayback;
};

const getTrackUrl = (document: Document, locationHref: string): string => {
  const videoId = attribute(
    document,
    ['ytmusic-player-bar [data-video-id]', 'ytmusic-player-bar[data-video-id]'],
    'data-video-id',
  );
  const href = attribute(
    document,
    [
      'ytmusic-player-bar a[href*="/watch"]',
      'ytmusic-player-bar a[href*="watch?v="]',
      'ytmusic-player-bar .title a',
    ],
    'href',
  );
  const candidate = /^[A-Za-z0-9_-]{1,64}$/.test(videoId)
    ? `/watch?v=${encodeURIComponent(videoId)}`
    : href || locationHref;
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
  preferMediaSession = false,
): string => {
  const mediaSessionImage =
    mediaSessionMetadata?.artwork
      ?.filter((item) => item.src?.trim())
      .sort((left, right) => artworkWidth(right.sizes) - artworkWidth(left.sizes))[0]?.src ?? '';
  const documentImage =
    attribute(document, ['ytmusic-player-bar img', '#song-image img'], 'src') ||
    backgroundImage(document, [
      'ytmusic-player-bar [style*="background-image"]',
      '#song-image [style*="background-image"]',
    ]);
  const image = preferMediaSession
    ? mediaSessionImage || documentImage
    : documentImage || mediaSessionImage;
  return normalizeImageUrl(image);
};

const artworkWidth = (sizes?: string | null): number => {
  const width = Number.parseInt(sizes?.match(/^(\d+)x\d+$/)?.[1] ?? '', 10);
  return Number.isFinite(width) ? width : 0;
};

const getTrackId = (trackUrl: string, locationHref: string): string => {
  try {
    const trackId = new URL(trackUrl || locationHref).searchParams.get('v') ?? '';
    return /^[A-Za-z0-9_-]{1,64}$/.test(trackId) ? trackId : '';
  } catch {
    return '';
  }
};

const getStableThumbnailUrl = (trackId: string): string =>
  trackId ? `https://i.ytimg.com/vi/${encodeURIComponent(trackId)}/hqdefault.jpg` : '';

const getMedia = (document: Document): MediaElementLike | undefined => {
  const media = Array.from(
    document.querySelectorAll('video, audio'),
  ) as unknown as MediaElementLike[];
  if (media.length === 0) {
    return undefined;
  }
  return media.find((element) => !element.paused && !element.ended) ?? media[0];
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
    artwork: metadata.artwork?.map((item) => ({ src: item.src, sizes: item.sizes })),
  };
};

export const extractTrackSnapshot = (
  document: Document,
  locationHref: string,
  mediaSessionMetadata?: MediaSessionMetadataLike,
  playbackState?: MediaSession['playbackState'],
): TrackSnapshot | null => {
  const media = getMedia(document);
  const documentTitle = trimText(
    text(document, ['ytmusic-player-bar .title', '.title.ytmusic-player-bar', '#player-bar-title']),
  );
  const mediaSessionTitle = trimText(mediaSessionMetadata?.title ?? '');
  const title = documentTitle || mediaSessionTitle;
  if (!title) {
    return null;
  }

  const mediaSessionMatches =
    !documentTitle ||
    (!!mediaSessionTitle &&
      mediaSessionTitle.toLocaleLowerCase() === documentTitle.toLocaleLowerCase());

  const byline = text(document, ['ytmusic-player-bar .byline', 'ytmusic-player-bar .subtitle']);
  const bylineParts = splitByline(byline);
  const artist = trimText(
    text(document, ['ytmusic-player-bar .byline a:first-child', '[data-testid="player-artist"]']) ||
      bylineParts.artist ||
      (mediaSessionMatches ? mediaSessionMetadata?.artist : '') ||
      '',
  );
  const album = trimText(
    text(document, ['ytmusic-player-bar .byline a:last-child', '[data-testid="player-album"]']) ||
      bylineParts.album ||
      (mediaSessionMatches ? mediaSessionMetadata?.album : '') ||
      '',
  );
  const trackUrl = getTrackUrl(document, locationHref);
  const trackId = getTrackId(trackUrl, locationHref);
  const imageUrl =
    getImageUrl(
      document,
      mediaSessionMatches ? mediaSessionMetadata : undefined,
      mediaSessionMatches,
    ) || getStableThumbnailUrl(trackId);

  const playback = choosePlayback(getMediaPlayback(media), getDisplayedPlayback(document));
  const position = playback?.position ?? 0;
  const duration = playback?.duration ?? 0;
  const isPlaying = media ? !media.paused && !media.ended : playbackState === 'playing';
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
