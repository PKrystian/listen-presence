import { describe, expect, it } from 'vitest';
import { extractTrackSnapshot } from './metadata-parser';

describe('extractTrackSnapshot', () => {
  it('reads player-bar metadata and media state', () => {
    document.body.innerHTML = `
      <ytmusic-player-bar>
        <div class="title">  Song title  </div>
        <div class="byline"><a>Artist</a><span> • </span><a>Album</a></div>
        <a class="title-link" href="/watch?v=abc123"></a>
        <img src="https://i.ytimg.com/vi/abc123/hqdefault.jpg">
      </ytmusic-player-bar>
      <video></video>
    `;
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperties(video, {
      currentTime: { value: 42 },
      duration: { value: 240 },
      paused: { value: false },
      ended: { value: false },
    });

    expect(extractTrackSnapshot(document, 'https://music.youtube.com/watch?v=abc123')).toEqual({
      title: 'Song title',
      artist: 'Artist',
      album: 'Album',
      imageUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
      trackUrl: 'https://music.youtube.com/watch?v=abc123',
      trackId: 'abc123',
      isPlaying: true,
      position: 42,
      duration: 240,
    });
  });

  it('uses Media Session metadata when the DOM is incomplete', () => {
    document.body.innerHTML = '<video></video>';
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperties(video, {
      currentTime: { value: 3 },
      duration: { value: 60 },
      paused: { value: true },
      ended: { value: false },
    });

    const snapshot = extractTrackSnapshot(
      document,
      'https://music.youtube.com/watch?v=media123',
      {
        title: 'Media title',
        artist: 'Media artist',
        album: 'Media album',
        artwork: [{ src: 'https://lh3.googleusercontent.com/image' }],
      },
      'playing',
    );

    expect(snapshot?.title).toBe('Media title');
    expect(snapshot?.artist).toBe('Media artist');
    expect(snapshot?.album).toBe('Media album');
    expect(snapshot?.imageUrl).toBe('https://lh3.googleusercontent.com/image');
    expect(snapshot?.isPlaying).toBe(false);
  });

  it('rejects non-YouTube track and image URLs', () => {
    document.body.innerHTML = `
      <ytmusic-player-bar>
        <div class="title">Song</div>
        <a href="https://example.test/watch?v=abc"></a>
        <img src="https://example.test/cover.jpg">
      </ytmusic-player-bar>
    `;

    const snapshot = extractTrackSnapshot(document, 'https://music.youtube.com/watch?v=abc');
    expect(snapshot?.trackUrl).toBe('https://music.youtube.com/watch?v=abc');
    expect(snapshot?.imageUrl).toBe('');
  });
});
