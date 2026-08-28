import { NativeClient } from './native-client';
import { PlaybackRegistry } from './playback-registry';
import { getSharingEnabled, setSharingEnabled } from './state';
import { buildPresenceActivity } from '../shared/presence';
import {
  INSTALL_URL,
  type ExtensionMessage,
  type ExtensionResponse,
  type PopupStatus,
  type TrackSnapshot,
} from '../shared/protocol';
import { isValidTrackSnapshot } from '../shared/validation';

const nativeClient = new NativeClient();
const playbackRegistry = new PlaybackRegistry();
let lastSelectedSnapshot: TrackSnapshot | null | undefined;
let selectionRevision = 0;

const toPopupStatus = (sharingEnabled: boolean): PopupStatus => {
  const state = nativeClient.getState();
  const status: PopupStatus = {
    sharingEnabled,
    connector: state.connector,
    discord: state.discord,
    activity: state.activity,
  };
  if (state.lastError) {
    status.lastError = state.lastError;
  }
  return status;
};

const refreshContentScripts = async (): Promise<void> => {
  const tabs = await chrome.tabs.query({ url: 'https://music.youtube.com/*' });
  await Promise.all(
    tabs.flatMap((tab) => {
      if (tab.id === undefined) {
        return [];
      }
      return [chrome.tabs.sendMessage(tab.id, { type: 'refresh_content' }).catch(() => undefined)];
    }),
  );
};

const updateActivity = async (
  snapshot: TrackSnapshot | null,
  isCurrent: () => boolean = () => true,
): Promise<void> => {
  const sharingEnabled = await getSharingEnabled();
  if (!isCurrent()) {
    return;
  }
  if (!sharingEnabled || !snapshot?.isPlaying) {
    await nativeClient.clearActivity();
    return;
  }
  const activity = buildPresenceActivity(snapshot);
  if (!activity) {
    await nativeClient.clearActivity();
    return;
  }
  await nativeClient.setActivity(activity);
};

const applySelectedActivity = async (snapshot: TrackSnapshot | null): Promise<void> => {
  if (snapshot === lastSelectedSnapshot) {
    return;
  }
  lastSelectedSnapshot = snapshot;
  const revision = ++selectionRevision;
  await updateActivity(snapshot, () => revision === selectionRevision);
};

const handleMessage = async (
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> => {
  if (message.type === 'track_update') {
    if (message.snapshot !== null && !isValidTrackSnapshot(message.snapshot)) {
      return { ok: false, error: 'Invalid track snapshot.' };
    }
    if (sender.tab?.id === undefined) {
      return { ok: false, error: 'Track update has no source tab.' };
    }
    const current = playbackRegistry.update(
      sender.tab.id,
      message.snapshot,
      sender.tab.active && message.snapshot?.isPlaying === true,
    );
    await applySelectedActivity(current);
    return { ok: true };
  }
  if (message.type === 'set_sharing') {
    selectionRevision += 1;
    await setSharingEnabled(message.enabled);
    if (!message.enabled) {
      await nativeClient.clearActivity();
    }
    await refreshContentScripts();
    return { ok: true, status: toPopupStatus(message.enabled) };
  }
  if (message.type === 'popup_get_status') {
    await nativeClient.getStatus();
    return { ok: true, status: toPopupStatus(await getSharingEnabled()) };
  }
  if (message.type === 'refresh_content') {
    await refreshContentScripts();
    return { ok: true };
  }
  return { ok: false, error: `Unsupported message. Install instructions: ${INSTALL_URL}` };
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get({ sharingEnabled: true });
  if (stored.sharingEnabled !== false) {
    await setSharingEnabled(true);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void applySelectedActivity(playbackRegistry.remove(tabId));
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    void applySelectedActivity(playbackRegistry.remove(tabId));
  }
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  handleMessage(message as ExtensionMessage, sender)
    .then(sendResponse)
    .catch((error: unknown) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected extension error.',
      }),
    );
  return true;
});
