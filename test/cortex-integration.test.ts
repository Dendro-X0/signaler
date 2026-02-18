import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentDispatcher } from '../src/cortex/agent-dispatcher.js';
import { ContextEngine } from '../src/cortex/context/context-engine.js';
import { AiProvider, CompletionRequest, CompletionResponse } from '../src/cortex/types.js';
import { AuditIssue } from '../src/cortex/agents/types.js';
import { AgentCache } from '../src/cortex/cache.js';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

// Mock Provider
class MockProvider implements AiProvider {
    public generate = vi.fn().mockResolvedValue({
        text: JSON.stringify({
            diagnosis: 'Mock Diagnosis',
            logic: 'Mock Logic',
            fix: 'Mock Fix',
            confidence: 0.9
        })
    });

    public getMetadata() {
        return { provider: 'local' as const, model: 'test-model' };
    }
}

// Mock Context Engine
const mockContextEngine = {
    init: vi.fn(),
    getContextForAudit: vi.fn().mockResolvedValue([{
        path: 'src/index.ts',
        code: 'console.log("hello")',
        startLine: 1,
        endLine: 1
    }])
} as unknown as ContextEngine;

describe('Cortex Stability & Efficiency', () => {
    let provider: MockProvider;
    let dispatcher: AgentDispatcher;
    const cachePath = join(process.cwd(), '.signaler', 'cortex-cache.json');

    beforeEach(async () => {
        try {
            await unlink(cachePath);
        } catch { }

        provider = new MockProvider();
        dispatcher = new AgentDispatcher(provider, mockContextEngine);
    });

    it('should use cache for identical requests', async () => {
        const issue: AuditIssue = {
            id: 'test-issue',
            title: 'Test Issue',
            description: 'Description',
            category: 'performance',
            url: '/test',
            selector: '.header'
        };

        const agent = dispatcher.getAgentForIssue(issue);

        // First run - should call provider
        await agent.analyze(issue);
        expect(provider.generate).toHaveBeenCalledTimes(1);

        // Second run - should use cache
        await agent.analyze(issue);
        expect(provider.generate).toHaveBeenCalledTimes(1);
    });

    it('should retry on malformed JSON response', async () => {
        const issue: AuditIssue = {
            id: 'retry-issue',
            title: 'Retry Issue',
            description: 'Description',
            category: 'performance',
            url: '/retry'
        };

        // First call fails JSON parse
        provider.generate
            .mockResolvedValueOnce({ text: 'Invalid JSON' })
            .mockResolvedValueOnce({
                text: JSON.stringify({
                    diagnosis: 'Recovered',
                    confidence: 0.8
                })
            });

        const agent = dispatcher.getAgentForIssue(issue);
        const result = await agent.analyze(issue);

        expect(provider.generate).toHaveBeenCalledTimes(2);
        expect(result.diagnosis).toBe('Recovered');
    });

    it('should fail gracefully after max retries', async () => {
        const issue: AuditIssue = {
            id: 'fail-issue',
            title: 'Fail Issue',
            description: 'Description',
            category: 'performance',
            url: '/fail'
        };

        // Always fail
        provider.generate.mockResolvedValue({ text: 'Invalid JSON' });

        const agent = dispatcher.getAgentForIssue(issue);
        const result = await agent.analyze(issue);

        expect(provider.generate).toHaveBeenCalledTimes(2); // Initial + 1 retry (maxAttempts=2)
        expect(result.diagnosis).toBe('Failed to generate analysis');
        expect(result.confidence).toBe(0);
    });
});
