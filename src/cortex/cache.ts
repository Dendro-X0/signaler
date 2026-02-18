import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    hash: string;
}

export class AgentCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private cacheFile: string;
    private loaded: boolean = false;

    constructor(cacheDir: string = '.signaler') {
        this.cacheFile = join(process.cwd(), cacheDir, 'cortex-cache.json');
    }

    private async load() {
        if (this.loaded) return;
        
        try {
            if (existsSync(this.cacheFile)) {
                const content = await readFile(this.cacheFile, 'utf-8');
                const data = JSON.parse(content);
                this.cache = new Map(Object.entries(data));
            }
        } catch (error) {
            // Ignore cache load errors, start fresh
        }
        this.loaded = true;
    }

    private async save() {
        try {
            await mkdir(dirname(this.cacheFile), { recursive: true });
            const data = Object.fromEntries(this.cache.entries());
            await writeFile(this.cacheFile, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            console.error('Failed to save Cortex cache:', error);
        }
    }

    public async get<T>(key: string, hash?: string): Promise<T | null> {
        await this.load();
        const entry = this.cache.get(key);
        
        if (!entry) return null;
        
        // precise hash check if provided (e.g. content hash)
        if (hash && entry.hash !== hash) return null;
        
        // simple expiry (e.g. 24h)
        if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    public async set<T>(key: string, data: T, hash: string = '') {
        await this.load();
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            hash
        });
        // Save asynchronously to avoid blocking
        this.save().catch(() => {});
    }

    public generateKey(prefix: string, ...parts: string[]): string {
        return `${prefix}:${parts.join(':')}`;
    }

    public generateHash(content: string): string {
        return createHash('md5').update(content).digest('hex');
    }
}
