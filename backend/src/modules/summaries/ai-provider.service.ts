import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiModel {
  name: string;
  modelId: string;
  priority: number;
  maxTokens: number;
  description: string;
}

@Injectable()
export class AIProviderService {
  private readonly logger = new Logger(AIProviderService.name);
  private genAI: GoogleGenerativeAI;
  private models: GeminiModel[] = [];

  constructor(private configService: ConfigService) {
    this.initializeGeminiModels();
  }

  private initializeGeminiModels() {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    
    if (!geminiKey) {
      this.logger.error('❌ GEMINI_API_KEY not configured!');
      throw new Error('GEMINI_API_KEY is required');
    }

    this.genAI = new GoogleGenerativeAI(geminiKey);

    // Define all available Gemini models in priority order (Updated Dec 2025)
    this.models = [
      {
        name: 'Gemini 2.5 Flash',
        modelId: 'gemini-2.5-flash',
        priority: 1,
        maxTokens: 65536,
        description: 'Stable Gemini 2.5 Flash (June 2025) - 1M input tokens, 64K output',
      },
      {
        name: 'Gemini 2.5 Flash-Lite',
        modelId: 'gemini-2.5-flash-lite',
        priority: 2,
        maxTokens: 65536,
        description: 'Gemini 2.5 Flash-Lite (July 2025) - Fast and efficient',
      },
      {
        name: 'Gemini 2.5 Pro',
        modelId: 'gemini-2.5-pro',
        priority: 3,
        maxTokens: 65536,
        description: 'Gemini 2.5 Pro (June 2025) - Highest quality, 1M input tokens',
      },
      {
        name: 'Gemini 2.0 Flash',
        modelId: 'gemini-2.0-flash',
        priority: 4,
        maxTokens: 8192,
        description: 'Gemini 2.0 Flash - Fast and versatile',
      },
      {
        name: 'Gemini 2.0 Flash-Lite',
        modelId: 'gemini-2.0-flash-lite',
        priority: 5,
        maxTokens: 8192,
        description: 'Gemini 2.0 Flash-Lite - Lightweight and efficient',
      },
    ]

    this.logger.log(`✅ Initialized ${this.models.length} Gemini models for automatic fallback`);
    this.models.forEach(m => {
      this.logger.log(`   ${m.priority}. ${m.name} (${m.modelId}) - ${m.description}`);
    });
  }

  /**
   * Generate text with automatic fallback across all Gemini models
   */
  async generateWithFallback(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{ text: string; provider: string; model: string }> {
    const errors: string[] = [];

    // Try each model in priority order
    for (const model of this.models) {
      try {
        this.logger.log(`🔄 Trying ${model.name} (${model.modelId})...`);
        
        const text = await this.generateWithModel(model.modelId, prompt, {
          maxTokens: Math.min(options?.maxTokens || 4096, model.maxTokens),
          temperature: options?.temperature || 0.7,
        });

        this.logger.log(`✅ Success with ${model.name}`);
        
        return {
          text,
          provider: 'Gemini',
          model: model.name,
        };
      } catch (error) {
        const errorMsg = error.message || error.toString();
        
        if (this.isQuotaError(error)) {
          this.logger.warn(`⚠️ ${model.name} quota exceeded, trying next model...`);
          errors.push(`${model.name}: Quota exceeded`);
          continue; // Try next model
        }
        
        // For non-quota errors, log but continue to next model
        this.logger.error(`❌ ${model.name} error: ${errorMsg}`);
        errors.push(`${model.name}: ${errorMsg}`);
        continue;
      }
    }

    // All models failed
    const errorSummary = errors.join('; ');
    this.logger.error(`❌ All Gemini models failed: ${errorSummary}`);
    throw new Error(`All Gemini models exhausted. Errors: ${errorSummary}`);
  }

  /**
   * Generate text with a specific Gemini model
   */
  private async generateWithModel(
    modelId: string,
    prompt: string,
    options: { maxTokens: number; temperature: number }
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: modelId,
      generationConfig: {
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  /**
   * Check if error is related to quota/rate limits
   */
  private isQuotaError(error: any): boolean {
    const errorStr = JSON.stringify(error).toLowerCase();
    const messageStr = (error.message || '').toLowerCase();
    
    return (
      error.status === 429 ||
      error.statusCode === 429 ||
      messageStr.includes('quota') ||
      messageStr.includes('limit') ||
      messageStr.includes('rate') ||
      messageStr.includes('resource has been exhausted') ||
      messageStr.includes('429') ||
      errorStr.includes('quota') ||
      errorStr.includes('resource_exhausted')
    );
  }

  /**
   * Get list of available models
   */
  getAvailableModels(): GeminiModel[] {
    return this.models;
  }

  /**
   * Check if service is available
   */
  hasAvailableProvider(): boolean {
    return this.models.length > 0;
  }

  /**
   * Get current provider info
   */
  getCurrentProvider(): string {
    return 'Google Gemini (Multi-model fallback)';
  }

  /**
   * Get all providers (for compatibility)
   */
  getAvailableProviders(): string[] {
    return this.models.map(m => `${m.name} (${m.modelId})`);
  }
}
