import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NativeClient } from './native-client';
import type { HostRequest, HostResponse } from '../shared/protocol';

const activity = {
  type: 2 as const,
  details: 'Song',
  state: 'Artist - Album',
  assets: { large_image: 'https://i.ytimg.com/vi/id/hqdefault.jpg' },
  buttons: [{ label: 'Open in YouTube Music', url: 'https://music.youtube.com/watch?v=id' }],
};

describe('NativeClient', () => {
  let posted: HostRequest[];
  let emitMessage: (message: HostResponse) => void;

  beforeEach(() => {
    posted = [];
    let messageListener: ((message: unknown) => void) | undefined;
    emitMessage = (message) => messageListener?.(message);
    const port = {
      onMessage: {
        addListener: (listener: (message: unknown) => void) => {
          messageListener = listener;
        },
      },
      onDisconnect: { addListener: vi.fn() },
      postMessage: (message: unknown) => {
        posted.push(message as HostRequest);
      },
      disconnect: vi.fn(),
    } as unknown as chrome.runtime.Port;
    globalThis.chrome = {
      runtime: {
        connectNative: vi.fn(() => port),
        lastError: undefined,
      },
    } as unknown as typeof chrome;
  });

  it('sends set_activity and deduplicates a successful repeat', async () => {
    const client = new NativeClient();
    const result = client.setActivity(activity);
    await Promise.resolve();
    const request = posted[0];
    expect(request?.type).toBe('set_activity');
    emitMessage({
      version: 1,
      id: request?.id ?? '',
      ok: true,
      result: {
        updated: true,
        status: { connector: 'ready', discord: 'connected', activity: 'set' },
      },
    });
    await result;
    expect(await client.setActivity(activity)).toBeNull();
    expect(posted).toHaveLength(1);
  });

  it('does not send an invalid activity', async () => {
    const client = new NativeClient();
    const result = await client.setActivity({ type: 0, details: 'not listening' } as never);
    expect(result).toBeNull();
    expect(posted).toHaveLength(0);
    expect(client.getState().connector).toBe('error');
  });
});
