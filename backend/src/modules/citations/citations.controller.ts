import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
  Query,
  DefaultValuePipe,
  Patch,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CitationsService } from './citations.service';
import { CitationParserService } from './citation-parser.service';
import { CitationMetricsService } from './citation-metrics.service';
import { CreateCitationDto } from './dto/citation.dto';
import { UpdateCitationDto } from './dto/update-citation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('citations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('citations')
export class CitationsController {
  private readonly logger = new Logger(CitationsController.name);
  
  constructor(
    private readonly citationsService: CitationsService,
    private readonly citationParserService: CitationParserService,
    private readonly citationMetricsService: CitationMetricsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a citation relationship' })
  @ApiResponse({ status: 201, description: 'Citation created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid citation (self-citation or already exists)' })
  create(@Body() createCitationDto: CreateCitationDto, @Req() req) {
    return this.citationsService.create(createCitationDto, req.user.id);
  }

  @Get('paper/:paperId')
  @ApiOperation({ summary: 'Get citations for a paper' })
  @ApiResponse({ status: 200, description: 'Return citing and cited papers' })
  findByPaper(@Param('paperId', ParseIntPipe) paperId: number) {
    return this.citationsService.findByPaper(paperId);
  }

  @Get('paper/:paperId/references')
  @ApiOperation({ summary: 'Get references (papers this paper cites)' })
  @ApiResponse({ status: 200, description: 'Return list of references with metadata' })
  getReferences(@Param('paperId', ParseIntPipe) paperId: number) {
    return this.citationsService.getReferences(paperId);
  }

  @Get('paper/:paperId/cited-by')
  @ApiOperation({ summary: 'Get citing papers (papers that cite this paper)' })
  @ApiResponse({ status: 200, description: 'Return list of citing papers with metadata' })
  getCitedBy(@Param('paperId', ParseIntPipe) paperId: number) {
    return this.citationsService.getCitedBy(paperId);
  }

  @Get('network/:paperId')
  @ApiOperation({ summary: 'Get citation network for D3.js visualization' })
  @ApiQuery({ name: 'depth', required: false, type: Number, description: 'Network depth (default: 2)' })
  @ApiResponse({ status: 200, description: 'Return nodes and edges for citation network' })
  getCitationNetwork(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Query('depth', new DefaultValuePipe(2), ParseIntPipe) depth: number,
  ) {
    return this.citationsService.getCitationNetwork(paperId, depth);
  }

  @Get('stats/:paperId')
  @ApiOperation({ summary: 'Get citation statistics' })
  @ApiResponse({ status: 200, description: 'Return citation counts' })
  getCitationStats(@Param('paperId', ParseIntPipe) paperId: number) {
    return this.citationsService.getCitationStats(paperId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update citation relevance and context' })
  @ApiResponse({ status: 200, description: 'Citation updated successfully' })
  @ApiResponse({ status: 404, description: 'Citation not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCitationDto: UpdateCitationDto,
  ) {
    return this.citationsService.update(id, updateCitationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a citation' })
  @ApiResponse({ status: 200, description: 'Citation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Citation not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.citationsService.remove(id);
  }

  @Post(':id/auto-rate')
  @ApiOperation({ summary: 'AI auto-rate citation relevance' })
  @ApiResponse({ status: 200, description: 'Citation rated successfully by AI' })
  @ApiResponse({ status: 400, description: 'AI service not available' })
  @ApiResponse({ status: 404, description: 'Citation not found' })
  autoRateRelevance(@Param('id', ParseIntPipe) id: number) {
    return this.citationsService.autoRateRelevance(id);
  }

  @Post('paper/:paperId/auto-rate-all')
  @ApiOperation({ 
    summary: 'AI auto-rate all references for a paper with advanced algorithms',
    description: 'Uses multi-dimensional scoring: AI content relevance (70%) + network centrality + temporal analysis + context quality (30%)'
  })
  @ApiResponse({ status: 200, description: 'All citations rated successfully with enhanced metrics' })
  @ApiResponse({ status: 400, description: 'AI service not available' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  autoRateAllReferences(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Req() req
  ) {
    return this.citationsService.autoRateAllReferences(paperId);
  }

  @Get('paper/:paperId/analyze')
  @ApiOperation({ 
    summary: 'Analyze and rank references by importance using advanced algorithms',
    description: 'Uses network centrality, temporal relevance, co-citation analysis, and content quality to rank references'
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of top references to return (default: 10)' })
  @ApiQuery({ name: 'minRelevance', required: false, type: Number, description: 'Minimum relevance score (0-1, default: 0.5)' })
  @ApiResponse({ status: 200, description: 'Analysis completed with advanced metrics' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  analyzeReferences(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('minRelevance', new DefaultValuePipe(0.0)) minRelevance: number, // Changed from 0.5 to 0.0
  ) {
    return this.citationsService.analyzeReferences(paperId, { limit, minRelevance });
  }

  @Get('paper/:paperId/analyze-enhanced')
  @ApiOperation({ 
    summary: 'Enhanced reference analysis with temporal and similarity metrics',
    description: 'Includes citation velocity, similar papers detection, and temporal trends for each reference'
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of top references (default: 10)' })
  @ApiResponse({ status: 200, description: 'Enhanced analysis with temporal and similarity data' })
  async analyzeReferencesEnhanced(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Req() req,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    // Get standard analysis
    const analysis = await this.citationsService.analyzeReferences(paperId, { limit });
    
    // Enhance with temporal metrics for top references
    const enhancedReferences = await Promise.all(
      analysis.topReferences.map(async (ref: any) => {
        try {
          // Get temporal metrics
          const velocity = await this.citationMetricsService.calculateCitationVelocity(ref.paper.id);
          const aging = await this.citationMetricsService.analyzeCitationAging(ref.paper.id);
          
          return {
            ...ref,
            temporalMetrics: {
              velocity: velocity.overallVelocity,
              velocityTrend: velocity.velocityTrend,
              acceleration: velocity.acceleration,
              agingPattern: aging.agingPattern,
              currentPhase: aging.currentPhase,
              paperAge: aging.paperAge,
            },
            interpretation: {
              impact: velocity.overallVelocity > 2 ? 'High Impact - Rapidly cited' :
                      velocity.overallVelocity > 0.5 ? 'Growing Impact' : 'Stable/Declining',
              relevance: aging.currentPhase === 'rising' ? 'Increasingly Relevant' :
                        aging.currentPhase === 'peak' ? 'Peak Relevance' :
                        aging.currentPhase === 'declining' ? 'Established' : 'Classic Work',
            }
          };
        } catch (error) {
          return { ...ref, temporalMetrics: null };
        }
      })
    );
    
    return {
      ...analysis,
      topReferences: enhancedReferences,
      metadata: {
        includedMetrics: [
          'Network Centrality (in-degree, clustering)',
          'Temporal Analysis (velocity, aging pattern)',
          'Co-citation Strength',
          'Content Relevance (AI-based)',
          'Context Quality Analysis',
          'Impact Potential (Composite Score 0-100)',
          'Future Citation Predictions (Linear Regression)',
        ],
        algorithm: 'Multi-dimensional scoring with 7 factors + predictive analytics'
      }
    };
  }

  @Get('paper/:paperId/trending-references')
  @ApiOperation({ 
    summary: '🔥 Detect trending references that are gaining momentum',
    description: 'Identifies references with high growth potential, active citation bursts, and breakthrough impact scores'
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of trending refs (default: 5)' })
  @ApiResponse({ status: 200, description: 'Trending references with predictions' })
  async getTrendingReferences(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Req() req,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    // Get all references
    const allRefs = await this.citationsService.analyzeReferences(paperId, { limit: 50, minRelevance: 0.3 });
    
    // Filter and score by trending metrics
    const trendingCandidates = await Promise.all(
      allRefs.topReferences.map(async (ref: any) => {
        try {
          // Skip if no impact data
          if (!ref.impactPotential || !ref.futurePrediction) return null;
          
          // Calculate trending score
          const impactScore = ref.impactPotential.score;
          const growthBonus = ref.futurePrediction.growthRate === '+' ? 30 : 0;
          const potentialBonus = ref.impactPotential.category === 'breakthrough' ? 20 : 
                                ref.impactPotential.category === 'high' ? 10 : 0;
          
          const trendingScore = impactScore + growthBonus + potentialBonus;
          
          // Only include if truly trending
          if (trendingScore < 70) return null;
          
          return {
            ...ref,
            trendingScore,
            trendingIndicators: {
              isGrowing: ref.futurePrediction.growthRate === '+',
              hasHighPotential: impactScore >= 60,
              isBreakthrough: ref.impactPotential.category === 'breakthrough',
              projectedImpact: ref.impactPotential.projectedRank,
              nextYearCitations: Math.round(ref.futurePrediction.nextYear),
            },
            badges: [
              trendingScore >= 100 ? '🚀 BREAKTHROUGH' : null,
              ref.futurePrediction.growthRate === '+' ? '📈 GROWING' : null,
              impactScore >= 80 ? '⭐ HIGH IMPACT' : null,
              ref.impactPotential.timeToImpact <= 2 ? '⚡ FAST RISING' : null,
            ].filter(Boolean)
          };
        } catch (error) {
          return null;
        }
      })
    );
    
    // Filter nulls and sort by trending score
    const trending = trendingCandidates
      .filter(ref => ref !== null)
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);
    
    return {
      paperId,
      trendingCount: trending.length,
      trendingReferences: trending,
      summary: {
        breakthroughPapers: trending.filter(ref => ref.trendingScore >= 100).length,
        growingPapers: trending.filter(ref => ref.trendingIndicators.isGrowing).length,
        highImpactPapers: trending.filter(ref => ref.trendingIndicators.hasHighPotential).length,
      },
      recommendation: trending.length > 0 
        ? `Found ${trending.length} trending reference(s) worth prioritizing for your research`
        : 'No strongly trending references detected at this time'
    };
  }

  @Get('debug/paper/:paperId')
  @ApiOperation({ summary: 'Debug: Get raw citation data for a paper' })
  @ApiResponse({ status: 200, description: 'Return raw citation data' })
  async debugCitations(@Param('paperId', ParseIntPipe) paperId: number) {
    return this.citationsService.debugCitations(paperId);
  }

  @Post('test-parser')
  @ApiOperation({ summary: 'Test AI citation parser with sample citation strings' })
  @ApiResponse({ status: 200, description: 'Parsing results returned' })
  async testParser(@Body() body: { citations: string[] }) {
    const results = await this.citationParserService.parseCitations(body.citations);
    return {
      success: true,
      count: results.length,
      results: results.map(r => ({
        rawCitation: r.rawCitation,
        parsed: {
          authors: r.authors,
          year: r.year,
          title: r.title,
          doi: r.doi,
          confidence: r.confidence,
        },
      })),
    };
  }

  @Get('network/:paperId/pagerank')
  @ApiOperation({ summary: 'Calculate PageRank scores for papers in citation network' })
  @ApiResponse({ status: 200, description: 'PageRank scores returned' })
  async getPageRank(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Req() req,
    @Query('maxDepth', new DefaultValuePipe(2), ParseIntPipe) maxDepth: number,
  ) {
    // Get citation network
    const network = await this.citationsService.getCitationNetwork(paperId, maxDepth);
    
    // Calculate PageRank
    const pageRankScores = await this.citationMetricsService.calculatePageRank(network);
    
    // Convert Map to array and sort by score
    const rankedPapers = Array.from(pageRankScores.entries())
      .map(([id, score]) => {
        const paper = network.nodes.find(n => n.id === id);
        return {
          paperId: id,
          pageRankScore: score,
          title: paper?.title,
          year: paper?.year,
          isMain: id === paperId,
        };
      })
      .sort((a, b) => b.pageRankScore - a.pageRankScore);
    
    return {
      paperId,
      networkSize: network.nodes.length,
      rankedPapers,
      algorithm: {
        name: 'PageRank',
        dampingFactor: 0.85,
        description: 'Measures paper importance based on citation structure. Higher scores indicate more influential papers.',
      },
    };
  }

  @Get('network/:paperId/centrality')
  @ApiOperation({ summary: 'Calculate centrality measures for papers in citation network' })
  @ApiResponse({ status: 200, description: 'Centrality measures returned' })
  async getCentrality(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Req() req,
    @Query('maxDepth', new DefaultValuePipe(2), ParseIntPipe) maxDepth: number,
  ) {
    // Get citation network
    const network = await this.citationsService.getCitationNetwork(paperId, maxDepth);
    
    // Calculate centrality for all papers
    const centralityMeasures = await Promise.all(
      network.nodes.map(async node => {
        const centrality = await this.citationMetricsService.calculateCentrality(node.id, network);
        return {
          paperId: node.id,
          title: node.title,
          year: node.year,
          isMain: node.id === paperId,
          centrality,
        };
      })
    );
    
    // Sort by total degree (most connected)
    const sortedMeasures = centralityMeasures.sort(
      (a, b) => b.centrality.totalDegree - a.centrality.totalDegree
    );
    
    return {
      paperId,
      networkSize: network.nodes.length,
      centralityMeasures: sortedMeasures,
      metrics: {
        inDegree: 'Number of papers citing this paper (influence)',
        outDegree: 'Number of papers this paper cites (breadth)',
        totalDegree: 'Total connections (in + out)',
        clusteringCoefficient: 'How interconnected the neighbors are (0-1)',
        normalizedInDegree: 'In-degree normalized by network size (0-1)',
      },
    };
  }

  @Get('similarity/:paperId1/:paperId2/co-citation')
  @ApiOperation({ summary: 'Calculate co-citation strength between two papers' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns co-citation metrics showing how often papers are cited together' 
  })
  async getCoCitationSimilarity(
    @Param('paperId1', ParseIntPipe) paperId1: number,
    @Param('paperId2', ParseIntPipe) paperId2: number,
    @Req() req
  ) {
    // Build network from user's papers (use depth 2 to get enough context)
    const network = await this.citationsService.getCitationNetwork(paperId1, 2);
    
    const coCitation = await this.citationMetricsService.calculateCoCitation(
      paperId1,
      paperId2,
      network
    );

    return {
      paperId1,
      paperId2,
      coCitation: {
        strength: coCitation.strength,
        jaccardIndex: coCitation.jaccardIndex,
        commonCitingPapers: coCitation.commonCitingPapers.length,
        totalCitingPaper1: coCitation.totalCitingPaper1,
        totalCitingPaper2: coCitation.totalCitingPaper2,
        interpretation: this.interpretCoCitation(coCitation.strength),
      },
      commonCitingPaperIds: coCitation.commonCitingPapers,
      explanation: 'Co-citation occurs when two papers are cited together by the same paper. Higher values indicate papers are frequently grouped in the same research context.',
    };
  }

  @Get('similarity/:paperId1/:paperId2/bibliographic-coupling')
  @ApiOperation({ summary: 'Calculate bibliographic coupling strength between two papers' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns coupling metrics showing how many references papers share' 
  })
  async getBibliographicCoupling(
    @Param('paperId1', ParseIntPipe) paperId1: number,
    @Param('paperId2', ParseIntPipe) paperId2: number,
    @Req() req
  ) {
    // Build network from user's papers (use depth 2 to get enough context)
    const network = await this.citationsService.getCitationNetwork(paperId1, 2);
    
    const coupling = await this.citationMetricsService.calculateBibliographicCoupling(
      paperId1,
      paperId2,
      network
    );

    return {
      paperId1,
      paperId2,
      bibliographicCoupling: {
        strength: coupling.strength,
        jaccardIndex: coupling.jaccardIndex,
        commonReferences: coupling.commonReferences.length,
        totalReferencesPaper1: coupling.totalReferencesPaper1,
        totalReferencesPaper2: coupling.totalReferencesPaper2,
        interpretation: this.interpretCoupling(coupling.strength),
      },
      commonReferenceIds: coupling.commonReferences,
      explanation: 'Bibliographic coupling occurs when two papers cite the same references. Higher values indicate papers build on similar foundations.',
    };
  }

  @Get('similar/:paperId')
  @ApiOperation({ summary: 'Find papers similar to a given paper' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns most similar papers using co-citation, coupling, or combined analysis' 
  })
  @ApiQuery({ 
    name: 'method', 
    enum: ['co-citation', 'coupling', 'combined'], 
    required: false,
    description: 'Similarity method to use (default: combined)'
  })
  @ApiQuery({ 
    name: 'limit', 
    type: Number, 
    required: false,
    description: 'Number of similar papers to return (default: 10)'
  })
  async findSimilarPapers(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Query('method') method: 'co-citation' | 'coupling' | 'combined' = 'combined',
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Req() req
  ) {
    // Build network from user's papers (use depth 2 for good coverage)
    const network = await this.citationsService.getCitationNetwork(paperId, 2);

    let similarPapers;
    let methodUsed;

    switch (method) {
      case 'co-citation':
        similarPapers = await this.citationMetricsService.findSimilarPapersByCoCitation(
          paperId,
          network,
          limit
        );
        methodUsed = 'Co-Citation Analysis';
        break;

      case 'coupling':
        similarPapers = await this.citationMetricsService.findSimilarPapersByCoupling(
          paperId,
          network,
          limit
        );
        methodUsed = 'Bibliographic Coupling Analysis';
        break;

      case 'combined':
      default:
        similarPapers = await this.citationMetricsService.findSimilarPapersCombined(
          paperId,
          network,
          limit
        );
        methodUsed = 'Combined Similarity Analysis (60% co-citation + 40% coupling)';
        break;
    }

    return {
      paperId,
      method: methodUsed,
      totalSimilarPapers: similarPapers.length,
      similarPapers,
      explanation: {
        'co-citation': 'Papers frequently cited together with the target paper',
        'coupling': 'Papers that cite many of the same references',
        'combined': 'Weighted combination of both co-citation and bibliographic coupling',
      }[method],
    };
  }

  /**
   * Helper method to interpret co-citation strength
   */
  private interpretCoCitation(strength: number): string {
    if (strength >= 0.7) return 'Very Strong - Papers are frequently cited together';
    if (strength >= 0.5) return 'Strong - Papers often appear in same research context';
    if (strength >= 0.3) return 'Moderate - Papers share some common citing papers';
    if (strength >= 0.1) return 'Weak - Papers occasionally cited together';
    return 'Very Weak - Papers rarely cited together';
  }

  /**
   * Helper method to interpret bibliographic coupling strength
   */
  private interpretCoupling(strength: number): string {
    if (strength >= 0.7) return 'Very Strong - Papers build on very similar foundations';
    if (strength >= 0.5) return 'Strong - Papers cite many common references';
    if (strength >= 0.3) return 'Moderate - Papers share some reference overlap';
    if (strength >= 0.1) return 'Weak - Papers have few common references';
    return 'Very Weak - Papers cite different references';
  }

  @Get('network/:paperId/communities')
  @ApiOperation({ summary: 'Detect research communities in citation network' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns communities detected using Louvain algorithm with modularity score' 
  })
  @ApiQuery({ 
    name: 'maxDepth', 
    type: Number, 
    required: false,
    description: 'Network depth for analysis (default: 2)'
  })
  async detectCommunities(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Query('maxDepth', new DefaultValuePipe(2), ParseIntPipe) maxDepth: number,
    @Req() req
  ) {
    try {
      this.logger.log(`🔍 Detecting communities for paper ${paperId} with depth ${maxDepth}`);
      
      // Build citation network
      this.logger.log('Building citation network...');
      const network = await this.citationsService.getCitationNetwork(paperId, maxDepth);
      this.logger.log(`Network built: ${network.nodes.length} nodes, ${network.edges.length} edges`);
      
      // Detect communities
      this.logger.log('Running community detection...');
      const result = await this.citationMetricsService.detectCommunities(network);
      this.logger.log(`Communities detected: ${result.communityCount}`);

      return {
        success: true,
        data: {
          paperId,
          networkSize: network.nodes.length,
          communityCount: result.communityCount,
          modularity: result.modularity,
          modularityInterpretation: this.interpretModularity(result.modularity),
          communities: result.communityDetails.map(c => ({
            communityId: c.communityId,
            size: c.size,
            density: c.density,
            avgDegree: c.avgDegree,
            keywords: c.keywords,
            topPapers: c.papers.slice(0, 5),
          })),
          explanation: 'Communities are groups of densely connected papers. Modularity measures quality of community structure (higher is better).',
        }
      };
    } catch (error) {
      this.logger.error(`❌ Error in detectCommunities for paper ${paperId}:`, error.message, error.stack);
      return {
        success: false,
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      };
    }
  }

  @Get('network/:paperId/community-leaders')
  @ApiOperation({ summary: 'Identify influential papers in each community' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns top influential papers per community based on in-community PageRank' 
  })
  @ApiQuery({ 
    name: 'maxDepth', 
    type: Number, 
    required: false,
    description: 'Network depth for analysis (default: 2)'
  })
  async getCommunityLeaders(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Query('maxDepth', new DefaultValuePipe(2), ParseIntPipe) maxDepth: number,
    @Req() req
  ) {
    // Build citation network
    const network = await this.citationsService.getCitationNetwork(paperId, maxDepth);
    
    // Detect communities first
    const communityResult = await this.citationMetricsService.detectCommunities(network);
    
    // Identify influential papers
    const leaders = await this.citationMetricsService.identifyInfluentialPapers(
      network,
      communityResult.communities
    );

    return {
      paperId,
      networkSize: network.nodes.length,
      communityCount: communityResult.communityCount,
      leaders: leaders.map(l => ({
        communityId: l.communityId,
        communitySize: communityResult.communityDetails.find(
          c => c.communityId === l.communityId
        )?.size || 0,
        topInfluencers: l.leaders.map(leader => ({
          paperId: leader.paperId,
          title: leader.title,
          year: leader.year,
          communityPageRank: leader.communityPageRank,
          inCommunityDegree: leader.inCommunityDegree,
          bridgeScore: leader.bridgeScore,
          role: this.interpretLeaderRole(leader.bridgeScore),
        })),
      })),
      explanation: {
        communityPageRank: 'Influence within the community (higher = more influential)',
        inCommunityDegree: 'Number of citations from papers in same community',
        bridgeScore: 'Proportion of connections to other communities (0-1)',
        role: 'Hub (low bridge score) or Bridge (high bridge score)',
      },
    };
  }

  @Get('network/:paperId/community-dynamics')
  @ApiOperation({ summary: 'Analyze temporal evolution of research communities' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns temporal analysis of communities showing growth trends' 
  })
  @ApiQuery({ 
    name: 'maxDepth', 
    type: Number, 
    required: false,
    description: 'Network depth for analysis (default: 2)'
  })
  async getCommunityDynamics(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Query('maxDepth', new DefaultValuePipe(2), ParseIntPipe) maxDepth: number,
    @Req() req
  ) {
    // Build citation network
    const network = await this.citationsService.getCitationNetwork(paperId, maxDepth);
    
    // Detect communities first
    const communityResult = await this.citationMetricsService.detectCommunities(network);
    
    // Analyze temporal dynamics
    const dynamics = await this.citationMetricsService.analyzeCommunityDynamics(
      network,
      communityResult.communities
    );

    return {
      paperId,
      networkSize: network.nodes.length,
      communityCount: communityResult.communityCount,
      timelines: dynamics.communityTimelines.map(t => ({
        communityId: t.communityId,
        communityKeywords: communityResult.communityDetails.find(
          c => c.communityId === t.communityId
        )?.keywords || [],
        yearRange: t.yearRange,
        growth: t.growth,
        growthInterpretation: this.interpretGrowth(t.growth),
        yearlySize: t.yearlySize,
        averageAge: t.averageAge,
        citationTrend: t.citationTrend,
      })),
      emergingCommunities: dynamics.emergingCommunities.map(cid => ({
        communityId: cid,
        keywords: communityResult.communityDetails.find(c => c.communityId === cid)?.keywords || [],
        size: communityResult.communityDetails.find(c => c.communityId === cid)?.size || 0,
      })),
      decliningCommunities: dynamics.decliningCommunities.map(cid => ({
        communityId: cid,
        keywords: communityResult.communityDetails.find(c => c.communityId === cid)?.keywords || [],
        size: communityResult.communityDetails.find(c => c.communityId === cid)?.size || 0,
      })),
      explanation: {
        emerging: 'Communities with recent growth (>50% increase)',
        stable: 'Communities with consistent activity',
        declining: 'Communities with decreased activity (>50% decrease)',
      },
    };
  }

  /**
   * Helper method to interpret modularity score
   */
  private interpretModularity(modularity: number): string {
    if (modularity >= 0.7) return 'Excellent - Very strong community structure';
    if (modularity >= 0.5) return 'Good - Clear community boundaries';
    if (modularity >= 0.3) return 'Moderate - Some community structure';
    if (modularity >= 0.1) return 'Weak - Unclear community boundaries';
    return 'Very Weak - Little to no community structure';
  }

  /**
   * Helper method to interpret leader role based on bridge score
   */
  private interpretLeaderRole(bridgeScore: number): string {
    if (bridgeScore >= 0.6) return 'Bridge - Connects multiple communities';
    if (bridgeScore >= 0.3) return 'Connector - Some cross-community influence';
    return 'Hub - Central within community';
  }

  /**
   * Helper method to interpret growth trend
   */
  private interpretGrowth(growth: 'emerging' | 'stable' | 'declining'): string {
    switch (growth) {
      case 'emerging': return 'Rapidly growing research area - High recent activity';
      case 'stable': return 'Mature research area - Consistent activity';
      case 'declining': return 'Declining interest - Reduced recent activity';
    }
  }

  /**
   * PHASE 4: TEMPORAL ANALYSIS ENDPOINTS
   */

  @Get('temporal/:paperId/velocity')
  async getCitationVelocity(@Param('paperId') paperId: string) {
    try {
      const id = parseInt(paperId);
      const velocity = await this.citationMetricsService.calculateCitationVelocity(id);

      return {
        success: true,
        data: velocity,
        metadata: {
          paperId: id,
          interpretation: {
            velocity: this.interpretVelocity(velocity.overallVelocity),
            trend: this.interpretVelocityTrend(velocity.velocityTrend),
            acceleration: this.interpretAcceleration(velocity.acceleration)
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('temporal/:paperId/bursts')
  async getCitationBursts(@Param('paperId') paperId: string) {
    try {
      const id = parseInt(paperId);
      const bursts = await this.citationMetricsService.detectCitationBursts(id);

      return {
        success: true,
        data: bursts,
        metadata: {
          paperId: id,
          interpretation: {
            currentStatus: bursts.currentBurst.active 
              ? `Active burst for ${bursts.currentBurst.duration} months (${bursts.currentBurst.intensity}x intensity)`
              : 'No active burst detected',
            history: `Detected ${bursts.historicalBursts.length} historical burst(s)`,
            forecast: this.interpretBurstProbability(bursts.burstProbability)
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('temporal/:paperId/aging')
  async getCitationAging(@Param('paperId') paperId: string) {
    try {
      const id = parseInt(paperId);
      const aging = await this.citationMetricsService.analyzeCitationAging(id);

      return {
        success: true,
        data: aging,
        metadata: {
          paperId: id,
          interpretation: {
            pattern: this.interpretAgingPattern(aging.agingPattern),
            phase: this.interpretCurrentPhase(aging.currentPhase),
            lifespan: `Paper is ${aging.paperAge} years old, projected relevance: ${aging.projectedLifespan} years`,
            halfLife: `Reached 50% of citations in ${aging.citationHalfLife} years`
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper methods for temporal interpretation
  private interpretVelocity(velocity: number): string {
    if (velocity > 5) return 'Very High - Rapidly accumulating citations';
    if (velocity > 2) return 'High - Strong citation growth';
    if (velocity > 0.5) return 'Moderate - Steady citation accumulation';
    if (velocity > 0.1) return 'Low - Slow citation growth';
    return 'Very Low - Minimal citation activity';
  }

  private interpretVelocityTrend(trend: string): string {
    switch (trend) {
      case 'accelerating': return 'Accelerating - Citation rate is increasing';
      case 'stable': return 'Stable - Consistent citation rate';
      case 'decelerating': return 'Decelerating - Citation rate is slowing down';
      default: return 'Unknown trend';
    }
  }

  private interpretAcceleration(acceleration: number): string {
    if (acceleration > 1) return 'Strong positive acceleration';
    if (acceleration > 0.3) return 'Moderate positive acceleration';
    if (acceleration > -0.3) return 'Stable (no significant change)';
    if (acceleration > -1) return 'Moderate deceleration';
    return 'Strong deceleration';
  }

  private interpretBurstProbability(probability: number): string {
    if (probability > 0.7) return 'High likelihood of upcoming citation burst';
    if (probability > 0.4) return 'Moderate chance of citation burst';
    if (probability > 0.2) return 'Low likelihood of citation burst';
    return 'Very unlikely to experience citation burst';
  }

  private interpretAgingPattern(pattern: string): string {
    switch (pattern) {
      case 'immediate': return 'Immediate Impact - Peaked within 2 years of publication';
      case 'delayed': return 'Delayed Recognition - Took 5+ years to peak';
      case 'classic': return 'Classic Pattern - Early peak followed by gradual decline';
      case 'sustained': return 'Sustained Relevance - Consistent impact over time';
      default: return 'Unknown pattern';
    }
  }

  private interpretCurrentPhase(phase: string): string {
    switch (phase) {
      case 'rising': return 'Rising - Citation activity is increasing';
      case 'peak': return 'Peak - Currently at maximum citation activity';
      case 'declining': return 'Declining - Citation activity is decreasing';
      case 'dormant': return 'Dormant - Minimal current citation activity';
      default: return 'Unknown phase';
    }
  }

  /**
   * PHASE 5: PREDICTIVE ANALYTICS ENDPOINTS
   */

  @Get('predictive/:paperId/forecast')
  async getFutureCitationForecast(
    @Param('paperId') paperId: string,
    @Query('months') months?: string
  ) {
    try {
      const id = parseInt(paperId);
      const monthsAhead = months ? parseInt(months) : 12;
      
      const forecast = await this.citationMetricsService.predictFutureCitations(id, monthsAhead);

      return {
        success: true,
        data: forecast,
        metadata: {
          paperId: id,
          forecastPeriod: `${monthsAhead} months`,
          interpretation: {
            confidence: this.interpretConfidence(forecast.confidence),
            trend: forecast.model.slope > 0 ? 'Upward trend' : 'Downward trend',
            reliability: forecast.model.rSquared > 0.7 ? 'High' : forecast.model.rSquared > 0.4 ? 'Moderate' : 'Low'
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('predictive/:paperId/impact-potential')
  async getImpactPotential(@Param('paperId') paperId: string) {
    try {
      const id = parseInt(paperId);
      const impact = await this.citationMetricsService.forecastImpactPotential(id);

      return {
        success: true,
        data: impact,
        metadata: {
          paperId: id,
          interpretation: {
            overall: this.interpretImpactPotential(impact.potential),
            score: `${impact.impactScore}/100 - ${impact.projectedRank}`,
            timeline: impact.timeToImpact === 0 
              ? 'Already at peak impact' 
              : `Estimated ${impact.timeToImpact} years to peak impact`,
            assessment: impact.strengths.length > impact.riskFactors.length 
              ? 'Strong potential with manageable risks' 
              : 'Potential limited by risk factors'
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('predictive/trending')
  async getTrendingPapers(@Query('limit') limit?: string) {
    try {
      const limitNum = limit ? parseInt(limit) : 10;
      const trending = await this.citationMetricsService.detectTrendingPapers(limitNum);

      return {
        success: true,
        data: trending,
        metadata: {
          count: trending.length,
          topPaper: trending[0] ? {
            title: trending[0].title,
            score: trending[0].trendingScore,
            velocity: `${trending[0].velocityChange > 0 ? '+' : ''}${trending[0].velocityChange}%`
          } : null,
          interpretation: trending.length > 0
            ? `${trending.filter(p => p.burstActive).length} papers experiencing active citation bursts`
            : 'No trending papers detected'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper methods for predictive interpretation
  private interpretConfidence(confidence: number): string {
    if (confidence > 0.8) return 'Very High - Predictions highly reliable';
    if (confidence > 0.6) return 'High - Predictions reliable';
    if (confidence > 0.4) return 'Moderate - Predictions somewhat reliable';
    if (confidence > 0.2) return 'Low - Predictions uncertain';
    return 'Very Low - Predictions unreliable';
  }

  private interpretImpactPotential(potential: string): string {
    switch (potential) {
      case 'breakthrough': return 'Breakthrough Potential - Likely to become highly influential';
      case 'high': return 'High Potential - Strong indicators of significant impact';
      case 'moderate': return 'Moderate Potential - Steady but limited impact expected';
      case 'low': return 'Low Potential - Minimal expected impact';
      default: return 'Unknown potential';
    }
  }
}
