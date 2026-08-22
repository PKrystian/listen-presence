import {
  createRequestId,
  HOST_NAME,
  type HostRequest,
  type HostResponse,
  type HostStatus,
  type PresenceActivity,
} from '../shared/protocol';
import { isValidPresenceActivity } from '../shared/validation';

type PendingRequest = {
  resolve: (response: HostResponse) => void;
  reject: (error: Error) => void;
  timeout: number;
};

export type NativeConnectionState = {
  connector: 'unknown' | 'available' | 'missing' | 'error';
  discord: 'unknown' | 'connected' | 'disconnected';
  lastError?: string;
};

const timeoutMs = 3000;

export class NativeClient {
  private port: chrome.runtime.Port | null = null;
  private pending = new Map<string, PendingRequest>();
  private lastFingerprint = 'clear';
  private state: NativeConnectionState = {
    connector: 'unknown',
    discord: 'unknown',
  };
  private retryAfter = 0;

  getState(): NativeConnectionState {
    return { ...this.state };
  }

  async setActivity(activity: PresenceActivity): Promise<HostResponse | null> {
    if (!isValidPresenceActivity(activity)) {
      this.state = {
        connector: 'error',
        discord: 'unknown',
        lastError: 'The extension rejected an invalid activity.',
      };
      return null;
    }
    const fingerprint = JSON.stringify(activity);
    if (fingerprint === this.lastFingerprint) {
      return null;
    }
    const response = await this.send({
      version: 1,
      id: createRequestId(),
      type: 'set_activity',
      activity,
    });
    if (response?.ok) {
      this.lastFingerprint = fingerprint;
    }
    return response;
  }

  async clearActivity(): Promise<HostResponse | null> {
    if (this.lastFingerprint === 'clear') {
      return null;
    }
    const response = await this.send({
      version: 1,
      id: createRequestId(),
      type: 'clear_activity',
    });
    if (response?.ok) {
      this.lastFingerprint = 'clear';
    }
    return response;
  }

  async getStatus(): Promise<HostStatus | null> {
    const response = await this.send({
      version: 1,
      id: createRequestId(),
      type: 'get_status',
    });
    if (
      response?.ok &&
      response.result &&
      typeof response.result === 'object' &&
      'status' in response.result
    ) {
      return response.result.status;
    }
    return null;
  }

  private connect(): chrome.runtime.Port | null {
    if (this.port) {
      return this.port;
    }
    if (Date.now() < this.retryAfter) {
      return null;
    }
    try {
      const port = chrome.runtime.connectNative(HOST_NAME);
      port.onMessage.addListener((message: unknown) => this.onMessage(message));
      port.onDisconnect.addListener(() => this.onDisconnect());
      this.port = port;
      this.state = {
        connector: 'available',
        discord: this.state.discord,
      };
      return port;
    } catch (error) {
      this.handleConnectionError(
        error instanceof Error ? error.message : 'Unable to start the connector.',
      );
      return null;
    }
  }

  private send(request: HostRequest): Promise<HostResponse | null> {
    const port = this.connect();
    if (!port) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pending.delete(request.id);
        this.handleConnectionError('The connector did not respond in time.');
        resolve(null);
      }, timeoutMs) as unknown as number;
      this.pending.set(request.id, {
        resolve,
        reject: () => resolve(null),
        timeout,
      });
      try {
        port.postMessage(request);
      } catch (error) {
        clearTimeout(timeout);
        this.pending.delete(request.id);
        this.handleConnectionError(
          error instanceof Error ? error.message : 'The connector rejected the message.',
        );
        resolve(null);
      }
    });
  }

  private onMessage(message: unknown): void {
    if (!message || typeof message !== 'object') {
      return;
    }
    const response = message as Partial<HostResponse>;
    if (response.version !== 1 || typeof response.id !== 'string') {
      return;
    }
    const pending = this.pending.get(response.id);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timeout);
    this.pending.delete(response.id);
    if (
      response.ok &&
      'result' in response &&
      response.result &&
      typeof response.result === 'object' &&
      'status' in response.result
    ) {
      const status = response.result.status as HostStatus;
      this.state = {
        connector: 'available',
        discord: status.discord,
      };
      if (status.lastError) {
        this.state.lastError = status.lastError;
      }
    } else if (!response.ok && 'error' in response && response.error) {
      this.handleConnectionError(response.error.message);
    }
    pending.resolve(response as HostResponse);
  }

  private onDisconnect(): void {
    const message =
      chrome.runtime.lastError?.message || 'The connector is not installed or closed.';
    this.port = null;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(message));
    }
    this.pending.clear();
    this.handleConnectionError(message);
  }

  private handleConnectionError(message: string): void {
    this.state = {
      connector:
        message.toLowerCase().includes('not found') ||
        message.toLowerCase().includes('not installed')
          ? 'missing'
          : 'error',
      discord: 'disconnected',
      lastError: message,
    };
    this.retryAfter = Date.now() + 5000;
  }
}
