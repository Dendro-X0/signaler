import WebSocket from "ws";

type PendingEntry = {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
};

type WebSocketMessageEvent = {
  readonly data: unknown;
};

function isWebSocketMessageEvent(event: unknown): event is WebSocketMessageEvent {
  if (!event || typeof event !== "object") {
    return false;
  }
  return "data" in event;
}

type WebSocketLike = {
  addEventListener(type: "open" | "error" | "message" | "close", listener: (event: unknown) => void): void;
  removeEventListener(type: "open" | "error" | "message" | "close", listener: (event: unknown) => void): void;
  send(data: string): void;
  close(): void;
};

function createWebSocket(url: string): WebSocketLike {
  const ws: WebSocket = new WebSocket(url);
  const handlers: Map<string, Map<(event: unknown) => void, (...args: unknown[]) => void>> = new Map();
  const mapType = (type: string): string => {
    return type;
  };
  const ensureMap = (type: string): Map<(event: unknown) => void, (...args: unknown[]) => void> => {
    const existing: Map<(event: unknown) => void, (...args: unknown[]) => void> | undefined = handlers.get(type);
    if (existing) {
      return existing;
    }
    const created: Map<(event: unknown) => void, (...args: unknown[]) => void> = new Map();
    handlers.set(type, created);
    return created;
  };
  return {
    addEventListener: (type, listener) => {
      const t: string = mapType(type);
      const byListener = ensureMap(t);
      if (byListener.has(listener)) {
        return;
      }
      const wrapped = (...args: unknown[]): void => {
        if (t === "message") {
          const data: unknown = args[0];
          const text: string = typeof data === "string" ? data : Buffer.isBuffer(data) ? data.toString("utf8") : "";
          listener({ data: text });
          return;
        }
        listener(undefined);
      };
      byListener.set(listener, wrapped);
      ws.on(t, wrapped);
    },
    removeEventListener: (type, listener) => {
      const t: string = mapType(type);
      const byListener: Map<(event: unknown) => void, (...args: unknown[]) => void> | undefined = handlers.get(t);
      if (!byListener) {
        return;
      }
      const wrapped = byListener.get(listener);
      if (!wrapped) {
        return;
      }
      byListener.delete(listener);
      ws.off(t, wrapped);
    },
    send: (data) => {
      ws.send(data);
    },
    close: () => {
      ws.close();
    },
  };
}

type EventListenerEntry = {
  readonly sessionId?: string;
  readonly listener: (params: unknown, sessionId: string | undefined) => void;
};

export class CdpClient {
  private readonly url: string;
  private socket: WebSocketLike | undefined;
  private nextId: number;
  private readonly pending: Map<number, PendingEntry>;
  private readonly listeners: Map<string, Set<EventListenerEntry>>;

