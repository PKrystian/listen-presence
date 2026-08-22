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

  it('uses the active media time when the player bar has stale text', () => {
    document.body.innerHTML = `
      <ytmusic-player-bar>
        <div class="title">Suffer Me</div>
        <div class="left-controls">
          <span class="time-info ytmusic-player-bar">0:34 / 2:44</span>
        </div>
      </ytmusic-player-bar>
      <video></video>
    `;
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperties(video, {
      currentTime: { value: 214 },
      duration: { value: 246 },
      paused: { value: false },
      ended: { value: false },
    });

    const snapshot = extractTrackSnapshot(document, 'https://music.youtube.com/watch?v=next123');
    expect(snapshot?.position).toBe(214);
    expect(snapshot?.duration).toBe(246);
  });

  it('falls back to the player-bar time while media timing is unavailable', () => {
    document.body.innerHTML = `
      <ytmusic-player-bar>
        <div class="title">Song</div>
        <span class="time-info">0:34 / 2:44</span>
      </ytmusic-player-bar>
      <video></video>
    `;
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperties(video, {
      currentTime: { value: Number.NaN },
      duration: { value: Number.NaN },
      paused: { value: true },
      ended: { value: false },
    });

    const snapshot = extractTrackSnapshot(document, 'https://music.youtube.com/watch?v=next123');
    expect(snapshot?.position).toBe(34);
    expect(snapshot?.duration).toBe(164);
  });

  it('uses the playing media element when multiple media elements exist', () => {
    document.body.innerHTML = `
      <ytmusic-player-bar><div class="title">Song</div></ytmusic-player-bar>
      <video></video>
      <video></video>
    `;
    const videos = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
    Object.defineProperties(videos[0], {
      currentTime: { value: 214 },
      duration: { value: 246 },
      paused: { value: true },
      ended: { value: false },
    });
    Object.defineProperties(videos[1], {
      currentTime: { value: 34 },
      duration: { value: 164 },
      paused: { value: false },
      ended: { value: false },
    });

    const snapshot = extractTrackSnapshot(document, 'https://music.youtube.com/watch?v=next123');
    expect(snapshot?.position).toBe(34);
    expect(snapshot?.duration).toBe(164);
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
    expect(snapshot?.imageUrl).toBe('https://i.ytimg.com/vi/media123/hqdefault.jpg');
    expect(snapshot?.isPlaying).toBe(false);
  });

  it('reads an image from a player background style when no thumbnail ID exists', () => {
    document.body.innerHTML = `
      <ytmusic-player-bar>
        <div class="title">Song</div>
        <div style="background-image: url('https://lh3.googleusercontent.com/image')"></div>
      </ytmusic-player-bar>
    `;

    const snapshot = extractTrackSnapshot(document, 'https://music.youtube.com/watch');
    expect(snapshot?.imageUrl).toBe('https://lh3.googleusercontent.com/image');
  });

  it('rejects non-YouTube track and image URLs', () => {
    document.body.innerHTML = `
      <ytmusic-player-bar>
        <div class="title">Song</div>
        <a href="https://example.test/watch?v=abc"></a>
        <img src="https://example.test/cover.jpg">
      </ytmusic-player-bar>
    `;

    const snapshot = extractTrackSnapshot(document, 'https://music.youtube.com/watch');
    expect(snapshot?.trackUrl).toBe('https://music.youtube.com/watch');
    expect(snapshot?.imageUrl).toBe('');
  });
});
