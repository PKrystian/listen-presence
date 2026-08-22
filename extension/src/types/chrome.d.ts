declare namespace chrome {
  namespace runtime {
    type MessageSender = { tab?: { id?: number } };
    type Port = {
      onMessage: { addListener(listener: (message: unknown) => void): void };
      onDisconnect: { addListener(listener: () => void): void };
      postMessage(message: unknown): void;
      disconnect(): void;
    };
    const lastError: { message?: string } | undefined;
    const onInstalled: { addListener(listener: () => void): void };
    const onMessage: {
      addListener(
        listener: (
          message: unknown,
          sender: MessageSender,
          sendResponse: (response: unknown) => void,
        ) => boolean | void,
      ): void;
    };
    function connectNative(name: string): Port;
    function sendMessage(message: unknown, callback?: (response: unknown) => void): void;
  }

  namespace storage {
    namespace local {
      function get(keys: string[] | Record<string, unknown>): Promise<Record<string, unknown>>;
      function set(items: Record<string, unknown>): Promise<void>;
    }
  }

  namespace tabs {
    type Tab = { id?: number };
    function query(queryInfo: Record<string, unknown>): Promise<Tab[]>;
    function sendMessage(tabId: number, message: unknown): Promise<unknown>;
    function create(createProperties: { url: string }): Promise<Tab>;
  }
}
