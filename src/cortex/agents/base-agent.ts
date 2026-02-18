import { AiProvider } from '../types.js';
import { ContextEngine } from '../context/context-engine.js';
import { AuditIssue, AnalysisResult, AgentOptions } from './types.js';
import { AgentCache } from '../cache.js';

/**
 * Base class for all specialist agents.
 */
export abstract class BaseAgent {
    protected readonly provider: AiProvider;
    protected readonly contextEngine: ContextEngine;
    protected readonly options: AgentOptions;
    protected readonly cache?: AgentCache;

    constructor(provider: AiProvider, contextEngine: ContextEngine, options: AgentOptions = {}, cache?: AgentCache) {
        this.provider = provider;
        this.contextEngine = contextEngine;
        this.options = options;
        this.cache = cache;
    }

    /**
     * Executes the analysis loop: Get context -> Check Cache -> Generate prompt -> Get AI response -> Cache Result.
     */
    public async analyze(issue: AuditIssue): Promise<AnalysisResult> {
        const url = issue.url || '/';
        const snippets = await this.contextEngine.getContextForAudit(url, issue.selector);

        // Check Cache
        let cacheKey = '';
        let contentHash = '';
        if (this.cache) {
            const contextString = JSON.stringify(snippets) + issue.id + issue.selector;
            contentHash = this.cache.generateHash(contextString);
            cacheKey = this.cache.generateKey('analysis', issue.id, contentHash);

            const cached = await this.cache.get<AnalysisResult>(cacheKey);
            if (cached) {
                return cached;
            }
        }

        const systemPrompt = this.getSystemPrompt();
        const userPrompt = this.createUserPrompt(issue, snippets);

        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts) {
            try {
                const response = await this.provider.generate({
                    systemPrompt,
                    userPrompt: attempts > 0 ? userPrompt + "\n\nCRITICAL: Ensure the response is valid JSON." : userPrompt,
                    jsonMode: true,
                });

                const parsed = JSON.parse(response.text);
                const result: AnalysisResult = {
                    issueId: issue.id,
                    diagnosis: parsed.diagnosis || '',
                    logic: parsed.logic || '',
                    fix: parsed.fix || '',
                    snippets,
                    confidence: parsed.confidence || 0.5,
                };

                // Save to Cache
                if (this.cache && result.confidence > 0.3) {
                    await this.cache.set(cacheKey, result, contentHash);
                }

                return result;
            } catch (err) {
                attempts++;
                if (attempts >= maxAttempts) {
                    return {
                        issueId: issue.id,
                        diagnosis: 'Failed to generate analysis',
                        logic: `Error: ${(err as Error).message}`,
                        fix: 'N/A',
                        snippets,
                        confidence: 0,
                    };
                }
                // Backoff slightly before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
        }

        // Fallback (should be unreachable given the loop logic)
        return {
            issueId: issue.id,
            diagnosis: 'Analysis Failed',
            logic: 'Maximum retry attempts exceeded',
            fix: 'N/A',
            snippets,
            confidence: 0,
        };
    }

    protected abstract getSystemPrompt(): string;

    protected createUserPrompt(issue: AuditIssue, snippets: any[]): string {
        return `
Audit Issue:
ID: ${issue.id}
Title: ${issue.title}
Description: ${issue.description}
Category: ${issue.category}
Selector: ${issue.selector || 'N/A'}

Code Context:
${snippets.map(s => `File: ${s.path} (Lines ${s.startLine}-${s.endLine})\n\`\`\`\n${s.code}\n\`\`\``).join('\n\n')}

Analyze this issue and provide a structured JSON response with:
- diagnosis: A brief explanation of the problem.
- logic: The technical reasoning behind the fix.
- fix: Specific code changes or configuration updates.
- confidence: Your confidence score (0-1).
`;
    }
}
