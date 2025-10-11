import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Paper } from './paper.entity';
import { CreatePaperDto } from './dto/create-paper.dto';
import { UpdatePaperDto } from './dto/update-paper.dto';
import { SearchPaperDto } from './dto/search-paper.dto';
import { UpdatePaperStatusDto } from './dto/update-paper-status.dto';

@Injectable()
export class PapersService {
  constructor(
    @InjectRepository(Paper)
    private papersRepository: Repository<Paper>,
  ) { }

  async create(createPaperDto: CreatePaperDto, userId: number): Promise<Paper> {
    const { tagIds, ...paperData } = createPaperDto;

    const paper = this.papersRepository.create({
      ...paperData,
      addedBy: userId,
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

    return await this.findOne(savedPaper.id);
  }

  async findAll(searchDto: SearchPaperDto): Promise<{ data: Paper[]; meta: any }> {
    const { page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = searchDto;

    const query = this.papersRepository
      .createQueryBuilder('paper')
      .leftJoinAndSelect('paper.tags', 'tags')
      .leftJoinAndSelect('paper.user', 'user');

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

}
