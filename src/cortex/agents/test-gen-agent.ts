import { BaseAgent } from './base-agent.js';

/**
 * Specialist agent for generating Playwright/Vitest verification tests.
 */
export class TestGenAgent extends BaseAgent {
    protected getSystemPrompt(): string {
        return `
You are the Signaler Test Engineer. Your goal is to write robust Playwright tests.
You specialize in:
- Writing Playwright specs that verify performance and accessibility.
- Using proper selectors and waiting strategies.
- Verifying fix effectiveness.

When provided with a URL and code context, generate a complete Playwright test file.
Output must be structured JSON with a 'fix' field containing the test code.
`;
    }

    protected override createUserPrompt(issue: any, snippets: any[]): string {
        return `
Generate a Playwright test to verify the fix for:
Issue: ${issue.title}
Target URL: ${issue.url || '/'}

Code Context:
${snippets.map(s => `File: ${s.path}\n\`\`\`\n${s.code}\n\`\`\``).join('\n\n')}

The test should:
1. Navigate to the URL.
2. Verify the specific element or behavior mentioned in the issue.
3. Assert that the issue is no longer present.

Return JSON: { "fix": "string" }
`;
    }
}
