import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiSummary } from './ai-summary.entity';
import { Paper } from '../papers/paper.entity';

@Injectable()
export class SummariesService {
  private genAI: GoogleGenerativeAI;

  constructor(
    @InjectRepository(AiSummary)
    private summariesRepository: Repository<AiSummary>,
    @InjectRepository(Paper)
    private papersRepository: Repository<Paper>,
  ) {
    // Initialize Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not found in environment variables');
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      console.log('✅ Gemini API initialized successfully');
    }
  }

  async generateSummary(paperId: number, userId: number, forceRegenerate: boolean = false, provider: string = 'gemini'): Promise<AiSummary> {
    console.log(`🤖 Generating summary for paper ${paperId} with provider: ${provider}`);
    
    // Verify paper exists and belongs to user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    // ✅ Check for fullText first (from PDF), fallback to abstract
    if (!paper.fullText && !paper.abstract) {
      throw new BadRequestException('Paper must have content (PDF with extracted text or abstract) to generate summary');
    }

    // Log content source
    const contentSource = paper.fullText ? 'Full PDF Content' : 'Abstract Only';
    const contentLength = paper.fullText ? paper.fullText.length : paper.abstract?.length || 0;
    console.log(`📄 Using ${contentSource} (${contentLength} characters) for summary generation`);

    // Check if summary already exists
    const existingSummary = await this.summariesRepository.findOne({
      where: { paperId },
    });

    if (existingSummary && !forceRegenerate) {
      console.log('📚 Returning existing summary');
      return existingSummary;
    }

    // Generate summary using Gemini AI
    let summaryText: string;
    let keyFindings: string[];

    if (provider === 'gemini') {
      console.log('🌟 Calling Gemini API to generate summary...');
      const result = await this.generateWithGemini(paper);
      summaryText = result.summary;
      keyFindings = result.keyFindings;
    } else {
      console.log('⚠️ Using placeholder summary (no AI provider specified)');
      // Fallback to placeholder
      summaryText = this.generatePlaceholderSummary(paper);
      keyFindings = this.extractPlaceholderKeyFindings(paper);
    }

    if (existingSummary) {
      // Update existing summary
      existingSummary.summary = summaryText;
      existingSummary.keyFindings = keyFindings;
      existingSummary.generatedAt = new Date();
      console.log('✅ Updated existing summary');
      return await this.summariesRepository.save(existingSummary);
    } else {
      // Create new summary
      const summary = this.summariesRepository.create({
        paperId,
        summary: summaryText,
        keyFindings,
      });
      console.log('✅ Created new summary');
      return await this.summariesRepository.save(summary);
    }
  }

  async getSummary(paperId: number, userId: number): Promise<AiSummary> {
    // Verify paper belongs to user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    const summary = await this.summariesRepository.findOne({
      where: { paperId },
      relations: ['paper'],
    });

    if (!summary) {
      throw new NotFoundException('Summary not found. Please generate it first.');
    }

    return summary;
  }

  async deleteSummary(paperId: number, userId: number): Promise<void> {
    // Verify paper belongs to user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    const summary = await this.summariesRepository.findOne({
      where: { paperId },
    });

    if (!summary) {
      throw new NotFoundException('Summary not found');
    }

    await this.summariesRepository.remove(summary);
  }

  // Generate summary using Google Gemini AI
  private async generateWithGemini(paper: Paper): Promise<{ summary: string; keyFindings: string[] }> {
    if (!this.genAI) {
      throw new BadRequestException('Gemini API is not configured. Please set GEMINI_API_KEY in environment variables.');
    }

    console.log('🌟 Calling Gemini API...');

    const model = this.genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash' });

    // ✅ Determine content source: prioritize fullText from PDF
    const hasFullText = paper.fullText && paper.fullText.length > 0;
    const contentSource = hasFullText ? 'Full Paper Content (from PDF)' : 'Abstract';
    
    // ✅ Use fullText if available, fallback to abstract
    let paperContent: string;
    if (hasFullText) {
      // Smart truncation for very long papers
      if (paper.fullText.length > 50000) {
        console.log(`⚠️ Paper very long (${paper.fullText.length} chars), applying smart truncation...`);
        paperContent = this.truncateContent(paper.fullText, 30000);
      } else {
        paperContent = paper.fullText;
      }
    } else {
      paperContent = paper.abstract || 'No content available';
    }

    console.log(`📄 Using ${contentSource} (${paperContent.length} characters)`);

    const prompt = `Analyze this academic paper and provide a comprehensive summary.

Paper Details:
- Title: ${paper.title}
- Authors: ${paper.authors}
- Year: ${paper.publicationYear || 'N/A'}
- Journal: ${paper.journal || 'N/A'}

Content Source: ${contentSource}

${hasFullText ? '==== FULL PAPER CONTENT ====' : '==== ABSTRACT ===='}
${paperContent}
${hasFullText ? '==== END OF FULL PAPER ====' : '==== END OF ABSTRACT ===='}

Please provide:
1. A ${hasFullText ? 'comprehensive' : 'concise'} summary (${hasFullText ? '4-6 paragraphs' : '2-3 paragraphs'}) that covers:
   - Main research question or objective
   - Methodology used ${hasFullText ? '(in detail with algorithms, datasets, experiments)' : ''}
   - Key results and findings ${hasFullText ? 'with specific numbers and metrics' : ''}
   - Significance and implications
   ${hasFullText ? '- Limitations and future work' : ''}

2. List ALL key findings from the paper as separate bullet points. ${hasFullText ? 'Extract findings from ALL sections: Introduction, Methodology, Results, Discussion, and Conclusion.' : 'Extract every significant finding from the abstract.'} Include as many findings as you can identify - do not limit to just 3-5 items.

Format your response as JSON:
{
  "summary": "Your detailed summary here...",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3", "Finding 4", "Finding 5", "...and more if available"]
}`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('📄 Raw Gemini response:', text);

      // Try to parse JSON response
      let parsed;
      try {
        // Remove markdown code blocks if present (both ```json and just ```)
        let cleanText = text.trim();
        
        // Remove code block markers
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }
        
        console.log('📝 Attempting to parse JSON...');
        parsed = JSON.parse(cleanText);
        console.log('✅ JSON parsed successfully');
      } catch (e) {
        console.warn('⚠️ Failed to parse JSON, using text extraction');
        console.warn('Parse error:', e.message);
        
        // Fallback: extract summary and findings from text using better regex
        try {
          // Try to extract JSON object from text
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            // Last resort: use the raw text
            parsed = {
              summary: text,
              keyFindings: ['Analysis completed by Gemini AI']
            };
          }
        } catch (e2) {
          parsed = {
            summary: text,
            keyFindings: ['Analysis completed by Gemini AI']
          };
        }
      }

      console.log('✅ Gemini summary generated successfully');
      
      return {
        summary: parsed.summary || text,
        keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : ['No specific findings extracted']
      };
    } catch (error) {
      console.error('❌ Gemini API error:', error);
      throw new BadRequestException(`Failed to generate summary with Gemini: ${error.message}`);
    }
  }

  // Placeholder methods - Replace with actual AI integration
  private generatePlaceholderSummary(paper: Paper): string {
    const keywords = paper.keywords?.split(',').slice(0, 3).join(', ') || 'various topics';
    return `This is an AI-generated summary of "${paper.title}". 
    
The paper, published in ${paper.publicationYear}, presents research on ${keywords}.

Abstract: ${paper.abstract}

This summary is a placeholder. Integrate with OpenAI API for actual AI-generated summaries.`;
  }

  private extractPlaceholderKeyFindings(paper: Paper): string[] {
    return [
      'Key finding 1: (Placeholder - integrate with OpenAI API)',
      'Key finding 2: (Placeholder - integrate with OpenAI API)',
      'Key finding 3: (Placeholder - integrate with OpenAI API)',
    ];
  }

  /**
   * Generate tag suggestions for a paper using AI
   * Returns a list of suggested tags based on paper metadata
   */
  async suggestTags(paperId: number, userId: number): Promise<{ suggested: string[]; confidence: number }> {
    console.log(`🏷️ Generating tag suggestions for paper ${paperId}`);
    
    // Verify paper exists and belongs to user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
      relations: ['tags'], // Load existing tags
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    // Generate tags using Gemini AI
    if (!this.genAI) {
      console.warn('⚠️ Gemini API not configured, returning keyword-based tags');
      return this.generateKeywordBasedTags(paper);
    }

    try {
      console.log('🌟 Calling Gemini API for tag suggestions...');
      const model = this.genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash' });

      const existingTags = paper.tags?.map(t => t.name).join(', ') || 'none';

      const prompt = `You are a research paper categorization expert. Analyze this academic paper and suggest relevant tags/keywords for organization.

Paper Details:
- Title: ${paper.title}
- Authors: ${paper.authors}
- Year: ${paper.publicationYear || 'N/A'}
- Journal: ${paper.journal || 'N/A'}
- Keywords: ${paper.keywords || 'N/A'}
- Existing Tags: ${existingTags}

Abstract:
${paper.abstract || 'No abstract available'}

Task:
1. Suggest 5-8 highly relevant tags/categories for this paper
2. Focus on: research domain, methodology, application area, key concepts
3. Make tags concise (1-3 words each)
4. Avoid duplicating existing tags
5. Use consistent naming (e.g., "Machine Learning" not "ML" or "machine learning")

Return ONLY a valid JSON object in this exact format (no markdown, no explanation):
{
  "tags": ["tag1", "tag2", "tag3", ...],
  "confidence": 0.95
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('🤖 Gemini response for tags:', text.substring(0, 200));

      // Parse response
      let parsed: { tags: string[]; confidence: number };
      
      try {
        // Try direct JSON parse
        const cleaned = text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (e1) {
        console.warn('⚠️ Failed to parse Gemini response, trying alternative parsing...');
        
        // Try to extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            // Fallback to keyword-based
            console.error('❌ Failed to parse Gemini JSON, using keyword fallback');
            return this.generateKeywordBasedTags(paper);
          }
        } else {
          return this.generateKeywordBasedTags(paper);
        }
      }

      // Validate and clean tags
      const suggestedTags = Array.isArray(parsed.tags) 
        ? parsed.tags
            .filter(tag => typeof tag === 'string' && tag.length > 0)
            .map(tag => tag.trim())
            .filter(tag => tag.length <= 50) // Max tag length
            .slice(0, 8) // Max 8 tags
        : [];

      const confidence = typeof parsed.confidence === 'number' 
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.85;

      console.log(`✅ Generated ${suggestedTags.length} tag suggestions with confidence ${confidence}`);

      return {
        suggested: suggestedTags,
        confidence,
      };

    } catch (error) {
      console.error('❌ Gemini API error for tags:', error);
      // Fallback to keyword-based tags
      return this.generateKeywordBasedTags(paper);
    }
  }

  /**
   * Generate tags based on paper keywords and title (fallback method)
   */
  private generateKeywordBasedTags(paper: Paper): { suggested: string[]; confidence: number } {
    const tags = new Set<string>();

    // Extract from keywords
    if (paper.keywords) {
      paper.keywords
        .split(/[,;]/)
        .map(k => k.trim())
        .filter(k => k.length > 0 && k.length <= 50)
        .slice(0, 5)
        .forEach(k => tags.add(k));
    }

    // Extract from title (common academic terms)
    const titleWords = paper.title.toLowerCase();
    const commonTerms = [
      'machine learning', 'deep learning', 'neural network', 'artificial intelligence',
      'data science', 'computer vision', 'natural language processing', 'nlp',
      'reinforcement learning', 'supervised learning', 'unsupervised learning',
      'algorithm', 'optimization', 'classification', 'regression', 'clustering',
      'survey', 'review', 'systematic review', 'meta-analysis',
      'case study', 'empirical study', 'experimental', 'theoretical',
      'blockchain', 'iot', 'cloud computing', 'edge computing',
      'cybersecurity', 'privacy', 'encryption', 'authentication',
    ];

    commonTerms.forEach(term => {
      if (titleWords.includes(term)) {
        // Capitalize first letter of each word
        const formatted = term
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        tags.add(formatted);
      }
    });

    // Add journal/venue as tag if available
    if (paper.journal && paper.journal.length <= 50) {
      tags.add(paper.journal);
    }

    return {
      suggested: Array.from(tags).slice(0, 6),
      confidence: 0.6, // Lower confidence for keyword-based
    };
  }

  /**
   * Truncate content intelligently for very long papers
   * Keeps first 60% and last 20% to preserve intro and conclusion
   */
  private truncateContent(content: string, maxTokens: number): string {
    const maxChars = maxTokens * 4; // Estimate 4 chars per token
    
    if (content.length <= maxChars) {
      return content;
    }

    console.log(`⚠️ Content too long (${content.length} chars), truncating to ${maxChars} chars`);

    // Keep first 60% (introduction, methodology)
    const introLength = Math.floor(maxChars * 0.6);
    // Keep last 20% (results, discussion, conclusion)
    const conclusionLength = maxChars - introLength;

    const intro = content.substring(0, introLength);
    const conclusion = content.substring(content.length - conclusionLength);

    return `${intro}\n\n[... CONTENT TRUNCATED FOR LENGTH - Middle section omitted ...]\n\n${conclusion}`;
  }
}
