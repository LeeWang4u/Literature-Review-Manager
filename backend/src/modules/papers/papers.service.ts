import { Injectable, NotFoundException, ForbiddenException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Paper } from './paper.entity';
import { Citation } from '../citations/citation.entity';
import { Note } from '../notes/note.entity';
import { CreatePaperDto } from './dto/create-paper.dto';
import { UpdatePaperDto } from './dto/update-paper.dto';
import { SearchPaperDto } from './dto/search-paper.dto';
import { UpdatePaperStatusDto } from './dto/update-paper-status.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CitationsService } from '../citations/citations.service';
import { CitationParserService } from '../citations/citation-parser.service';
import { CitationMetricsService } from '../citations/citation-metrics.service';
import { AIProviderService } from '../summaries/ai-provider.service';
import { PaperMetadataService } from './paper-metadata.service';
import { PdfService } from '../pdf/pdf.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PapersService {
  private readonly logger = new Logger(PapersService.name);
  
  constructor(
    @InjectRepository(Paper)
    private papersRepository: Repository<Paper>,

    @InjectRepository(Citation)
    private paperCitationsRepository: Repository<Citation>,

    @InjectRepository(Note)
    private notesRepository: Repository<Note>,


    private citationsService: CitationsService,
    private citationParserService: CitationParserService,
    private citationMetricsService: CitationMetricsService,
    private aiProviderService: AIProviderService,
    private paperMetadataService: PaperMetadataService,
    @Inject(forwardRef(() => PdfService))
    private pdfService: PdfService,
  ) { }




  async create(createPaperDto: CreatePaperDto, userId: number): Promise<{ success: boolean; message: string; data: Paper }> {
    // Debug: Log entire DTO
    this.logger.log(`\n${'='.repeat(80)}`);
    this.logger.log(`📥 CREATE PAPER REQUEST - User ID: ${userId}`);
    this.logger.log(`${'='.repeat(80)}`);
    this.logger.log(`CreatePaperDto received: ${JSON.stringify(createPaperDto, null, 2)}`);
    
    const { tagIds, references, ...paperData } = createPaperDto;

    // Debug: Log references with year data
    if (references && references.length > 0) {
      this.logger.log(`\n📚 REFERENCES ANALYSIS:`);
      this.logger.log(`   Total references: ${references.length}`);
      this.logger.log(`   Sample references (first 3):`);
      references.slice(0, 3).forEach((ref: any, idx: number) => {
        this.logger.log(`   ${idx + 1}. Title: "${ref.title?.substring(0, 50)}..."`);
        this.logger.log(`      Authors: ${ref.authors || 'N/A'}`);
        this.logger.log(`      Year: ${ref.year || 'N/A'}`);
        this.logger.log(`      DOI: ${ref.doi || 'N/A'}`);
      });
      const withYear = references.filter((r: any) => r.year).length;
      const withDOI = references.filter((r: any) => r.doi).length;
      const withAuthors = references.filter((r: any) => r.authors).length;
      this.logger.log(`   Data completeness:`);
      this.logger.log(`     - With year: ${withYear}/${references.length}`);
      this.logger.log(`     - With DOI: ${withDOI}/${references.length}`);
      this.logger.log(`     - With authors: ${withAuthors}/${references.length}`);
    } else {
      this.logger.log(`\n📚 REFERENCES: None provided`);
    }

    const whereConditions = [];
    if (paperData.doi) {
      whereConditions.push({ doi: paperData.doi, addedBy: userId, isReference: false });
    }
    if (paperData.url) {
      whereConditions.push({ url: paperData.url, addedBy: userId, isReference: false });
    }
    if (whereConditions.length > 0) {
      const existingPaper = await this.papersRepository.findOne({ where: whereConditions });
      if (existingPaper) {
        throw new HttpException(
          {
            success: false,
            message: 'Bài báo này đã tồn tại trong thư viện của bạn.',
            status: HttpStatus.CONFLICT,
            data: { id: existingPaper.id },
          },
          HttpStatus.CONFLICT, // 409
        );
      }
    }



    const paper = this.papersRepository.create({
      ...paperData,
      addedBy: userId,
      isReference: paperData.isReference || false,
    });

    const savedPaper = await this.papersRepository.save(paper);

    // Handle tags if provided
    if (tagIds && tagIds.length > 0) {
      await this.papersRepository
        .createQueryBuilder()
        .relation(Paper, 'tags')
        .of(savedPaper)
        .add(tagIds);
    }

    // 🔥 Auto-download PDF from ArXiv if URL is ArXiv
    if (paperData.url && paperData.url.includes('arxiv.org')) {
      this.autoDownloadArxivPdf(savedPaper.id, paperData.url, userId).catch(err => {
        this.logger.error(`Failed to auto-download ArXiv PDF for paper ${savedPaper.id}: ${err.message}`);
      });
    }

    // Xử lý references với AI parsing và auto-download workflow
    if (references && references.length > 0) {
      this.logger.log(`\n🚀 STARTING ASYNC REFERENCE PROCESSING...`);
      this.logger.log(`   Will process ${references.length} references in background`);
      // Kick off async processing sau khi return response
      this.processReferencesWithAutoDownload(savedPaper, references, userId).catch(err => {
        this.logger.error(`❌ Failed to process references for paper ${savedPaper.id}: ${err.message}`);
      });
    } else {
      this.logger.log(`\n⏭️  SKIPPING REFERENCE PROCESSING: No references provided`);
    }

    const addToLibraryDto = {
      paperId: savedPaper.id,
    }


    this.logger.log(`\n✅ PAPER CREATED SUCCESSFULLY`);
    this.logger.log(`   Paper ID: ${savedPaper.id}`);
    this.logger.log(`   Title: ${savedPaper.title.substring(0, 50)}...`);
    this.logger.log(`${'='.repeat(80)}\n`);

    return {
      success: true,
      message: 'Paper created successfully. References are being processed in background.',
      data: await this.findOne(savedPaper.id)
    };
  }

  /**
   * Manually fetch references for any paper
   */
  async fetchReferencesForPaper(paperId: number, userId: number) {
    this.logger.log(`\n${'='.repeat(80)}`);
    this.logger.log(`🔍 MANUAL REFERENCE FETCH REQUEST`);
    this.logger.log(`   Paper ID: ${paperId}`);
    this.logger.log(`   User ID: ${userId}`);
    this.logger.log(`${'='.repeat(80)}\n`);

    // Find the paper
    const paper = await this.papersRepository.findOne({
      where: { id: paperId },
    });

    if (!paper) {
      throw new NotFoundException(`Paper with ID ${paperId} not found`);
    }

    this.logger.log(`📄 Paper found: "${paper.title.substring(0, 60)}..."`);
    this.logger.log(`   DOI: ${paper.doi || 'N/A'}`);
    this.logger.log(`   URL: ${paper.url || 'N/A'}`);

    // Check if paper has DOI or URL
    if (!paper.doi && !paper.url) {
      this.logger.warn(`⚠️ Paper has no DOI or URL`);
      return {
        success: false,
        message: 'Cannot fetch references: Paper needs DOI or URL.',
        data: { referencesFound: 0, referencesProcessed: 0 },
      };
    }

    // Try to fetch from external sources using DOI or URL
    let references = [];
    let errorMessage = '';
    
    this.logger.log(`\n🌐 Fetching references from external sources...`);
    this.logger.log(`   Using: ${paper.doi ? `DOI ${paper.doi}` : `URL ${paper.url}`}`);
    
    try {
      const metadata = await this.paperMetadataService.extractMetadata(
        paper.doi || paper.url,
      );
      
      references = metadata.references || [];
      this.logger.log(`✅ API call successful`);
      this.logger.log(`   References returned: ${references.length}`);
      
      if (references.length === 0) {
        this.logger.warn(`⚠️ External API returned 0 references for this paper`);
        errorMessage = 'External API found the paper but it has no references listed.';
      }
    } catch (error) {
      this.logger.error(`❌ Failed to fetch from external API: ${error.message}`);
      errorMessage = `API Error: ${error.message}`;
    }

    if (references.length === 0) {
      return {
        success: false,
        message: errorMessage || 'No references found.',
        data: { 
          referencesFound: 0, 
          referencesProcessed: 0,
          doi: paper.doi,
          url: paper.url,
        },
      };
    }

    // Process references using the same workflow as paper creation
    this.logger.log(`\n🚀 STARTING REFERENCE PROCESSING...`);
    this.logger.log(`   Will process ${references.length} references in background`);
    
    await this.processReferencesWithAutoDownload(paper, references, userId);

    return {
      success: true,
      message: `Found ${references.length} references. Processing in background.`,
      data: {
        referencesFound: references.length,
        message: 'References are being enriched and saved in background',
      },
    };
  }

  /**
   * Enrich reference with metadata from Semantic Scholar
   */
  private async enrichReferenceMetadata(ref: any): Promise<any> {
    let s2Data: any = null;
    let enrichmentMethod = 'none';
    
    try {
      // Strategy 1: Try DOI first (most reliable)
      if (ref.doi) {
        try {
          s2Data = await this.paperMetadataService.fetchSemanticScholarMetadata(`DOI:${ref.doi}`);
          enrichmentMethod = 'doi';
          this.logger.debug(`✅ Enriched via DOI: ${ref.doi}`);
        } catch (doiError) {
          this.logger.debug(`DOI lookup failed for ${ref.doi}: ${doiError.message}`);
        }
      }
      
      // Strategy 2: Fallback to title search if DOI failed or unavailable
      if (!s2Data && ref.title) {
        try {
          s2Data = await this.paperMetadataService.fetchSemanticScholarMetadata(ref.title);
          enrichmentMethod = 'title';
          this.logger.debug(`✅ Enriched via title: "${ref.title.substring(0, 40)}..."`);
        } catch (titleError) {
          this.logger.debug(`Title lookup failed: ${titleError.message}`);
        }
      }
      
      // If enrichment succeeded, merge data
      if (s2Data) {
        const enrichedRef = {
          ...ref,
          authors: ref.authors || s2Data.authors,
          year: ref.year || s2Data.year,
          abstract: s2Data.abstract || ref.abstract || '',
          citationCount: s2Data.citationCount || 0,
          influentialCitationCount: s2Data.influentialCitationCount || 0,
          venue: s2Data.venue || ref.venue || '',
          fieldsOfStudy: s2Data.fieldsOfStudy || [],
          isOpenAccess: s2Data.isOpenAccess || false,
          enriched: true,
          enrichmentMethod,
        };
        
        // Log abstract status
        if (enrichedRef.abstract && enrichedRef.abstract.trim() !== '') {
          this.logger.debug(`  📄 Abstract fetched (${enrichedRef.abstract.length} chars) via ${enrichmentMethod}`);
        } else {
          this.logger.debug(`  ⚠️ No abstract available from ${enrichmentMethod}`);
        }
        
        return enrichedRef;
      }
      
      // No enrichment succeeded
      this.logger.debug(`❌ Enrichment failed for: "${ref.title?.substring(0, 40)}..."`);
      return { ...ref, enriched: false };
      
    } catch (error) {
      this.logger.debug(`Enrichment error: ${error.message}`);
      return { ...ref, enriched: false };
    }
  }

  /**
   * Calculate advanced priority score for reference
   */
  private calculatePriorityScore(ref: any, mainPaperTitle: string): number {
    let score = 0;

    // 1. Citation Count (0-30 points) - highly cited = more important
    if (ref.citationCount) {
      if (ref.citationCount >= 1000) score += 30;
      else if (ref.citationCount >= 500) score += 25;
      else if (ref.citationCount >= 100) score += 20;
      else if (ref.citationCount >= 50) score += 15;
      else if (ref.citationCount >= 10) score += 10;
      else score += 5;
    }

    // 2. Influential Citation Count (0-20 points)
    if (ref.influentialCitationCount) {
      if (ref.influentialCitationCount >= 100) score += 20;
      else if (ref.influentialCitationCount >= 50) score += 15;
      else if (ref.influentialCitationCount >= 10) score += 10;
      else score += 5;
    }

    // 3. Publication Year (0-20 points) - prefer recent papers
    if (ref.year) {
      const currentYear = new Date().getFullYear();
      const age = currentYear - ref.year;
      if (age <= 2) score += 20;
      else if (age <= 5) score += 15;
      else if (age <= 10) score += 10;
      else if (age <= 20) score += 5;
    }

    // 4. Venue Quality (0-15 points) - top venues are more important
    if (ref.venue) {
      const topVenues = [
        'nature', 'science', 'cell', 'lancet', 'jama',
        'neurips', 'icml', 'iclr', 'cvpr', 'iccv', 'eccv', 'acl', 'emnlp',
        'sigir', 'kdd', 'www', 'chi', 'usenix', 'osdi', 'sosp'
      ];
      const venueLower = ref.venue.toLowerCase();
      if (topVenues.some(v => venueLower.includes(v))) {
        score += 15;
      } else {
        score += 5; // Any published venue gets some points
      }
    }

    // 5. Has DOI (0-10 points) - downloadable
    if (ref.doi && ref.doi.trim() !== '') {
      score += 10;
    }

    // 6. Open Access (0-5 points) - easier to access
    if (ref.isOpenAccess) {
      score += 5;
    }

    return score;
  }

  /**
   * Dynamically select optimal number of references based on score distribution
   * Uses statistical analysis to find natural cutoff point
   */
  private selectOptimalReferences(sortedRefs: any[]): any[] {
    if (sortedRefs.length === 0) return [];
    
    // Strategy 1: Always take top-tier references (score >= 70)
    const topTier = sortedRefs.filter(r => r.priorityScore >= 70);
    
    // Strategy 2: Add high-quality references (score >= 50) up to a reasonable limit
    const highQuality = sortedRefs.filter(r => r.priorityScore >= 50 && r.priorityScore < 70);
    
    // Strategy 3: Find score gap to determine natural cutoff
    const scores = sortedRefs.map(r => r.priorityScore);
    let cutoffIndex = topTier.length + highQuality.length;
    
    // Look for significant score drop (>15 points) after high-quality refs
    for (let i = cutoffIndex; i < Math.min(scores.length - 1, cutoffIndex + 20); i++) {
      const gap = scores[i] - scores[i + 1];
      if (gap > 15) {
        cutoffIndex = i + 1;
        this.logger.log(`📉 Found score gap of ${gap} points at position ${i + 1}`);
        break;
      }
    }
    
    // Constraints: min 5, max 10, prefer quality over quantity
    const minRefs = 5;
    const maxRefs = 10;
    
    let selectedCount = Math.max(minRefs, Math.min(maxRefs, cutoffIndex));
    
    // If we have too few high-quality refs, be more generous
    if (topTier.length + highQuality.length < minRefs) {
      selectedCount = Math.min(maxRefs, Math.max(minRefs, sortedRefs.length));
      this.logger.log(`⚠️ Limited high-quality refs, expanding selection to ${selectedCount}`);
    }
    
    const selected = sortedRefs.slice(0, selectedCount);
    
    this.logger.log(`\n📊 Selection Breakdown:`);
    this.logger.log(`  Top-tier (≥70): ${topTier.length}`);
    this.logger.log(`  High-quality (50-69): ${highQuality.length}`);
    this.logger.log(`  Medium (30-49): ${selected.filter(r => r.priorityScore >= 30 && r.priorityScore < 50).length}`);
    this.logger.log(`  Lower (<30): ${selected.filter(r => r.priorityScore < 30).length}`);
    this.logger.log(`  Score range: ${selected[0]?.priorityScore || 0} - ${selected[selected.length - 1]?.priorityScore || 0}`);
    
    return selected;
  }

  /**
   * Process references with enrichment and advanced priority scoring
   */
  private async processReferencesWithAutoDownload(
    savedPaper: Paper,
    references: any[],
    userId: number,
  ): Promise<void> {
      this.logger.log(`\n🔍 Starting reference enrichment and processing for ${references.length} references...`);
      
      // Step 1: Enrich references with external metadata (parallel for speed)
      const enrichmentPromises = references.map(ref => 
        this.enrichReferenceMetadata(ref).catch(err => {
          this.logger.debug(`Enrichment failed for "${ref.title?.substring(0, 40)}": ${err.message}`);
          return { ...ref, enriched: false };
        })
      );
      
      const enrichedRefs = await Promise.all(enrichmentPromises);
      const enrichedCount = enrichedRefs.filter(r => r.enriched).length;
      this.logger.log(`✅ Enriched ${enrichedCount}/${references.length} references with external metadata`);

      // Step 2: Calculate advanced priority scores
      const refsWithScore = enrichedRefs.map(ref => ({
        ...ref,
        priorityScore: this.calculatePriorityScore(ref, savedPaper.title)
      }));

      // Sort by priority
      const allSortedRefs = refsWithScore
        .filter(r => r.title && r.title.trim() !== '')
        .sort((a, b) => b.priorityScore - a.priorityScore);
      
      // 🎯 DYNAMIC SELECTION: Calculate optimal number based on score distribution
      const selectedRefs = this.selectOptimalReferences(allSortedRefs);
      this.logger.log(`\n🎯 Dynamic Selection: Selected ${selectedRefs.length}/${allSortedRefs.length} high-quality references`);

      // Log priority distribution
      this.logger.log(`\n📊 Priority Score Distribution (selected ${selectedRefs.length}):`);
      const scoreRanges = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
      selectedRefs.forEach(ref => {
        const score = ref.priorityScore;
        if (score <= 20) scoreRanges['0-20']++;
        else if (score <= 40) scoreRanges['21-40']++;
        else if (score <= 60) scoreRanges['41-60']++;
        else if (score <= 80) scoreRanges['61-80']++;
        else scoreRanges['81-100']++;
      });
      Object.entries(scoreRanges).forEach(([range, count]) => {
        this.logger.log(`  ${range} points: ${count} refs`);
      });
      
      // Log abstract availability with enrichment methods
      const withAbstract = selectedRefs.filter(r => r.abstract && r.abstract.trim() !== '').length;
      const enrichedViaDoi = selectedRefs.filter(r => r.enrichmentMethod === 'doi').length;
      const enrichedViaTitle = selectedRefs.filter(r => r.enrichmentMethod === 'title').length;
      
      this.logger.log(`\n📄 Abstract & Enrichment Status:`);
      this.logger.log(`  With abstract: ${withAbstract}/${selectedRefs.length} (${((withAbstract/selectedRefs.length)*100).toFixed(0)}%)`);
      this.logger.log(`  Without abstract: ${selectedRefs.length - withAbstract}/${selectedRefs.length}`);
      this.logger.log(`  Enriched via DOI: ${enrichedViaDoi}`);
      this.logger.log(`  Enriched via Title: ${enrichedViaTitle}`);
      this.logger.log(`  Not enriched: ${selectedRefs.length - enrichedViaDoi - enrichedViaTitle}`);
      
      // Top 5 references by score with abstract info
      this.logger.log(`\n🏆 Top 5 References by Priority:`);
      selectedRefs.slice(0, 5).forEach((ref, idx) => {
        const abstractStatus = ref.abstract && ref.abstract.trim() !== '' 
          ? `📄 ${ref.abstract.length}chars` 
          : '❌ No abstract';
        this.logger.log(`  ${idx + 1}. [Score: ${ref.priorityScore}] "${ref.title?.substring(0, 50)}..." (${ref.year || 'N/A'}, cited: ${ref.citationCount || 0}, ${abstractStatus})`);
      });
      this.logger.log('');

      // Step 3: Process and save citations
      let savedCount = 0;
      let skippedCount = 0;
      let aiParsedCount = 0;
      let preExtractedCount = 0;
      
      this.logger.log(`\n💾 Saving ${selectedRefs.length} references to database...`);
      
      for (const ref of selectedRefs) {
        // Skip invalid references
        if ((!ref.title || ref.title.trim() === '') && (!ref.doi || ref.doi.trim() === '')) {
          skippedCount++;
          continue;
        }

        // ✅ OPTIMIZATION: Skip AI parsing if data is already complete from API
        let parsed;
        const hasCompleteData = ref.authors && ref.year && ref.title;
        
        if (hasCompleteData) {
          // Use pre-extracted data from Semantic Scholar/CrossRef API
          parsed = {
            authors: ref.authors,
            year: ref.year,
            title: ref.title,
            doi: ref.doi || '',
            confidence: 1.0,  // High confidence - from official API
            rawCitation: ref.title,
          };
          preExtractedCount++;
          
          if (preExtractedCount <= 3) {
            this.logger.log(`  ✅ Using pre-extracted data (no AI parsing needed): "${ref.title.substring(0, 50)}..."`);
            this.logger.log(`     → Authors: ${parsed.authors}`);
            this.logger.log(`     → Year: ${parsed.year}`);
            this.logger.log(`     → DOI: ${parsed.doi || 'N/A'}`);
          }
        } else {
          // Only use AI parsing when data is incomplete
          try {
            parsed = await this.citationParserService.parseCitation(ref.title);
            aiParsedCount++;
            
            if (aiParsedCount <= 3) {
              this.logger.log(`  🤖 AI Parsed: "${ref.title.substring(0, 50)}..."`);
              this.logger.log(`     → Authors: ${parsed.authors}`);
              this.logger.log(`     → Year: ${parsed.year}`);
              this.logger.log(`     → Title: ${parsed.title.substring(0, 50)}...`);
              this.logger.log(`     → Confidence: ${(parsed.confidence * 100).toFixed(0)}%`);
            }
          } catch (error) {
            this.logger.warn(`Failed to parse citation: ${error.message}`);
            // Fallback to basic data
            parsed = {
              authors: ref.authors || 'Unknown',
              year: ref.year || null,
              title: ref.title,
              doi: ref.doi || undefined,
              confidence: 0.3,
              rawCitation: ref.title,
            };
          }
        }

        const cleanDoi = parsed.doi || ref.doi || '';
        let cleanTitle = parsed.title;
        if (cleanTitle.length > 500) {
          cleanTitle = cleanTitle.substring(0, 497) + '...';
        }

        // Kiểm tra xem reference này đã tồn tại chưa (theo DOI)
        let refPaper: Paper | null = null;
        if (cleanDoi) {
          refPaper = await this.papersRepository.findOne({
            where: { doi: cleanDoi },
          });
        }

        // Nếu chưa có thì thêm mới, đánh dấu là reference
        if (!refPaper) {
          this.logger.debug(`Creating new reference paper: ${cleanTitle.substring(0, 60)}...`);
          refPaper = this.papersRepository.create({
            title: cleanTitle || '',
            authors: parsed.authors || 'Unknown',
            publicationYear: parsed.year,
            doi: cleanDoi || '',
            abstract: ref.abstract || '',  // ✅ From enrichment
            journal: ref.venue || '',       // ✅ From enrichment
            isReference: true,
            addedBy: userId,
          });
          await this.papersRepository.save(refPaper);
        }

        // Kiểm tra duplicate citation trước khi save
        const existingCitation = await this.paperCitationsRepository.findOne({
          where: {
            citingPaperId: savedPaper.id,
            citedPaperId: refPaper.id,
          },
        });

        if (!existingCitation) {
          // Lưu quan hệ trích dẫn với enriched metadata
          const newCitation = await this.paperCitationsRepository.save({
            citingPaperId: savedPaper.id,
            citedPaperId: refPaper.id,
            createdBy: userId,
            citationContext: ref.citationContext || null,
            relevanceScore: ref.priorityScore ? ref.priorityScore / 100 : null, // Convert 0-100 to 0-1
            isInfluential: ref.isInfluential || (ref.influentialCitationCount > 0) || false,
            // AI parsing fields
            citationDepth: 0,
            parsedAuthors: parsed.authors,
            parsedTitle: parsed.title,
            parsedYear: parsed.year,
            parsingConfidence: parsed.confidence,
            rawCitation: parsed.rawCitation,
          });
          
          this.logger.debug(`✅ Citation saved: Paper ${savedPaper.id} -> Ref ${refPaper.id} [Priority Score: ${ref.priorityScore}, Relevance: ${(ref.priorityScore / 100).toFixed(2)}, Citations: ${ref.citationCount || 0}, Abstract: ${ref.abstract ? 'Yes' : 'No'}]`);

          // Auto-rate ALL references if we have content (no score threshold)
          const hasContent = (savedPaper.abstract || savedPaper.fullText) && (refPaper.abstract || refPaper.fullText);
          if (parsed.confidence > 0.5 && hasContent) {
            this.logger.debug(`🤖 Triggering AI auto-rate for citation ${newCitation.id}...`);
            this.citationsService.autoRateRelevance(newCitation.id).catch(err => {
              this.logger.warn(`⚠️ Auto-rate failed for citation ${newCitation.id}: ${err.message}`);
            });
          } else if (!hasContent) {
            this.logger.debug(`⏸️ Skipped auto-rate (no content): "${parsed.title.substring(0, 40)}..." [Citing has content: ${!!(savedPaper.abstract || savedPaper.fullText)}, Cited has content: ${!!refPaper.abstract}]`);
          }

          // Auto-download PDF for very high-priority references (score >= 70)
          if (ref.priorityScore >= 70 && parsed.confidence > 0.5) {
            this.logger.log(`🚀 Auto-download triggered: "${parsed.title.substring(0, 50)}..." [Score: ${ref.priorityScore}]`);
            this.autoDownloadReferencePdf(refPaper, userId, 0).catch(err => {
              this.logger.debug(`Auto-download failed: ${err.message}`);
            });
          }

          savedCount++;
        } else {
          this.logger.debug(`⏭️ Skipped duplicate: Paper ${savedPaper.id} -> Ref ${refPaper.id}`);
        }
      }
      
      const withAbstractCount = selectedRefs.filter(r => r.abstract && r.abstract.trim() !== '').length;
      const autoRateEligible = selectedRefs.filter(r => {
        const hasAbstract = r.abstract && r.abstract.trim() !== '';
        return hasAbstract && (savedPaper.abstract || savedPaper.fullText);
      }).length;
      
      this.logger.log(`\n✅ Reference Processing Complete:`);
      this.logger.log(`   Total references received: ${references.length}`);
      this.logger.log(`   Dynamically selected: ${selectedRefs.length} (based on score distribution)`);
      this.logger.log(`   Enriched with external data: ${enrichedCount}`);
      this.logger.log(`   Pre-extracted (from API): ${preExtractedCount}`);
      this.logger.log(`   AI parsed (incomplete data): ${aiParsedCount}`);
      this.logger.log(`   Successfully saved: ${savedCount}`);
      this.logger.log(`   Skipped (invalid): ${skippedCount}`);
      this.logger.log(`   With abstract from enrichment: ${withAbstractCount}/${selectedRefs.length}`);
      this.logger.log(`   Eligible for AI auto-rate: ${autoRateEligible}/${savedCount}`);
      this.logger.log(`   High-priority (score ≥60): ${selectedRefs.filter(r => r.priorityScore >= 60).length}`);
      this.logger.log(`   Very high-priority (score ≥70): ${selectedRefs.filter(r => r.priorityScore >= 70).length}`);
      this.logger.log('');
  }

  async findAll(searchDto: SearchPaperDto, userId: number): Promise<{ data: Paper[]; meta: any }> {
    const { page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = searchDto;

    const query = this.papersRepository
      .createQueryBuilder('paper')
      .leftJoinAndSelect('paper.tags', 'tags')
      .leftJoinAndSelect('paper.user', 'user')
      .where('paper.added_by = :userId', { userId })
      .andWhere('paper.is_reference = :isReference', { isReference: false });

    // Search query
    if (searchDto.query) {
      query.andWhere(
        '(paper.title LIKE :query OR paper.abstract LIKE :query OR paper.keywords LIKE :query OR paper.authors LIKE :query)',
        { query: `%${searchDto.query}%` },
      );
    }

    // Filter by year (support both exact year and year range)
    if (searchDto.year) {
      query.andWhere('paper.publicationYear = :year', { year: searchDto.year });
    } else if (searchDto.yearFrom && searchDto.yearTo) {
      query.andWhere('paper.publicationYear BETWEEN :yearFrom AND :yearTo', { 
        yearFrom: searchDto.yearFrom, 
        yearTo: searchDto.yearTo 
      });
    } else if (searchDto.yearFrom) {
      query.andWhere('paper.publicationYear >= :yearFrom', { yearFrom: searchDto.yearFrom });
    } else if (searchDto.yearTo) {
      query.andWhere('paper.publicationYear <= :yearTo', { yearTo: searchDto.yearTo });
    }

    // Filter by author
    if (searchDto.author) {
      query.andWhere('paper.authors LIKE :author', { author: `%${searchDto.author}%` });
    }

    // Filter by journal
    if (searchDto.journal) {
      query.andWhere('paper.journal LIKE :journal', { journal: `%${searchDto.journal}%` });
    }

    // Filter by tags
    if (searchDto.tags) {
      const tagIds = searchDto.tags.split(',').map(id => parseInt(id.trim()));
      query.andWhere('tags.id IN (:...tagIds)', { tagIds });
    }

    // Sorting
    query.orderBy(`paper.${sortBy}`, sortOrder);

    // Pagination
    const skip = (page - 1) * pageSize;
    query.skip(skip).take(pageSize);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: number): Promise<Paper> {
    const paper = await this.papersRepository.findOne({
      where: { id },
      relations: ['tags', 'user', 'pdfFiles', 'notes'],
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    return paper;
  }

  async findByDoiOrUrl(doi?: string, url?: string, userId?: number): Promise<Paper> {
    if (!doi && !url) {
      throw new NotFoundException('DOI or URL required');
    }

    const whereConditions = [];
    if (doi) {
      whereConditions.push({ doi, addedBy: userId, isReference: false });
    }
    if (url) {
      whereConditions.push({ url, addedBy: userId, isReference: false });
    }

    const paper = await this.papersRepository.findOne({
      where: whereConditions,
      relations: ['tags'],
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    return paper;
  }

  async update(id: number, updatePaperDto: UpdatePaperDto, userId: number): Promise<Paper> {
    const paper = await this.findOne(id);

    // Check ownership
    if (paper.addedBy !== userId) {
      throw new ForbiddenException('You can only edit your own papers');
    }

    const { tagIds, ...paperData } = updatePaperDto;

    Object.assign(paper, paperData);
    await this.papersRepository.save(paper);

    // Update tags if provided
    if (tagIds !== undefined) {
      await this.papersRepository
        .createQueryBuilder()
        .relation(Paper, 'tags')
        .of(paper)
        .addAndRemove(tagIds, paper.tags.map(t => t.id));
    }

    return await this.findOne(id);
  }

  async remove(id: number, userId: number): Promise<void> {
    const paper = await this.findOne(id);

    if (paper.addedBy !== userId) {
      throw new ForbiddenException('You can only delete your own papers');
    }

    // Remove from user library first

    // Remove all citations (both citing and cited)
    await this.paperCitationsRepository.delete({ citingPaperId: id });
    await this.paperCitationsRepository.delete({ citedPaperId: id });

    // TypeORM will handle cascade delete for: notes, pdfFiles, aiSummaries, tags (many-to-many)
    // because of onDelete: 'CASCADE' in the entity relationships

    await this.papersRepository.remove(paper);
  }

  async getStatistics(userId?: number) {
    const query = this.papersRepository.createQueryBuilder('paper');

    if (userId) {
      query.where('paper.addedBy = :userId', { userId });
    }

    query.andWhere('paper.is_reference = :isReference', { isReference: false });

    const total = await query.getCount();

    const byYear = await query
      .select('paper.publicationYear', 'year')
      .addSelect('COUNT(*)', 'count')
      .groupBy('paper.publicationYear')
      .orderBy('paper.publicationYear', 'ASC')//'DESC')
      .getRawMany();

    return {
      total,
      byYear,
    };
  }

  async updateStatus(id: number, dto: UpdatePaperStatusDto, userId: number) {
    const paper = await this.papersRepository.findOne({ where: { id } });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    if (paper.addedBy !== userId) {
      throw new ForbiddenException('You are not the owner of this paper');
    }

    if (dto.status !== undefined) paper.status = dto.status;
    if (dto.favorite !== undefined) paper.favorite = dto.favorite;

    return await this.papersRepository.save(paper);
  }

  async countPapersByStatus(userId?: number): Promise<Record<'to_read' | 'reading' | 'completed', number>> {
    const statuses: Array<'to_read' | 'reading' | 'completed'> = ['to_read', 'reading', 'completed'];
    const baseQuery = this.papersRepository.createQueryBuilder('paper')
      .where('paper.is_reference = :isReference', { isReference: false });

    if (userId !== undefined) {
      baseQuery.andWhere('paper.added_by = :userId', { userId });
    }

    const result: Record<'to_read' | 'reading' | 'completed', number> = {
      to_read: 0,
      reading: 0,
      completed: 0,
    };

    for (const status of statuses) {
      result[status] = await baseQuery.clone().andWhere('paper.status = :status', { status }).getCount();
    }

    return result;
  }



  async getStatisticsInLibrary(userId: number, status?: string, favorite?: string) {
    const query = this.papersRepository
      .createQueryBuilder('paper')
      .where('paper.addedBy = :userId', { userId });
    if (status) {
      query.andWhere('paper.status = :status', { status });
    }
    if (favorite) {
      const fav = favorite === 'true';
      query.andWhere('paper.favorite = :fav', { fav });
    }
    const total = await query.getCount();

    const byYear = await query
      .select('paper.publicationYear', 'year')
      .addSelect('COUNT(*)', 'count')
      .groupBy('paper.publicationYear')
      .orderBy('paper.publicationYear', 'DESC')
      .getRawMany();
    return {
      total,
      byYear,
    };
  }

  async getUserLibrary(
    userId: number,
    status?: 'to_read' | 'reading' | 'completed',
    favorite?: 'true' | 'false',
  ): Promise<Paper[]> {
    const query = this.papersRepository.createQueryBuilder('paper')
      .where('paper.userId = :userId', { userId });

    if (status) {
      query.andWhere('paper.status = :status', { status });
    }

    if (favorite === 'true' || favorite === 'false') {
      query.andWhere('paper.favorite = :favorite', { favorite: favorite === 'true' });
    }

    return await query.orderBy('paper.updatedAt', 'DESC').getMany();
  }


  /**
   * Update fullText field for a paper
   * Used after PDF text extraction
   */
  async updateFullText(id: number, fullText: string): Promise<void> {
    await this.papersRepository.update(id, { fullText });
  }

  /**
   * Auto-download PDF from ArXiv and save to database
   * Runs asynchronously in background
   */
  private async autoDownloadArxivPdf(paperId: number, arxivUrl: string, userId: number): Promise<void> {
    try {
      this.logger.log(`🚀 Starting auto-download ArXiv PDF for paper ${paperId}`);
      
      // Extract ArXiv ID from URL
      const arxivId = this.paperMetadataService.extractArxivId(arxivUrl);
      if (!arxivId) {
        this.logger.warn(`Could not extract ArXiv ID from URL: ${arxivUrl}`);
        return;
      }

      this.logger.log(`📥 Downloading ArXiv PDF: ${arxivId}`);
      
      // Download PDF buffer
      const pdfBuffer = await this.paperMetadataService.downloadArxivPdf(arxivId);
      
      // Save to temp file
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const tempFilename = `arxiv-${arxivId}-${Date.now()}.pdf`;
      const tempFilePath = path.join(uploadsDir, tempFilename);
      fs.writeFileSync(tempFilePath, pdfBuffer);
      
      this.logger.log(`💾 Saved temp file: ${tempFilePath}`);
      
      // Get file stats
      const fileStats = fs.statSync(tempFilePath);
      
      // Create file object compatible with Multer
      const fileObject: Express.Multer.File = {
        fieldname: 'file',
        originalname: `${arxivId}.pdf`,
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: fileStats.size,
        destination: uploadsDir,
        filename: tempFilename,
        path: tempFilePath,
        buffer: pdfBuffer,
        stream: null as any,
      };
      
      // Upload to PDF service
      await this.pdfService.uploadPdf(paperId, fileObject, userId);
      
      this.logger.log(`✅ Auto-downloaded and processed ArXiv PDF for paper ${paperId}`);
    } catch (error) {
      this.logger.error(`❌ Auto-download failed for paper ${paperId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Auto-download PDF for reference paper (recursive support for multi-level citation network)
   * @param refPaper Reference paper entity
   * @param userId User ID
   * @param depth Current citation depth (0 = direct, 1 = citation of citation, etc.)
   * @param maxDepth Maximum recursion depth (default: 2)
   */
  private async autoDownloadReferencePdf(
    refPaper: Paper,
    userId: number,
    depth: number,
    maxDepth: number = 2,
  ): Promise<void> {
    try {
      this.logger.log(`🔍 [Depth ${depth}] Processing reference paper ${refPaper.id}: ${refPaper.title.substring(0, 50)}...`);

      let pdfBuffer: Buffer | null = null;
      let source = 'unknown';

      // Strategy 1: Try ArXiv if URL contains arxiv.org
      if (refPaper.url && refPaper.url.includes('arxiv.org')) {
        try {
          const arxivId = this.paperMetadataService.extractArxivId(refPaper.url);
          if (arxivId) {
            this.logger.log(`📥 [Depth ${depth}] Downloading from ArXiv: ${arxivId}`);
            pdfBuffer = await this.paperMetadataService.downloadArxivPdf(arxivId);
            source = 'arxiv';
          }
        } catch (error) {
          this.logger.warn(`ArXiv download failed: ${error.message}`);
        }
      }

      // Strategy 2: Try DOI if available (use paper metadata service or Unpaywall API)
      if (!pdfBuffer && refPaper.doi) {
        try {
          this.logger.log(`📥 [Depth ${depth}] Attempting download via DOI: ${refPaper.doi}`);
          // Try to fetch open access URL via Unpaywall or similar service
          const openAccessUrl = await this.fetchOpenAccessUrl(refPaper.doi);
          if (openAccessUrl) {
            pdfBuffer = await this.downloadPdfFromUrl(openAccessUrl);
            source = 'open-access';
          }
        } catch (error) {
          this.logger.warn(`DOI-based download failed: ${error.message}`);
        }
      }

      // Strategy 3: Try direct URL if available
      if (!pdfBuffer && refPaper.url && refPaper.url.endsWith('.pdf')) {
        try {
          this.logger.log(`📥 [Depth ${depth}] Downloading from direct URL: ${refPaper.url}`);
          pdfBuffer = await this.downloadPdfFromUrl(refPaper.url);
          source = 'direct-url';
        } catch (error) {
          this.logger.warn(`Direct URL download failed: ${error.message}`);
        }
      }

      // If no PDF was downloaded, log and exit
      if (!pdfBuffer) {
        this.logger.warn(`❌ [Depth ${depth}] Could not download PDF for paper ${refPaper.id}: No available source`);
        return;
      }

      // Save PDF to file system
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const tempFilename = `ref-${refPaper.id}-${Date.now()}.pdf`;
      const tempFilePath = path.join(uploadsDir, tempFilename);
      fs.writeFileSync(tempFilePath, pdfBuffer);

      const fileStats = fs.statSync(tempFilePath);
      this.logger.log(`💾 [Depth ${depth}] Saved PDF (${(fileStats.size / 1024 / 1024).toFixed(2)} MB) from ${source}`);

      // Create Multer file object
      const fileObject: Express.Multer.File = {
        fieldname: 'file',
        originalname: `${refPaper.title.substring(0, 50)}.pdf`,
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: fileStats.size,
        destination: uploadsDir,
        filename: tempFilename,
        path: tempFilePath,
        buffer: pdfBuffer,
        stream: null as any,
      };

      // Upload to PDF service (this will extract text and store in database)
      await this.pdfService.uploadPdf(refPaper.id, fileObject);
      this.logger.log(`✅ [Depth ${depth}] PDF uploaded and processed for paper ${refPaper.id}`);

      // 🔥 Recursive: Fetch references of this reference (if depth < maxDepth)
      if (depth < maxDepth) {
        this.logger.log(`🔄 [Depth ${depth}] Fetching references of reference paper ${refPaper.id} (next depth: ${depth + 1})`);
        
        // Fetch references using Semantic Scholar or CrossRef
        let references: any[] = [];
        if (refPaper.doi) {
          try {
            references = await this.paperMetadataService.getReferences(refPaper.doi);
          } catch (error) {
            this.logger.warn(`Could not fetch references by DOI: ${error.message}`);
          }
        }
        
        // If no DOI or failed, try metadata search
        if ((!references || references.length === 0) && refPaper.title) {
          try {
            const searchResult = await this.paperMetadataService.searchPaperByMetadata(
              refPaper.title,
              refPaper.authors,
              refPaper.publicationYear,
            );
            
            if (searchResult) {
              references = await this.paperMetadataService.getReferencesByPaperId(searchResult.paperId);
              this.logger.log(`   ✅ Found ${references.length} references via metadata search`);
            }
          } catch (error) {
            this.logger.warn(`Could not fetch references by metadata: ${error.message}`);
          }
        }

        if (references && references.length > 0) {
          this.logger.log(`📚 [Depth ${depth}] Found ${references.length} references, enriching with metadata...`);
          
          // 🔥 ENRICH REFERENCES: Add abstracts and additional metadata
          try {
            this.logger.log(`🔄 [Depth ${depth}] Calling enrichReferences for ${references.length} references...`);
            references = await this.paperMetadataService.enrichReferences(references);
            const enrichedCount = references.filter(r => r.enriched).length;
            this.logger.log(`✅ [Depth ${depth}] Enriched ${enrichedCount}/${references.length} references with abstracts`);
          } catch (enrichError) {
            this.logger.error(`❌ [Depth ${depth}] Enrichment failed: ${enrichError.message}`);
            this.logger.error(enrichError.stack);
            this.logger.warn(`⚠️ [Depth ${depth}] Proceeding with basic references due to enrichment failure`);
          }
          
          // Process references asynchronously
          this.processReferencesRecursive(refPaper, references, userId, depth + 1, maxDepth).catch(err => {
            this.logger.error(`Failed to process recursive references at depth ${depth + 1}: ${err.message}`);
          });
        } else {
          this.logger.warn(`   ⚠️ No references found for paper ${refPaper.id} at depth ${depth}`);
        }
      }

    } catch (error) {
      this.logger.error(`❌ [Depth ${depth}] Auto-download failed for reference ${refPaper.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process references recursively for multi-level citation network
   */
  private async processReferencesRecursive(
    parentPaper: Paper,
    references: any[],
    userId: number,
    depth: number,
    maxDepth: number,
  ): Promise<void> {
    // Calculate priority scores (same logic as original)
    const referencesWithScore = references.map(ref => {
      let score = 0;
      
      if ((!ref.title || ref.title.trim() === '') && (!ref.doi || ref.doi.trim() === '')) {
        return { ...ref, priorityScore: 0 };
      }

      // Citation context quality (0-40)
      if (ref.citationContext) {
        const contextLength = ref.citationContext.length;
        if (contextLength > 200) score += 40;
        else if (contextLength > 100) score += 30;
        else if (contextLength > 50) score += 20;
        else score += 10;
      }

      // Year (0-30)
      if (ref.year) {
        const currentYear = new Date().getFullYear();
        const age = currentYear - ref.year;
        if (age <= 2) score += 30;
        else if (age <= 5) score += 25;
        else if (age <= 10) score += 15;
        else if (age <= 20) score += 5;
      }

      // Has DOI (0-30)
      if (ref.doi && ref.doi.trim() !== '') {
        score += 30;
      } else {
        score += 10;
      }

      return { ...ref, priorityScore: score };
    });

    // Sort and take top 30% (more selective at deeper levels)
    const sortedRefs = referencesWithScore
      .filter(r => r.priorityScore > 0)
      .sort((a, b) => b.priorityScore - a.priorityScore);

    const topN = Math.min(Math.ceil(sortedRefs.length * 0.3), 10); // Max 10 at deeper levels
    const topRefs = sortedRefs.slice(0, topN);

    this.logger.log(`🎯 [Depth ${depth}] Processing top ${topRefs.length}/${references.length} references`);

    // Process each reference
    let successCount = 0;
    let errorCount = 0;
    
    for (const ref of topRefs) {
      try {
        this.logger.log(`   📖 Processing ref: "${ref.title?.substring(0, 60)}..."`);
        
        // Use AI-extracted data first, citation parser only as fallback
        let parsed = {
          title: ref.title,
          authors: ref.authors || 'Unknown',
          year: ref.year || null,
          doi: ref.doi || null,
          confidence: 0.8,
          rawCitation: ref.title,
        };

        // Only use citation parser if we're missing critical data
        if (!ref.authors || !ref.year) {
          try {
            const citationParsed = await this.citationParserService.parseCitation(ref.title);
            this.logger.log(`      ✓ Citation parser filled missing data`);
            // Fill in missing fields only
            if (!parsed.authors || parsed.authors === 'Unknown') {
              parsed.authors = citationParsed.authors || 'Unknown';
            }
            if (!parsed.year) {
              parsed.year = citationParsed.year;
            }
            if (!parsed.doi) {
              parsed.doi = citationParsed.doi;
            }
            parsed.confidence = citationParsed.confidence;
          } catch (error) {
            this.logger.warn(`      ⚠️ Citation parser failed (using AI data): ${error.message}`);
          }
        } else {
          this.logger.log(`      ✓ Using AI-extracted data (authors: ${ref.authors?.substring(0, 30)}, year: ${ref.year})`);
        }

        // Create or find reference paper
        const cleanDoi = parsed.doi || '';
        let refPaper: Paper | null = null;
        
        if (cleanDoi) {
          refPaper = await this.papersRepository.findOne({ where: { doi: cleanDoi } });
        }

        if (!refPaper) {
          refPaper = this.papersRepository.create({
            title: parsed.title || ref.title,
            authors: parsed.authors,
            publicationYear: parsed.year,
            doi: cleanDoi,
            isReference: true,
            addedBy: userId,
          });
          await this.papersRepository.save(refPaper);
          this.logger.log(`      ✓ Created paper ID: ${refPaper.id} (authors: ${parsed.authors?.substring(0, 30)}, year: ${parsed.year})`);
        } else {
          this.logger.log(`      ✓ Found existing paper ID: ${refPaper.id}`);
        }

        // Create citation relationship
        const existingCitation = await this.paperCitationsRepository.findOne({
          where: {
            citingPaperId: parentPaper.id,
            citedPaperId: refPaper.id,
          },
        });

        if (!existingCitation) {
          const citation = await this.paperCitationsRepository.save({
            citingPaperId: parentPaper.id,
            citedPaperId: refPaper.id,
            createdBy: userId,
            citationContext: ref.citationContext || null,
            relevanceScore: ref.priorityScore ? ref.priorityScore / 100 : null,
            isInfluential: ref.isInfluential || false,
            citationDepth: depth,
            parsedAuthors: parsed.authors,
            parsedTitle: parsed.title,
            parsedYear: parsed.year,
            parsingConfidence: parsed.confidence,
            rawCitation: parsed.rawCitation,
          });
          this.logger.log(`      ✓ Created citation ID: ${citation.id}`);
          successCount++;
        } else {
          this.logger.log(`      • Citation already exists ID: ${existingCitation.id}`);
        }

        // Auto-download and fetch nested references if high priority (score >= 50)
        if (ref.priorityScore >= 50 && parsed.confidence > 0.5) {
          this.logger.log(`🚀 [Depth ${depth}] Processing high-priority nested reference: ${parsed.title.substring(0, 40)}... (score: ${ref.priorityScore})`);
          
          // Try to download PDF first
          this.autoDownloadReferencePdf(refPaper, userId, depth, maxDepth).catch(err => {
            this.logger.warn(`Nested auto-download failed: ${err.message}`);
          });
          
          // But also try to fetch references immediately (don't wait for PDF)
          if (depth < maxDepth) {
            this.fetchAndProcessNestedReferences(refPaper, userId, depth, maxDepth).catch(err => {
              this.logger.warn(`Failed to fetch nested references: ${err.message}`);
            });
          }
        }
      } catch (error) {
        this.logger.error(`      ❌ Error processing reference: ${error.message}`);
        this.logger.error(`      Stack: ${error.stack}`);
        errorCount++;
        continue;
      }
    }
    
    this.logger.log(`✅ [Depth ${depth}] Completed: ${successCount} citations created, ${errorCount} errors`);
    
    // 🔥 PHASE 2: Apply graph analysis to select top 20 from all created citations
    if (depth === 0) {  // Only for root paper's direct references
      await this.rankReferencesWithGraphAnalysis(parentPaper.id, userId);
    }
  }

  /**
   * 🔥 PHASE 2: Re-rank references using advanced graph algorithms
   * This runs AFTER citations are created, so we have network data
   */
  private async rankReferencesWithGraphAnalysis(paperId: number, userId: number): Promise<void> {
    try {
      this.logger.log(`\n🎯 ========== PHASE 2: GRAPH ANALYSIS RANKING ==========`);
      this.logger.log(`📊 Analyzing citation network for paper ${paperId}...`);
      
      // Get all citations for this paper
      const citations = await this.paperCitationsRepository.find({
        where: { citingPaperId: paperId },
        relations: ['citedPaper'],
      });
      
      if (citations.length === 0) {
        this.logger.warn(`No citations found for paper ${paperId}`);
        return;
      }
      
      this.logger.log(`Found ${citations.length} citations to analyze`);
      
      // Get citation network for graph analysis
      const network = await this.citationsService.getCitationNetwork(paperId, 2);
      
      // Calculate advanced scores for each citation
      const citationsWithScores = await Promise.all(
        citations.map(async (citation) => {
          try {
            // 1. Advanced multi-dimensional score (7 factors)
            const { totalScore, breakdown } = await this.citationMetricsService.calculateAdvancedScore(
              citation,
              network,
              new Date().getFullYear()
            );
            
            // 2. Network centrality (PageRank-like)
            const centrality = await this.citationMetricsService.calculateCentrality(
              citation.citedPaperId,
              network
            );
            
            // 3. Co-citation strength (similarity to other papers)
            const coCitationResult = await this.citationMetricsService.calculateCoCitation(
              paperId,
              citation.citedPaperId,
              network
            );
            const coCitation = coCitationResult.strength || 0;
            
            // 4. Impact potential (0-100 composite score)
            let impactScore = 0;
            try {
              const impact = await this.citationMetricsService.forecastImpactPotential(citation.citedPaperId);
              impactScore = impact.impactScore || 0;
            } catch (err) {
              this.logger.warn(`Impact forecast failed for ${citation.citedPaperId}: ${err.message}`);
            }
            
            // 5. Combined final score (weighted average)
            const finalScore = 
              totalScore * 0.40 +           // Advanced multi-factor: 40%
              centrality.inDegree * 0.01 * 0.25 +  // Network centrality: 25% (normalized)
              coCitation * 0.20 +           // Co-citation: 20%
              impactScore * 0.01 * 0.15;    // Impact potential: 15%
            
            this.logger.log(
              `  📄 Paper ${citation.citedPaperId}: ` +
              `Score=${finalScore.toFixed(3)} ` +
              `(adv=${totalScore.toFixed(2)}, ` +
              `cent=${centrality.inDegree}, ` +
              `coCite=${coCitation.toFixed(2)}, ` +
              `impact=${impactScore.toFixed(0)})`
            );
            
            return {
              citation,
              finalScore,
              breakdown: {
                advancedScore: totalScore,
                centrality: centrality.inDegree,
                coCitation,
                impactScore,
              }
            };
          } catch (error) {
            this.logger.error(`Error analyzing citation ${citation.id}: ${error.message}`);
            return {
              citation,
              finalScore: citation.relevanceScore || 0,
              breakdown: null
            };
          }
        })
      );
      
      // Sort by final score and keep top 20
      const sortedCitations = citationsWithScores
        .sort((a, b) => b.finalScore - a.finalScore);
      
      const top20 = sortedCitations.slice(0, 20);
      const toRemove = sortedCitations.slice(20);
      
      this.logger.log(`\n📊 RANKING RESULTS:`);
      this.logger.log(`  ✅ Top 20 references (keeping):`);
      top20.forEach((item, idx) => {
        this.logger.log(
          `    ${idx + 1}. Paper ${item.citation.citedPaperId} - ` +
          `Score: ${item.finalScore.toFixed(3)} - ` +
          `"${item.citation.citedPaper?.title?.substring(0, 50)}..."`
        );
      });
      
      if (toRemove.length > 0) {
        this.logger.log(`\n  ❌ Removing ${toRemove.length} lower-ranked citations`);
        const idsToRemove = toRemove.map(item => item.citation.id);
        await this.paperCitationsRepository.delete(idsToRemove);
        this.logger.log(`  ✓ Deleted ${toRemove.length} citations`);
      }
      
      // Update relevance scores for top 20
      this.logger.log(`\n  📝 Updating relevance scores for top 20...`);
      for (const item of top20) {
        await this.paperCitationsRepository.update(item.citation.id, {
          relevanceScore: item.finalScore,
        });
      }
      
      this.logger.log(`\n✅ ========== GRAPH ANALYSIS COMPLETE ==========\n`);
      
    } catch (error) {
      this.logger.error(`❌ Graph analysis failed: ${error.message}`);
      this.logger.error(error.stack);
    }
  }

  /**
   * Fetch and process nested references without requiring PDF
   */
  private async fetchAndProcessNestedReferences(
    refPaper: Paper,
    userId: number,
    depth: number,
    maxDepth: number,
  ): Promise<void> {
    try {
      this.logger.log(`🔄 [Depth ${depth}] Fetching references for paper ${refPaper.id}: ${refPaper.title.substring(0, 40)}...`);
      
      let references: any[] = [];
      
      // Method 1: Try DOI first
      if (refPaper.doi) {
        try {
          references = await this.paperMetadataService.getReferences(refPaper.doi);
          this.logger.log(`   ✅ Found ${references.length} references via DOI`);
        } catch (error) {
          this.logger.warn(`   ⚠️ Could not fetch by DOI: ${error.message}`);
        }
      }
      
      // Method 2: Try metadata search if no DOI or failed
      if ((!references || references.length === 0) && refPaper.title) {
        try {
          const searchResult = await this.paperMetadataService.searchPaperByMetadata(
            refPaper.title,
            refPaper.authors,
            refPaper.publicationYear,
          );
          
          if (searchResult) {
            // Update DOI if found
            if (searchResult.doi && !refPaper.doi) {
              refPaper.doi = searchResult.doi;
              await this.papersRepository.save(refPaper);
              this.logger.log(`   📝 Updated DOI: ${searchResult.doi}`);
            }
            
            references = await this.paperMetadataService.getReferencesByPaperId(searchResult.paperId);
            this.logger.log(`   ✅ Found ${references.length} references via metadata search`);
          }
        } catch (error) {
          this.logger.warn(`   ⚠️ Metadata search failed: ${error.message}`);
        }
      }

      if (references && references.length > 0) {
        this.logger.log(`📚 [Depth ${depth}] Found ${references.length} references, enriching with metadata...`);
        
        // 🔥 ENRICH REFERENCES: Add abstracts and additional metadata
        try {
          references = await this.paperMetadataService.enrichReferences(references);
          const enrichedCount = references.filter(r => r.enriched).length;
          this.logger.log(`✅ [Depth ${depth}] Enriched ${enrichedCount}/${references.length} references with abstracts`);
        } catch (enrichError) {
          this.logger.warn(`⚠️ [Depth ${depth}] Enrichment failed, proceeding with basic references: ${enrichError.message}`);
        }
        
        this.logger.log(`📚 [Depth ${depth}] Processing ${references.length} references at depth ${depth + 1}`);
        await this.processReferencesRecursive(refPaper, references, userId, depth + 1, maxDepth);
      } else {
        this.logger.warn(`   ⚠️ No references found for paper ${refPaper.id}`);
      }
    } catch (error) {
      this.logger.error(`   ❌ Failed to fetch nested references: ${error.message}`);
    }
  }

  /**
   * Fetch open access URL for DOI using Unpaywall API
   */
  private async fetchOpenAccessUrl(doi: string): Promise<string | null> {
    try {
      const email = 'your-email@example.com'; // TODO: Move to config
      const url = `https://api.unpaywall.org/v2/${doi}?email=${email}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      // Check for best open access location
      if (data.best_oa_location && data.best_oa_location.url_for_pdf) {
        this.logger.log(`✅ Found open access PDF via Unpaywall`);
        return data.best_oa_location.url_for_pdf;
      }

      return null;
    } catch (error) {
      this.logger.warn(`Unpaywall API error: ${error.message}`);
      return null;
    }
  }

  /**
   * Download PDF from URL
   */
  private async downloadPdfFromUrl(url: string): Promise<Buffer> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async toggleFavorite(id: number, favorite: boolean, userId: number): Promise<Paper> {
   
    const paper = await this.findOne(id);
    if(!paper) {
      throw new NotFoundException('Paper not found in library');
    }
    if (paper.addedBy !== userId) {
      throw new ForbiddenException('You can only modify your own papers');
    }
    
    paper.favorite = favorite;
    return await this.papersRepository.save(paper);
  }

  // get statistics of paper: status and favorite
  async getPaperStatusStatistics(userId: number): Promise<{ 
        byStatus: Record<string, number>;
    favorites: number;
    total: number; }> {
    const baseQuery = this.papersRepository.createQueryBuilder('paper')
      .where('paper.addedBy = :userId', { userId })
      .andWhere('paper.isReference = :isReference', { isReference: false });

    const total = await baseQuery.getCount();

    const byStatus: Record<string, number> = {};
    
    for (const status of ['to_read', 'reading', 'completed']) {
      byStatus[status] = await baseQuery
        .clone()
        .andWhere('paper.status = :status', { status })
        .getCount();
    }

    const favorites = await baseQuery
      .clone()
      .andWhere('paper.favorite = true')
      .getCount();
    return {
      byStatus,
      favorites,
      total,
    };
  }

  // Get library (filtered papers)
  async getLibrary(userId: number, filters?: {
    status?: string;
    favorite?: boolean;
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<{ items: any[]; total: number }> {
    const { status, favorite, page = 1, pageSize = 10, search } = filters || {};

    const queryBuilder = this.papersRepository
      .createQueryBuilder('paper')
      .leftJoinAndSelect('paper.tags', 'tags')
      .where('paper.addedBy = :userId', { userId })
      .andWhere('paper.isReference = :isReference', { isReference: false });

    if (status) {
      queryBuilder.andWhere('paper.status = :status', { status });
    }

    if (favorite !== undefined) {
      queryBuilder.andWhere('paper.favorite = :favorite', { favorite });
    }

    if (search) {
      queryBuilder.andWhere(
        '(paper.title LIKE :search OR paper.authors LIKE :search OR paper.abstract LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const total = await queryBuilder.getCount();

    const papers = await queryBuilder
      .orderBy('paper.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    // Transform to match LibraryItem format
    const items = papers.map(paper => ({
      id: paper.id,
      paperId: paper.id,
      userId: paper.addedBy,
      addedAt: paper.createdAt,
      paper: paper,
    }));

    return { items, total };
  }

  // Update paper status
  async updatePaperStatus(paperId: number, userId: number, status: string): Promise<Paper> {
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
      relations: ['tags'],
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    paper.status = status as any;
    return await this.papersRepository.save(paper);
  }

  // Remove paper (soft delete by setting isReference or hard delete)
  async removePaper(paperId: number, userId: number): Promise<void> {
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    await this.papersRepository.remove(paper);
  }

}
