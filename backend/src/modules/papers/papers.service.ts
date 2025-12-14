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
import { LibraryService } from '../library/library.service';
import { CitationsService } from '../citations/citations.service';
import { CitationParserService } from '../citations/citation-parser.service';
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

    private libraryService: LibraryService,
    private citationsService: CitationsService,
    private citationParserService: CitationParserService,
    private paperMetadataService: PaperMetadataService,
    @Inject(forwardRef(() => PdfService))
    private pdfService: PdfService,
  ) { }




  async create(createPaperDto: CreatePaperDto, userId: number): Promise<{ success: boolean; message: string; status: number; data: Paper }> {
    const { tagIds, references, ...paperData } = createPaperDto;

    // Debug: Log references with year data
    if (references && references.length > 0) {
      this.logger.log(`Received ${references.length} references from frontend`);
      this.logger.log(`Sample references (first 3):`);
      references.slice(0, 3).forEach((ref: any, idx: number) => {
        this.logger.log(`  Ref ${idx + 1}: title="${ref.title?.substring(0, 40)}...", year=${ref.year}, authors="${ref.authors?.substring(0, 30)}..."`);
      });
      const withYear = references.filter((r: any) => r.year).length;
      this.logger.log(`References with year: ${withYear}/${references.length}`);
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
      isReference: false,
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
      // Kick off async processing sau khi return response
      this.processReferencesWithAutoDownload(savedPaper, references, userId).catch(err => {
        this.logger.error(`Failed to process references for paper ${savedPaper.id}: ${err.message}`);
      });
    }

    const addToLibraryDto = {
      paperId: savedPaper.id,
    }

    await this.libraryService.addToLibrary(userId, addToLibraryDto);

    return {
      success: true,
      message: 'Paper created successfully. References are being processed in background.',
      status: HttpStatus.CREATED,
      data: await this.findOne(savedPaper.id)
    };
  }

  /**
   * Process references with AI parsing, auto-download high-priority PDFs
   */
  private async processReferencesWithAutoDownload(
    savedPaper: Paper,
    references: any[],
    userId: number,
  ): Promise<void> {
      // Bước 1: Tính priority score cho mỗi reference (không cần AI)
      const referencesWithScore = references.map(ref => {
        let score = 0;
        
        // Skip invalid references
        if ((!ref.title || ref.title.trim() === '') && (!ref.doi || ref.doi.trim() === '')) {
          return { ...ref, priorityScore: 0 };
        }

        // 1. Citation context quality (0-40 điểm)
        if (ref.citationContext) {
          const contextLength = ref.citationContext.length;
          // Context dài = có nhiều thông tin
          if (contextLength > 200) score += 40;
          else if (contextLength > 100) score += 30;
          else if (contextLength > 50) score += 20;
          else score += 10;

          // Bonus: có keywords quan trọng
          const importantKeywords = [
            'propose', 'demonstrate', 'show', 'prove', 'novel', 'new', 
            'important', 'significant', 'key', 'fundamental', 'seminal',
            'state-of-the-art', 'benchmark', 'framework', 'method', 'approach'
          ];
          const contextLower = ref.citationContext.toLowerCase();
          const keywordCount = importantKeywords.filter(kw => contextLower.includes(kw)).length;
          score += Math.min(keywordCount * 5, 20); // Max +20 điểm
        }

        // 2. Năm xuất bản (0-30 điểm) - ưu tiên papers gần đây
        if (ref.year) {
          const currentYear = new Date().getFullYear();
          const age = currentYear - ref.year;
          if (age <= 2) score += 30;        // Very recent
          else if (age <= 5) score += 25;   // Recent
          else if (age <= 10) score += 15;  // Moderately recent
          else if (age <= 20) score += 5;   // Older
          // Older than 20 years: 0 điểm (unless it's a seminal work)
        }

        // 3. Có DOI = có thể tải về (0-30 điểm)
        if (ref.doi && ref.doi.trim() !== '') {
          score += 30;
        } else {
          score += 10; // Still give some points
        }

        return { ...ref, priorityScore: score };
      });

      // Bước 2: Sắp xếp theo priority score và chỉ auto-rate top N%
      const sortedRefs = referencesWithScore
        .filter(r => r.priorityScore > 0)
        .sort((a, b) => b.priorityScore - a.priorityScore);

      // Chỉ auto-rate top 50% hoặc tối đa 20 references
      const topN = Math.min(
        Math.ceil(sortedRefs.length * 0.5), 
        20
      );
      const refsToAutoRate = new Set(
        sortedRefs.slice(0, topN).map(r => r.doi || r.title)
      );

      console.log(`Will auto-rate ${refsToAutoRate.size}/${references.length} references based on priority scores`);
      
      // Log priority scores distribution
      this.logger.log(`\n📊 Priority Score Distribution:`);
      const scoreRanges = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
      sortedRefs.forEach(ref => {
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
      this.logger.log('');

      // Bước 3: Parse citations with AI và lưu
      let savedCount = 0;
      let skippedCount = 0;
      let aiParsedCount = 0;
      
      this.logger.log(`\n🤖 Starting AI citation parsing...`);
      
      for (const ref of references) {
        if ((!ref.title || ref.title.trim() === '') && (!ref.doi || ref.doi.trim() === '')) {
          skippedCount++;
          this.logger.warn(`⚠️ Skipped reference: no title and no DOI`);
          continue;
        }

        // Use AI to parse citation string
        let parsed;
        try {
          parsed = await this.citationParserService.parseCitation(ref.title);
          aiParsedCount++;
          
          if (aiParsedCount <= 3) {
            this.logger.log(`  ✅ Parsed: "${ref.title.substring(0, 50)}..."`);
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
          this.logger.log(`Creating new reference paper: ${cleanTitle.substring(0, 60)}..., year: ${parsed.year || 'null'}`);
          refPaper = this.papersRepository.create({
            title: cleanTitle || '',
            authors: parsed.authors || 'Unknown',
            publicationYear: parsed.year,
            doi: cleanDoi || '',
            isReference: true,
            addedBy: userId,
          });
          await this.papersRepository.save(refPaper);
          this.logger.log(`Reference paper saved with ID: ${refPaper.id}, year: ${refPaper.publicationYear}`);
        }

        // Kiểm tra duplicate citation trước khi save
        const existingCitation = await this.paperCitationsRepository.findOne({
          where: {
            citingPaperId: savedPaper.id,
            citedPaperId: refPaper.id,
          },
        });

        if (!existingCitation) {
          // Lưu quan hệ trích dẫn với AI-parsed metadata
          const newCitation = await this.paperCitationsRepository.save({
            citingPaperId: savedPaper.id,
            citedPaperId: refPaper.id,
            createdById: userId,
            citationContext: ref.citationContext || null,
            relevanceScore: ref.relevanceScore || null,
            isInfluential: ref.isInfluential || false,
            // AI parsing fields
            citationDepth: 0, // Direct citation
            parsedAuthors: parsed.authors,
            parsedTitle: parsed.title,
            parsedYear: parsed.year,
            parsingConfidence: parsed.confidence,
            rawCitation: parsed.rawCitation,
          });

          // Tạo note tự động cho citation
          if (parsed.confidence > 0.5) { // Only create note if confidence is good
            try {
              const noteContent = this.citationParserService.generateCitationNote(parsed, savedPaper.title);
              const citationNote = await this.notesRepository.save({
                userId: userId,
                paperId: refPaper.id,
                title: `Citation from: ${savedPaper.title.substring(0, 50)}...`,
                content: noteContent,
                color: '#E3F2FD', // Light blue for citation notes
              });
              
              // Link note to citation
              newCitation.noteId = citationNote.id;
              await this.paperCitationsRepository.save(newCitation);
              
              this.logger.log(`  📝 Created citation note (ID: ${citationNote.id})`);
            } catch (error) {
              this.logger.warn(`Failed to create citation note: ${error.message}`);
            }
          }

          // Chỉ auto-rate nếu reference nằm trong top priority
          const refIdentifier = ref.doi || ref.title;
          if (refsToAutoRate.has(refIdentifier)) {
            // Tự động đánh giá mức độ liên quan bằng AI (chạy async, không chờ)
            this.citationsService.autoRateRelevance(newCitation.id).catch(err => {
              console.error(`Failed to auto-rate citation ${newCitation.id}:`, err.message);
            });
          }

          // 🔥 Auto-download PDF for high-priority references (score >= 50)
          const priorityScore = ref.priorityScore || 0;
          if (priorityScore >= 50 && parsed.confidence > 0.5) {
            this.logger.log(`🚀 Triggering auto-download for high-priority reference: ${parsed.title.substring(0, 50)}... (score: ${priorityScore}, confidence: ${(parsed.confidence * 100).toFixed(0)}%)`);
            this.autoDownloadReferencePdf(refPaper, userId, 0).catch(err => {
              this.logger.warn(`Auto-download failed for reference ${refPaper.id}: ${err.message}`);
            });
          } else if (priorityScore > 0) {
            this.logger.debug(`⏸️ Skipped auto-download: ${parsed.title.substring(0, 40)}... (score: ${priorityScore}, confidence: ${(parsed.confidence * 100).toFixed(0)}%, needs >=50 & >50%)`);
          }
        }
        
        savedCount++;
      }
      
      this.logger.log(`\n✅ Citation Summary:`);
      this.logger.log(`   Total references received: ${references.length}`);
      this.logger.log(`   AI parsed: ${aiParsedCount}`);
      this.logger.log(`   Successfully saved: ${savedCount}`);
      this.logger.log(`   Skipped (no title/DOI): ${skippedCount}`);
      this.logger.log(`   Will auto-rate: ${refsToAutoRate.size}`);
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

    // Filter by year
    if (searchDto.year) {
      query.andWhere('paper.publicationYear = :year', { year: searchDto.year });
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
    try {
      await this.libraryService.removeFromLibraryByPaperId(userId, id);
    } catch (error) {
      // If not in library, that's fine
    }

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
      await this.pdfService.uploadPdf(paperId, fileObject);
      
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
          this.logger.log(`📚 [Depth ${depth}] Found ${references.length} references, processing top-scored ones...`);
          
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
    for (const ref of topRefs) {
      // Parse citation with AI
      let parsed;
      try {
        parsed = await this.citationParserService.parseCitation(ref.title);
      } catch (error) {
        this.logger.warn(`Failed to parse citation at depth ${depth}: ${error.message}`);
        continue;
      }

      // Create or find reference paper
      const cleanDoi = parsed.doi || ref.doi || '';
      let refPaper: Paper | null = null;
      
      if (cleanDoi) {
        refPaper = await this.papersRepository.findOne({ where: { doi: cleanDoi } });
      }

      if (!refPaper) {
        refPaper = this.papersRepository.create({
          title: parsed.title || ref.title,
          authors: parsed.authors || 'Unknown',
          publicationYear: parsed.year,
          doi: cleanDoi,
          isReference: true,
          addedBy: userId,
        });
        await this.papersRepository.save(refPaper);
      }

      // Create citation relationship
      const existingCitation = await this.paperCitationsRepository.findOne({
        where: {
          citingPaperId: parentPaper.id,
          citedPaperId: refPaper.id,
        },
      });

      if (!existingCitation) {
        await this.paperCitationsRepository.save({
          citingPaperId: parentPaper.id,
          citedPaperId: refPaper.id,
          createdById: userId,
          citationContext: ref.citationContext || null,
          isInfluential: ref.isInfluential || false,
          citationDepth: depth,
          parsedAuthors: parsed.authors,
          parsedTitle: parsed.title,
          parsedYear: parsed.year,
          parsingConfidence: parsed.confidence,
          rawCitation: parsed.rawCitation,
        });

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
      }
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

  /**
   * Manually fetch nested references for a paper
   * Allows user to trigger reference fetching at any depth level
   */
  async manuallyFetchNestedReferences(
    paperId: number,
    userId: number,
    targetDepth: number = 1,
    maxDepth: number = 2,
  ): Promise<{ message: string; stats: any }> {
    this.logger.log(`\n🔍 Manual fetch nested references triggered for paper ${paperId}`);
    this.logger.log(`   Target depth: ${targetDepth}, Max depth: ${maxDepth}`);

    const paper = await this.papersRepository.findOne({ 
      where: { id: paperId },
      relations: ['pdfFiles'],
    });
    if (!paper) {
      throw new Error('Paper not found');
    }

    this.logger.log(`\n📚 Fetching references for: ${paper.title.substring(0, 60)}...`);
    
    let processedCount = 0;
    let newRefsCount = 0;
    let skippedCount = 0;
    let references: any[] = [];
    let method = 'unknown';
    let updatedDoi: string | null = null;

    try {
      // Method 1: Try to fetch from DOI first
      if (paper.doi) {
        this.logger.log(`   🔑 Using DOI: ${paper.doi}`);
        references = await this.paperMetadataService.getReferences(paper.doi);
        method = 'DOI API';
      }
      
      // Method 2: If no DOI or no references found, search by title/authors/year
      if (!paper.doi || !references || references.length === 0) {
        this.logger.log(`   🔍 Searching by metadata: title="${paper.title.substring(0, 40)}...", year=${paper.publicationYear}`);
        
        try {
          const searchResult = await this.paperMetadataService.searchPaperByMetadata(
            paper.title,
            paper.authors,
            paper.publicationYear,
          );

          if (searchResult) {
            this.logger.log(`   ✅ Found paper ID: ${searchResult.paperId}`);
            
            // Update DOI if found and not set
            if (searchResult.doi && !paper.doi) {
              updatedDoi = searchResult.doi;
              paper.doi = updatedDoi;
              await this.papersRepository.save(paper);
              this.logger.log(`   🔑 Updated paper DOI: ${updatedDoi}`);
            }

            // Fetch references using paperId
            references = await this.paperMetadataService.getReferencesByPaperId(searchResult.paperId);
            method = 'Metadata Search';
          }
        } catch (searchError) {
          this.logger.warn(`   ⚠️ Metadata search failed: ${searchError.message}`);
          
          // Method 2.5: Try AI to find DOI if search is rate-limited
          if (searchError.message?.includes('429') && !paper.doi) {
            this.logger.log(`   🤖 Trying AI to find DOI...`);
            const aiDoi = await this.paperMetadataService.findDoiWithAI(
              paper.title,
              paper.authors,
              paper.publicationYear,
            );
            
            if (aiDoi) {
              this.logger.log(`   ✅ AI found DOI: ${aiDoi}`);
              paper.doi = aiDoi;
              updatedDoi = aiDoi;
              await this.papersRepository.save(paper);
              
              // Try to fetch references using AI-found DOI
              try {
                references = await this.paperMetadataService.getReferences(aiDoi);
                method = 'AI DOI Finder + API';
                this.logger.log(`   ✅ Fetched ${references.length} references using AI-found DOI`);
              } catch (doiError) {
                this.logger.warn(`   ⚠️ Could not fetch references with AI-found DOI: ${doiError.message}`);
              }
            }
          }
        }
        
        // Method 3: Fallback to AI extraction from PDF if search failed
        if ((!references || references.length === 0) && paper.pdfFiles && paper.pdfFiles.length > 0) {
          this.logger.warn(`   🤖 Trying AI extraction from PDF...`);
          
          try {
            const pdfFile = paper.pdfFiles[0];
            this.logger.log(`   📄 Extracting from PDF: ${pdfFile.fileName}`);
            
            // Extract abstract from PDF if not already set
            if (!paper.abstract || paper.abstract.length < 50) {
              const abstract = await this.extractAbstractFromPdf(pdfFile.filePath);
              if (abstract && abstract.length > 50) {
                paper.abstract = abstract;
                await this.papersRepository.save(paper);
                this.logger.log(`   📝 Extracted abstract from PDF (${abstract.length} chars)`);
              }
            }
            
            references = await this.extractReferencesFromPdfWithAI(pdfFile.filePath, paper.title);
            method = 'AI PDF Extraction';
            
            // Try to find DOI from PDF
            const pdfDoi = await this.tryFindDoiFromPdf(pdfFile.filePath);
            if (pdfDoi && !paper.doi) {
              updatedDoi = pdfDoi;
              paper.doi = updatedDoi;
              await this.papersRepository.save(paper);
              this.logger.log(`   🔑 Found and updated DOI from PDF: ${updatedDoi}`);
            }
          } catch (aiError) {
            this.logger.error(`   ❌ AI extraction failed: ${aiError.message}`);
          }
        }
      }
      
      // If still no references, return rate limit message
      if (!references || references.length === 0) {
        const reasons = [];
        if (!paper.doi) reasons.push('no DOI');
        if (!paper.pdfFiles || paper.pdfFiles.length === 0) reasons.push('no PDF');
        if (method === 'unknown') reasons.push('API rate limited');
        
        this.logger.log(`   ⏳ Unable to fetch references: ${reasons.join(', ')}`);
        return {
          message: `⏳ Cannot fetch references right now (${reasons.join(', ')}). Please try again in a few minutes when API rate limit resets.`,
          stats: {
            paperId,
            targetDepth,
            processedCount: 0,
            newReferencesFound: 0,
            skippedCount: 0,
            method: 'Failed - Rate Limited',
          },
        };
      }

      this.logger.log(`   ✅ Found ${references.length} references`);
      this.logger.log(`   Processing references at depth ${targetDepth}...`);

      // Process these references
      await this.processReferencesRecursive(
        paper,
        references,
        userId,
        targetDepth,
        maxDepth,
      );

      processedCount = 1;
      newRefsCount = references.length;

      this.logger.log(`\n✅ Manual fetch completed successfully`);

    } catch (error) {
      this.logger.error(`   ❌ Failed to fetch references: ${error.message}`);
      throw new Error(`Failed to fetch references: ${error.message}`);
    }

    const summary = {
      paperId,
      paperTitle: paper.title.substring(0, 100),
      paperDoi: paper.doi || null,
      updatedDoi: updatedDoi || null,
      targetDepth,
      processedCount,
      newReferencesFound: newRefsCount,
      skippedCount,
      method,
    };

    this.logger.log(`\n📊 Summary:`);
    this.logger.log(`   Paper: ${paper.title.substring(0, 60)}...`);
    this.logger.log(`   DOI: ${paper.doi || 'N/A'}`);
    if (updatedDoi) this.logger.log(`   📝 DOI updated from ${method === 'AI PDF Extraction' ? 'PDF' : 'search'}`);
    this.logger.log(`   New references found: ${newRefsCount}`);
    this.logger.log(`   Target depth: ${targetDepth}`);
    this.logger.log(`   Method: ${method}`);

    let successMessage = 'References fetched successfully';
    if (method === 'Metadata Search') {
      successMessage = 'References found by searching paper metadata';
    } else if (method === 'AI PDF Extraction') {
      successMessage = 'References extracted from PDF using AI';
    }

    return {
      message: successMessage,
      stats: summary,
    };
  }

  /**
   * Extract references from PDF using AI
   */
  private async extractReferencesFromPdfWithAI(
    pdfPath: string,
    paperTitle: string,
  ): Promise<any[]> {
    this.logger.log(`\n🤖 Extracting references from PDF using AI...`);
    
    try {
      // Get PDF text using PdfService's text extractor
      const pdfText = await this.pdfService['pdfTextExtractor'].extractText(pdfPath);
      
      if (!pdfText || pdfText.length < 100) {
        this.logger.warn('   ⚠️ PDF text too short or empty');
        return [];
      }

      // Find references section (usually at the end)
      const referencesSection = this.extractReferencesSection(pdfText);
      
      if (!referencesSection || referencesSection.length < 100) {
        this.logger.warn('   ⚠️ No references section found in PDF');
        return [];
      }

      this.logger.log(`   📝 Found references section (${referencesSection.length} chars)`);

      // Use AI to parse references
      const references = await this.parseReferencesWithAI(referencesSection, paperTitle);
      
      this.logger.log(`   ✅ Extracted ${references.length} references using AI`);
      return references;
      
    } catch (error) {
      this.logger.error(`   ❌ Failed to extract references from PDF: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract references section from PDF text
   */
  private extractReferencesSection(pdfText: string): string {
    // Common reference section headers
    const refHeaders = [
      'REFERENCES',
      'References',
      'BIBLIOGRAPHY',
      'Bibliography',
      'WORKS CITED',
      'Works Cited',
      'LITERATURE CITED',
    ];

    // Try to find reference section
    let refStartIndex = -1;
    let foundHeader = '';
    
    for (const header of refHeaders) {
      const index = pdfText.lastIndexOf(header);
      if (index > refStartIndex) {
        refStartIndex = index;
        foundHeader = header;
      }
    }

    if (refStartIndex === -1) {
      // Try regex pattern for numbered references
      const match = pdfText.match(/\n\s*\[1\]|\n\s*1\./);
      if (match && match.index) {
        refStartIndex = match.index;
        foundHeader = 'Numbered References';
      }
    }

    if (refStartIndex === -1) {
      this.logger.warn('   No references section header found');
      return '';
    }

    this.logger.log(`   Found "${foundHeader}" at position ${refStartIndex}`);
    
    // Extract from header to end (or limit to ~10000 chars)
    const refSection = pdfText.substring(refStartIndex);
    return refSection.substring(0, Math.min(refSection.length, 10000));
  }

  /**
   * Parse references section using AI
   */
  private async parseReferencesWithAI(
    referencesText: string,
    paperTitle: string,
  ): Promise<any[]> {
    try {
      // Truncate if too long
      const truncatedText = referencesText.substring(0, 15000);

      const prompt = `You are an expert at parsing academic references from PDF text. Extract all references from the following text.

PAPER TITLE: "${paperTitle}"

REFERENCES TEXT:
"""
${truncatedText}
"""

INSTRUCTIONS:
1. Identify each individual reference (they may be numbered like [1], 1., or unnumbered)
2. For each reference, extract:
   - authors: All author names (format: "FirstName LastName, FirstName LastName")
   - year: Publication year (4-digit number)
   - title: Paper/article title
   - journal: Journal/conference name (if present)
   - doi: DOI if present (format: 10.xxxx/xxxxx)
   - priorityScore: Rate relevance to main paper (0-100, based on title similarity and citation context)
3. Only include references that are clearly academic papers or articles
4. Skip malformed or incomplete references

OUTPUT FORMAT (JSON array only, no other text):
[
  {
    "authors": "Author names",
    "year": 2024,
    "title": "Paper title",
    "journal": "Journal name or null",
    "doi": "DOI or null",
    "priorityScore": 75
  }
]

IMPORTANT:
- Return valid JSON array only
- If no references found, return []
- Include at least title and authors for each reference
- priorityScore should reflect how relevant the reference seems to "${paperTitle}"`;

      const result = await this.citationParserService['model'].generateContent(prompt);
      const response = result.response.text();
      
      // Extract JSON
      let jsonText = response.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(jsonText);
      
      if (!Array.isArray(parsed)) {
        this.logger.warn('   AI did not return an array');
        return [];
      }

      // Convert to format expected by processReferencesRecursive
      return parsed.map(ref => ({
        title: ref.title || '',
        authors: ref.authors || 'Unknown',
        year: ref.year || null,
        doi: ref.doi || null,
        journal: ref.journal || null,
        priorityScore: ref.priorityScore || 50,
        relevanceScore: ref.priorityScore ? ref.priorityScore / 100 : 0.5,
      }));
      
    } catch (error) {
      this.logger.error(`   Failed to parse references with AI: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract abstract from PDF content
   */
  private async extractAbstractFromPdf(pdfPath: string): Promise<string | null> {
    try {
      const pdfText = await this.pdfService['pdfTextExtractor'].extractText(pdfPath);
      
      // Look for abstract section in first 5000 characters
      const searchText = pdfText.substring(0, 5000);
      
      // Common abstract section headers
      const abstractHeaders = ['ABSTRACT', 'Abstract', 'Summary', 'SUMMARY'];
      
      for (const header of abstractHeaders) {
        const headerIndex = searchText.indexOf(header);
        if (headerIndex !== -1) {
          // Start after the header
          const startIndex = headerIndex + header.length;
          let abstractText = searchText.substring(startIndex);
          
          // Find end of abstract (next section header or double newline)
          const endMarkers = [
            '\nINTRODUCTION',
            '\nIntroduction',
            '\n1. INTRODUCTION',
            '\n1. Introduction',
            '\nMETHODS',
            '\nKeywords',
            '\nKEYWORDS',
            '\n\n\n', // Triple newline
          ];
          
          let endIndex = abstractText.length;
          for (const marker of endMarkers) {
            const markerIndex = abstractText.indexOf(marker);
            if (markerIndex !== -1 && markerIndex < endIndex) {
              endIndex = markerIndex;
            }
          }
          
          abstractText = abstractText.substring(0, endIndex).trim();
          
          // Clean up: remove extra whitespace, limit length
          abstractText = abstractText
            .replace(/\s+/g, ' ')
            .replace(/^\s*[\r\n]+/gm, ' ')
            .trim()
            .substring(0, 2000);
          
          if (abstractText.length > 100) {
            this.logger.log(`   📝 Extracted abstract from PDF (${abstractText.length} chars)`);
            return abstractText;
          }
        }
      }
      
      return null;
    } catch (error) {
      this.logger.warn(`   Failed to extract abstract from PDF: ${error.message}`);
      return null;
    }
  }

  /**
   * Try to find DOI from PDF content
   */
  private async tryFindDoiFromPdf(pdfPath: string): Promise<string | null> {
    try {
      const pdfText = await this.pdfService['pdfTextExtractor'].extractText(pdfPath);
      
      // Look for DOI in first 3000 characters (usually in header/footer)
      const searchText = pdfText.substring(0, 3000);
      
      // DOI regex pattern
      const doiPattern = /10\.\d{4,}\/[^\s]+/g;
      const matches = searchText.match(doiPattern);
      
      if (matches && matches.length > 0) {
        // Return first DOI found (most likely the paper's own DOI)
        const doi = matches[0].replace(/[.,;:)\]]$/, ''); // Remove trailing punctuation
        this.logger.log(`   🔍 Found DOI in PDF: ${doi}`);
        return doi;
      }
      
      return null;
    } catch (error) {
      this.logger.warn(`   Failed to extract DOI from PDF: ${error.message}`);
      return null;
    }
  }

}
