export const HOST_NAME = 'com.listenpresence.connector';
export const PROTOCOL_VERSION = 1;
export const MAX_TEXT_LENGTH = 128;
export const INSTALL_URL =
  'https://github.com/PKrystian/listen-presence/releases/latest/download/ListenPresence-Setup.exe';

export type PresenceActivity = {
  type: 2;
  details: string;
  state?: string;
  assets?: {
    large_image?: string;
    large_text?: string;
  };
  timestamps?: {
    start?: number;
    end?: number;
  };
  buttons?: Array<{
    label: string;
    url: string;
  }>;
};

export type TrackSnapshot = {
  title: string;
  artist: string;
  album: string;
  imageUrl: string;
  trackUrl: string;
  trackId: string;
  isPlaying: boolean;
  position: number;
  duration: number;
};

export type HostRequest =
  | { version: 1; id: string; type: 'ping' }
  | { version: 1; id: string; type: 'set_activity'; activity: PresenceActivity }
  | { version: 1; id: string; type: 'clear_activity' }
  | { version: 1; id: string; type: 'get_status' };

export type HostStatus = {
  connector: 'ready';
  discord: 'connected' | 'disconnected';
  activity: 'set' | 'clear';
  lastError?: string;
};

export type HostResponse =
  | { version: 1; id: string; ok: true; result: { pong: true } }
  | { version: 1; id: string; ok: true; result: { status: HostStatus } }
  | { version: 1; id: string; ok: true; result: { cleared: true; status: HostStatus } }
  | { version: 1; id: string; ok: true; result: { updated: true; status: HostStatus } }
  | {
      version: 1;
      id: string;
      ok: false;
      error: { code: string; message: string };
    };

export type ExtensionMessage =
  | { type: 'track_update'; snapshot: TrackSnapshot | null }
  | { type: 'popup_get_status' }
  | { type: 'set_sharing'; enabled: boolean }
  | { type: 'refresh_content' };

export type PopupStatus = {
  sharingEnabled: boolean;
  connector: 'unknown' | 'available' | 'missing' | 'error';
  discord: 'unknown' | 'connected' | 'disconnected';
  activity: 'unknown' | 'set' | 'clear';
  lastError?: string;
};

export type ExtensionResponse = {
  ok: boolean;
  status?: PopupStatus;
  error?: string;
};

export const createRequestId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
