import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Citation } from './citation.entity';
import { Paper } from '../papers/paper.entity';
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import { density } from 'graphology-metrics/graph';
import { differenceInDays, differenceInMonths, differenceInYears } from 'date-fns';
import * as stats from 'simple-statistics';

/**
 * Advanced citation metrics and graph analysis service
 * Implements sophisticated algorithms for measuring paper influence
 */
@Injectable()
export class CitationMetricsService {
  private readonly logger = new Logger(CitationMetricsService.name);

  constructor(
    @InjectRepository(Citation)
    private citationsRepository: Repository<Citation>,
    @InjectRepository(Paper)
    private papersRepository: Repository<Paper>,
  ) {}

  /**
   * Calculate advanced multi-dimensional influence score
   * Combines 7 factors: content relevance, network centrality, temporal relevance,
   * context quality, citation frequency, author reputation, and depth penalty
   */
  async calculateAdvancedScore(
    citation: Citation,
    network: { nodes: any[]; edges: any[] },
    currentYear: number = new Date().getFullYear()
  ): Promise<{
    totalScore: number;
    breakdown: {
      contentRelevance: number;
      networkImportance: number;
      contextQuality: number;
      temporalRelevance: number;
      citationFrequency: number;
      depthPenalty: number;
    };
  }> {
    let totalScore = 0;
    const breakdown = {
      contentRelevance: 0,
      networkImportance: 0,
      contextQuality: 0,
      temporalRelevance: 0,
      citationFrequency: 0,
      depthPenalty: 0,
    };

    // 1. Content Relevance (30% weight) - From AI analysis
    const contentScore = citation.relevanceScore || 0;
    breakdown.contentRelevance = contentScore * 0.3;
    totalScore += breakdown.contentRelevance;

    // 2. Network Importance (25% weight) - Based on centrality
    const inDegree = network.edges.filter(
      e => e.target === citation.citedPaperId
    ).length;
    
    // Use logarithmic scale to prevent domination by highly-cited papers
    // Log scale: 1 citation = 0.1, 10 citations = 0.5, 100 citations = 1.0
    const normalizedDegree = inDegree > 0 
      ? Math.min(Math.log10(inDegree + 1) / 2, 1.0)
      : 0;
    breakdown.networkImportance = normalizedDegree * 0.25;
    totalScore += breakdown.networkImportance;

    // 3. Context Quality (20% weight) - Sentiment and proximity analysis
    const contextScore = await this.analyzeContextQuality(citation);
    breakdown.contextQuality = contextScore * 0.2;
    totalScore += breakdown.contextQuality;

    // 4. Temporal Relevance (15% weight) - Exponential decay
    const citedPaper = await this.papersRepository.findOne({
      where: { id: citation.citedPaperId },
    });
    
    if (citedPaper?.publicationYear) {
      const age = currentYear - citedPaper.publicationYear;
      // Exponential decay: half-life of 10 years
      // 0 years = 1.0, 5 years = 0.7, 10 years = 0.5, 20 years = 0.25
      const recencyScore = Math.exp(-age / 14.427); // ln(2)/14.427 ≈ half-life 10 years
      breakdown.temporalRelevance = recencyScore * 0.15;
      totalScore += breakdown.temporalRelevance;
    }

    // 5. Citation Frequency (5% weight) - How often cited in citing paper
    if (citation.citationContext) {
      // Estimate from context length and depth
      const frequencyScore = Math.min(citation.citationContext.length / 500, 1.0);
      breakdown.citationFrequency = frequencyScore * 0.05;
      totalScore += breakdown.citationFrequency;
    }

    // 6. Depth Penalty (5% weight) - Penalize deep citations
    // Direct citation (depth 0) = 1.0, depth 1 = 0.7, depth 2 = 0.5, depth 3+ = 0.3
    const depth = citation.citationDepth || 0;
    const depthScore = Math.max(1.0 - (depth * 0.3), 0.3);
    breakdown.depthPenalty = depthScore * 0.05;
    totalScore += breakdown.depthPenalty;

    return {
      totalScore: Math.min(totalScore, 1.0),
      breakdown,
    };
  }

  /**
   * Analyze citation context quality using sentiment and keyword proximity
   * Returns score 0-1 based on positive sentiment and relevance indicators
   */
  private async analyzeContextQuality(citation: Citation): Promise<number> {
    if (!citation.citationContext) {
      return 0.5; // Neutral if no context
    }

    const context = citation.citationContext.toLowerCase();
    let score = 0.5; // Start neutral

    // Positive indicators (+0.1 each, max +0.5)
    const positiveKeywords = [
      'important', 'seminal', 'foundational', 'key', 'significant',
      'pioneering', 'influential', 'comprehensive', 'critical', 'essential',
      'breakthrough', 'landmark', 'novel', 'innovative', 'groundbreaking'
    ];

    // Negative indicators (-0.15 each, max -0.5)
    const negativeKeywords = [
      'limited', 'flawed', 'insufficient', 'contradicts', 'challenges',
      'outdated', 'problematic', 'questionable', 'inadequate', 'disputed'
    ];

    // Methodological indicators (+0.15 each, max +0.3)
    const methodKeywords = [
      'method', 'approach', 'technique', 'algorithm', 'framework',
      'model', 'system', 'procedure', 'protocol', 'methodology'
    ];

    let positiveCount = 0;
    let negativeCount = 0;
    let methodCount = 0;

    positiveKeywords.forEach(keyword => {
      if (context.includes(keyword)) positiveCount++;
    });

    negativeKeywords.forEach(keyword => {
      if (context.includes(keyword)) negativeCount++;
    });

    methodKeywords.forEach(keyword => {
      if (context.includes(keyword)) methodCount++;
    });

    // Calculate sentiment score
    score += Math.min(positiveCount * 0.1, 0.5);
    score -= Math.min(negativeCount * 0.15, 0.5);
    score += Math.min(methodCount * 0.15, 0.3);

    // Influential flag override
    if (citation.isInfluential) {
      score = Math.max(score, 0.8);
    }

    return Math.max(0, Math.min(score, 1.0));
  }

