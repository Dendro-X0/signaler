import { ContextEngine } from '../src/cortex/context/context-engine.js';

async function main() {
    console.log('--- Context Engine Verification ---');
    const engine = new ContextEngine(process.cwd());

    console.log('1. Initializing Engine...');
    const stack = await engine.init();
    console.log('Detected Tech Stack:', JSON.stringify(stack, null, 2));

    console.log('\n2. Testing Context Retrieval for URL "/"...');
    const context = await engine.getContextForAudit('/');
    console.log('Found Context:', JSON.stringify(context, null, 2));

    console.log('\n3. Testing Element Search for "SignalerAPI"...');
    const elementContext = await engine.getContextForAudit('/', 'SignalerAPI');
    console.log('Element Context:', JSON.stringify(elementContext, null, 2));
}

main().catch(console.error);
