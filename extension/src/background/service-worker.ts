import { NativeClient } from './native-client';
import { getSharingEnabled, setSharingEnabled } from './state';
import { buildPresenceActivity } from '../shared/presence';
import {
  INSTALL_URL,
  type ExtensionMessage,
  type ExtensionResponse,
  type PopupStatus,
  type TrackSnapshot,
} from '../shared/protocol';

const nativeClient = new NativeClient();

const toPopupStatus = (sharingEnabled: boolean): PopupStatus => {
  const state = nativeClient.getState();
  const status: PopupStatus = {
    sharingEnabled,
    connector: state.connector,
    discord: state.discord,
  };
  if (state.lastError) {
    status.lastError = state.lastError;
  }
  return status;
};

const refreshContentScripts = async (): Promise<void> => {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.flatMap((tab) => {
      if (tab.id === undefined) {
        return [];
      }
      return [chrome.tabs.sendMessage(tab.id, { type: 'refresh_content' }).catch(() => undefined)];
    }),
  );
};

const updateActivity = async (snapshot: TrackSnapshot | null): Promise<void> => {
  const sharingEnabled = await getSharingEnabled();
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

const handleMessage = async (message: ExtensionMessage): Promise<ExtensionResponse> => {
  if (message.type === 'track_update') {
    await updateActivity(message.snapshot);
    return { ok: true };
  }
  if (message.type === 'set_sharing') {
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

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  handleMessage(message as ExtensionMessage)
    .then(sendResponse)
    .catch((error: unknown) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected extension error.',
      }),
    );
  return true;
});
