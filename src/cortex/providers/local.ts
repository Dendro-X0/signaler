import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { AiProvider, AiProviderType, CompletionRequest, CompletionResponse, CortexConfig } from '../types.js';

/**
 * Implementation of AI provider for local endpoints (Ollama, LM Studio, etc.)
 * that are OpenAI-compatible.
 */
export class LocalProvider implements AiProvider {
    private readonly config: CortexConfig;
    private readonly modelName: string;
    private readonly type: AiProviderType;

    constructor(config: CortexConfig, type: AiProviderType = 'ollama') {
        this.config = config;
        this.type = type;
        this.modelName = config.model || (type === 'ollama' ? 'llama3' : 'local-model');
    }

    getMetadata(): { provider: AiProviderType; model: string } {
        return {
            provider: this.type,
            model: this.modelName,
        };
    }

    async generate(request: CompletionRequest): Promise<CompletionResponse> {
        // We use the OpenAI adapter but point it to a local base URL
        const local = createOpenAI({
            apiKey: this.config.apiKey || 'no-key-required',
            baseURL: this.config.baseUrl || 'http://127.0.0.1:11434/v1', // Default Ollama OpenAI-compatible port
        });

        const { text, usage, response } = await generateText({
            model: local(this.modelName),
            system: request.systemPrompt,
            prompt: request.userPrompt,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
        } as any);

        return {
            text,
            usage: usage ? {
                promptTokens: (usage as any).promptTokens,
                completionTokens: (usage as any).completionTokens,
                totalTokens: (usage as any).totalTokens,
            } : undefined,
            raw: response,
        };
    }
}
