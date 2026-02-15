import { PatchChange } from './types.js';

/**
 * Generates patch changes from AI suggestions.
 */
export class PatchGenerator {
    /**
     * Parses an AI response (which should contain 'original' and 'replacement' blocks)
     * into a standard PatchChange format.
     */
    public createPatch(filePath: string, original: string, replacement: string): PatchChange {
        return {
            path: filePath,
            original: original.trim(),
            replacement: replacement.trim(),
        };
    }

    /**
     * Helper to wrap code in a standard diff-like structure for display.
     */
    public formatDiff(change: PatchChange): string {
        return `
File: ${change.path}
--- Original ---
${change.original}
--- Replacement ---
${change.replacement}
`;
    }
}
