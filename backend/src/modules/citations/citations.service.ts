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
import { CitationMetricsService } from './citation-metrics.service';

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
    private citationMetricsService: CitationMetricsService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
      });
      console.log('✅ Gemini AI initialized in CitationsService');
    } else {
      console.warn('⚠️ GEMINI_API_KEY not found - AI rating will not be available');
    }
  }

  async create(createCitationDto: CreateCitationDto, userId: number): Promise<Citation> {
    const { citingPaperId, citedPaperId } = createCitationDto;

    // Prevent self-citation
    if (citingPaperId === citedPaperId) {
      throw new BadRequestException('A paper cannot cite itself');
    }

    // Check if both papers exist
    const citingPaper = await this.papersRepository.findOne({
      where: { id: citingPaperId },
    });

    const citedPaper = await this.papersRepository.findOne({
      where: { id: citedPaperId },
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
      ...createCitationDto,
      createdBy: userId,
    });

    return await this.citationsRepository.save(citation);
  }

  async findByPaper(paperId: number) {
    // Verify paper exists
    const paper = await this.papersRepository.findOne({
      where: { id: paperId },
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

  async getCitationNetwork(paperId: number, depth: number = 2) {
    // Verify paper exists
    const rootPaper = await this.papersRepository.findOne({
      where: { id: paperId },
    });

    if (!rootPaper) {
      throw new NotFoundException('Paper not found');
    }

    const visited = new Set<number>();
    const nodes = [];
    const edges = [];
    const nodeMetadata = new Map<number, any>();
    const nodeDepths = new Map<number, number>();

    const traverse = async (currentPaperId: number, currentDepth: number, isMainPaper: boolean = false) => {
      if (currentDepth > depth || visited.has(currentPaperId)) {
        return;
      }

      visited.add(currentPaperId);
      
      // Track the minimum depth at which this node appears
      const existingDepth = nodeDepths.get(currentPaperId);
      if (existingDepth === undefined || currentDepth < existingDepth) {
        nodeDepths.set(currentPaperId, currentDepth);
      }

      const paper = await this.papersRepository.findOne({
        where: { id: currentPaperId },
      });

      if (!paper) return;

      // Get all citations WHERE THIS PAPER IS CITING others (outgoing)
      const citationsOut = await this.citationsRepository.find({
        where: { citingPaperId: currentPaperId },
      });

      // Get all citations WHERE THIS PAPER IS CITED by others (incoming)
      const citationsIn = await this.citationsRepository.find({
        where: { citedPaperId: currentPaperId },
      });

      const allCitations = [...citationsOut, ...citationsIn];

      // Aggregate metadata for this node from all its citations
      let maxRelevance = 0;
      let isInfluential = false;
      let maxParsingConfidence = 0;
      let citationDepthValue = 0;

      for (const citation of allCitations) {
        if (citation.relevanceScore && citation.relevanceScore > maxRelevance) {
          maxRelevance = citation.relevanceScore;
        }
        if (citation.isInfluential) {
          isInfluential = true;
        }
        if (citation.parsingConfidence && citation.parsingConfidence > maxParsingConfidence) {
          maxParsingConfidence = citation.parsingConfidence;
        }
        if (citation.citationDepth !== null && citation.citationDepth !== undefined) {
          citationDepthValue = Math.max(citationDepthValue, citation.citationDepth);
        }

        edges.push({
          source: citation.citingPaperId,
          target: citation.citedPaperId,
          relevanceScore: citation.relevanceScore,
          isInfluential: citation.isInfluential,
          citationContext: citation.citationContext,
          citationDepth: citation.citationDepth,
          parsingConfidence: citation.parsingConfidence,
          parsedAuthors: citation.parsedAuthors,
          parsedTitle: citation.parsedTitle,
          parsedYear: citation.parsedYear,
        });
      }

      nodeMetadata.set(currentPaperId, {
        relevanceScore: maxRelevance || undefined,
        isInfluential: isInfluential || undefined,
        parsingConfidence: maxParsingConfidence || undefined,
        citationDepth: citationDepthValue,
        isReference: paper.isReference,
      });

      // Traverse outgoing citations (papers this paper cites)
      for (const citation of citationsOut) {
        await traverse(citation.citedPaperId, currentDepth + 1, false);
      }

      // For the main paper, also traverse incoming citations
      if (isMainPaper) {
        for (const citation of citationsIn) {
          await traverse(citation.citingPaperId, currentDepth + 1, false);
        }
      }
    };

    await traverse(paperId, 0, true);

    // Build nodes with metadata
    for (const nodeId of visited) {
      const paper = await this.papersRepository.findOne({
        where: { id: nodeId },
      });

      if (paper) {
        const metadata = nodeMetadata.get(nodeId) || {};
        const nodeDepth = nodeDepths.get(nodeId) || 0;
        
        nodes.push({
          id: paper.id,
          title: paper.title,
          year: paper.publicationYear,
          authors: paper.authors,
          abstract: paper.abstract,
          doi: paper.doi,
          url: paper.url,
          isReference: paper.isReference,
          relevanceScore: metadata.relevanceScore,
          isInfluential: metadata.isInfluential,
          parsingConfidence: metadata.parsingConfidence,
          citationDepth: metadata.citationDepth,
          networkDepth: nodeDepth,
          type: nodeId === paperId ? 'main' : (nodeDepth === 1 ? 'reference' : 'nested-reference'),
        });
      }
    }

    console.log(`\n📊 Citation Network Stats for paper ${paperId}:`);
    console.log(`   Total nodes: ${nodes.length}`);
    console.log(`   Total edges: ${edges.length}`);
    console.log(`   Depth 0 (main): ${nodes.filter(n => n.networkDepth === 0).length}`);
    console.log(`   Depth 1 (direct refs): ${nodes.filter(n => n.networkDepth === 1).length}`);
    console.log(`   Depth 2 (nested refs): ${nodes.filter(n => n.networkDepth === 2).length}`);
    console.log(`   Depth 3+ (deep refs): ${nodes.filter(n => n.networkDepth >= 3).length}`);
    console.log('');

    return { nodes, edges };
  }

  async debugCitations(paperId: number) {
    // Get all citations without auth check
    const citationsOut = await this.citationsRepository.find({
      where: { citingPaperId: paperId },
      relations: ['citingPaper', 'citedPaper', 'createdBy'],
    });

    const citationsIn = await this.citationsRepository.find({
      where: { citedPaperId: paperId },
      relations: ['citingPaper', 'citedPaper', 'createdBy'],
    });

    const paper = await this.papersRepository.findOne({
      where: { id: paperId },
    });

    return {
      paper: paper ? { id: paper.id, title: paper.title, isReference: paper.isReference } : null,
      citationsCount: citationsOut.length + citationsIn.length,
      citingThisPaper: citationsOut.length,
      citedByThisPaper: citationsIn.length,
      citationsOut: citationsOut.map(c => ({
        id: c.id,
        citingId: c.citingPaperId,
        citingTitle: c.citingPaper?.title,
        citedId: c.citedPaperId,
        citedTitle: c.citedPaper?.title,
        relevanceScore: c.relevanceScore,
        isInfluential: c.isInfluential,
      })),
      citationsIn: citationsIn.map(c => ({
        id: c.id,
        citingId: c.citingPaperId,
        citingTitle: c.citingPaper?.title,
        citedId: c.citedPaperId,
        citedTitle: c.citedPaper?.title,
        relevanceScore: c.relevanceScore,
        isInfluential: c.isInfluential,
      })),
    };
  }

  async getCitationStats(paperId: number) {
    // Verify paper exists
    const paper = await this.papersRepository.findOne({
      where: { id: paperId },
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

  async getReferences(paperId: number): Promise<Citation[]> {
    // Verify paper exists
    const paper = await this.papersRepository.findOne({
      where: { id: paperId },
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

  async getCitedBy(paperId: number): Promise<Citation[]> {
    // Verify paper exists
    const paper = await this.papersRepository.findOne({
      where: { id: paperId },
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

  async remove(id: number): Promise<void> {
    const citation = await this.citationsRepository.findOne({
      where: { id },
    });

    if (!citation) {
      throw new NotFoundException('Citation not found');
    }

    await this.citationsRepository.remove(citation);
  }

  async update(id: number, updateCitationDto: UpdateCitationDto): Promise<Citation> {
    const citation = await this.citationsRepository.findOne({
      where: { id },
      relations: ['citingPaper', 'citedPaper'],
    });

    if (!citation) {
      throw new NotFoundException('Citation not found');
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
  async autoRateRelevance(citationId: number): Promise<Citation> {
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

    const citing = citation.citingPaper;
    const cited = citation.citedPaper;

    // Check if we have enough content for meaningful analysis
    const citingHasContent = citing.abstract || citing.fullText;
    const citedHasContent = cited.abstract || cited.fullText;
    
    if (!citingHasContent || !citedHasContent) {
      throw new BadRequestException(
        `Cannot auto-rate: ${!citingHasContent ? 'Citing paper' : 'Cited paper'} lacks abstract/fullText. ` +
        `Please add content or rate manually.`
      );
    }

    // Prepare content for AI analysis
    const citingContent = this.truncateContent(citing.abstract || citing.fullText, 2000);
    const citedContent = this.truncateContent(cited.abstract || cited.fullText, 2000);

    // Calculate recency score (papers from recent years are more relevant)
    const currentYear = new Date().getFullYear();
    const citedYear = cited.publicationYear || 2000;
    const yearDiff = currentYear - citedYear;
    const recencyNote = yearDiff <= 3 ? 'very recent' : yearDiff <= 5 ? 'recent' : yearDiff <= 10 ? 'moderately old' : 'older';

    // Count citation mentions in fullText if available
    let citationFrequency = 0;
    let citationLocations = '';
    if (citing.fullText && cited.authors) {
      const firstAuthor = cited.authors.split(',')[0].trim().split(' ').pop(); // Get last name of first author
      if (firstAuthor) {
        const mentions = citing.fullText.match(new RegExp(firstAuthor, 'gi')) || [];
        citationFrequency = mentions.length;
      }
      
      // Detect location: intro, methods, results, discussion
      const text = citing.fullText.toLowerCase();
      const introSection = text.substring(0, Math.floor(text.length * 0.25));
      const methodsSection = text.substring(Math.floor(text.length * 0.25), Math.floor(text.length * 0.5));
      const resultsSection = text.substring(Math.floor(text.length * 0.5), Math.floor(text.length * 0.75));
      const discussionSection = text.substring(Math.floor(text.length * 0.75));
      
      const locations = [];
      if (firstAuthor && introSection.includes(firstAuthor.toLowerCase())) locations.push('Introduction');
      if (firstAuthor && methodsSection.includes(firstAuthor.toLowerCase())) locations.push('Methods');
      if (firstAuthor && resultsSection.includes(firstAuthor.toLowerCase())) locations.push('Results');
      if (firstAuthor && discussionSection.includes(firstAuthor.toLowerCase())) locations.push('Discussion');
      citationLocations = locations.join(', ') || 'Unknown';
    }

    const prompt = `You are a research paper relevance analyzer. Analyze the relationship between two academic papers and provide a relevance score.

CITING PAPER (Main Paper):
Title: ${citing.title}
Authors: ${citing.authors}
Year: ${citing.publicationYear}
Abstract/Content: ${citingContent}

CITED PAPER (Reference):
Title: ${cited.title}
Authors: ${cited.authors}
Year: ${cited.publicationYear} (${recencyNote} - published ${currentYear - citedYear} years ago)
Abstract/Content: ${citedContent}

CITATION METRICS:
- Frequency: Cited ${citationFrequency} time(s) in the paper${citationFrequency > 0 ? ` (${citationFrequency > 5 ? 'frequently cited' : citationFrequency > 2 ? 'multiple citations' : 'limited citations'})` : ''}
- Location: ${citationLocations || 'Not detected'}${citationLocations.includes('Introduction') ? ' (cited in intro suggests foundational importance)' : ''}${citationLocations.includes('Methods') ? ' (cited in methods suggests methodological relevance)' : ''}
${citation.citationContext ? `- Existing Context: "${citation.citationContext}"\n` : ''}
TASK: Evaluate how relevant and important the CITED paper is to the CITING paper's research.

Consider:
1. **Topic overlap and research domain similarity**
2. **Methodological connections**
3. **Whether the cited paper provides foundational concepts, methods, or data**
4. **The cited paper's contribution to the citing paper's arguments or findings**
5. **Whether this is a key/influential reference or just a passing mention**
6. **Citation frequency** - Papers cited multiple times are usually more important
7. **Citation location** - Citations in Introduction/Methods are typically more foundational than those in Discussion
8. **Recency** - More recent papers (≤5 years) may be more relevant for current research trends
9. **Existing citation context** - If already documented, respect the established relationship

SCORING GUIDELINES:
- 0.8-1.0: Critical reference (foundational work, cited frequently, in key sections, high methodological relevance)
- 0.6-0.8: High relevance (important contribution, cited multiple times or in important sections)
- 0.3-0.6: Medium relevance (useful reference, cited once or briefly mentioned)
- 0.0-0.3: Low relevance (tangential mention, outdated, or minimal contribution)

Respond in EXACTLY this JSON format (no additional text):
{
  "relevanceScore": <number between 0.0 and 1.0>,
  "isInfluential": <boolean>,
  "reasoning": "<2-3 sentence explanation considering frequency, location, recency, and content>",
  "suggestedContext": "<brief note about how this reference relates to the main paper>"
}

Where:
- isInfluential: true if this is a foundational/key reference (cited frequently, in intro/methods, or methodologically critical), false otherwise`;

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
  async autoRateAllReferences(paperId: number): Promise<{ rated: number; failed: number; citations: Citation[] }> {
    const citations = await this.getReferences(paperId)
    
    console.log(`\n🔍 AUTO-RATING ${citations.length} REFERENCES FOR PAPER ${paperId}`);
    console.log(`   Using advanced algorithms: network centrality + temporal analysis + context quality\n`);
    
    // Get citation network for advanced metrics (use depth 2 for good coverage)
    const network = await this.getCitationNetwork(paperId, 2);
    const currentYear = new Date().getFullYear();
    
    let rated = 0;
    let failed = 0;
    const results: Citation[] = [];

    for (const citation of citations) {
      try {
        // First, use AI to get base relevance score
        const updated = await this.autoRateRelevance(citation.id);
        
        // Then, enhance with advanced metrics
        const { totalScore, breakdown } = await this.citationMetricsService.calculateAdvancedScore(
          updated,
          network,
          currentYear
        );
        
        // Get centrality for additional context
        const centrality = await this.citationMetricsService.calculateCentrality(
          updated.citedPaperId,
          network
        );
        
        // Update with enhanced score (combine AI score with advanced metrics)
        // 70% AI content relevance + 30% advanced metrics
        const enhancedScore = (updated.relevanceScore * 0.7) + (totalScore * 0.3);
        updated.relevanceScore = Math.min(enhancedScore, 1.0);
        
        // Mark as influential if highly cited in network
        if (centrality.inDegree >= 3 || totalScore >= 0.8) {
          updated.isInfluential = true;
        }
        
        await this.citationsRepository.save(updated);
        
        console.log(`   ✓ Rated citation ${citation.id}: ${(enhancedScore * 100).toFixed(0)}% relevance`);
        console.log(`     - AI Content: ${(updated.relevanceScore * 0.7 * 100).toFixed(0)}%`);
        console.log(`     - Network Importance: ${(breakdown.networkImportance * 100).toFixed(0)}%`);
        console.log(`     - Temporal Relevance: ${(breakdown.temporalRelevance * 100).toFixed(0)}%`);
        console.log(`     - In-degree: ${centrality.inDegree} citations${updated.isInfluential ? ' (INFLUENTIAL)' : ''}`);
        
        results.push(updated);
        rated++;
        
        // Add delay to avoid rate limiting (500ms between requests)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`   ✗ Failed to rate citation ${citation.id}:`, error.message);
        failed++;
        results.push(citation);
      }
    }

    console.log(`\n✅ COMPLETED: ${rated} rated, ${failed} failed\n`);
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
    options: AnalyzeReferencesDto = {}
  ): Promise<ReferenceAnalysisResult> {
    const { limit = 10, minRelevance = 0.0 } = options; // Changed from 0.5 to 0.0

    // Verify paper exists
    const paper = await this.papersRepository.findOne({
      where: { id: paperId },
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

    // Get full citation network for advanced metrics
    const network = await this.getCitationNetwork(paperId, 2);
    const currentYear = new Date().getFullYear();

    // Calculate combined score for each reference using advanced algorithm
    const scoredReferences = await Promise.all(
      citations.map(async (citation) => {
        const citedPaper = citation.citedPaper;
        
        // Use advanced multi-dimensional scoring
        const { totalScore: score, breakdown } = await this.citationMetricsService.calculateAdvancedScore(
          citation,
          network,
          currentYear
        );
        
        // Calculate centrality measures
        const centrality = await this.citationMetricsService.calculateCentrality(
          citedPaper.id,
          network
        );
        
        // Calculate co-citation similarity (how similar to other references)
        const coCitation = await this.citationMetricsService.calculateCoCitation(
          paperId,
          citedPaper.id,
          network
        );
        
        // 🆕 Predict future impact potential (composite score 0-100)
        let impactPotential = null;
        try {
          impactPotential = await this.citationMetricsService.forecastImpactPotential(citedPaper.id);
        } catch (error) {
          // Skip if not enough data for prediction
        }
        
        // 🆕 Get citation predictions (linear regression)
        let predictions = null;
        try {
          predictions = await this.citationMetricsService.predictFutureCitations(citedPaper.id, 12);
        } catch (error) {
          // Skip if not enough data for prediction
        }
        
        // Get citation count for display
        const citationCount = centrality.inDegree;

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
          centrality,
          coCitationStrength: coCitation.strength,
          scoreBreakdown: breakdown,
          // 🆕 Impact potential metrics
          impactPotential: impactPotential ? {
            score: impactPotential.impactScore,
            category: impactPotential.potential,
            projectedRank: impactPotential.projectedRank,
            timeToImpact: impactPotential.timeToImpact,
            indicators: impactPotential.indicators,
          } : null,
          // 🆕 Future predictions
          futurePrediction: predictions ? {
            nextYear: predictions.predictions[11]?.predicted || 0,
            confidenceInterval: predictions.predictions[11]?.confidenceInterval || { lower: 0, upper: 0 },
            growthRate: predictions.overallTrend === 'growing' ? '+' : predictions.overallTrend === 'declining' ? '-' : '=',
          } : null,
        };
      })
    );

    // Filter by minimum relevance and sort by score
    const filteredReferences = scoredReferences
      .filter(ref => ref.citation.relevanceScore >= minRelevance || ref.citation.isInfluential)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Calculate recommendations with enhanced criteria
    const highPriority = scoredReferences.filter(ref => 
      ref.score >= 0.8 || 
      (ref.centrality.inDegree >= 5 && ref.score >= 0.6) ||
      ref.coCitationStrength >= 0.7 ||
      (ref.impactPotential?.score >= 80) // 🆕 Breakthrough potential
    ).length;
    
    const shouldDownload = scoredReferences.filter(ref => 
      (ref.score >= 0.6 || 
       ref.citation.isInfluential || 
       ref.centrality.inDegree >= 3 ||
       (ref.impactPotential?.score >= 60)) && // 🆕 High potential
      !ref.paper.hasPdf
    ).length;
    
    // 🆕 Identify trending references
    const trendingReferences = scoredReferences.filter(ref => 
      ref.futurePrediction?.growthRate === '+' &&
      ref.impactPotential?.category === 'high' || ref.impactPotential?.category === 'breakthrough'
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
      // 🆕 Overall insights
      insights: {
        hasBreakthroughPapers: scoredReferences.some(ref => ref.impactPotential?.score >= 80),
        avgImpactScore: Math.round(
          scoredReferences
            .filter(ref => ref.impactPotential)
            .reduce((sum, ref) => sum + (ref.impactPotential?.score || 0), 0) / 
          scoredReferences.filter(ref => ref.impactPotential).length
        ) || 0,
        growingReferences: scoredReferences.filter(ref => ref.futurePrediction?.growthRate === '+').length,
      }
    };
  }
}
