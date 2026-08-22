import type { PresenceActivity, TrackSnapshot } from './protocol';
import { clampPlayback, isYouTubeImageUrl, isYouTubeMusicUrl, trimText } from './validation';

export const buildPresenceActivity = (
  snapshot: TrackSnapshot,
  now = Date.now(),
): PresenceActivity | null => {
  const title = trimText(snapshot.title);
  const trackUrl = isYouTubeMusicUrl(snapshot.trackUrl) ? snapshot.trackUrl : '';
  if (!snapshot.isPlaying || !title) {
    return null;
  }

  const playback = clampPlayback(snapshot.position, snapshot.duration);
  const activity: PresenceActivity = {
    type: 2,
    details: title,
  };

  const state = [trimText(snapshot.artist), trimText(snapshot.album)].filter(Boolean).join(' - ');
  if (state) {
    activity.state = state.slice(0, 128);
  }

  const imageUrl = snapshot.imageUrl;
  if (isYouTubeImageUrl(imageUrl)) {
    activity.assets = {
      large_image: imageUrl,
      large_text: 'YouTube Music',
    };
  }

  if (playback.duration > 0) {
    const start = Math.floor(now / 1000) - Math.floor(playback.position);
    activity.timestamps = {
      start,
      end: start + Math.floor(playback.duration),
    };
  }

  if (trackUrl) {
    activity.buttons = [
      {
        label: 'Open in YouTube Music',
        url: trackUrl,
      },
    ];
  }
  return activity;
};

export const presenceFingerprint = (activity: PresenceActivity | null): string =>
  activity ? JSON.stringify(activity) : 'clear';
