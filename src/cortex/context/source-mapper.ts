import fs from 'node:fs';
import path from 'node:path';
import { FileContext, TechStack } from './types.js';

/**
 * Maps URLs and DOM elements back to source code files.
 */
export class SourceMapper {
    private readonly cwd: string;
    private readonly techStack: TechStack;

    constructor(techStack: TechStack, cwd: string = process.cwd()) {
        this.techStack = techStack;
        this.cwd = cwd;
    }

    /**
     * Maps a URL pathname to a set of potential source files.
     */
    public async mapUrlToFile(pathname: string): Promise<FileContext[]> {
        const potentialPaths = this.getPotentialPaths(pathname);
        const results: FileContext[] = [];

        for (const p of potentialPaths) {
            const fullPath = path.join(this.cwd, p);
            const exists = fs.existsSync(fullPath);
            results.push({
                path: p,
                exists,
                confidence: exists ? 0.9 : 0.1,
            });
        }

        return results.sort((a, b) => b.confidence - a.confidence);
    }

    private getPotentialPaths(pathname: string): string[] {
        const normalizedPath = pathname === '/' ? 'index' : pathname.replace(/^\/|\/$/g, '');
        const paths: string[] = [];

        if (this.techStack.framework === 'next') {
            if (this.techStack.router === 'app-router') {
                const subPath = pathname === '/' ? '' : normalizedPath;
                paths.push(path.join('app', subPath, 'page.tsx'));
                paths.push(path.join('src', 'app', subPath, 'page.tsx'));
            } else {
                paths.push(path.join('pages', `${normalizedPath}.tsx`));
                paths.push(path.join('src', 'pages', `${normalizedPath}.tsx`));
                paths.push(path.join('pages', normalizedPath, 'index.tsx'));
            }
        }

        // Generic fallback
        paths.push(path.join('src', `${normalizedPath}.tsx`));
        paths.push(path.join('src', `${normalizedPath}.ts`));
        paths.push(path.join('src', `${normalizedPath}.js`));
        paths.push(path.join('src', 'index.ts'));
        paths.push(path.join('src', 'index.js'));

        return [...new Set(paths)];
    }

    /**
     * Searches for a DOM element (by class or ID) within a list of files.
     */
    public async findElementInFiles(selector: string, files: string[]): Promise<FileContext | null> {
        // Simple heuristic: search for class or ID string in file content
        const searchString = selector.replace(/^[.#]/, '');

        for (const file of files) {
            const fullPath = path.join(this.cwd, file);
            if (!fs.existsSync(fullPath)) continue;

            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes(searchString)) {
                return { path: file, exists: true, confidence: 0.8 };
            }
        }

        return null;
    }
}
