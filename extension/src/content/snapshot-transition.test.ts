import { describe, expect, it } from 'vitest';
import type { TrackSnapshot } from '../shared/protocol';
import { shouldWaitForTrackMetadata, transitionTimeoutMs } from './snapshot-transition';

const snapshot = (overrides: Partial<TrackSnapshot> = {}): TrackSnapshot => ({
  title: 'Old title',
  artist: 'Old artist',
  album: 'Old album',
  imageUrl: 'https://i.ytimg.com/vi/old/image.jpg',
  trackUrl: 'https://music.youtube.com/watch?v=old',
  trackId: 'old',
  isPlaying: true,
  position: 10,
  duration: 180,
  ...overrides,
});

describe('shouldWaitForTrackMetadata', () => {
  it('waits when the title changes before the track ID and image', () => {
    const previous = snapshot();
    const candidate = snapshot({ title: 'New title', artist: 'New artist', position: 0 });
    expect(shouldWaitForTrackMetadata(previous, candidate, 100)).toBe(true);
  });

  it('publishes as soon as the new track ID and image are available', () => {
    const previous = snapshot();
    const candidate = snapshot({
      title: 'New title',
      artist: 'New artist',
      trackId: 'new',
      trackUrl: 'https://music.youtube.com/watch?v=new',
      imageUrl: 'https://i.ytimg.com/vi/new/image.jpg',
      position: 0,
    });
    expect(shouldWaitForTrackMetadata(previous, candidate, 100)).toBe(false);
  });

  it('never waits longer than the transition timeout', () => {
    const previous = snapshot();
    const candidate = snapshot({ title: 'New title' });
    expect(shouldWaitForTrackMetadata(previous, candidate, transitionTimeoutMs)).toBe(false);
  });
});
