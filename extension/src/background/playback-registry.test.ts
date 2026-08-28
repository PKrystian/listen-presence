import { describe, expect, it } from 'vitest';
import type { TrackSnapshot } from '../shared/protocol';
import { PlaybackRegistry } from './playback-registry';

const snapshot = (title: string, isPlaying: boolean): TrackSnapshot => ({
  title,
  artist: 'Artist',
  album: 'Album',
  imageUrl: `https://i.ytimg.com/vi/${title}/hqdefault.jpg`,
  trackUrl: `https://music.youtube.com/watch?v=${title}`,
  trackId: title,
  isPlaying,
  position: 10,
  duration: 180,
});

describe('PlaybackRegistry', () => {
  it('does not let a paused tab clear another playing tab', () => {
    const registry = new PlaybackRegistry();
    registry.update(1, snapshot('playing', true), false, 1);
    expect(registry.update(2, snapshot('paused', false), true, 2)?.title).toBe('playing');
  });

  it('prefers a playing active tab', () => {
    const registry = new PlaybackRegistry();
    registry.update(1, snapshot('background', true), false, 1);
    expect(registry.update(2, snapshot('active', true), true, 2)?.title).toBe('active');
  });

  it('falls back to another playing tab after pause or removal', () => {
    const registry = new PlaybackRegistry();
    registry.update(1, snapshot('first', true), false, 1);
    registry.update(2, snapshot('second', true), false, 2);
    expect(registry.update(1, snapshot('first', false), false, 3)?.title).toBe('second');
    expect(registry.remove(2)).toBeNull();
  });

  it('clears an empty source without affecting unrelated state', () => {
    const registry = new PlaybackRegistry();
    registry.update(1, snapshot('playing', true));
    expect(registry.update(2, null)?.title).toBe('playing');
    expect(registry.remove(1)).toBeNull();
  });
});
