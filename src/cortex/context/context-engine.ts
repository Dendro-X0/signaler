import { TechStackDetector } from './tech-stack.js';
import { SourceMapper } from './source-mapper.js';
import { SnippetExtractor } from './snippet-extractor.js';
import { TechStack, SnippetContext } from './types.js';

/**
 * The Context Engine coordinates tech stack detection, source mapping, and code retrieval.
 */
export class ContextEngine {
    private readonly cwd: string;
    private techStack: TechStack | null = null;
    private sourceMapper: SourceMapper | null = null;
    private snippetExtractor: SnippetExtractor | null = null;

    constructor(cwd: string = process.cwd()) {
        this.cwd = cwd;
    }

    /**
     * Initializes the engine by detecting the tech stack.
     */
    public async init(): Promise<TechStack> {
        if (this.techStack && this.sourceMapper && this.snippetExtractor) {
            return this.techStack;
        }

        const detector = new TechStackDetector(this.cwd);
        this.techStack = await detector.detect();
        this.sourceMapper = new SourceMapper(this.techStack, this.cwd);
        this.snippetExtractor = new SnippetExtractor(this.cwd);
        return this.techStack;
    }

    /**
     * Attempts to find and extract code relevant to a URL and a specific selector.
     */
    public async getContextForAudit(pathname: string, selector?: string): Promise<SnippetContext[]> {
        if (!this.sourceMapper || !this.snippetExtractor) {
            await this.init();
        }

        const files = await this.sourceMapper!.mapUrlToFile(pathname);
        const snippets: SnippetContext[] = [];

        // 1. Try to find the selector in the likely files
        const existingFiles = files.filter(f => f.exists).map(f => f.path);

        let targetFile: string | null = null;
        if (selector && existingFiles.length > 0) {
            const found = await this.sourceMapper!.findElementInFiles(selector, existingFiles);
            if (found) targetFile = found.path;
        }

        // 2. Fallback to the most likely file for the route
        if (!targetFile && existingFiles.length > 0) {
            targetFile = existingFiles[0];
        }

        // 3. Extract snippets
        if (targetFile) {
            const snippet = await this.snippetExtractor!.extractSnippet(targetFile, selector);
            if (snippet) snippets.push(snippet);
        }

        return snippets;
    }

    public getTechStack(): TechStack | null {
        return this.techStack;
    }

    public getCwd(): string {
        return this.cwd;
    }
}
