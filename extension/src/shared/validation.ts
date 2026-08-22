import type { PresenceActivity, TrackSnapshot } from './protocol';

const YOUTUBE_IMAGE_HOSTS = new Set([
  'i.ytimg.com',
  'img.youtube.com',
  'yt3.ggpht.com',
  'lh3.googleusercontent.com',
]);

const isString = (value: unknown): value is string => typeof value === 'string';

export const trimText = (value: string, maxLength = 128): string =>
  value.trim().replace(/\s+/g, ' ').slice(0, maxLength);

export const isYouTubeImageUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && YOUTUBE_IMAGE_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
};

export const isYouTubeMusicUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname.toLowerCase() === 'music.youtube.com' &&
      (url.pathname === '/watch' || url.pathname.startsWith('/watch/'))
    );
  } catch {
    return false;
  }
};

export const normalizeImageUrl = (value: string): string => {
  if (!isYouTubeImageUrl(value)) {
    return '';
  }
  return value;
};

export const normalizeTrackUrl = (value: string): string => {
  if (!isYouTubeMusicUrl(value)) {
    return '';
  }
  return value;
};

export const isValidTrackSnapshot = (value: unknown): value is TrackSnapshot => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const snapshot = value as Partial<TrackSnapshot>;
  return (
    [
      snapshot.title,
      snapshot.artist,
      snapshot.album,
      snapshot.imageUrl,
      snapshot.trackUrl,
      snapshot.trackId,
    ].every((field) => isString(field)) &&
    typeof snapshot.isPlaying === 'boolean' &&
    typeof snapshot.position === 'number' &&
    Number.isFinite(snapshot.position) &&
    typeof snapshot.duration === 'number' &&
    Number.isFinite(snapshot.duration)
  );
};

export const isValidPresenceActivity = (value: unknown): value is PresenceActivity => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const activity = value as Partial<PresenceActivity>;
  if (
    activity.type !== 2 ||
    !isString(activity.details) ||
    activity.details.length < 1 ||
    activity.details.length > 128
  ) {
    return false;
  }
  if (activity.state !== undefined && (!isString(activity.state) || activity.state.length > 128)) {
    return false;
  }
  if (activity.assets !== undefined) {
    if (!activity.assets || typeof activity.assets !== 'object' || Array.isArray(activity.assets)) {
      return false;
    }
    if (
      activity.assets.large_image !== undefined &&
      (!isString(activity.assets.large_image) || !isYouTubeImageUrl(activity.assets.large_image))
    ) {
      return false;
    }
  }
  if (activity.timestamps !== undefined) {
    if (
      !activity.timestamps ||
      typeof activity.timestamps !== 'object' ||
      Array.isArray(activity.timestamps)
    ) {
      return false;
    }
    if (activity.timestamps.start !== undefined && !Number.isInteger(activity.timestamps.start)) {
      return false;
    }
    if (activity.timestamps.end !== undefined && !Number.isInteger(activity.timestamps.end)) {
      return false;
    }
  }
  if (activity.buttons !== undefined) {
    if (!Array.isArray(activity.buttons) || activity.buttons.length > 1) {
      return false;
    }
    for (const button of activity.buttons) {
      if (!button || typeof button !== 'object' || Array.isArray(button)) {
        return false;
      }
      if (
        !isString(button.label) ||
        button.label.length < 1 ||
        button.label.length > 32 ||
        !isYouTubeMusicUrl(button.url)
      ) {
        return false;
      }
    }
  }
  return true;
};

export const clampPlayback = (
  position: number,
  duration: number,
): { position: number; duration: number } => {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safePosition = Number.isFinite(position) && position >= 0 ? position : 0;
  return {
    position: safeDuration > 0 ? Math.min(safePosition, safeDuration) : safePosition,
    duration: safeDuration,
  };
};
