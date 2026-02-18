import { AiProvider } from './types.js';
import { ContextEngine } from './context/context-engine.js';
import { BaseAgent } from './agents/base-agent.js';
import { PerformanceAgent } from './agents/performance-agent.js';
import { A11yAgent } from './agents/a11y-agent.js';
import { GeneralAgent } from './agents/general-agent.js';
import { AuditIssue } from './agents/types.js';
import { AgentCache } from './cache.js';

/**
 * Dispatches audit issues to the appropriate specialized agent.
 */
export class AgentDispatcher {
    private readonly provider: AiProvider;
    private readonly contextEngine: ContextEngine;
    private readonly cache: AgentCache;

    constructor(provider: AiProvider, contextEngine: ContextEngine) {
        this.provider = provider;
        this.contextEngine = contextEngine;
        this.cache = new AgentCache();
    }

    /**
     * Resolves the correct agent for a given issue.
     */
    public getAgentForIssue(issue: AuditIssue): BaseAgent {
        switch (issue.category) {
            case 'performance':
                return new PerformanceAgent(this.provider, this.contextEngine, {}, this.cache);
            case 'accessibility':
                return new A11yAgent(this.provider, this.contextEngine, {}, this.cache);
            default:
                return new GeneralAgent(this.provider, this.contextEngine, {}, this.cache);
        }
    }
}