  /**
   * @param url - WebSocket URL for the Chrome DevTools Protocol endpoint.
   */
  public constructor(url: string) {
    this.url = url;
    this.socket = undefined;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  /**
   * Connect to the CDP websocket.
   */
  public async connect(): Promise<void> {
    if (this.socket) {
      return;
    }
    const socket: WebSocketLike = createWebSocket(this.url);
    this.socket = socket;
    await new Promise<void>((resolve, reject) => {
      const onOpen = (): void => {
        cleanup();
        resolve();
      };
      const onError = (): void => {
        cleanup();
        reject(new Error("CDP WebSocket connection failed"));
      };
      const cleanup = (): void => {
        socket.removeEventListener("open", onOpen);
        socket.removeEventListener("error", onError);
      };
      socket.addEventListener("open", onOpen);
      socket.addEventListener("error", onError);
    });
    socket.addEventListener("message", (event: unknown) => {
      if (!isWebSocketMessageEvent(event)) {
        return;
      }
      this.handleMessage(typeof event.data === "string" ? event.data : "");
    });
    socket.addEventListener("close", () => {
      this.handleClose();
    });
  }

  /**
   * Close the CDP websocket.
   */
  public close(): void {
    if (!this.socket) {
      return;
    }
    this.socket.close();
    this.socket = undefined;
    this.handleClose();
  }

  /**
   * Subscribe to a CDP event.
   *
   * @param method - CDP event name, e.g. "Page.loadEventFired".
   * @param listener - Event handler.
   */
  public on(method: string, listener: (params: unknown) => void): () => void {
    const set: Set<EventListenerEntry> = this.listeners.get(method) ?? new Set();
    const entry: EventListenerEntry = { listener: (params) => listener(params) };
    set.add(entry);
    this.listeners.set(method, set);
    return () => {
      const current: Set<EventListenerEntry> | undefined = this.listeners.get(method);
      current?.delete(entry);
    };
  }

  /**
   * Subscribe to a CDP event, optionally filtering by sessionId.
   *
   * @param method - CDP event name.
   * @param sessionId - Optional sessionId to filter events.
   * @param listener - Event handler.
   */
  public onEvent(method: string, sessionId: string | undefined, listener: (params: unknown) => void): () => void {
    const set: Set<EventListenerEntry> = this.listeners.get(method) ?? new Set();
    const entry: EventListenerEntry = { sessionId, listener: (params, eventSessionId) => {
      if (sessionId !== undefined && eventSessionId !== sessionId) {
        return;
      }
      listener(params);
    } };
    set.add(entry);
    this.listeners.set(method, set);
    return () => {
      const current: Set<EventListenerEntry> | undefined = this.listeners.get(method);
      current?.delete(entry);
    };
  }

  /**
   * Send a CDP command and await its result.
   *
   * @param method - CDP method name.
   * @param params - CDP params object.
   * @param sessionId - Optional sessionId when using Target.attachToTarget with flatten.
   */
  public async send<T>(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<T> {
    const socket: WebSocketLike | undefined = this.socket;
    if (!socket) {
      throw new Error("CDP client is not connected");
    }
    const id: number = this.nextId;
    this.nextId += 1;
    const message: Record<string, unknown> = sessionId ? { id, method, params, sessionId } : { id, method, params };
    const payload: string = JSON.stringify(message);
    const result = await new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      socket.send(payload);
    });
    return result as T;
  }

  /**
   * Wait for a CDP event once.
   *
   * @param method - CDP event name.
   * @param timeoutMs - Timeout in milliseconds.
   */
  public waitForEvent<T>(method: string, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer: NodeJS.Timeout = setTimeout(() => {
        off();
        reject(new Error(`Timed out waiting for CDP event: ${method}`));
      }, timeoutMs);
      const off = this.on(method, (params: unknown) => {
        clearTimeout(timer);
        off();
        resolve(params as T);
      });
    });
  }

  /**
   * Wait for a CDP event once for a specific session.
   *
   * @param method - CDP event name.
   * @param sessionId - Target sessionId.
   * @param timeoutMs - Timeout in milliseconds.
   */
  public waitForEventForSession<T>(method: string, sessionId: string, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer: NodeJS.Timeout = setTimeout(() => {
        off();
        reject(new Error(`Timed out waiting for CDP event: ${method}`));
      }, timeoutMs);
      const off = this.onEvent(method, sessionId, (params: unknown) => {
        clearTimeout(timer);
        off();
        resolve(params as T);
      });
    });
  }

  private handleClose(): void {
    for (const entry of this.pending.values()) {
      entry.reject(new Error("CDP connection closed"));
    }
    this.pending.clear();
  }

  private handleMessage(raw: string): void {
    if (raw.length === 0) {
      return;
    }
    const parsed: unknown = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return;
    }
    const record = parsed as { readonly id?: unknown; readonly result?: unknown; readonly error?: unknown; readonly method?: unknown; readonly params?: unknown; readonly sessionId?: unknown };
    if (typeof record.id === "number") {
      const pending = this.pending.get(record.id);
      if (!pending) {
        return;
      }
      this.pending.delete(record.id);
      if (record.error && typeof record.error === "object") {
        const message: string = (record.error as { readonly message?: unknown }).message as string;
        pending.reject(new Error(message || "CDP error"));
        return;
      }
      pending.resolve(record.result);
      return;
    }
    if (typeof record.method === "string") {
      const listeners: Set<EventListenerEntry> | undefined = this.listeners.get(record.method);
      if (!listeners) {
        return;
      }
      const sessionId: string | undefined = typeof record.sessionId === "string" ? record.sessionId : undefined;
      for (const listener of listeners) {
        listener.listener(record.params, sessionId);
      }
    }
  }
}
