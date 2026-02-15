import fs from 'node:fs';
import path from 'node:path';
import { PatchChange, RemediationResult } from './types.js';

/**
 * Applies patches to the local file system.
 */
export class PatchApplier {
    private readonly cwd: string;

    constructor(cwd: string = process.cwd()) {
        this.cwd = cwd;
    }

    /**
     * Applies a set of changes to the files.
     */
    public async applyChanges(changes: PatchChange[]): Promise<RemediationResult> {
        const modifiedFiles: string[] = [];

        try {
            for (const change of changes) {
                const fullPath = path.join(this.cwd, change.path);
                if (!fs.existsSync(fullPath)) {
                    throw new Error(`File not found: ${change.path}`);
                }

                const content = fs.readFileSync(fullPath, 'utf8');

                // Safety check: ensure original content matches
                if (!content.includes(change.original)) {
                    throw new Error(`Original content not found in ${change.path}. Patch may be stale.`);
                }

                const updatedContent = content.replace(change.original, change.replacement);
                fs.writeFileSync(fullPath, updatedContent, 'utf8');
                modifiedFiles.push(change.path);
            }

            return { success: true, modifiedFiles };
        } catch (err: any) {
            return {
                success: false,
                error: err.message,
                modifiedFiles,
            };
        }
    }
}
