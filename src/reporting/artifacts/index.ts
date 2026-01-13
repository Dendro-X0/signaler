/**
 * Artifact Management - Output artifact handling
 */

// Artifact management interfaces
export interface ArtifactManager {
  store(artifact: Artifact): Promise<string>;
  retrieve(id: string): Promise<Artifact | undefined>;
  list(): Promise<ArtifactInfo[]>;
}

export interface Artifact {
  id: string;
  type: string;
  content: Buffer | string;
  metadata: Record<string, unknown>;
}

export interface ArtifactInfo {
  id: string;
  type: string;
  size: number;
  createdAt: string;
}

// Re-export artifact components (will be added during migration)
// export * from './navigation.js';
// export * from './storage.js';