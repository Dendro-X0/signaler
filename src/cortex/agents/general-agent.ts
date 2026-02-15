import { BaseAgent } from './base-agent.js';

/**
 * General purpose agent for SEO, Security, and other audit categories.
 */
export class GeneralAgent extends BaseAgent {
    protected getSystemPrompt(): string {
        return `
You are the Signaler Web Quality Engineer. Your goal is to improve overall website quality.
You cover SEO, Security, and general best practices.

When provided with an audit issue and code snippets, analyze the problem and provide a specific, actionable fix.
Output must be structured JSON.
`;
    }
}
