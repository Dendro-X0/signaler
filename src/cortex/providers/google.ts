import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { AiProvider, AiProviderType, CompletionRequest, CompletionResponse, CortexConfig } from '../types.js';

/**
 * Implementation of AI provider using Google Gemini
 */
export class GoogleProvider implements AiProvider {
    private readonly config: CortexConfig;
    private readonly modelName: string;

    constructor(config: CortexConfig) {
        this.config = config;
        this.modelName = config.model || 'gemini-1.5-pro';
    }

    getMetadata(): { provider: AiProviderType; model: string } {
        return {
            provider: 'google',
            model: this.modelName,
        };
    }

    async generate(request: CompletionRequest): Promise<CompletionResponse> {
        const google = createGoogleGenerativeAI({
            apiKey: this.config.apiKey,
            baseURL: this.config.baseUrl,
        });

        const { text, usage, response } = await generateText({
            model: google(this.modelName),
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
