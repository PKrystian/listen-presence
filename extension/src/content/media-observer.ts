import { extractTrackSnapshot, readMediaSessionMetadata } from './metadata-parser';
import type { TrackSnapshot } from '../shared/protocol';

type SnapshotListener = (snapshot: TrackSnapshot | null) => void;

const mediaEvents = [
  'play',
  'pause',
  'ended',
  'timeupdate',
  'loadedmetadata',
  'durationchange',
  'seeking',
  'seeked',
];

export const observePlayback = (listener: SnapshotListener): (() => void) => {
  let mediaElements: Element[] = [];
  let routeTimer: number | undefined;
  const historyMethods = {
    pushState: history.pushState,
    replaceState: history.replaceState,
  };

  const emit = (): void => {
    const snapshot = extractTrackSnapshot(
      document,
      window.location.href,
      readMediaSessionMetadata('mediaSession' in navigator ? navigator.mediaSession : undefined),
      'mediaSession' in navigator ? navigator.mediaSession.playbackState : undefined,
    );
    listener(snapshot);
  };

  const onMediaEvent = (): void => {
    emit();
  };

  const bindMedia = (): void => {
    const next = Array.from(document.querySelectorAll('video, audio'));
    if (
      next.length === mediaElements.length &&
      next.every((element, index) => element === mediaElements[index])
    ) {
      return;
    }
    for (const element of mediaElements) {
      for (const event of mediaEvents) {
        element.removeEventListener(event, onMediaEvent);
      }
    }
    mediaElements = next;
    for (const element of mediaElements) {
      for (const event of mediaEvents) {
        element.addEventListener(event, onMediaEvent);
      }
    }
  };

  const notifyRoute = (): void => {
    window.dispatchEvent(new Event('listenpresence-route-change'));
  };

  history.pushState = function pushState(...args): void {
    historyMethods.pushState.apply(history, args);
    notifyRoute();
  };
  history.replaceState = function replaceState(...args): void {
    historyMethods.replaceState.apply(history, args);
    notifyRoute();
  };

  const mutationObserver = new MutationObserver(() => {
    bindMedia();
    emit();
  });
  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [
      'src',
      'srcset',
      'href',
      'class',
      'aria-label',
      'aria-hidden',
      'style',
      'data-video-id',
    ],
  });

  const onRoute = (): void => {
    window.clearTimeout(routeTimer);
    routeTimer = window.setTimeout(() => {
      bindMedia();
      emit();
    }, 100);
  };

  const routeEvents = [
    'popstate',
    'hashchange',
    'yt-navigate-finish',
    'listenpresence-route-change',
  ];
  for (const event of routeEvents) {
    window.addEventListener(event, onRoute);
    document.addEventListener(event, onRoute);
  }

  const interval = window.setInterval(emit, 500);
  bindMedia();
  emit();

  return () => {
    mutationObserver.disconnect();
    window.clearInterval(interval);
    window.clearTimeout(routeTimer);
    for (const element of mediaElements) {
      for (const event of mediaEvents) {
        element.removeEventListener(event, onMediaEvent);
      }
    }
    for (const event of routeEvents) {
      window.removeEventListener(event, onRoute);
      document.removeEventListener(event, onRoute);
    }
    history.pushState = historyMethods.pushState;
    history.replaceState = historyMethods.replaceState;
  };
};
