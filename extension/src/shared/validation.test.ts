import { describe, expect, it } from 'vitest';
import { isYouTubeImageUrl, isYouTubeMusicUrl, isValidPresenceActivity } from './validation';

describe('validation', () => {
  it('accepts supported YouTube image hosts and rejects arbitrary hosts', () => {
    expect(isYouTubeImageUrl('https://i.ytimg.com/vi/id/hqdefault.jpg')).toBe(true);
    expect(isYouTubeImageUrl('https://lh3.googleusercontent.com/image')).toBe(true);
    expect(isYouTubeImageUrl('https://example.test/image.jpg')).toBe(false);
    expect(isYouTubeImageUrl('http://i.ytimg.com/vi/id/hqdefault.jpg')).toBe(false);
  });

  it('accepts only YouTube Music watch URLs', () => {
    expect(isYouTubeMusicUrl('https://music.youtube.com/watch?v=id')).toBe(true);
    expect(isYouTubeMusicUrl('https://www.youtube.com/watch?v=id')).toBe(false);
    expect(isYouTubeMusicUrl('https://music.youtube.com/browse/album')).toBe(false);
  });

  it('validates the limited activity shape', () => {
    expect(
      isValidPresenceActivity({
        type: 2,
        details: 'Title',
        state: 'Artist - Album',
        assets: { large_image: 'https://i.ytimg.com/vi/id/hqdefault.jpg' },
        buttons: [{ label: 'Open in YouTube Music', url: 'https://music.youtube.com/watch?v=id' }],
      }),
    ).toBe(true);
    expect(isValidPresenceActivity({ type: 0, details: 'Command injection' })).toBe(false);
  });

  it('rejects malformed nested values without throwing', () => {
    expect(() =>
      isValidPresenceActivity({ type: 2, details: 'Title', buttons: null } as never),
    ).not.toThrow();
    expect(isValidPresenceActivity({ type: 2, details: 'Title', buttons: null } as never)).toBe(
      false,
    );
    expect(
      isValidPresenceActivity({ type: 2, details: 'Title', assets: 'remote-code' } as never),
    ).toBe(false);
  });
});
