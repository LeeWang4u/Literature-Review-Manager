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



  async getUserLibrary(
  userId: number,
  filters: {
    status?: 'to_read' | 'reading' | 'completed';
    favorite?: boolean | string; // Chấp nhận cả boolean và string
    page?: number; // Tham số trang
    pageSize?: number;
    search?: string // Số lượng mục trên mỗi trang
  }
): Promise<{ items: UserLibrary[]; total: number }> {

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 10;

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


    if (filters.search) {
      query.andWhere(
        '(paper.title LIKE :search OR paper.abstract LIKE :search OR paper.keywords LIKE :search OR paper.authors LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }


  // Sắp xếp và trả về kết quả
  query.orderBy('library.addedAt', 'DESC');

  query.skip((page - 1) * pageSize); // Bỏ qua số lượng mục đã có
  query.take(pageSize); // Lấy số lượng mục theo pageSize

  // return await query.getMany();
  const [items, total] = await query.getManyAndCount();
  return { items, total };
}

  async countByStatusInLibrary(userId: number): Promise<Record<'to_read' | 'reading' | 'completed', number>> {
    const statuses: Array<'to_read' | 'reading' | 'completed'> = ['to_read', 'reading', 'completed'];

    const baseQuery = this.libraryRepository
      .createQueryBuilder('library')
      .innerJoin('library.paper', 'paper')
      .where('library.userId = :userId', { userId })
      .andWhere('paper.isReference = :isReference', { isReference: false });

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

// async getUserLibrary(
//   userId: number,
//   filters: {
//     status?: 'to_read' | 'reading' | 'completed';
//     favorite?: boolean | string; // Chấp nhận cả boolean và string
//   },
//   page: number = 1, // Tham số trang, mặc định là 1
//   pageSize: number = 8 // Số lượng mục trên mỗi trang, mặc định là 8
// ): Promise<UserLibrary[]> {
//   const query = this.libraryRepository
//     .createQueryBuilder('library')
//     .innerJoinAndSelect('library.paper', 'paper')
//     .leftJoinAndSelect('paper.tags', 'tags')
//     .where('library.userId = :userId', { userId });

//   // 1. Áp dụng bộ lọc status nếu có
//   if (filters.status) {
//     query.andWhere('paper.status = :status', { status: filters.status });
//   }

//   // 2. Áp dụng bộ lọc favorite nếu có
//   if (filters.favorite !== undefined && filters.favorite !== null) {
//     const isFavorite = String(filters.favorite).toLowerCase() === 'true';
//     query.andWhere('paper.favorite = :isFavorite', { isFavorite });
//   }

//   // 3. Sắp xếp
//   query.orderBy('library.addedAt', 'DESC');

//   // 4. Phân trang
//   query.skip((page - 1) * pageSize); // Bỏ qua số lượng mục đã có
//   query.take(pageSize); // Lấy số lượng mục theo pageSize

//   return await query.getMany();
// }

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
