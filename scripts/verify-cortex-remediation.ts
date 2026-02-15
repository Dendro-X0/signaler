import fs from 'node:fs';
import path from 'node:path';
import { PatchApplier } from '../src/cortex/remediation/patch-applier.js';
import { PatchGenerator } from '../src/cortex/remediation/patch-generator.js';

async function main() {
    console.log('--- Phase 4 Automated Remediation Verification ---');

    const cwd = process.cwd();
    const testFile = path.join(cwd, 'scripts', 'temp-fix-test.txt');

    // 1. Setup "broken" state
    console.log('1. Setting up test file...');
    const originalContent = 'export function hello() {\n  console.log("Fix me!");\n}';
    fs.writeFileSync(testFile, originalContent, 'utf8');

    // 2. Generate Patch
    console.log('2. Generating patch...');
    const generator = new PatchGenerator();
    const patch = generator.createPatch(
        'scripts/temp-fix-test.txt',
        'console.log("Fix me!");',
        'console.log("Fixed by Signaler Cortex!");'
    );
    console.log('Proposed Diff:', generator.formatDiff(patch));

    // 3. Apply Patch
    console.log('3. Applying patch...');
    const applier = new PatchApplier(cwd);
    const result = await applier.applyChanges([patch]);

    if (result.success) {
        console.log('Success: Modified files:', result.modifiedFiles);
        const updatedContent = fs.readFileSync(testFile, 'utf8');
        console.log('Updated Content:\n', updatedContent);

        if (updatedContent.includes('Fixed by Signaler Cortex!')) {
            console.log('\n✅ VERIFICATION PASSED: Patch applied correctly.');
        } else {
            console.log('\n❌ VERIFICATION FAILED: Content mismatch.');
        }
    } else {
        console.log('Error:', result.error);
    }

    // Cleanup
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
}

main().catch(console.error);
