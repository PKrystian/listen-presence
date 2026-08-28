import type { TrackSnapshot } from '../shared/protocol';
import { observePlayback } from './media-observer';
import { extractTrackSnapshot, readMediaSessionMetadata } from './metadata-parser';
import { shouldWaitForTrackMetadata, transitionTimeoutMs } from './snapshot-transition';

let lastPublished: TrackSnapshot | null | undefined;
let pendingTransition: { snapshot: TrackSnapshot; startedAt: number } | undefined;
let transitionTimer: number | undefined;

const snapshotIdentity = (snapshot: TrackSnapshot | null): string => {
  if (!snapshot) {
    return 'empty';
  }
  return [
    snapshot.trackId,
    snapshot.trackUrl,
    snapshot.title,
    snapshot.artist,
    snapshot.album,
    snapshot.imageUrl,
  ].join('|');
};

const shouldPublish = (snapshot: TrackSnapshot | null, force = false): boolean => {
  if (force || lastPublished === undefined) {
    return true;
  }
  if (!snapshot || !lastPublished) {
    return snapshot !== lastPublished;
  }
  return (
    snapshotIdentity(snapshot) !== snapshotIdentity(lastPublished) ||
    snapshot.isPlaying !== lastPublished.isPlaying ||
    Math.abs(snapshot.position - lastPublished.position) >= 2 ||
    Math.abs(snapshot.duration - lastPublished.duration) >= 1
  );
};

const clearPendingTransition = (): void => {
  pendingTransition = undefined;
  window.clearTimeout(transitionTimer);
  transitionTimer = undefined;
};

const sendSnapshot = (snapshot: TrackSnapshot | null, force = false): void => {
  if (!shouldPublish(snapshot, force)) {
    return;
  }
  lastPublished = snapshot;
  chrome.runtime.sendMessage({ type: 'track_update', snapshot });
};

const publish = (snapshot: TrackSnapshot | null, force = false): void => {
  if (force || !snapshot || !snapshot.isPlaying || !lastPublished) {
    clearPendingTransition();
    sendSnapshot(snapshot, force);
    return;
  }

  if (!pendingTransition) {
    pendingTransition = { snapshot, startedAt: Date.now() };
  } else {
    pendingTransition.snapshot = snapshot;
  }
  const elapsed = Date.now() - pendingTransition.startedAt;
  if (shouldWaitForTrackMetadata(lastPublished, snapshot, elapsed)) {
    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(
      () => {
        if (pendingTransition) {
          publish(pendingTransition.snapshot);
        }
      },
      Math.max(transitionTimeoutMs - elapsed, 0),
    );
    return;
  }

  clearPendingTransition();
  sendSnapshot(snapshot);
};

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (
    message &&
    typeof message === 'object' &&
    (message as { type?: unknown }).type === 'refresh_content'
  ) {
    const snapshot = extractSnapshot();
    publish(snapshot, true);
  }
});

const extractSnapshot = (): TrackSnapshot | null => {
  return extractTrackSnapshot(
    document,
    window.location.href,
    readMediaSessionMetadata('mediaSession' in navigator ? navigator.mediaSession : undefined),
    'mediaSession' in navigator ? navigator.mediaSession.playbackState : undefined,
  );
};

observePlayback((snapshot) => publish(snapshot));
