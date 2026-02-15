import fs from 'node:fs';
import path from 'node:path';
import { SnippetContext } from './types.js';

/**
 * Extracts relevant code snippets from source files with token budget management.
 */
export class SnippetExtractor {
    private readonly cwd: string;
    private readonly maxTokens: number;

    constructor(cwd: string = process.cwd(), maxTokens: number = 2000) {
        this.cwd = cwd;
        this.maxTokens = maxTokens;
    }

    /**
     * Extracts a snippet from a file around a search term or a line number.
     */
    public async extractSnippet(filePath: string, searchTerm?: string): Promise<SnippetContext | null> {
        const fullPath = path.join(this.cwd, filePath);
        if (!fs.existsSync(fullPath)) return null;

        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        let targetLine = 0;
        if (searchTerm) {
            const foundIndex = lines.findIndex(line => line.includes(searchTerm));
            if (foundIndex !== -1) targetLine = foundIndex;
        }

        const windowSize = 15; // 15 lines before and after
        const startLine = Math.max(0, targetLine - windowSize);
        const endLine = Math.min(lines.length - 1, targetLine + windowSize);

        const snippetLines = lines.slice(startLine, endLine + 1);
        const snippetText = snippetLines.join('\n');

        // Basic token estimation (rough heuristic: 1 token ~= 4 characters)
        const estimatedTokens = Math.ceil(snippetText.length / 4);

        if (estimatedTokens > this.maxTokens) {
            // If too large, trim the lines further
            const trimmedLines = snippetLines.slice(5, -5);
            return {
                path: filePath,
                code: trimmedLines.join('\n'),
                startLine: startLine + 5,
                endLine: endLine - 5
            };
        }

        return {
            path: filePath,
            code: snippetText,
            startLine: startLine + 1, // 1-indexed for display
            endLine: endLine + 1
        };
    }
}
