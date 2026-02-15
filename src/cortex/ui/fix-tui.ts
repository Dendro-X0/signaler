import prompts from 'prompts';
import { AgentDispatcher } from '../agent-dispatcher.js';
import { ContextEngine } from '../context/context-engine.js';
import { AuditIssue } from '../agents/types.js';
import { PatchGenerator } from '../remediation/patch-generator.js';
import { PatchApplier } from '../remediation/patch-applier.js';
import { AiProvider } from '../types.js';

/**
 * Handles the interactive remediation (Fix) flow.
 */
export async function runFixFlow(provider: AiProvider, contextEngine: ContextEngine) {
    console.log('\n--- 🪄 Signaler Fix Mode ---');

    const dispatcher = new AgentDispatcher(provider, contextEngine);
    const patchGenerator = new PatchGenerator();
    const patchApplier = new PatchApplier(contextEngine.getCwd());

    // Mock issues for the interactive demo
    // In production, these would come from .signaler/summary.json
    const issues: AuditIssue[] = [
        { id: '1', title: 'Large Unoptimized Image', description: 'Hero image is 1.2MB, should be WebP.', category: 'performance', selector: 'img.hero', url: '/' },
        { id: '2', title: 'Missing Alt Text', description: 'Logo image is missing alt attribute.', category: 'accessibility', selector: 'img.logo', url: '/about' },
    ];

    const { issueId } = await prompts({
        type: 'select',
        name: 'issueId',
        message: 'Select an issue to fix',
        choices: [
            ...issues.map(i => ({ title: `[${i.category.toUpperCase()}] ${i.title}`, value: i.id })),
            { title: '↩ Back', value: 'back' }
        ]
    });

    if (!issueId || issueId === 'back') return;

    const issue = issues.find(i => i.id === issueId)!;
    console.log(`\nAnalyzing issue: ${issue.title}...`);

    const agent = dispatcher.getAgentForIssue(issue);
    const result = await agent.analyze(issue);

    console.log('\n--- AI Diagnosis ---');
    console.log(result.diagnosis);
    console.log('\n--- Proposed Fix ---');
    console.log(result.fix);

    const { confirm } = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: 'Apply this fix? (Generates a patch)',
        initial: true
    });

    if (confirm) {
        // Here we would actually use the patch applier
        console.log('\nApplying patch...');

        // Demo patch generation
        const patch = patchGenerator.createPatch(
            'src/components/Hero.tsx', // Mocked path
            '<img src="hero.jpg" />',
            '<img src="hero.webp" loading="lazy" />'
        );

        const applyResult = await patchApplier.applyChanges([patch]);
        if (applyResult.success) {
            console.log('✅ Fix applied successfully!');
        } else {
            console.log(`❌ Failed to apply fix: ${applyResult.error}`);
        }
    }
}
