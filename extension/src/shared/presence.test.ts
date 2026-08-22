import { describe, expect, it } from 'vitest';
import { buildPresenceActivity, presenceFingerprint } from './presence';
import type { TrackSnapshot } from './protocol';

const snapshot: TrackSnapshot = {
  title: 'Song title',
  artist: 'Artist',
  album: 'Album',
  imageUrl: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
  trackUrl: 'https://music.youtube.com/watch?v=abc',
  trackId: 'abc',
  isPlaying: true,
  position: 30,
  duration: 210,
};

describe('buildPresenceActivity', () => {
  it('builds listening activity with timestamps, image and button', () => {
    const activity = buildPresenceActivity(snapshot, 1_700_000_000_000);
    expect(activity).toEqual({
      type: 2,
      details: 'Song title',
      state: 'Artist - Album',
      assets: {
        large_image: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
        large_text: 'YouTube Music',
      },
      timestamps: {
        start: 1699999970,
        end: 1700000180,
      },
      buttons: [
        {
          label: 'Open in YouTube Music',
          url: 'https://music.youtube.com/watch?v=abc',
        },
      ],
    });
  });

  it('clears when playback is paused', () => {
    expect(buildPresenceActivity({ ...snapshot, isPlaying: false })).toBeNull();
  });

  it('deduplicates the same activity', () => {
    const activity = buildPresenceActivity(snapshot, 1_700_000_000_000);
    expect(presenceFingerprint(activity)).toBe(presenceFingerprint(activity));
    expect(presenceFingerprint(null)).toBe('clear');
  });
});
