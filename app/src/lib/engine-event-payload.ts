type ApexDevice = 'mobile' | 'desktop';

type EngineEventBase = {
  readonly ts: string;
};

type EngineEventRunStarted = EngineEventBase & {
  readonly type: 'run_started';
  readonly mode: 'audit' | 'folder' | 'folder_bundle_only';
  readonly outputDir: string;
  readonly configPath?: string;
  readonly rootDir?: string;
};

type EngineEventProgress = EngineEventBase & {
  readonly type: 'progress';
  readonly completed: number;
  readonly total: number;
  readonly path: string;
  readonly device: ApexDevice;
  readonly etaMs?: number;
};

type EngineEventArtifactWritten = EngineEventBase & {
  readonly type: 'artifact_written';
  readonly kind: 'file' | 'dir';
  readonly relativePath: string;
};

type EngineEventRunCompleted = EngineEventBase & {
  readonly type: 'run_completed';
  readonly mode: 'audit' | 'folder' | 'folder_bundle_only';
  readonly outputDir: string;
  readonly elapsedMs?: number;
};

type EngineEventFolderServerStarted = EngineEventBase & {
  readonly type: 'folder_server_started';
  readonly baseUrl: string;
  readonly rootDir: string;
};

type EngineEventFolderServerStopped = EngineEventBase & {
  readonly type: 'folder_server_stopped';
};

type EngineEventFolderRoutesDetected = EngineEventBase & {
  readonly type: 'folder_routes_detected';
  readonly count: number;
  readonly cap: number;
};

type EngineEventFolderRoutesFallback = EngineEventBase & {
  readonly type: 'folder_routes_fallback';
  readonly reason: 'no_routes_detected';
};

type EngineEventFolderRoutesTruncated = EngineEventBase & {
  readonly type: 'folder_routes_truncated';
  readonly cap: number;
  readonly count: number;
};

type EngineEventFolderCombosTruncated = EngineEventBase & {
  readonly type: 'folder_combos_truncated';
  readonly maxCombos: number;
  readonly combosDetected: number;
  readonly combosUsed: number;
};

type EngineEventPayload =
  | EngineEventRunStarted
  | EngineEventProgress
  | EngineEventArtifactWritten
  | EngineEventRunCompleted
  | EngineEventFolderServerStarted
  | EngineEventFolderServerStopped
  | EngineEventFolderRoutesDetected
  | EngineEventFolderRoutesFallback
  | EngineEventFolderRoutesTruncated
  | EngineEventFolderCombosTruncated;

export type { EngineEventPayload };
