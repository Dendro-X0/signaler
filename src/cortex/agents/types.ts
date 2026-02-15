import { SnippetContext } from '../context/types.js';

export interface AuditIssue {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly category: 'performance' | 'accessibility' | 'security' | 'seo' | 'other';
    readonly impact?: string;
    readonly selector?: string;
    readonly url?: string;
}

export interface AnalysisResult {
    readonly issueId: string;
    readonly diagnosis: string;
    readonly logic: string;
    readonly fix: string;
    readonly snippets: readonly SnippetContext[];
    readonly confidence: number;
}

export interface AgentOptions {
    readonly temperature?: number;
    readonly maxTokens?: number;
}
