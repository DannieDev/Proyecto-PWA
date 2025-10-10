interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistration {
  sync?: SyncManager;
}

interface Window {
  SyncManager?: {
    prototype: SyncManager;
    new(): SyncManager;
  };
}