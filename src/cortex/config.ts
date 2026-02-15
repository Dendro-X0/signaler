import fs from 'node:fs';
import path from 'node:path';
import { CortexConfig, CortexConfigSchema } from './types.js';

/**
 * Loads the Cortex configuration from various sources
 */
export async function loadCortexConfig(cwd: string = process.cwd()): Promise<CortexConfig> {
    const configFiles = [
        '.signalerrc',
        '.signalerrc.json',
        'signaler.json'
    ];

    let rawConfig: any = {};

    // 1. Try loading from config files
    for (const file of configFiles) {
        const filePath = path.join(cwd, file);
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                rawConfig = JSON.parse(content).ai || {};
                break;
            } catch (err) {
                console.warn(`Failed to parse config file ${file}:`, err);
            }
        }
    }

    // 2. Try loading from package.json
    const packageJsonPath = path.join(cwd, 'package.json');
    if (Object.keys(rawConfig).length === 0 && fs.existsSync(packageJsonPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            rawConfig = pkg.signaler?.ai || {};
        } catch (err) {
            // Ignore package.json parsing errors
        }
    }

    // 3. Override with environment variables
    if (process.env.SIGNALER_AI_PROVIDER) rawConfig.provider = process.env.SIGNALER_AI_PROVIDER;
    if (process.env.SIGNALER_AI_MODEL) rawConfig.model = process.env.SIGNALER_AI_MODEL;
    if (process.env.SIGNALER_AI_KEY) rawConfig.apiKey = process.env.SIGNALER_AI_KEY;
    if (process.env.SIGNALER_AI_URL) rawConfig.baseUrl = process.env.SIGNALER_AI_URL;

    // Validate and return
    return CortexConfigSchema.parse(rawConfig);
}

/**
 * Saves the Cortex configuration to .signalerrc
 */
export async function saveCortexConfig(config: CortexConfig, cwd: string = process.cwd()): Promise<void> {
    const filePath = path.join(cwd, '.signalerrc');
    let existing: any = {};

    if (fs.existsSync(filePath)) {
        try {
            existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (err) {
            // New file or corrupted
        }
    }

    const updated = {
        ...existing,
        ai: config
    };

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
}
