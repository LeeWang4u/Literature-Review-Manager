import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLibrary, LibraryStatus } from './user-library.entity';
import { AddToLibraryDto, UpdateLibraryStatusDto, RatePaperDto } from './dto/library.dto';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(UserLibrary)
    private libraryRepository: Repository<UserLibrary>,
  ) {}

  async addToLibrary(userId: number, addToLibraryDto: AddToLibraryDto): Promise<UserLibrary> {
    // Check if paper already in library
    const existing = await this.libraryRepository.findOne({
      where: {
        userId,
        paperId: addToLibraryDto.paperId,
      },
    });

    if (existing) {
      throw new ConflictException('Paper already in your library');
    }

    const libraryItem = this.libraryRepository.create({
      userId,
      paperId: addToLibraryDto.paperId,
      status: addToLibraryDto.status || LibraryStatus.TO_READ,
    });

    return await this.libraryRepository.save(libraryItem);
  }

  async getUserLibrary(userId: number, status?: LibraryStatus): Promise<UserLibrary[]> {
    const query = this.libraryRepository
      .createQueryBuilder('library')
      .leftJoinAndSelect('library.paper', 'paper')
      .leftJoinAndSelect('paper.tags', 'tags')
      .where('library.userId = :userId', { userId });

    if (status) {
      query.andWhere('library.status = :status', { status });
    }

    query.orderBy('library.addedAt', 'DESC');

    return await query.getMany();
  }

  async updateStatus(id: number, userId: number, updateStatusDto: UpdateLibraryStatusDto): Promise<UserLibrary> {
    const libraryItem = await this.libraryRepository.findOne({
      where: { id, userId },
    });

    if (!libraryItem) {
      throw new NotFoundException('Library item not found');
    }

    libraryItem.status = updateStatusDto.status;
    return await this.libraryRepository.save(libraryItem);
  }

  async ratePaper(id: number, userId: number, ratePaperDto: RatePaperDto): Promise<UserLibrary> {
    const libraryItem = await this.libraryRepository.findOne({
      where: { id, userId },
    });

    if (!libraryItem) {
      throw new NotFoundException('Library item not found');
    }

    libraryItem.rating = ratePaperDto.rating;
    return await this.libraryRepository.save(libraryItem);
  }

  async removeFromLibrary(id: number, userId: number): Promise<void> {
    const libraryItem = await this.libraryRepository.findOne({
      where: { id, userId },
    });

    if (!libraryItem) {
      throw new NotFoundException('Library item not found');
    }

    await this.libraryRepository.remove(libraryItem);
  }

  async getStatistics(userId: number) {
    const total = await this.libraryRepository.count({ where: { userId } });
    
    const byStatus = await this.libraryRepository
      .createQueryBuilder('library')
      .select('library.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('library.userId = :userId', { userId })
      .groupBy('library.status')
      .getRawMany();

    const avgRating = await this.libraryRepository
      .createQueryBuilder('library')
      .select('AVG(library.rating)', 'avgRating')
      .where('library.userId = :userId', { userId })
      .andWhere('library.rating IS NOT NULL')
      .getRawOne();

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      averageRating: avgRating.avgRating ? parseFloat(avgRating.avgRating).toFixed(2) : null,
    };
  }
}
