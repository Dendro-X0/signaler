export interface PatchChange {
    readonly path: string;
    readonly original: string;
    readonly replacement: string;
}

export interface RemediationResult {
    readonly success: boolean;
    readonly error?: string;
    readonly patch?: string;
    readonly modifiedFiles: readonly string[];
}
