import type { TrackSnapshot } from '../shared/protocol';

type TabPlayback = {
  snapshot: TrackSnapshot;
  updatedAt: number;
};

export class PlaybackRegistry {
  private tabs = new Map<number, TabPlayback>();
  private preferredTabId: number | undefined;

  update(
    tabId: number,
    snapshot: TrackSnapshot | null,
    prefer = false,
    updatedAt = Date.now(),
  ): TrackSnapshot | null {
    if (!snapshot) {
      this.tabs.delete(tabId);
    } else {
      this.tabs.set(tabId, { snapshot, updatedAt });
    }

    if (snapshot?.isPlaying && (prefer || !this.preferredIsPlaying())) {
      this.preferredTabId = tabId;
    } else if ((!snapshot || !snapshot.isPlaying) && this.preferredTabId === tabId) {
      this.preferredTabId = undefined;
    }
    return this.current();
  }

  remove(tabId: number): TrackSnapshot | null {
    this.tabs.delete(tabId);
    if (this.preferredTabId === tabId) {
      this.preferredTabId = undefined;
    }
    return this.current();
  }

  private preferredIsPlaying(): boolean {
    return (
      this.preferredTabId !== undefined &&
      this.tabs.get(this.preferredTabId)?.snapshot.isPlaying === true
    );
  }

  private current(): TrackSnapshot | null {
    if (this.preferredTabId !== undefined) {
      const preferred = this.tabs.get(this.preferredTabId)?.snapshot;
      if (preferred?.isPlaying) {
        return preferred;
      }
    }

    const fallback = Array.from(this.tabs.entries())
      .filter(([, playback]) => playback.snapshot.isPlaying)
      .sort((left, right) => right[1].updatedAt - left[1].updatedAt)[0];
    this.preferredTabId = fallback?.[0];
    return fallback?.[1].snapshot ?? null;
  }
}
