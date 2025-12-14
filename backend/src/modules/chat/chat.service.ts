import { Injectable, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { ChatMessageDto, ChatResponse } from './dto/chat.dto';
import { PapersService } from '../papers/papers.service';

@Injectable()
export class ChatService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(
    private configService: ConfigService,
    private papersService: PapersService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash - best quality and still has quota
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
    });
    console.log('✅ Gemini API initialized with model: gemini-2.5-flash');
  }

  async chat(chatDto: ChatMessageDto): Promise<ChatResponse> {
    try {
      let contextText = '';

      // If paperId is provided, get paper context
      if (chatDto.paperId) {
        const paper = await this.papersService.findOne(chatDto.paperId);
        
        // Use fullText if available, otherwise fallback to abstract
        const paperContent = paper.fullText || paper.abstract || 'No content available';
        
        // Truncate content to fit within token limits (6000 tokens = ~24000 chars)
        const truncatedContent = this.truncateContent(paperContent, 6000);
        
        contextText = `
Context about the paper:
Title: ${paper.title}
Authors: ${paper.authors}
Publication Year: ${paper.publicationYear}
Journal: ${paper.journal || 'Not specified'}

Full Paper Content:
${truncatedContent}

`;
      }

      // Add custom paper context if provided
      if (chatDto.paperContext) {
        contextText += `\nAdditional Context:\n${chatDto.paperContext}\n`;
      }

      const prompt = contextText
        ? `${contextText}\nBased on the above paper context, please answer the following question:\n\n${chatDto.message}`
        : chatDto.message;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        response: text,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error in chat service:', error);
      throw new BadRequestException(
        'Failed to generate response. Please try again.',
      );
    }
  }

  // Get suggested prompts for a paper
  getSuggestedPrompts(): string[] {
    return [
      "Summarize the main contributions of this paper",
      "What are the key findings and conclusions?",
      "Explain the methodology used in this research",
      "What are the limitations of this study?",
      "How does this paper compare to related work?",
      "What future research directions are suggested?",
      "Explain the key concepts in simple terms",
      "What datasets or experiments were used?",
      "What are the practical applications of this research?",
      "Identify potential biases or issues in the study"
    ];
  }

  /**
   * Truncate content to fit within token limits for AI model
   * Preserves beginning (60%) and end (20%) to maintain context
   * @param content - Full text content
   * @param maxTokens - Maximum tokens allowed (default: 6000)
   * @returns Truncated content
   */
  private truncateContent(content: string, maxTokens: number = 6000): string {
    // Estimate: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    
    if (content.length <= maxChars) {
      return content;
    }

    // Take first 60% and last 20% to preserve intro and conclusions
    const firstPartLength = Math.floor(maxChars * 0.6);
    const lastPartLength = Math.floor(maxChars * 0.2);
    
    const firstPart = content.substring(0, firstPartLength);
    const lastPart = content.substring(content.length - lastPartLength);
    
    return `${firstPart}\n\n[... Middle section truncated for brevity ...]\n\n${lastPart}`;
  }
}
