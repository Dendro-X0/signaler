import fs from 'node:fs';
import path from 'node:path';
import { TechStack } from './types.js';

/**
 * Detects the technology stack of the project by analyzing configuration files.
 */
export class TechStackDetector {
    private readonly cwd: string;

    constructor(cwd: string = process.cwd()) {
        this.cwd = cwd;
    }

    /**
     * Performs detection and returns the identified tech stack.
     */
    public async detect(): Promise<TechStack> {
        const pkg = this.readPackageJson();
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        return {
            framework: this.detectFramework(deps),
            language: this.detectLanguage(),
            styling: this.detectStyling(deps),
            router: this.detectRouter(deps),
        };
    }

    private readPackageJson(): any {
        const pkgPath = path.join(this.cwd, 'package.json');
        if (!fs.existsSync(pkgPath)) return {};
        try {
            return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        } catch {
            return {};
        }
    }

    private detectFramework(deps: Record<string, string>): TechStack['framework'] {
        if (deps.next) return 'next';
        if (deps.nuxt) return 'nuxt';
        if (deps['@remix-run/react']) return 'remix';
        if (deps.svelte) return 'sveltekit';
        if (deps.astro) return 'astro';
        return 'unknown';
    }

    private detectLanguage(): TechStack['language'] {
        return fs.existsSync(path.join(this.cwd, 'tsconfig.json')) ? 'typescript' : 'javascript';
    }

    private detectStyling(deps: Record<string, string>): string[] {
        const styles: string[] = [];
        if (deps.tailwindcss) styles.push('tailwind');
        if (deps['styled-components']) styles.push('styled-components');
        if (deps['@emotion/react']) styles.push('emotion');
        return styles;
    }

    private detectRouter(deps: Record<string, string>): TechStack['router'] {
        if (deps.next) {
            // Check for app directory vs pages directory
            const hasApp = fs.existsSync(path.join(this.cwd, 'app')) || fs.existsSync(path.join(this.cwd, 'src', 'app'));
            return hasApp ? 'app-router' : 'pages-router';
        }
        return 'unknown';
    }
}
