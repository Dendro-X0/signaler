export type FrameworkType = 'next' | 'nuxt' | 'remix' | 'sveltekit' | 'astro' | 'unknown';
export type LanguageType = 'typescript' | 'javascript';
export type RouterType = 'app-router' | 'pages-router' | 'file-system' | 'unknown';

export interface TechStack {
    readonly framework: FrameworkType;
    readonly language: LanguageType;
    readonly styling: readonly string[];
    readonly router: RouterType;
}

export interface FileContext {
    readonly path: string;
    readonly confidence: number;
    readonly exists: boolean;
}

export interface SnippetContext {
    readonly path: string;
    readonly code: string;
    readonly startLine: number;
    readonly endLine: number;
}
