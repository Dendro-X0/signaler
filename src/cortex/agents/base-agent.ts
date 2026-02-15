import { AiProvider } from '../types.js';
import { ContextEngine } from '../context/context-engine.js';
import { AuditIssue, AnalysisResult, AgentOptions } from './types.js';

/**
 * Base class for all specialist agents.
 */
export abstract class BaseAgent {
    protected readonly provider: AiProvider;
    protected readonly contextEngine: ContextEngine;
    protected readonly options: AgentOptions;

    constructor(provider: AiProvider, contextEngine: ContextEngine, options: AgentOptions = {}) {
        this.provider = provider;
        this.contextEngine = contextEngine;
        this.options = options;
    }

    /**
     * Executes the analysis loop: Get context -> Generate prompt -> Get AI response.
     */
    public async analyze(issue: AuditIssue): Promise<AnalysisResult> {
        const url = issue.url || '/';
        const snippets = await this.contextEngine.getContextForAudit(url, issue.selector);

        const systemPrompt = this.getSystemPrompt();
        const userPrompt = this.createUserPrompt(issue, snippets);

        const response = await this.provider.generate({
            systemPrompt,
            userPrompt,
            jsonMode: true,
        });

        try {
            const parsed = JSON.parse(response.text);
            return {
                issueId: issue.id,
                diagnosis: parsed.diagnosis || '',
                logic: parsed.logic || '',
                fix: parsed.fix || '',
                snippets,
                confidence: parsed.confidence || 0.5,
            };
        } catch (err) {
            return {
                issueId: issue.id,
                diagnosis: 'Failed to parse AI response',
                logic: response.text,
                fix: 'N/A',
                snippets,
                confidence: 0,
            };
        }
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
