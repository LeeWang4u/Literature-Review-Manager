import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Citation } from './citation.entity';
import { Paper } from '../papers/paper.entity';
import { CreateCitationDto } from './dto/citation.dto';
import { UpdateCitationDto } from './dto/update-citation.dto';
import { AnalyzeReferencesDto, ReferenceAnalysisResult } from './dto/analyze-references.dto';

@Injectable()
export class CitationsService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(
    @InjectRepository(Citation)
    private citationsRepository: Repository<Citation>,
    @InjectRepository(Paper)
    private papersRepository: Repository<Paper>,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash-lite',
      });
      console.log('✅ Gemini AI initialized in CitationsService');
    } else {
      console.warn('⚠️ GEMINI_API_KEY not found - AI rating will not be available');
    }
  }

  async create(userId: number, createCitationDto: CreateCitationDto): Promise<Citation> {
    const { citingPaperId, citedPaperId } = createCitationDto;

    // Prevent self-citation
    if (citingPaperId === citedPaperId) {
      throw new BadRequestException('A paper cannot cite itself');
    }

    // Check if both papers exist
    const citingPaper = await this.papersRepository.findOne({
      where: { id: citingPaperId, addedBy: userId },
    });

    const citedPaper = await this.papersRepository.findOne({
      where: { id: citedPaperId, addedBy: userId },
    });

    if (!citingPaper || !citedPaper) {
      throw new NotFoundException('One or both papers not found');
    }

    // Check if citation already exists
    const existing = await this.citationsRepository.findOne({
      where: { citingPaperId, citedPaperId },
    });

    if (existing) {
      throw new BadRequestException('Citation already exists');
    }

    const citation = this.citationsRepository.create({
      citingPaperId,
      citedPaperId,
      userId,
    });

    return await this.citationsRepository.save(citation);
  }

  async findByPaper(paperId: number, userId: number) {
    // Verify paper belongs to user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    // Papers that cite this paper
    const citing = await this.citationsRepository.find({
      where: { citedPaperId: paperId },
      relations: ['citingPaper'],
    });

    // Papers cited by this paper
    const citedBy = await this.citationsRepository.find({
      where: { citingPaperId: paperId },
      relations: ['citedPaper'],
    });

    return {
      citing: citing.map((c) => c.citingPaper),
      citedBy: citedBy.map((c) => c.citedPaper),
    };
  }

  async getCitationNetwork(paperId: number, userId: number, depth: number = 2) {
    // Verify paper belongs to user
    const rootPaper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!rootPaper) {
      throw new NotFoundException('Paper not found');
    }

    const visited = new Set<number>();
    const nodes = [];
    const edges = [];
    const nodeMetadata = new Map<number, any>();

    const traverse = async (currentPaperId: number, currentDepth: number) => {
      if (currentDepth > depth || visited.has(currentPaperId)) {
        return;
      }

      visited.add(currentPaperId);

      const paper = await this.papersRepository.findOne({
        where: { id: currentPaperId },
      });

      if (!paper) return;

      // Get all citations for this paper (regardless of who created them)
      const citations = await this.citationsRepository.find({
        where: [
          { citingPaperId: currentPaperId },
          { citedPaperId: currentPaperId },
        ],
      });

      // Aggregate metadata for this node from all its citations
      let maxRelevance = 0;
      let isInfluential = false;

      for (const citation of citations) {
        if (citation.relevanceScore && citation.relevanceScore > maxRelevance) {
          maxRelevance = citation.relevanceScore;
        }
        if (citation.isInfluential) {
          isInfluential = true;
        }

        edges.push({
          source: citation.citingPaperId,
          target: citation.citedPaperId,
          relevanceScore: citation.relevanceScore,
          isInfluential: citation.isInfluential,
          citationContext: citation.citationContext,
        });

        // Traverse connected papers
        if (citation.citingPaperId === currentPaperId) {
          await traverse(citation.citedPaperId, currentDepth + 1);
        } else {
          await traverse(citation.citingPaperId, currentDepth + 1);
        }
      }

      nodeMetadata.set(currentPaperId, {
        relevanceScore: maxRelevance || undefined,
        isInfluential: isInfluential || undefined,
      });
    };

    await traverse(paperId, 0);

    // Build nodes with metadata
    for (const paperId of visited) {
      const paper = await this.papersRepository.findOne({
        where: { id: paperId },
      });

      if (paper) {
        const metadata = nodeMetadata.get(paperId) || {};
        nodes.push({
          id: paper.id,
          title: paper.title,
          year: paper.publicationYear,
          authors: paper.authors,
          relevanceScore: metadata.relevanceScore,
          isInfluential: metadata.isInfluential,
        });
      }
    }

    return { nodes, edges };
  }

  async getCitationStats(paperId: number, userId: number) {
    // Verify paper belongs to user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    const citedByCount = await this.citationsRepository.count({
      where: { citedPaperId: paperId },
    });

    const citingCount = await this.citationsRepository.count({
      where: { citingPaperId: paperId },
    });

    return {
      citedBy: citedByCount,
      citing: citingCount,
    };
  }

  async getReferences(paperId: number, userId: number): Promise<Citation[]> {
    // Verify paper belongs to user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    // Get papers cited by this paper (references)
    return await this.citationsRepository.find({
      where: { citingPaperId: paperId },
      relations: ['citedPaper'],
      order: {
        isInfluential: 'DESC',
        relevanceScore: 'DESC',
      },
    });
  }

  async getCitedBy(paperId: number, userId: number): Promise<Citation[]> {
    // Verify paper belongs to user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    // Get papers that cite this paper
    return await this.citationsRepository.find({
      where: { citedPaperId: paperId },
      relations: ['citingPaper'],
      order: {
        isInfluential: 'DESC',
        relevanceScore: 'DESC',
      },
    });
  }

  async remove(id: number, userId: number): Promise<void> {
    const citation = await this.citationsRepository.findOne({
      where: { id, createdById: userId },
    });

    if (!citation) {
      throw new NotFoundException('Citation not found');
    }

    await this.citationsRepository.remove(citation);
  }

  async update(id: number, userId: number, updateCitationDto: UpdateCitationDto): Promise<Citation> {
    const citation = await this.citationsRepository.findOne({
      where: { id },
      relations: ['citingPaper', 'citedPaper'],
    });

    if (!citation) {
      throw new NotFoundException('Citation not found');
    }

    // Verify user owns the citing paper
    const citingPaper = await this.papersRepository.findOne({
      where: { id: citation.citingPaperId, addedBy: userId },
    });

    if (!citingPaper) {
      throw new NotFoundException('You do not have permission to update this citation');
    }

    // Update only provided fields
    if (updateCitationDto.relevanceScore !== undefined) {
      citation.relevanceScore = updateCitationDto.relevanceScore;
    }

    if (updateCitationDto.citationContext !== undefined) {
      citation.citationContext = updateCitationDto.citationContext;
    }

    return await this.citationsRepository.save(citation);
  }

  /**
   * AI-powered relevance scoring for a citation
   * Analyzes the relationship between citing and cited papers
   */
  async autoRateRelevance(citationId: number, userId: number): Promise<Citation> {
    if (!this.model) {
      throw new BadRequestException('AI service is not configured. Please set GEMINI_API_KEY.');
    }

    const citation = await this.citationsRepository.findOne({
      where: { id: citationId },
      relations: ['citingPaper', 'citedPaper'],
    });

    if (!citation) {
      throw new NotFoundException('Citation not found');
    }

    // Verify user owns the citing paper
    const citingPaper = await this.papersRepository.findOne({
      where: { id: citation.citingPaperId, addedBy: userId },
    });

    if (!citingPaper) {
      throw new NotFoundException('You do not have permission to update this citation');
    }

    const citing = citation.citingPaper;
    const cited = citation.citedPaper;

    // Prepare content for AI analysis
    const citingContent = this.truncateContent(citing.abstract || citing.fullText || 'No content available', 2000);
    const citedContent = this.truncateContent(cited.abstract || cited.fullText || 'No content available', 2000);

    const prompt = `You are a research paper relevance analyzer. Analyze the relationship between two academic papers and provide a relevance score.

CITING PAPER (Main Paper):
Title: ${citing.title}
Authors: ${citing.authors}
Year: ${citing.publicationYear}
Abstract/Content: ${citingContent}

CITED PAPER (Reference):
Title: ${cited.title}
Authors: ${cited.authors}
Year: ${cited.publicationYear}
Abstract/Content: ${citedContent}

TASK: Evaluate how relevant and important the CITED paper is to the CITING paper's research.

Consider:
1. Topic overlap and research domain similarity
2. Methodological connections
3. Whether the cited paper provides foundational concepts, methods, or data
4. The cited paper's contribution to the citing paper's arguments or findings
5. Whether this is a key/influential reference or just a passing mention

Respond in EXACTLY this JSON format (no additional text):
{
  "relevanceScore": <number between 0.0 and 1.0>,
  "isInfluential": <boolean>,
  "reasoning": "<2-3 sentence explanation>",
  "suggestedContext": "<brief note about how this reference relates to the main paper>"
}

Where:
- relevanceScore: 0.0-0.3 (low), 0.3-0.6 (medium), 0.6-0.8 (high), 0.8-1.0 (critical)
- isInfluential: true if this is a foundational/key reference, false otherwise`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse AI response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }

      const aiResult = JSON.parse(jsonMatch[0]);

      // Validate and constrain values
      const relevanceScore = Math.max(0, Math.min(1, aiResult.relevanceScore || 0));
      const isInfluential = aiResult.isInfluential === true;
      const suggestedContext = aiResult.suggestedContext || aiResult.reasoning || '';

      // Update citation with AI-generated values
      citation.relevanceScore = relevanceScore;
      citation.isInfluential = isInfluential;
      citation.citationContext = suggestedContext;

      return await this.citationsRepository.save(citation);
    } catch (error) {
      console.error('AI rating error:', error);
      throw new BadRequestException('Failed to generate AI relevance score. Please try again or rate manually.');
    }
  }

  /**
   * Batch AI rating for all citations of a paper
   */
  async autoRateAllReferences(paperId: number, userId: number): Promise<{ rated: number; failed: number; citations: Citation[] }> {
    const citations = await this.getReferences(paperId, userId);
    
    let rated = 0;
    let failed = 0;
    const results: Citation[] = [];

    for (const citation of citations) {
      try {
        const updated = await this.autoRateRelevance(citation.id, userId);
        results.push(updated);
        rated++;
        
        // Add delay to avoid rate limiting (500ms between requests)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to rate citation ${citation.id}:`, error.message);
        failed++;
        results.push(citation);
      }
    }

    return { rated, failed, citations: results };
  }

  /**
   * Truncate content to fit within token limits
   */
  private truncateContent(content: string, maxChars: number = 8000): string {
    if (content.length <= maxChars) {
      return content;
    }

    // Take first 70% and last 20% to preserve intro and conclusions
    const firstPartLength = Math.floor(maxChars * 0.7);
    const lastPartLength = Math.floor(maxChars * 0.2);
    
    const firstPart = content.substring(0, firstPartLength);
    const lastPart = content.substring(content.length - lastPartLength);
    
    return `${firstPart}\n\n[... truncated ...]\n\n${lastPart}`;
  }

  /**
   * Analyze references and rank by relevance + influence
   * Returns top references that should be downloaded
   */
  async analyzeReferences(
    paperId: number, 
    userId: number, 
    options: AnalyzeReferencesDto = {}
  ): Promise<ReferenceAnalysisResult> {
    const { limit = 10, minRelevance = 0.5 } = options;

    // Verify paper belongs to user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    // Get all references with their citation data
    const citations = await this.citationsRepository.find({
      where: { citingPaperId: paperId },
      relations: ['citedPaper', 'citedPaper.pdfFiles'],
      order: {
        isInfluential: 'DESC',
        relevanceScore: 'DESC',
      },
    });

    if (citations.length === 0) {
      return {
        paperId,
        title: paper.title,
        totalReferences: 0,
        analyzedReferences: 0,
        topReferences: [],
        recommendations: {
          highPriority: 0,
          shouldDownload: 0,
        },
      };
    }

    // Calculate combined score for each reference
    const scoredReferences = await Promise.all(
      citations.map(async (citation) => {
        const citedPaper = citation.citedPaper;
        
        // Calculate combined score (0-1 scale)
        let score = 0;
        
        // 1. Relevance score (40% weight)
        if (citation.relevanceScore) {
          score += citation.relevanceScore * 0.4;
        }
        
        // 2. Influential status (30% weight)
        if (citation.isInfluential) {
          score += 0.3;
        }
        
        // 3. Citation count from network (30% weight)
        // Count how many other papers in user's library cite this paper
        const citationCount = await this.citationsRepository.count({
          where: { citedPaperId: citedPaper.id },
        });
        
        // Normalize citation count (assume max 10 citations = 1.0)
        const citationScore = Math.min(citationCount / 10, 1.0);
        score += citationScore * 0.3;

        return {
          citation: {
            id: citation.id,
            citedPaperId: citedPaper.id,
            relevanceScore: citation.relevanceScore || 0,
            isInfluential: citation.isInfluential || false,
            citationContext: citation.citationContext,
          },
          paper: {
            id: citedPaper.id,
            title: citedPaper.title,
            authors: citedPaper.authors,
            year: citedPaper.publicationYear,
            doi: citedPaper.doi,
            url: citedPaper.url,
            hasPdf: !!citedPaper.fullText || (citedPaper.pdfFiles && citedPaper.pdfFiles.length > 0),
          },
          score,
          citationCount,
        };
      })
    );

    // Filter by minimum relevance and sort by score
    const filteredReferences = scoredReferences
      .filter(ref => ref.citation.relevanceScore >= minRelevance || ref.citation.isInfluential)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Calculate recommendations
    const highPriority = scoredReferences.filter(ref => ref.score >= 0.8).length;
    const shouldDownload = scoredReferences.filter(ref => 
      (ref.score >= 0.6 || ref.citation.isInfluential) && !ref.paper.hasPdf
    ).length;

    return {
      paperId,
      title: paper.title,
      totalReferences: citations.length,
      analyzedReferences: scoredReferences.length,
      topReferences: filteredReferences,
      recommendations: {
        highPriority,
        shouldDownload,
      },
    };
  }
}
