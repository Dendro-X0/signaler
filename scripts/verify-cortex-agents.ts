import { AgentDispatcher } from '../src/cortex/agent-dispatcher.js';
import { ContextEngine } from '../src/cortex/context/context-engine.js';
import { AuditIssue } from '../src/cortex/agents/types.js';
import { AiProvider } from '../src/cortex/types.js';

// Mock Provider for testing
class MockProvider implements AiProvider {
    async generate(req: any): Promise<any> {
        return {
            text: JSON.stringify({
                diagnosis: 'Mock diagnosis',
                logic: 'Mock logic',
                fix: 'Mock fix',
                confidence: 0.99
            })
        };
    }
    getMetadata() {
        return { provider: 'local' as any, model: 'mock' };
    }
}

async function main() {
    console.log('--- Phase 3 Specialist Agents Verification ---');

    const provider = new MockProvider();
    const contextEngine = new ContextEngine(process.cwd());
    const dispatcher = new AgentDispatcher(provider, contextEngine);

    const issues: AuditIssue[] = [
        { id: '1', title: 'Slow LCP', description: 'Large Contentful Paint is slow', category: 'performance', selector: 'img.hero' },
        { id: '2', title: 'Missing Alt', description: 'Image missing alt text', category: 'accessibility', selector: 'img.logo' },
        { id: '3', title: 'Security Header', description: 'Missing CSP header', category: 'security' }
    ];

    for (const issue of issues) {
        console.log(`\nTesting Issue: ${issue.title} (${issue.category})`);
        const agent = dispatcher.getAgentForIssue(issue);
        console.log(`Routed to: ${agent.constructor.name}`);

        const result = await agent.analyze(issue);
        console.log('Analysis Result:', JSON.stringify(result, null, 2));
    }
}

main().catch(console.error);
