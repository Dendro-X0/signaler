import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { AiProvider, AiProviderType, CompletionRequest, CompletionResponse, CortexConfig } from '../types.js';

/**
 * Implementation of AI provider using OpenAI
 */
export class OpenAIProvider implements AiProvider {
    private readonly config: CortexConfig;
    private readonly modelName: string;

    constructor(config: CortexConfig) {
        this.config = config;
        this.modelName = config.model || 'gpt-4o';
    }

    getMetadata(): { provider: AiProviderType; model: string } {
        return {
            provider: 'openai',
            model: this.modelName,
        };
    }

    async generate(request: CompletionRequest): Promise<CompletionResponse> {
        const openai = createOpenAI({
            apiKey: this.config.apiKey,
            baseURL: this.config.baseUrl,
        });

        const { text, usage, response } = await generateText({
            model: openai(this.modelName),
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
