import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLibrary, LibraryStatus } from './user-library.entity';
import { AddToLibraryDto, UpdateLibraryStatusDto, RatePaperDto } from './dto/library.dto';
import { Paper } from '../papers/paper.entity';


export interface StatusDefinition {
  key: string;
  label: string;
  color: 'default' | 'primary' | 'success' | 'warning';
}

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(UserLibrary)
    private libraryRepository: Repository<UserLibrary>,
    @InjectRepository(Paper) // Cần Paper repository để cập nhật
    private paperRepository: Repository<Paper>,
  ) {}

  getStatuses(): StatusDefinition[] {
    return this.statuses;
  }

  private readonly statuses: StatusDefinition[] = [
    { key: 'to_read', label: 'To Read', color: 'default' },
    { key: 'reading', label: 'Reading', color: 'primary' },
    { key: 'completed', label: 'Completed', color: 'success' },
    { key: 'favorites', label: 'Favorites', color: 'warning' },
  ];

  

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
      // status: addToLibraryDto.status || LibraryStatus.TO_READ,
    });

    return await this.libraryRepository.save(libraryItem);
  }

  // async getUserLibrary(userId: number, status?: 'to_read' | 'reading' | 'completed'): Promise<UserLibrary[]> {
  //   const query = this.libraryRepository
  //     .createQueryBuilder('library')
  //     .innerJoinAndSelect('library.paper', 'paper') // Dùng innerJoin để đảm bảo paper tồn tại
  //     .leftJoinAndSelect('paper.tags', 'tags')
  //     .where('library.userId = :userId', { userId });

  //   // Lọc trực tiếp trên cột status của bảng 'papers'
  //   if (status) {
  //     query.andWhere('paper.status = :status', { status });
  //   }

  //   query.orderBy('library.addedAt', 'DESC');
  //   return await query.getMany();
  // }

  async updateStatus(id: number, userId: number, updateStatusDto: UpdateLibraryStatusDto): Promise<UserLibrary> {
    // 1. Tìm mục trong thư viện của người dùng và load cả 'paper' liên quan
    const libraryItem = await this.libraryRepository.findOne({
      where: { id, userId },
      relations: ['paper'], // Quan trọng: Phải load cả paper
    });

    if (!libraryItem || !libraryItem.paper) {
      throw new NotFoundException('Library item or associated paper not found');
    }

    // 2. Cập nhật trạng thái trên chính thực thể paper
    // libraryItem.paper.status = updateStatusDto.status;

    // 3. Lưu lại sự thay đổi trên paper vào cơ sở dữ liệu
    await this.paperRepository.save(libraryItem.paper);
    
    // 4. Trả về libraryItem ban đầu để giữ nguyên API response contract
    return libraryItem;
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

  async removeFromLibraryByPaperId(userId: number, paperId: number): Promise<void> {
    const libraryItem = await this.libraryRepository.findOne({
      where: { userId, paperId },
    });

    if (!libraryItem) {
      // If not found, just return silently (paper not in library)
      return;
    }

    await this.libraryRepository.remove(libraryItem);
  }

  async getLibrary(userId: number): Promise<UserLibrary[]> {
    return this.libraryRepository.find({
      where: { userId },
      relations: ['paper', 'paper.tags'],
      order: { addedAt: 'DESC' },
    });
  }

//   async getUserLibrary(
//   userId: number,
//   filters: {
//     status?: 'to_read' | 'reading' | 'completed';
//     favorite?: boolean;
//   }
// ): Promise<UserLibrary[]> {
//   const query = this.libraryRepository
//     .createQueryBuilder('library')
//     .innerJoinAndSelect('library.paper', 'paper')
//     .leftJoinAndSelect('paper.tags', 'tags') 
//     .where('library.userId = :userId', { userId });

//   // Nếu có favorite flag, ưu tiên lấy theo favorite
//   if (filters.favorite !== undefined) {
//     const isFavorite = String(filters.favorite).toLowerCase() === 'true';
//     query.andWhere('paper.favorite = :favorite', { favorite: isFavorite });
//     // query.andWhere('paper.favorite = :favorite', { favorite: filters.favorite });
//   }
//   // Nếu không có favorite flag và có status, lọc theo status
//   else if (filters.status) {
//     query.andWhere('paper.status = :status', { status: filters.status });
//     // query.andWhere('library.status = :status', { status: filters.status });
//   }

//   // Sắp xếp theo thời gian thêm vào gần nhất
//   query.orderBy('library.addedAt', 'DESC');

//   return await query.getMany();
// }

  // async getStatistics(userId: number): Promise<{
  //   byStatus: Record<string, number>;
  //   favorites: number;
  //   total: number;
  // }> {
  //   // Lấy tất cả các item trong thư viện và join với paper
  //   const libraryItems = await this.libraryRepository.find({
  //     where: { userId },
  //     relations: ['paper'],
  //   });

  //   const byStatus: Record<string, number> = {
  //     to_read: 0,
  //     reading: 0,
  //     completed: 0,
  //   };
  //   let favorites = 0;

  //   for (const item of libraryItems) {
  //     if (item.paper) { // Kiểm tra paper có tồn tại không
  //       // Đếm dựa trên status của paper
  //       if (byStatus.hasOwnProperty(item.paper.status)) {
  //         byStatus[item.paper.status]++;
  //       }
  //       // Đếm dựa trên favorite của paper
  //       if (item.paper.favorite) {
  //         favorites++;
  //       }
  //     }
  //   }

  //   return {
  //     byStatus,
  //     favorites,
  //     total: libraryItems.length,
  //   };
  // }

  async getUserLibrary(
  userId: number,
  filters: {
    status?: 'to_read' | 'reading' | 'completed';
    favorite?: boolean | string; // Chấp nhận cả boolean và string
  }
): Promise<UserLibrary[]> {
  const query = this.libraryRepository
    .createQueryBuilder('library')
    .innerJoinAndSelect('library.paper', 'paper')
    .leftJoinAndSelect('paper.tags', 'tags')
    .where('library.userId = :userId', { userId });

  // 1. Áp dụng bộ lọc status nếu có
  if (filters.status) {
    query.andWhere('paper.status = :status', { status: filters.status });
  }

  // 2. Áp dụng bộ lọc favorite nếu có
  // NestJS thường tự động chuyển 'true'/'false' thành boolean, nhưng cách này an toàn hơn
  if (filters.favorite !== undefined && filters.favorite !== null) {
    const isFavorite = String(filters.favorite).toLowerCase() === 'true';
    query.andWhere('paper.favorite = :isFavorite', { isFavorite });
  }

  // Sắp xếp và trả về kết quả
  query.orderBy('library.addedAt', 'DESC');
  return await query.getMany();
}

async getStatistics(userId: number): Promise<{
    byStatus: Record<string, number>;
    favorites: number;
    total: number;
  }> {
    const baseQuery = this.libraryRepository
      .createQueryBuilder('library')
      .innerJoin('library.paper', 'paper')
      .where('library.userId = :userId', { userId });

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

  async toggleFavorite(libraryId: number, favorite: boolean, userId: number): Promise<UserLibrary> {
    const libraryItem = await this.libraryRepository.findOne({
      where: { id: libraryId, userId },
      relations: ['paper'], // Quan trọng: phải load cả paper
    });

    if (!libraryItem || !libraryItem.paper) {
      throw new NotFoundException('Library item or associated paper not found');
    }
    
    // Cập nhật favorite trên chính paper đó
    libraryItem.paper.favorite = favorite;
    await this.paperRepository.save(libraryItem.paper);
    
    return libraryItem;
  }

  async inLibrary(userId: number, paperId: number): Promise<boolean> {
    const count = await this.libraryRepository.count({
      where: { userId, paperId },
    });
    return count > 0;
  }

  
}
