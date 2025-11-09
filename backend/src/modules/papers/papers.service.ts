import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

@Injectable()
export class PapersService {
  constructor(
    @InjectRepository(Paper)
    private papersRepository: Repository<Paper>,

    @InjectRepository(Citation)
    private paperCitationsRepository: Repository<Citation>,

    private libraryService: LibraryService,
  ) { }




  async create(createPaperDto: CreatePaperDto, userId: number): Promise<{ success: boolean; message: string; data: Paper }> {
    const { tagIds, references, ...paperData } = createPaperDto;


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
      for (const ref of references) {
        // Bỏ qua những ref không có DOI
        // if (!ref.doi || ref.doi.trim() === '') continue;
        if ((!ref.title || ref.title.trim() === '') && (!ref.doi || ref.doi.trim() === '')) continue;

        const cleanTitle = ref.title ? ref.title.replace(/\\n/g, '\n') : '';
        const cleanDoi = ref.doi ? ref.doi.trim() : '';


        // Kiểm tra xem reference này đã tồn tại chưa (theo DOI)
        // let refPaper = await this.papersRepository.findOne({
        //   where: { doi: ref.doi },
        // });
        // Chỉ kiểm tra trong DB nếu có DOI
        let refPaper: Paper | null = null;
        if (cleanDoi) {
          refPaper = await this.papersRepository.findOne({
            where: { doi: cleanDoi },
          });
        }

        // Nếu chưa có thì thêm mới, đánh dấu là reference
        if (!refPaper) {
          refPaper = this.papersRepository.create({
            title: cleanTitle || '',
            doi: ref.doi || '',
            isReference: true,
            addedBy: userId,  // Optional: Set addedBy cho refPaper nếu cần, giả sử user cũng "add" ref
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
          // Lưu quan hệ trích dẫn
          await this.paperCitationsRepository.save({
            citingPaperId: savedPaper.id,
            citedPaperId: refPaper.id,
            createdById: userId,  // Sửa: Set createdById required
            // citationContext: 'some context if available',  // Nếu DTO có, set ở đây; hiện null ok
          });
        }
        // Nếu duplicate, bỏ qua hoặc log, tùy bạn
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
      throw new NotFoundException(`Paper with ID ${id} not found`);
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
