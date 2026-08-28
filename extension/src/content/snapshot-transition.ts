import type { TrackSnapshot } from '../shared/protocol';

export const transitionTimeoutMs = 1200;

const trackLabel = (snapshot: TrackSnapshot): string =>
  `${snapshot.title.toLocaleLowerCase()}|${snapshot.artist.toLocaleLowerCase()}`;

export const shouldWaitForTrackMetadata = (
  previous: TrackSnapshot,
  candidate: TrackSnapshot,
  elapsedMs: number,
): boolean => {
  if (elapsedMs >= transitionTimeoutMs || !candidate.isPlaying) {
    return false;
  }
  const trackChanged =
    trackLabel(previous) !== trackLabel(candidate) || previous.trackId !== candidate.trackId;
  if (!trackChanged) {
    return false;
  }
  return previous.trackId === candidate.trackId || previous.imageUrl === candidate.imageUrl;
};