  /**
   * Calculate basic centrality measures for a paper in the citation network
   * Returns in-degree, out-degree, and clustering coefficient
   */
  async calculateCentrality(
    paperId: number,
    network: { nodes: any[]; edges: any[] }
  ): Promise<{
    inDegree: number;
    outDegree: number;
    totalDegree: number;
    clusteringCoefficient: number;
    normalizedInDegree: number;
  }> {
    // In-degree: How many papers cite this paper
    const inDegree = network.edges.filter(e => e.target === paperId).length;

    // Out-degree: How many papers this paper cites
    const outDegree = network.edges.filter(e => e.source === paperId).length;

    // Get neighbors (papers connected to this paper)
    const neighbors = new Set<number>();
    network.edges.forEach(edge => {
      if (edge.source === paperId) neighbors.add(edge.target);
      if (edge.target === paperId) neighbors.add(edge.source);
    });

    // Calculate clustering coefficient
    // Ratio of edges between neighbors to possible edges
    let clusteringCoefficient = 0;
    if (neighbors.size >= 2) {
      const neighborArray = Array.from(neighbors);
      let possibleEdges = (neighbors.size * (neighbors.size - 1)) / 2;
      let actualEdges = 0;

      for (let i = 0; i < neighborArray.length; i++) {
        for (let j = i + 1; j < neighborArray.length; j++) {
          const hasEdge = network.edges.some(
            e =>
              (e.source === neighborArray[i] && e.target === neighborArray[j]) ||
              (e.source === neighborArray[j] && e.target === neighborArray[i])
          );
          if (hasEdge) actualEdges++;
        }
      }

      clusteringCoefficient = possibleEdges > 0 ? actualEdges / possibleEdges : 0;
    }

    // Normalized in-degree (0-1 scale based on network size)
    const maxPossibleDegree = network.nodes.length - 1;
    const normalizedInDegree = maxPossibleDegree > 0 ? inDegree / maxPossibleDegree : 0;

    return {
      inDegree,
      outDegree,
      totalDegree: inDegree + outDegree,
      clusteringCoefficient,
      normalizedInDegree,
    };
  }

  /**
   * Simple PageRank implementation for citation network
   * Measures the importance of papers based on citation structure
   * 
   * @param network Citation network with nodes and edges
   * @param dampingFactor Probability of following a citation (default 0.85)
   * @param maxIterations Maximum iterations for convergence (default 30)
   * @param tolerance Convergence threshold (default 0.0001)
   */
  async calculatePageRank(
    network: { nodes: any[]; edges: any[] },
    dampingFactor: number = 0.85,
    maxIterations: number = 30,
    tolerance: number = 0.0001
  ): Promise<Map<number, number>> {
    const pageRank = new Map<number, number>();
    const outDegree = new Map<number, number>();
    const n = network.nodes.length;

    if (n === 0) return pageRank;

    // Initialize: equal probability for all nodes
    const initialScore = 1.0 / n;
    network.nodes.forEach(node => {
      pageRank.set(node.id, initialScore);
      outDegree.set(node.id, 0);
    });

    // Calculate out-degrees
    network.edges.forEach(edge => {
      const current = outDegree.get(edge.source) || 0;
      outDegree.set(edge.source, current + 1);
    });

    // Iterative computation
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const newPageRank = new Map<number, number>();
      let maxDelta = 0;

      // For each node, calculate new PageRank
      network.nodes.forEach(node => {
        const nodeId = node.id;
        
        // Sum contributions from incoming citations
        let sum = 0;
        network.edges
          .filter(e => e.target === nodeId)
          .forEach(edge => {
            const sourceRank = pageRank.get(edge.source) || 0;
            const sourceDegree = outDegree.get(edge.source) || 1;
            sum += sourceRank / sourceDegree;
          });

        // Apply damping factor
        const newRank = (1 - dampingFactor) / n + dampingFactor * sum;
        newPageRank.set(nodeId, newRank);

        // Track convergence
        const delta = Math.abs(newRank - (pageRank.get(nodeId) || 0));
        maxDelta = Math.max(maxDelta, delta);
      });

      // Update PageRank values
      newPageRank.forEach((value, key) => {
        pageRank.set(key, value);
      });

      // Check convergence
      if (maxDelta < tolerance) {
        this.logger.debug(`PageRank converged after ${iteration + 1} iterations`);
        break;
      }
    }

