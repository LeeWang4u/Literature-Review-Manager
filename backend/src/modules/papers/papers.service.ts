import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Paper } from './paper.entity';
import { Citation } from '../citations/citation.entity';
import { CreatePaperDto } from './dto/create-paper.dto';
import { UpdatePaperDto } from './dto/update-paper.dto';
import { SearchPaperDto } from './dto/search-paper.dto';
import { UpdatePaperStatusDto } from './dto/update-paper-status.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { LibraryService } from '../library/library.service';
import { CitationsService } from '../citations/citations.service';

@Injectable()
export class PapersService {
  private readonly logger = new Logger(PapersService.name);
  
  constructor(
    @InjectRepository(Paper)
    private papersRepository: Repository<Paper>,

    @InjectRepository(Citation)
    private paperCitationsRepository: Repository<Citation>,

    private libraryService: LibraryService,
    private citationsService: CitationsService,
  ) { }




  async create(createPaperDto: CreatePaperDto, userId: number): Promise<{ success: boolean; message: string; data: Paper }> {
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

    // Xử lý references (nếu có)
    if (references && references.length > 0) {
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

      // Bước 3: Lưu citations và auto-rate selective
      for (const ref of references) {
        if ((!ref.title || ref.title.trim() === '') && (!ref.doi || ref.doi.trim() === '')) continue;

        // Clean and truncate title to fit database column (max 500 chars)
        let cleanTitle = ref.title ? ref.title.replace(/\\n/g, '\n') : '';
        if (cleanTitle.length > 500) {
          cleanTitle = cleanTitle.substring(0, 497) + '...';
        }
        const cleanDoi = ref.doi ? ref.doi.trim() : '';

        // Kiểm tra xem reference này đã tồn tại chưa (theo DOI)
        let refPaper: Paper | null = null;
        if (cleanDoi) {
          refPaper = await this.papersRepository.findOne({
            where: { doi: cleanDoi },
          });
        }

        // Nếu chưa có thì thêm mới, đánh dấu là reference
        if (!refPaper) {
          // Extract year from title if not provided
          let year: number | null = null;
          
          // Try to parse year from ref.year (could be number or string)
          if (ref.year) {
            if (typeof ref.year === 'number') {
              year = ref.year;
            } else {
              const yearStr = String(ref.year).trim();
              if (yearStr !== '') {
                const parsed = parseInt(yearStr);
                if (!isNaN(parsed)) {
                  year = parsed;
                }
              }
            }
          }
          
          // If still no year, extract from title
          if (!year && ref.title) {
            const yearMatch = ref.title.match(/\((\d{4})\)/g);
            if (yearMatch && yearMatch.length > 0) {
              const lastYear = yearMatch[yearMatch.length - 1];
              const extractedYear = parseInt(lastYear.replace(/[()]/g, ''));
              if (extractedYear >= 1900 && extractedYear <= new Date().getFullYear() + 1) {
                year = extractedYear;
                this.logger.log(`Extracted year ${year} from title: "${ref.title.substring(0, 60)}..."`);
              }
            }
          }
          
          this.logger.log(`Creating new reference paper: ${cleanTitle}, year: ${year}`);
          refPaper = this.papersRepository.create({
            title: cleanTitle || '',
            authors: ref.authors || '',
            publicationYear: year,
            doi: ref.doi || '',
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
          // Lưu quan hệ trích dẫn với metadata
          const newCitation = await this.paperCitationsRepository.save({
            citingPaperId: savedPaper.id,
            citedPaperId: refPaper.id,
            createdById: userId,
            citationContext: ref.citationContext || null,
            relevanceScore: ref.relevanceScore || null,
            isInfluential: ref.isInfluential || false,
          });

          // Chỉ auto-rate nếu reference nằm trong top priority
          const refIdentifier = ref.doi || ref.title;
          if (refsToAutoRate.has(refIdentifier)) {
            // Tự động đánh giá mức độ liên quan bằng AI (chạy async, không chờ)
            this.citationsService.autoRateRelevance(newCitation.id, userId).catch(err => {
              console.error(`Failed to auto-rate citation ${newCitation.id}:`, err.message);
            });
          }
        }
      }
    }

    const addToLibraryDto = {
      paperId: savedPaper.id,
    }

    await this.libraryService.addToLibrary(userId, addToLibraryDto);


    return {
      success: true,
      message: 'Paper created successfully',
      data: await this.findOne(savedPaper.id)
    };
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

}
