import { z } from 'zod';

/**
 * Supported AI providers for Signaler Cortex
 */
export type AiProviderType = 'openai' | 'anthropic' | 'google' | 'ollama' | 'local';

/**
 * Configuration for the Cortex AI module
 */
export const CortexConfigSchema = z.object({
    provider: z.enum(['openai', 'anthropic', 'google', 'ollama', 'local']).default('openai'),
    model: z.string().optional(),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    temperature: z.number().min(0).max(2).default(0.1),
    maxTokens: z.number().int().positive().optional(),
});

export type CortexConfig = z.infer<typeof CortexConfigSchema>;

/**
 * Standard request for AI completion
 */
export interface CompletionRequest {
    systemPrompt?: string;
    userPrompt: string;
    jsonMode?: boolean;
}

/**
 * Standard response from AI completion
 */
export interface CompletionResponse {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    raw?: any;
}

/**
 * Interface that all AI providers must implement
 */
export interface AiProvider {
    /**
     * Generates a text completion based on the prompt
     */
    generate(request: CompletionRequest): Promise<CompletionResponse>;

    /**
     * Returns metadata about the provider (e.g., model name)
     */
    getMetadata(): { provider: AiProviderType; model: string };
}
