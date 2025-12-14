import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiSummary } from './ai-summary.entity';
import { Paper } from '../papers/paper.entity';
import { AIProviderService } from './ai-provider.service';

@Injectable()
export class SummariesService {
  constructor(
    @InjectRepository(AiSummary)
    private summariesRepository: Repository<AiSummary>,
    @InjectRepository(Paper)
    private papersRepository: Repository<Paper>,
    private aiProviderService: AIProviderService,
  ) {
    console.log('✅ SummariesService initialized with AI fallback support');
  }

  async generateSummary(paperId: number, userId: number, forceRegenerate: boolean = false, provider: string = 'auto', maxKeyFindings: number = 5): Promise<AiSummary> {
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

    // Generate summary using AI with fallback
    let summaryText: string;
    let keyFindings: string[];
    let usedProvider: string;
    let usedModel: string;

    try {
      console.log('🌟 Calling AI providers with automatic fallback...');
      const result = await this.generateWithAI(paper, maxKeyFindings);
      summaryText = result.summary;
      keyFindings = result.keyFindings;
      usedProvider = result.provider;
      usedModel = result.model;
      
      console.log(`✅ Summary generated successfully with ${usedProvider} (${usedModel})`);
    } catch (error) {
      console.error('❌ All AI providers failed:', error.message);
      console.log('⚠️ Falling back to placeholder summary');
      summaryText = this.generatePlaceholderSummary(paper);
      keyFindings = this.extractPlaceholderKeyFindings(paper);
      usedProvider = 'fallback';
      usedModel = 'none';
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

  // Generate summary using AI with automatic fallback
  private async generateWithAI(paper: Paper, maxKeyFindings: number = 5): Promise<{ 
    summary: string; 
    keyFindings: string[];
    provider: string;
    model: string;
  }> {
    if (!this.aiProviderService.hasAvailableProvider()) {
      throw new BadRequestException('No AI providers are configured. Please set at least one API key.');
    }

    console.log('🌟 Generating summary with AI providers...');

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

2. List the TOP ${maxKeyFindings} most important key findings from the paper as separate bullet points. ${hasFullText ? 'Extract findings from ALL sections: Introduction, Methodology, Results, Discussion, and Conclusion.' : 'Extract the most significant findings from the abstract.'} Focus on the most critical insights and limit to EXACTLY ${maxKeyFindings} findings.

Format your response as JSON:
{
  "summary": "Your detailed summary here...",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3", "Finding 4", "Finding 5"${maxKeyFindings > 5 ? ', "...up to ' + maxKeyFindings + ' findings"' : ''}]
}`;

    try {
      const result = await this.aiProviderService.generateWithFallback(prompt, {
        maxTokens: 16384, // Increased to 16K to prevent response truncation
        temperature: 0.7,
      });
      
      const text = result.text;
      console.log('📄 Raw AI response length:', text.length, 'chars');
      console.log('📄 Raw AI response (first 500 chars):', text.substring(0, 500));
      console.log('📄 Raw AI response (last 200 chars):', text.substring(Math.max(0, text.length - 200)));

      // Try to parse JSON response
      let parsed;
      try {
        // Remove markdown code blocks if present
        let cleanText = text.trim();
        
        // More robust markdown removal
        if (cleanText.startsWith('```')) {
          // Remove opening ```json or ```
          cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '');
          // Remove closing ```
          cleanText = cleanText.replace(/\n?```\s*$/, '');
          cleanText = cleanText.trim();
        }
        
        console.log('📝 Attempting to parse JSON...');
        console.log('🔍 Clean text (first 300 chars):', cleanText.substring(0, 300));
        parsed = JSON.parse(cleanText);
        console.log('✅ JSON parsed successfully');
        console.log('📊 Parsed object keys:', Object.keys(parsed));
        console.log('📋 KeyFindings count:', Array.isArray(parsed.keyFindings) ? parsed.keyFindings.length : 'N/A');
      } catch (e) {
        console.warn('⚠️ Failed to parse JSON directly, trying extraction. Error:', e.message);
        
        // Fallback 1: Try to extract JSON object from text more carefully
        const jsonMatch = text.match(/\{\s*"summary"[\s\S]*"keyFindings"[\s\S]*\]/);
        if (jsonMatch) {
          try {
            // Find the complete JSON object
            let jsonStr = jsonMatch[0];
            // Count braces to find the closing }
            let braceCount = 0;
            let endIdx = 0;
            for (let i = 0; i < jsonStr.length; i++) {
              if (jsonStr[i] === '{') braceCount++;
              if (jsonStr[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  endIdx = i + 1;
                  break;
                }
              }
            }
            
            if (endIdx > 0) {
              jsonStr = jsonStr.substring(0, endIdx);
              console.log('🔍 Extracted JSON length:', jsonStr.length);
              parsed = JSON.parse(jsonStr);
              console.log('✅ JSON extracted and parsed successfully');
            } else {
              throw new Error('Could not find complete JSON object');
            }
          } catch (e2) {
            console.error('❌ JSON extraction failed:', e2.message);
            parsed = {
              summary: text,
              keyFindings: ['⚠️ Key findings could not be extracted from AI response. Please regenerate the summary.']
            };
          }
        } else {
          console.warn('⚠️ No JSON pattern found in response');
          parsed = {
            summary: text,
            keyFindings: ['⚠️ Key findings could not be extracted from AI response. Please regenerate the summary.']
          };
        }
      }

      console.log(`✅ Summary generated successfully with ${result.provider}`);
      
      // Check if keyFindings is missing
      if (!parsed.keyFindings || !Array.isArray(parsed.keyFindings)) {
        console.warn('⚠️ KeyFindings missing or invalid in AI response! Parsed object:', JSON.stringify(parsed).substring(0, 300));
      }
      
      return {
        summary: parsed.summary || text,
        keyFindings: Array.isArray(parsed.keyFindings) && parsed.keyFindings.length > 0 
          ? parsed.keyFindings 
          : ['⚠️ Key findings could not be extracted. Please refer to the full summary above.'],
        provider: result.provider,
        model: result.model,
      };
    } catch (error) {
      console.error('❌ AI generation error:', error);
      throw new BadRequestException(`Failed to generate summary: ${error.message}`);
    }
  }

  // Placeholder methods - Used when all AI models are unavailable
  private generatePlaceholderSummary(paper: Paper): string {
    const parts: string[] = [];
    
    // Title and basic info
    parts.push(`**${paper.title}**\n`);
    
    if (paper.authors || paper.publicationYear || paper.journal) {
      const metadata = [
        paper.authors ? `Authors: ${paper.authors}` : null,
        paper.publicationYear ? `Year: ${paper.publicationYear}` : null,
        paper.journal ? `Published in: ${paper.journal}` : null,
      ].filter(Boolean).join(' | ');
      parts.push(metadata + '\n');
    }
    
    // Abstract (most important content)
    if (paper.abstract) {
      parts.push(`\n**Abstract:**\n${paper.abstract}\n`);
    } else if (paper.fullText) {
      const preview = paper.fullText.substring(0, 500).trim();
      parts.push(`\n**Content Preview:**\n${preview}...\n`);
    }
    
    // Keywords
    if (paper.keywords) {
      parts.push(`\n**Keywords:** ${paper.keywords}`);
    }
    
    // Notice
    parts.push(`\n\n---\n*⚠️ AI summary generation is temporarily unavailable (quota limits reached). This summary is compiled from metadata. AI service will resume when quota resets (~24 hours).*`);
    
    return parts.join('\n');
  }

  private extractPlaceholderKeyFindings(paper: Paper): string[] {
    const findings: string[] = [];
    
    // Extract from keywords if available
    if (paper.keywords) {
      const keywords = paper.keywords.split(/[,;]/).map(k => k.trim()).slice(0, 5);
      keywords.forEach(k => findings.push(`Research topic: ${k}`));
    }
    
    // Add paper type/methodology if identifiable from title
    const titleLower = paper.title.toLowerCase();
    if (titleLower.includes('survey') || titleLower.includes('review')) {
      findings.push('Paper type: Literature review or survey paper');
    } else if (titleLower.includes('case study')) {
      findings.push('Paper type: Case study research');
    } else if (titleLower.includes('empirical')) {
      findings.push('Paper type: Empirical study');
    }
    
    // If still empty, add generic finding
    if (findings.length === 0) {
      findings.push('⚠️ Detailed findings require AI analysis (currently unavailable)');
      findings.push('Please refer to the abstract for key research contributions');
    }
    
    return findings;
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

    // Generate tags using AI with fallback
    if (!this.aiProviderService.hasAvailableProvider()) {
      console.warn('⚠️ No AI providers configured, returning keyword-based tags');
      return this.generateKeywordBasedTags(paper);
    }

    try {
      console.log('🌟 Calling AI provider for tag suggestions...');

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

      const result = await this.aiProviderService.generateWithFallback(prompt, {
        maxTokens: 2048,
        temperature: 0.7,
      });
      const text = result.text;

      console.log(`🤖 ${result.model} response for tags:`, text.substring(0, 200));

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
   * Suggest tags from text content (title + abstract) without requiring paper ID
   * Used for pre-save tag suggestions
   */
  async suggestTagsFromText(title: string, abstract: string, authors?: string, keywords?: string): Promise<{ suggested: string[]; confidence: number }> {
    console.log(`🏷️ Generating tag suggestions from text content`);

    // Generate tags using AI with fallback
    if (!this.aiProviderService.hasAvailableProvider()) {
      console.warn('⚠️ No AI providers configured, returning keyword-based tags');
      return this.generateKeywordBasedTagsFromText(title, abstract, keywords);
    }

    try {
      console.log('🌟 Calling AI provider for tag suggestions...');

      const prompt = `You are a research paper categorization expert. Analyze this academic paper and suggest relevant tags/keywords for organization.

Paper Details:
- Title: ${title}
- Authors: ${authors || 'N/A'}
- Keywords: ${keywords || 'N/A'}

Abstract:
${abstract || 'No abstract available'}

Task:
1. Suggest 5-8 highly relevant tags/categories for this paper
2. Focus on: research domain, methodology, application area, key concepts
3. Make tags concise (1-3 words each)
4. Use consistent naming (e.g., "Machine Learning" not "ML" or "machine learning")

Return ONLY a valid JSON object in this exact format (no markdown, no explanation):
{
  "tags": ["tag1", "tag2", "tag3", ...],
  "confidence": 0.95
}`;

      const result = await this.aiProviderService.generateWithFallback(prompt, {
        maxTokens: 2048,
        temperature: 0.7,
      });
      const text = result.text;

      console.log(`🤖 ${result.model} response for tags:`, text.substring(0, 200));

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
            return this.generateKeywordBasedTagsFromText(title, abstract, keywords);
          }
        } else {
          return this.generateKeywordBasedTagsFromText(title, abstract, keywords);
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
      return this.generateKeywordBasedTagsFromText(title, abstract, keywords);
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

  /**
   * Generate tags from text without paper object (fallback method)
   */
  private generateKeywordBasedTagsFromText(title: string, abstract: string, keywords?: string): { suggested: string[]; confidence: number } {
    const tags = new Set<string>();

    // Extract from keywords
    if (keywords) {
      keywords
        .split(/[,;]/)
        .map(k => k.trim())
        .filter(k => k.length > 0 && k.length <= 50)
        .slice(0, 5)
        .forEach(k => tags.add(k));
    }

    // Extract from title (common academic terms)
    const titleWords = title.toLowerCase();
    const commonTerms = [
      'machine learning', 'deep learning', 'neural network', 'artificial intelligence',
      'data science', 'computer vision', 'natural language processing', 'nlp',
      'reinforcement learning', 'supervised learning', 'unsupervised learning',
      'optimization', 'algorithm', 'classification', 'regression', 'clustering',
      'transformer', 'attention mechanism', 'generative model',
    ];

    commonTerms.forEach(term => {
      if (titleWords.includes(term)) {
        tags.add(term.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
      }
    });

    return {
      suggested: Array.from(tags).slice(0, 8),
      confidence: 0.6, // Lower confidence for keyword-based
    };
  }
}