    return pageRank;
  }

  /**
   * Calculate enhanced context metrics including:
   * - Sentiment polarity
   * - Citation location importance
   * - Keyword proximity to research objectives
   */
  async analyzeContextMetrics(
    citingPaper: Paper,
    citation: Citation
  ): Promise<{
    sentimentScore: number;
    locationScore: number;
    proximityScore: number;
    mentionCount: number;
  }> {
    const result = {
      sentimentScore: 0.5,
      locationScore: 0.5,
      proximityScore: 0.5,
      mentionCount: 0,
    };

    if (!citingPaper.fullText || !citation.citationContext) {
      return result;
    }

    const fullText = citingPaper.fullText.toLowerCase();
    const context = citation.citationContext.toLowerCase();

    // 1. Extract cited author for mention tracking
    const citedPaper = await this.papersRepository.findOne({
      where: { id: citation.citedPaperId },
    });

    if (citedPaper?.authors) {
      const firstAuthor = citedPaper.authors.split(',')[0].trim().split(' ').pop();
      if (firstAuthor) {
        const mentions = fullText.match(new RegExp(firstAuthor, 'gi')) || [];
        result.mentionCount = mentions.length;
      }
    }

    // 2. Sentiment analysis
    result.sentimentScore = await this.analyzeContextQuality(citation);

    // 3. Location importance
    // Divide paper into sections: Introduction (0-25%), Methods (25-50%), Results (50-75%), Discussion (75-100%)
    const textLength = fullText.length;
    const sections = {
      introduction: fullText.substring(0, Math.floor(textLength * 0.25)),
      methods: fullText.substring(Math.floor(textLength * 0.25), Math.floor(textLength * 0.5)),
      results: fullText.substring(Math.floor(textLength * 0.5), Math.floor(textLength * 0.75)),
      discussion: fullText.substring(Math.floor(textLength * 0.75)),
    };

    // Score by section importance
    let locationScore = 0;
    if (sections.introduction.includes(context.substring(0, 50))) {
      locationScore = 1.0; // Most important
    } else if (sections.methods.includes(context.substring(0, 50))) {
      locationScore = 0.9; // Very important
    } else if (sections.results.includes(context.substring(0, 50))) {
      locationScore = 0.7; // Important
    } else if (sections.discussion.includes(context.substring(0, 50))) {
      locationScore = 0.6; // Moderately important
    } else {
      locationScore = 0.5; // Default
    }
    result.locationScore = locationScore;

    // 4. Proximity to research objectives/methods keywords
    const keyPhrases = [
      'objective', 'aim', 'goal', 'purpose', 'research question',
      'method', 'approach', 'technique', 'framework', 'model',
      'hypothesis', 'theory', 'contribution', 'findings', 'conclusion'
    ];

    let proximityMatches = 0;
    keyPhrases.forEach(phrase => {
      if (context.includes(phrase)) {
        proximityMatches++;
      }
    });

    result.proximityScore = Math.min(proximityMatches / 5, 1.0);

    return result;
  }

  /**
   * Calculate co-citation strength between two papers
   * Co-citation occurs when two papers are cited together by the same citing paper
   * Higher co-citation indicates papers are related in the same research area
   * 
   * @param paperId1 First paper ID
   * @param paperId2 Second paper ID
   * @param network Citation network containing all papers and citations
   * @returns Co-citation strength (0-1) and list of papers citing both
   */
  async calculateCoCitation(
    paperId1: number,
    paperId2: number,
    network: { nodes: any[]; edges: any[] }
  ): Promise<{
    strength: number;
    commonCitingPapers: number[];
    totalCitingPaper1: number;
    totalCitingPaper2: number;
    jaccardIndex: number;
  }> {
    // Find all papers citing paper1
    const citingPaper1 = new Set<number>();
    network.edges.forEach(edge => {
      if (edge.citedPaperId === paperId1) {
        citingPaper1.add(edge.citingPaperId);
      }
    });

    // Find all papers citing paper2
    const citingPaper2 = new Set<number>();
    network.edges.forEach(edge => {
      if (edge.citedPaperId === paperId2) {
        citingPaper2.add(edge.citingPaperId);
      }
    });

    // Find papers citing both (intersection)
    const commonCiting = Array.from(citingPaper1).filter(id => 
      citingPaper2.has(id)
    );

    // Calculate Jaccard index: |intersection| / |union|
    const union = new Set([...citingPaper1, ...citingPaper2]);
    const jaccardIndex = union.size > 0 ? commonCiting.length / union.size : 0;

    // Normalized strength (0-1)
    const maxPossible = Math.min(citingPaper1.size, citingPaper2.size);
    const strength = maxPossible > 0 ? commonCiting.length / maxPossible : 0;

    return {
      strength,
      commonCitingPapers: commonCiting,
      totalCitingPaper1: citingPaper1.size,
      totalCitingPaper2: citingPaper2.size,
      jaccardIndex,
    };
  }

  /**
   * Calculate bibliographic coupling strength between two papers
   * Coupling occurs when two papers cite the same references
   * Higher coupling indicates papers build on similar foundations
   * 
   * @param paperId1 First paper ID
   * @param paperId2 Second paper ID
   * @param network Citation network containing all papers and citations
   * @returns Coupling strength (0-1) and list of common references
   */
  async calculateBibliographicCoupling(
    paperId1: number,
    paperId2: number,
    network: { nodes: any[]; edges: any[] }
  ): Promise<{
    strength: number;
    commonReferences: number[];
    totalReferencesPaper1: number;
    totalReferencesPaper2: number;
    jaccardIndex: number;
  }> {
    // Find all references of paper1
    const referencesPaper1 = new Set<number>();
    network.edges.forEach(edge => {
      if (edge.citingPaperId === paperId1) {
        referencesPaper1.add(edge.citedPaperId);
      }
    });

    // Find all references of paper2
    const referencesPaper2 = new Set<number>();
    network.edges.forEach(edge => {
      if (edge.citingPaperId === paperId2) {
        referencesPaper2.add(edge.citedPaperId);
      }
    });

    // Find common references (intersection)
    const commonRefs = Array.from(referencesPaper1).filter(id => 
      referencesPaper2.has(id)
    );

    // Calculate Jaccard index
    const union = new Set([...referencesPaper1, ...referencesPaper2]);
    const jaccardIndex = union.size > 0 ? commonRefs.length / union.size : 0;

    // Normalized strength (0-1)
    const maxPossible = Math.min(referencesPaper1.size, referencesPaper2.size);
    const strength = maxPossible > 0 ? commonRefs.length / maxPossible : 0;

    return {
      strength,
      commonReferences: commonRefs,
      totalReferencesPaper1: referencesPaper1.size,
      totalReferencesPaper2: referencesPaper2.size,
      jaccardIndex,
    };
  }

  /**
   * Find papers most similar to a given paper using co-citation analysis
   * Returns papers frequently cited together with the target paper
   * 
   * @param paperId Target paper ID
   * @param network Citation network
   * @param topN Number of similar papers to return (default 10)
   * @returns Array of similar papers with co-citation scores
   */
  async findSimilarPapersByCoCitation(
    paperId: number,
    network: { nodes: any[]; edges: any[] },
    topN: number = 10
  ): Promise<Array<{
    paperId: number;
    title: string;
    year: number;
    coCitationStrength: number;
    commonCitingPapers: number;
    jaccardIndex: number;
  }>> {
    // Get all other papers in network (exclude self)
    const otherPapers = network.nodes.filter(node => node.id !== paperId);

    // Calculate co-citation with each paper
    const similarities = await Promise.all(
      otherPapers.map(async (paper) => {
        const coCitation = await this.calculateCoCitation(
          paperId,
          paper.id,
          network
        );

        return {
          paperId: paper.id,
          title: paper.title,
          year: paper.year,
          coCitationStrength: coCitation.strength,
          commonCitingPapers: coCitation.commonCitingPapers.length,
          jaccardIndex: coCitation.jaccardIndex,
        };
      })
    );

    // Sort by co-citation strength and return top N
    return similarities
      .filter(s => s.coCitationStrength > 0) // Only papers with some co-citation
      .sort((a, b) => b.coCitationStrength - a.coCitationStrength)
      .slice(0, topN);
  }

  /**
   * Find papers most similar to a given paper using bibliographic coupling
   * Returns papers that cite many of the same references
   * 
   * @param paperId Target paper ID
   * @param network Citation network
   * @param topN Number of similar papers to return (default 10)
   * @returns Array of similar papers with coupling scores
   */
  async findSimilarPapersByCoupling(
    paperId: number,
    network: { nodes: any[]; edges: any[] },
    topN: number = 10
  ): Promise<Array<{
    paperId: number;
    title: string;
    year: number;
    couplingStrength: number;
    commonReferences: number;
    jaccardIndex: number;
  }>> {
    // Get all other papers in network (exclude self)
    const otherPapers = network.nodes.filter(node => node.id !== paperId);

    // Calculate bibliographic coupling with each paper
    const similarities = await Promise.all(
      otherPapers.map(async (paper) => {
        const coupling = await this.calculateBibliographicCoupling(
          paperId,
          paper.id,
          network
        );

        return {
          paperId: paper.id,
          title: paper.title,
          year: paper.year,
          couplingStrength: coupling.strength,
          commonReferences: coupling.commonReferences.length,
          jaccardIndex: coupling.jaccardIndex,
        };
      })
    );

    // Sort by coupling strength and return top N
    return similarities
      .filter(s => s.couplingStrength > 0) // Only papers with some coupling
      .sort((a, b) => b.couplingStrength - a.couplingStrength)
      .slice(0, topN);
  }

  /**
   * Calculate combined similarity score using both co-citation and bibliographic coupling
   * Provides a more robust measure of paper relatedness
   * 
   * @param paperId Target paper ID
   * @param network Citation network
   * @param topN Number of similar papers to return (default 10)
   * @returns Array of similar papers with combined scores
   */
  async findSimilarPapersCombined(
    paperId: number,
    network: { nodes: any[]; edges: any[] },
    topN: number = 10
  ): Promise<Array<{
    paperId: number;
    title: string;
    year: number;
    combinedScore: number;
    coCitationStrength: number;
    couplingStrength: number;
    jaccardIndexCoCitation: number;
    jaccardIndexCoupling: number;
  }>> {
    // Get all other papers in network
    const otherPapers = network.nodes.filter(node => node.id !== paperId);

    // Calculate both metrics for each paper
    const similarities = await Promise.all(
      otherPapers.map(async (paper) => {
        const [coCitation, coupling] = await Promise.all([
          this.calculateCoCitation(paperId, paper.id, network),
          this.calculateBibliographicCoupling(paperId, paper.id, network),
        ]);

        // Combined score: weighted average (60% co-citation, 40% coupling)
        // Co-citation weighted higher as it indicates current relevance
        const combinedScore = 
          coCitation.strength * 0.6 + 
          coupling.strength * 0.4;

        return {
          paperId: paper.id,
          title: paper.title,
          year: paper.year,
          combinedScore,
          coCitationStrength: coCitation.strength,
          couplingStrength: coupling.strength,
          jaccardIndexCoCitation: coCitation.jaccardIndex,
          jaccardIndexCoupling: coupling.jaccardIndex,
        };
      })
    );

    // Sort by combined score and return top N
    return similarities
      .filter(s => s.combinedScore > 0)
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, topN);
  }

  /**
   * Detect research communities using Louvain algorithm
   * Communities are groups of densely connected papers in the citation network
   * 
   * @param network Citation network containing all papers and citations
   * @returns Community assignments with modularity score
   */
  async detectCommunities(
    network: { nodes: any[]; edges: any[] }
  ): Promise<{
    communities: Record<string, number>; // paperId -> communityId
    communityCount: number;
    modularity: number;
    communityDetails: Array<{
      communityId: number;
      size: number;
      papers: Array<{ paperId: number; title: string; year: number }>;
      density: number;
      avgDegree: number;
      keywords: string[];
    }>;
  }> {
    // Build graphology graph from network
    const graph = new Graph({ type: 'directed' });

    // Add nodes
    network.nodes.forEach(node => {
      graph.addNode(node.id.toString(), {
        label: node.title,
        year: node.year,
      });
    });

    // Add edges
    network.edges.forEach(edge => {
      const source = edge.citingPaperId.toString();
      const target = edge.citedPaperId.toString();
      
      if (graph.hasNode(source) && graph.hasNode(target)) {
        // Use undirected edge for community detection
        if (!graph.hasEdge(source, target) && !graph.hasEdge(target, source)) {
          try {
            graph.addEdge(source, target);
          } catch (e) {
            // Edge might already exist, ignore
          }
        }
      }
    });

    // Run Louvain community detection
    const communities = louvain(graph);
    
    // Calculate modularity (quality of community structure)
    const modularity = this.calculateModularity(graph, communities);

    // Group papers by community
    const communityGroups = new Map<number, any[]>();
    Object.entries(communities).forEach(([nodeId, communityId]) => {
      if (!communityGroups.has(communityId)) {
        communityGroups.set(communityId, []);
      }
      
      const node = network.nodes.find(n => n.id.toString() === nodeId);
      if (node) {
        communityGroups.get(communityId).push(node);
      }
    });

    // Calculate community details
    const communityDetails = [];
    for (const [communityId, papers] of communityGroups.entries()) {
      // Build subgraph for this community
      const subgraph = graph.copy();
      const nodesToKeep = papers.map(p => p.id.toString());
      subgraph.forEachNode((node) => {
        if (!nodesToKeep.includes(node)) {
          subgraph.dropNode(node);
        }
      });

      // Calculate community metrics
      const communityDensity = subgraph.order > 1 ? density(subgraph) : 0;
      const communityAvgDegree = subgraph.order > 0 
        ? (subgraph.size * 2) / subgraph.order 
        : 0;

      // Extract keywords from paper titles (simple approach)
      const keywords = this.extractCommunityKeywords(papers);

      communityDetails.push({
        communityId,
        size: papers.length,
        papers: papers.map(p => ({
          paperId: p.id,
          title: p.title,
          year: p.year,
        })),
        density: communityDensity,
        avgDegree: communityAvgDegree,
        keywords,
      });
    }

    // Sort communities by size (descending)
    communityDetails.sort((a, b) => b.size - a.size);

    return {
      communities,
      communityCount: communityGroups.size,
      modularity,
      communityDetails,
    };
  }

  /**
   * Calculate modularity of community structure
   * Modularity measures the strength of division of a network into communities
   * Range: -0.5 to 1.0 (higher is better)
   */
  private calculateModularity(
    graph: Graph,
    communities: Record<string, number>
  ): number {
    const m = graph.size; // Total number of edges
    if (m === 0) return 0;

    let modularity = 0;
    const twoM = 2 * m;

    graph.forEachEdge((edge, attributes, source, target) => {
      const sourceCommunity = communities[source];
      const targetCommunity = communities[target];

      // Only count if same community
      if (sourceCommunity === targetCommunity) {
        const ki = graph.degree(source);
        const kj = graph.degree(target);
        
        // Modularity formula: (Aij - ki*kj/2m) / 2m
        // Safe division: already checked m > 0 above
        const expected = (ki * kj) / twoM;
        modularity += (1 - expected) / twoM;
      }
    });

    return modularity;
  }

  /**
   * Extract representative keywords from community papers
   * Uses simple word frequency analysis on titles
   */
  private extractCommunityKeywords(papers: any[]): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
      'using', 'based', 'via', 'through', 'into', 'about', 'over', 'after',
    ]);

    // Count word frequencies
    const wordFreq = new Map<string, number>();
    
    papers.forEach(paper => {
      const words = paper.title
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w));

      words.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      });
    });

    // Get top 5 most frequent words
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Identify influential papers within each community
   * Uses in-community PageRank to rank papers by influence within their community
   * 
   * @param network Citation network
   * @param communities Community assignments from detectCommunities()
   * @returns Influential papers per community
   */
  async identifyInfluentialPapers(
    network: { nodes: any[]; edges: any[] },
    communities: Record<string, number>
  ): Promise<Array<{
    communityId: number;
    leaders: Array<{
      paperId: number;
      title: string;
      year: number;
      communityPageRank: number;
      inCommunityDegree: number;
      bridgeScore: number; // Connections to other communities
    }>;
  }>> {
    // Group papers by community
    const communityGroups = new Map<number, any[]>();
    Object.entries(communities).forEach(([nodeId, communityId]) => {
      if (!communityGroups.has(communityId)) {
        communityGroups.set(communityId, []);
      }
      
      const node = network.nodes.find(n => n.id.toString() === nodeId);
      if (node) {
        communityGroups.get(communityId).push(node);
      }
    });

    const results = [];

    for (const [communityId, papers] of communityGroups.entries()) {
      const paperIds = papers.map(p => p.id);

      // Build subnetwork for this community
      const subNetwork = {
        nodes: papers,
        edges: network.edges.filter(e => 
          paperIds.includes(e.citingPaperId) && 
          paperIds.includes(e.citedPaperId)
        ),
      };

      // Calculate PageRank within community
      const pageRankScores = await this.calculatePageRank(
        subNetwork
      );

      // Calculate metrics for each paper
      const leaders = papers.map(paper => {
        const prScore = pageRankScores.get(paper.id) || 0;

        // In-community degree (citations within community)
        const inCommunityDegree = network.edges.filter(e =>
          (e.citedPaperId === paper.id && paperIds.includes(e.citingPaperId))
        ).length;

        // Bridge score (connections to other communities)
        const externalConnections = network.edges.filter(e =>
          (e.citingPaperId === paper.id && !paperIds.includes(e.citedPaperId)) ||
          (e.citedPaperId === paper.id && !paperIds.includes(e.citingPaperId))
        ).length;

        const totalConnections = network.edges.filter(e =>
          e.citingPaperId === paper.id || e.citedPaperId === paper.id
        ).length;

        const bridgeScore = totalConnections > 0 
          ? externalConnections / totalConnections 
          : 0;

        return {
          paperId: paper.id,
          title: paper.title,
          year: paper.year,
          communityPageRank: prScore,
          inCommunityDegree,
          bridgeScore,
        };
      });

      // Sort by PageRank and take top 5
      leaders.sort((a, b) => b.communityPageRank - a.communityPageRank);

      results.push({
        communityId,
        leaders: leaders.slice(0, 5),
      });
    }

    return results;
  }

  /**
   * Analyze temporal dynamics of communities
   * Track how communities evolve over time
   * 
   * @param network Citation network with temporal data
   * @param communities Community assignments
   * @returns Temporal analysis of communities
   */
  async analyzeCommunityDynamics(
    network: { nodes: any[]; edges: any[] },
    communities: Record<string, number>
  ): Promise<{
    communityTimelines: Array<{
      communityId: number;
      yearRange: { start: number; end: number };
      growth: 'emerging' | 'stable' | 'declining';
      yearlySize: Array<{ year: number; paperCount: number }>;
      averageAge: number;
      citationTrend: 'increasing' | 'stable' | 'decreasing';
    }>;
    emergingCommunities: number[]; // Communities with recent growth
    decliningCommunities: number[]; // Communities losing activity
  }> {
    // Group papers by community
    const communityGroups = new Map<number, any[]>();
    Object.entries(communities).forEach(([nodeId, communityId]) => {
      if (!communityGroups.has(communityId)) {
        communityGroups.set(communityId, []);
      }
      
      const node = network.nodes.find(n => n.id.toString() === nodeId);
      if (node) {
        communityGroups.get(communityId).push(node);
      }
    });

    const currentYear = new Date().getFullYear();
    const communityTimelines = [];
    const emergingCommunities = [];
    const decliningCommunities = [];

    for (const [communityId, papers] of communityGroups.entries()) {
      // Get year range
      const years = papers.map(p => p.year || currentYear);
      const startYear = Math.min(...years);
      const endYear = Math.max(...years);

      // Count papers per year
      const yearlySize = new Map<number, number>();
      papers.forEach(p => {
        const year = p.year || currentYear;
        yearlySize.set(year, (yearlySize.get(year) || 0) + 1);
      });

      const yearlySizeArray = Array.from(yearlySize.entries())
        .map(([year, paperCount]) => ({ year, paperCount }))
        .sort((a, b) => a.year - b.year);

      // Calculate average age
      const totalAge = papers.reduce((sum, p) => 
        sum + (currentYear - (p.year || currentYear)), 0
      );
      const averageAge = papers.length > 0 ? totalAge / papers.length : 0;

      // Determine growth trend (compare recent 3 years vs previous 3 years)
      const recentYears = yearlySizeArray.filter(y => y.year >= currentYear - 3);
      const olderYears = yearlySizeArray.filter(y => 
        y.year >= currentYear - 6 && y.year < currentYear - 3
      );

      const recentAvg = recentYears.length > 0
        ? recentYears.reduce((sum, y) => sum + y.paperCount, 0) / recentYears.length
        : 0;
      const olderAvg = olderYears.length > 0
        ? olderYears.reduce((sum, y) => sum + y.paperCount, 0) / olderYears.length
        : 0;

      let growth: 'emerging' | 'stable' | 'declining';
      if (recentAvg > olderAvg * 1.5) {
        growth = 'emerging';
        emergingCommunities.push(communityId);
      } else if (recentAvg < olderAvg * 0.5) {
        growth = 'declining';
        decliningCommunities.push(communityId);
      } else {
        growth = 'stable';
      }

      // Analyze citation trend (simple: recent papers getting cited more?)
      const paperIds = papers.map(p => p.id);
      const recentPapers = papers.filter(p => (p.year || currentYear) >= currentYear - 3);
      const recentCitations = network.edges.filter(e =>
        recentPapers.some(rp => rp.id === e.citedPaperId)
      ).length;

      const olderPapers = papers.filter(p => 
        (p.year || currentYear) >= currentYear - 6 && 
        (p.year || currentYear) < currentYear - 3
      );
      const olderCitations = network.edges.filter(e =>
        olderPapers.some(op => op.id === e.citedPaperId)
      ).length;

      const citationTrend = recentCitations > olderCitations * 1.2
        ? 'increasing'
        : recentCitations < olderCitations * 0.8
        ? 'decreasing'
        : 'stable';

      communityTimelines.push({
        communityId,
        yearRange: { start: startYear, end: endYear },
        growth,
        yearlySize: yearlySizeArray,
        averageAge,
        citationTrend,
      });
    }

    return {
      communityTimelines,
      emergingCommunities,
      decliningCommunities,
    };
  }

  /**
   * PHASE 4: TEMPORAL ANALYSIS
   * Track citation velocity and identify citation bursts
   */

  /**
   * Calculate citation velocity - rate of citation accumulation over time
   * Measures how quickly a paper gains citations
   */
  async calculateCitationVelocity(paperId: number): Promise<{
    overallVelocity: number; // Citations per month
    recentVelocity: number; // Last 12 months
    acceleration: number; // Change in velocity
    velocityTrend: 'accelerating' | 'stable' | 'decelerating';
    monthlyData: Array<{
      month: string;
      citationCount: number;
      cumulativeCount: number;
      velocity: number;
    }>;
    peakMonth: { month: string; citations: number };
  }> {
    const citations = await this.citationsRepository.find({
      where: { citedPaperId: paperId },
      relations: ['citingPaper'],
      order: { createdAt: 'ASC' }
    });

    if (citations.length === 0) {
      return {
        overallVelocity: 0,
        recentVelocity: 0,
        acceleration: 0,
        velocityTrend: 'stable',
        monthlyData: [],
        peakMonth: { month: '', citations: 0 }
      };
    }

    const paper = await this.papersRepository.findOne({ where: { id: paperId } });
    const publicationDate = paper?.publicationYear 
      ? new Date(paper.publicationYear, 0, 1) 
      : citations[0].createdAt;

    // Group citations by month
    const monthlyGroups = new Map<string, number>();
    citations.forEach(citation => {
      const date = citation.createdAt;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyGroups.set(monthKey, (monthlyGroups.get(monthKey) || 0) + 1);
    });

    // Calculate cumulative and velocity data
    const monthlyData = [];
    let cumulative = 0;
    const sortedMonths = Array.from(monthlyGroups.keys()).sort();

    for (const month of sortedMonths) {
      const count = monthlyGroups.get(month) || 0;
      cumulative += count;
      
      // Velocity = citations in this month
      monthlyData.push({
        month,
        citationCount: count,
        cumulativeCount: cumulative,
        velocity: count
      });
    }

    // Find peak month
    const peakMonth = monthlyData.reduce((peak, current) => 
      current.citationCount > peak.citationCount ? current : peak,
      { month: '', citationCount: 0, cumulativeCount: 0, velocity: 0 }
    );

    // Calculate overall velocity (citations per month)
    // Use Math.max to ensure we never divide by zero
    const monthsSincePublication = Math.max(1, differenceInMonths(new Date(), publicationDate));
    const overallVelocity = citations.length / monthsSincePublication;

    // Calculate recent velocity (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const recentCitations = citations.filter(c => c.createdAt >= twelveMonthsAgo);
    const recentVelocity = recentCitations.length / 12;

    // Calculate acceleration (change in velocity)
    const acceleration = recentVelocity - overallVelocity;
    
    let velocityTrend: 'accelerating' | 'stable' | 'decelerating';
    if (acceleration > 0.5) velocityTrend = 'accelerating';
    else if (acceleration < -0.5) velocityTrend = 'decelerating';
    else velocityTrend = 'stable';

    return {
      overallVelocity: parseFloat(overallVelocity.toFixed(2)),
      recentVelocity: parseFloat(recentVelocity.toFixed(2)),
      acceleration: parseFloat(acceleration.toFixed(2)),
      velocityTrend,
      monthlyData,
      peakMonth: {
        month: peakMonth.month,
        citations: peakMonth.citationCount
      }
    };
  }

  /**
   * Detect citation bursts - sudden increases in citation rate
   * Uses Kleinberg's burst detection algorithm (simplified)
   */
  async detectCitationBursts(paperId: number): Promise<{
    hasBurst: boolean;
    currentBurst: {
      active: boolean;
      startMonth: string;
      duration: number; // months
      intensity: number; // multiplier of baseline
    };
    historicalBursts: Array<{
      startMonth: string;
      endMonth: string;
      duration: number;
      peakCitations: number;
      intensity: number;
    }>;
    burstProbability: number; // Likelihood of future burst
  }> {
    const velocityData = await this.calculateCitationVelocity(paperId);
    
    if (velocityData.monthlyData.length < 6) {
      return {
        hasBurst: false,
        currentBurst: { active: false, startMonth: '', duration: 0, intensity: 0 },
        historicalBursts: [],
        burstProbability: 0
      };
    }

    // Calculate baseline (median citations per month)
    const monthlyCounts = velocityData.monthlyData.map(m => m.citationCount);
    const sortedCounts = [...monthlyCounts].sort((a, b) => a - b);
    // Ensure baseline is at least 1 to avoid division by zero
    const baseline = Math.max(1, sortedCounts[Math.floor(sortedCounts.length / 2)] || 1);

    // Detect bursts (citations > 2x baseline for 3+ consecutive months)
    const bursts = [];
    let currentBurstStart = null;
    let currentBurstPeak = 0;

    for (let i = 0; i < velocityData.monthlyData.length; i++) {
      const month = velocityData.monthlyData[i];
      const isBurst = month.citationCount > baseline * 2;

      if (isBurst && !currentBurstStart) {
        currentBurstStart = i;
        currentBurstPeak = month.citationCount;
      } else if (isBurst && currentBurstStart !== null) {
        currentBurstPeak = Math.max(currentBurstPeak, month.citationCount);
      } else if (!isBurst && currentBurstStart !== null) {
        // Burst ended
        const duration = i - currentBurstStart;
        if (duration >= 3) { // Minimum 3 months to qualify as burst
          bursts.push({
            startMonth: velocityData.monthlyData[currentBurstStart].month,
            endMonth: velocityData.monthlyData[i - 1].month,
            duration,
            peakCitations: currentBurstPeak,
            intensity: parseFloat((currentBurstPeak / baseline).toFixed(2))
          });
        }
        currentBurstStart = null;
        currentBurstPeak = 0;
      }
    }

    // Check if current burst is active
    const lastMonth = velocityData.monthlyData[velocityData.monthlyData.length - 1];
    const isCurrentlyBursting = lastMonth.citationCount > baseline * 2;

    let currentBurst = { active: false, startMonth: '', duration: 0, intensity: 0 };
    if (isCurrentlyBursting && currentBurstStart !== null) {
      const duration = velocityData.monthlyData.length - currentBurstStart;
      currentBurst = {
        active: true,
        startMonth: velocityData.monthlyData[currentBurstStart].month,
        duration,
        intensity: parseFloat((lastMonth.citationCount / baseline).toFixed(2))
      };
    }

    // Calculate burst probability based on recent trend
    const recentMonths = velocityData.monthlyData.slice(-6);
    const recentAverage = recentMonths.reduce((sum, m) => sum + m.citationCount, 0) / 6;
    const burstProbability = Math.min(0.95, Math.max(0.05, (recentAverage / baseline - 1) * 0.5));

    return {
      hasBurst: bursts.length > 0 || isCurrentlyBursting,
      currentBurst,
      historicalBursts: bursts,
      burstProbability: parseFloat(burstProbability.toFixed(2))
    };
  }

  /**
   * Analyze citation aging - how citation patterns change over paper's lifetime
   */
  async analyzeCitationAging(paperId: number): Promise<{
    paperAge: number; // years since publication
    citationHalfLife: number; // years to reach 50% of total citations
    agingPattern: 'classic' | 'delayed' | 'immediate' | 'sustained' | 'dormant';
    peakYear: number; // years after publication when citations peaked
    currentPhase: 'rising' | 'peak' | 'declining' | 'dormant';
    yearlyBreakdown: Array<{
      yearsSincePublication: number;
      citations: number;
      percentage: number;
      cumulative: number;
    }>;
    projectedLifespan: number; // estimated years of continued relevance
  }> {
    const citations = await this.citationsRepository.find({
      where: { citedPaperId: paperId },
      relations: ['citingPaper'],
      order: { createdAt: 'ASC' }
    });

    const paper = await this.papersRepository.findOne({ where: { id: paperId } });
    const publicationYear = paper?.publicationYear || new Date().getFullYear();
    const currentYear = new Date().getFullYear();
    const paperAge = currentYear - publicationYear;

    if (citations.length === 0 || paperAge < 1) {
      return {
        paperAge,
        citationHalfLife: 0,
        agingPattern: 'dormant',
        peakYear: 0,
        currentPhase: 'dormant',
        yearlyBreakdown: [],
        projectedLifespan: 0
      };
    }

    // Group citations by years since publication
    const yearlyGroups = new Map<number, number>();
    citations.forEach(citation => {
      const citationYear = citation.createdAt.getFullYear();
      const yearsSince = citationYear - publicationYear;
      if (yearsSince >= 0) {
        yearlyGroups.set(yearsSince, (yearlyGroups.get(yearsSince) || 0) + 1);
      }
    });

    // Build yearly breakdown
    const yearlyBreakdown = [];
    let cumulative = 0;
    const maxYear = Math.max(...Array.from(yearlyGroups.keys()));

    for (let year = 0; year <= maxYear; year++) {
      const count = yearlyGroups.get(year) || 0;
      cumulative += count;
      yearlyBreakdown.push({
        yearsSincePublication: year,
        citations: count,
        percentage: parseFloat(((count / citations.length) * 100).toFixed(1)),
        cumulative
      });
    }

    // Find peak year
    const peakYearData = yearlyBreakdown.reduce((peak, current) => 
      current.citations > peak.citations ? current : peak,
      { yearsSincePublication: 0, citations: 0, percentage: 0, cumulative: 0 }
    );
    const peakYear = peakYearData.yearsSincePublication;

    // Calculate citation half-life
    const halfCitations = citations.length / 2;
    const halfLifeData = yearlyBreakdown.find(y => y.cumulative >= halfCitations);
    const citationHalfLife = halfLifeData?.yearsSincePublication || paperAge;

    // Determine aging pattern
    let agingPattern: 'classic' | 'delayed' | 'immediate' | 'sustained';
    if (peakYear <= 2) {
      agingPattern = 'immediate'; // Peaked quickly
    } else if (peakYear > 5) {
      agingPattern = 'delayed'; // Slow burn
    } else if (citationHalfLife < paperAge * 0.3) {
      agingPattern = 'classic'; // Early peak, gradual decline
    } else {
      agingPattern = 'sustained'; // Consistent over time
    }

    // Determine current phase
    const recentYears = yearlyBreakdown.slice(-3);
    const recentAvg = recentYears.reduce((sum, y) => sum + y.citations, 0) / 3;
    const peakCitations = peakYearData.citations;
    
    let currentPhase: 'rising' | 'peak' | 'declining' | 'dormant';
    if (recentAvg < peakCitations * 0.2) {
      currentPhase = 'dormant';
    } else if (recentAvg >= peakCitations * 0.8) {
      currentPhase = 'peak';
    } else if (recentYears[2]?.citations > recentYears[0]?.citations) {
      currentPhase = 'rising';
    } else {
      currentPhase = 'declining';
    }

    // Project lifespan (simple heuristic)
    let projectedLifespan = paperAge;
    if (currentPhase === 'rising' || currentPhase === 'peak') {
      projectedLifespan = paperAge + 5;
    } else if (currentPhase === 'declining') {
      projectedLifespan = paperAge + 2;
    }

    return {
      paperAge,
      citationHalfLife,
      agingPattern,
      peakYear,
      currentPhase,
      yearlyBreakdown,
      projectedLifespan
    };
  }

  /**
   * PHASE 5: PREDICTIVE ANALYTICS
   * Forecast future citation trends and identify emerging influential papers
   */

  /**
   * Predict future citation counts using linear regression on historical data
   */
  async predictFutureCitations(paperId: number, monthsAhead: number = 12): Promise<{
    predictions: Array<{
      month: string;
      predictedCitations: number;
      confidenceInterval: { lower: number; upper: number };
    }>;
    totalPredicted: number;
    confidence: number; // 0-1 scale
    model: {
      slope: number;
      intercept: number;
      rSquared: number;
    };
    recommendation: string;
  }> {
    const velocity = await this.calculateCitationVelocity(paperId);

    if (velocity.monthlyData.length < 6) {
      return {
        predictions: [],
        totalPredicted: 0,
        confidence: 0,
        model: { slope: 0, intercept: 0, rSquared: 0 },
        recommendation: 'Insufficient data for prediction (need at least 6 months of history)'
      };
    }

    // Prepare data for linear regression
    const dataPoints: [number, number][] = velocity.monthlyData.map((m, index) => [
      index, // x: month index
      m.citationCount // y: citation count
    ]);

    // Fit linear regression model
    const regression = stats.linearRegression(dataPoints);
    let rSquared = stats.rSquared(dataPoints, stats.linearRegressionLine(regression));
    // Protect against NaN in rSquared
    if (isNaN(rSquared) || !isFinite(rSquared)) {
      rSquared = 0;
    }

    // Calculate standard error for confidence intervals
    const predictions = dataPoints.map(([x, y]) => y);
    const fitted = dataPoints.map(([x]) => regression.m * x + regression.b);
    const residuals = predictions.map((y, i) => y - fitted[i]);
    // Protect against NaN: ensure standardError is valid or default to 1
    let standardError = stats.standardDeviation(residuals);
    if (isNaN(standardError) || !isFinite(standardError)) {
      standardError = 1;
    }

    // Generate predictions
    const predictionResults = [];
    let totalPredicted = 0;
    const lastMonthIndex = velocity.monthlyData.length - 1;

    for (let i = 1; i <= monthsAhead; i++) {
      const futureIndex = lastMonthIndex + i;
      const predicted = Math.max(0, regression.m * futureIndex + regression.b);
      
      // 95% confidence interval (±1.96 * SE)
      const margin = 1.96 * standardError;
      const lower = Math.max(0, predicted - margin);
      const upper = predicted + margin;

      // Generate future month string
      const lastMonth = velocity.monthlyData[velocity.monthlyData.length - 1].month;
      const [year, month] = lastMonth.split('-').map(Number);
      const futureDate = new Date(year, month - 1 + i, 1);
      const futureMonth = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;

      predictionResults.push({
        month: futureMonth,
        predictedCitations: Math.round(predicted),
        confidenceInterval: {
          lower: Math.round(lower),
          upper: Math.round(upper)
        }
      });

      totalPredicted += Math.round(predicted);
    }

    // Confidence based on R² and data points
    const dataQuality = Math.min(1, velocity.monthlyData.length / 24);
    const confidence = parseFloat((rSquared * dataQuality).toFixed(2));

    // Generate recommendation
    let recommendation: string;
    if (confidence > 0.7 && regression.m > 0) {
      recommendation = 'Strong upward trend - High confidence in continued growth';
    } else if (confidence > 0.7 && regression.m < 0) {
      recommendation = 'Strong downward trend - Citations likely to decline';
    } else if (confidence > 0.4) {
      recommendation = 'Moderate confidence - Trend is somewhat predictable';
    } else {
      recommendation = 'Low confidence - Citation pattern is irregular or insufficient data';
    }

    return {
      predictions: predictionResults,
      totalPredicted,
      confidence,
      model: {
        slope: parseFloat(regression.m.toFixed(4)),
        intercept: parseFloat(regression.b.toFixed(2)),
        rSquared: parseFloat(rSquared.toFixed(3))
      },
      recommendation
    };
  }

  /**
   * Forecast long-term impact potential using multiple indicators
   */
  async forecastImpactPotential(paperId: number): Promise<{
    impactScore: number; // 0-100 composite score
    potential: 'breakthrough' | 'high' | 'moderate' | 'low';
    indicators: {
      velocityScore: number;
      burstScore: number;
      networkScore: number;
      freshness: number;
    };
    projectedRank: string; // Quartile projection
    timeToImpact: number; // Estimated years to reach peak
    riskFactors: string[];
    strengths: string[];
  }> {
    // Gather multiple metrics
    const [velocity, bursts, aging] = await Promise.all([
      this.calculateCitationVelocity(paperId),
      this.detectCitationBursts(paperId),
      this.analyzeCitationAging(paperId)
    ]);

    // Get citations to calculate basic PageRank-like score
    const citations = await this.citationsRepository.find({
      where: [
        { citingPaperId: paperId },
        { citedPaperId: paperId }
      ]
    });
    const citationCount = citations.filter(c => c.citedPaperId === paperId).length;
    const pageRank = Math.min(1, citationCount / 100); // Normalized score

    // Calculate component scores (0-100)
    let velocityScore = Math.min(100, (velocity.recentVelocity / 10) * 100);
    let burstScore = bursts.hasBurst ? Math.min(100, bursts.burstProbability * 100 + 30) : 0;
    let networkScore = Math.min(100, (pageRank / 0.1) * 100);
    let freshnessScore = Math.max(0, 100 - (aging.paperAge * 10));

    // Protect against NaN values
    if (!isFinite(velocityScore) || isNaN(velocityScore)) velocityScore = 0;
    if (!isFinite(burstScore) || isNaN(burstScore)) burstScore = 0;
    if (!isFinite(networkScore) || isNaN(networkScore)) networkScore = 0;
    if (!isFinite(freshnessScore) || isNaN(freshnessScore)) freshnessScore = 0;

    // Composite impact score (weighted average)
    const impactScore = Math.round(
      velocityScore * 0.3 +
      burstScore * 0.25 +
      networkScore * 0.3 +
      freshnessScore * 0.15
    );

    // Categorize potential
    let potential: 'breakthrough' | 'high' | 'moderate' | 'low';
    if (impactScore > 80) potential = 'breakthrough';
    else if (impactScore > 60) potential = 'high';
    else if (impactScore > 40) potential = 'moderate';
    else potential = 'low';

    // Project quartile rank
    let projectedRank: string;
    if (impactScore > 75) projectedRank = 'Top 10% (Q1)';
    else if (impactScore > 50) projectedRank = 'Top 25% (Q1-Q2)';
    else if (impactScore > 30) projectedRank = 'Top 50% (Q2-Q3)';
    else projectedRank = 'Bottom 50% (Q3-Q4)';

    // Estimate time to peak impact
    let timeToImpact = 3; // default
    if (velocity.velocityTrend === 'accelerating') timeToImpact = 2;
    else if (velocity.velocityTrend === 'decelerating') timeToImpact = 5;
    if (aging.currentPhase === 'peak') timeToImpact = 0;

    // Identify risk factors
    const riskFactors: string[] = [];
    if (velocity.velocityTrend === 'decelerating') {
      riskFactors.push('Declining citation velocity');
    }
    if (aging.paperAge > 5 && aging.currentPhase === 'declining') {
      riskFactors.push('Aging paper with declining interest');
    }
    if (!bursts.hasBurst && bursts.burstProbability < 0.3) {
      riskFactors.push('Low probability of citation burst');
    }
    if (pageRank < 0.01) {
      riskFactors.push('Weak network position');
    }

    // Identify strengths
    const strengths: string[] = [];
    if (velocity.velocityTrend === 'accelerating') {
      strengths.push('Accelerating citation rate');
    }
    if (bursts.currentBurst.active) {
      strengths.push(`Active citation burst (${bursts.currentBurst.intensity}x intensity)`);
    }
    if (pageRank > 0.05) {
      strengths.push('Strong network centrality');
    }
    if (aging.currentPhase === 'rising' || aging.currentPhase === 'peak') {
      strengths.push('In growth or peak phase');
    }

    return {
      impactScore,
      potential,
      indicators: {
        velocityScore: Math.round(velocityScore),
        burstScore: Math.round(burstScore),
        networkScore: Math.round(networkScore),
        freshness: Math.round(freshnessScore)
      },
      projectedRank,
      timeToImpact,
      riskFactors,
      strengths
    };
  }

  /**
   * Detect trending papers in real-time based on recent activity
   */
  async detectTrendingPapers(limit: number = 10): Promise<Array<{
    paperId: number;
    title: string;
    trendingScore: number;
    recentVelocity: number;
    velocityChange: number; // percentage increase
    burstActive: boolean;
    rank: number;
  }>> {
    // Get all papers with recent citations
    const recentPapers = await this.papersRepository
      .createQueryBuilder('paper')
      .innerJoin('paper.citedBy', 'citation')
      .where('citation.createdAt >= DATE_SUB(NOW(), INTERVAL 90 DAY)')
      .groupBy('paper.id')
      .having('COUNT(citation.id) > 2')
      .select('paper.id', 'paperId')
      .addSelect('paper.title', 'title')
      .addSelect('COUNT(citation.id)', 'recentCount')
      .orderBy('recentCount', 'DESC')
      .limit(50) // Analyze top 50 candidates
      .getRawMany();

    // Calculate trending scores for each
    const trendingData = await Promise.all(
      recentPapers.map(async (paper) => {
        const velocity = await this.calculateCitationVelocity(paper.paperId);
        const bursts = await this.detectCitationBursts(paper.paperId);

        // Trending score = recent velocity + acceleration bonus + burst bonus
        const accelerationBonus = velocity.acceleration > 0 ? velocity.acceleration * 10 : 0;
        const burstBonus = bursts.currentBurst.active ? bursts.currentBurst.intensity * 5 : 0;
        const trendingScore = velocity.recentVelocity + accelerationBonus + burstBonus;

        // Velocity change percentage
        const velocityChange = velocity.overallVelocity > 0
          ? ((velocity.recentVelocity - velocity.overallVelocity) / velocity.overallVelocity) * 100
          : 100;

        return {
          paperId: paper.paperId,
          title: paper.title,
          trendingScore: parseFloat(trendingScore.toFixed(2)),
          recentVelocity: velocity.recentVelocity,
          velocityChange: parseFloat(velocityChange.toFixed(1)),
          burstActive: bursts.currentBurst.active
        };
      })
    );

    // Sort by trending score and assign ranks
    trendingData.sort((a, b) => b.trendingScore - a.trendingScore);
    
    return trendingData.slice(0, limit).map((paper, index) => ({
      ...paper,
      rank: index + 1
    }));
  }
}
