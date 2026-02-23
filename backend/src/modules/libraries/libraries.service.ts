import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Library } from './library.entity';
import { LibraryPaper } from './library-paper.entity';
import { CreateLibraryDto } from './dto/create-library.dto';
import { UpdateLibraryDto } from './dto/update-library.dto';

@Injectable()
export class LibrariesService {
  constructor(
    @InjectRepository(Library)
    private librariesRepository: Repository<Library>,
    @InjectRepository(LibraryPaper)
    private libraryPapersRepository: Repository<LibraryPaper>,
  ) {}

  async createDefaultLibrary(userId: number): Promise<Library> {
    const existingDefault = await this.librariesRepository.findOne({
      where: { userId, isDefault: true },
    });

    if (existingDefault) {
      return existingDefault;
    }

    const defaultLibrary = this.librariesRepository.create({
      userId,
      name: 'My Library',
      description: 'Your default library',
      isDefault: true,
    });

    return this.librariesRepository.save(defaultLibrary);
  }

  async create(userId: number, createLibraryDto: CreateLibraryDto): Promise<Library> {
    const library = this.librariesRepository.create({
      ...createLibraryDto,
      userId,
      isDefault: false,
    });

    return this.librariesRepository.save(library);
  }

  async findAll(userId: number): Promise<Library[]> {
    return this.librariesRepository.find({
      where: { userId },
      order: {
        isDefault: 'DESC', // My Library first
        createdAt: 'ASC',  // Then by creation time
      },
    });
  }

  async findOne(id: number, userId: number): Promise<Library> {
    const library = await this.librariesRepository.findOne({
      where: { id, userId },
    });

    if (!library) {
      throw new NotFoundException('Library not found');
    }

    return library;
  }

  async update(id: number, userId: number, updateLibraryDto: UpdateLibraryDto): Promise<Library> {
    const library = await this.findOne(id, userId);

    if (library.isDefault && updateLibraryDto.name) {
      // Allow editing description but prevent renaming default library
      throw new ForbiddenException('Cannot rename the default library');
    }

    Object.assign(library, updateLibraryDto);
    return this.librariesRepository.save(library);
  }

  async remove(id: number, userId: number): Promise<void> {
    const library = await this.findOne(id, userId);

    if (library.isDefault) {
      throw new ForbiddenException('Cannot delete the default library');
    }

    await this.librariesRepository.remove(library);
  }

  async addPaperToLibrary(libraryId: number, paperId: number, userId: number): Promise<void> {
    const library = await this.findOne(libraryId, userId);

    // Check if paper already in library
    const existing = await this.libraryPapersRepository.findOne({
      where: { libraryId, paperId },
    });

    if (existing) {
      throw new BadRequestException('Paper already in this library');
    }

    const libraryPaper = this.libraryPapersRepository.create({
      libraryId,
      paperId,
    });

    await this.libraryPapersRepository.save(libraryPaper);
  }

  async removePaperFromLibrary(libraryId: number, paperId: number, userId: number): Promise<void> {
    const library = await this.findOne(libraryId, userId);

    const libraryPaper = await this.libraryPapersRepository.findOne({
      where: { libraryId, paperId },
    });

    if (!libraryPaper) {
      throw new NotFoundException('Paper not found in this library');
    }

    await this.libraryPapersRepository.remove(libraryPaper);
  }

  async getPapersInLibrary(libraryId: number, userId: number): Promise<number[]> {
    await this.findOne(libraryId, userId); // Verify access

    const libraryPapers = await this.libraryPapersRepository.find({
      where: { libraryId },
      select: ['paperId'],
    });

    return libraryPapers.map(lp => lp.paperId);
  }

  async getLibrariesForPaper(paperId: number, userId: number): Promise<Library[]> {
    const libraryPapers = await this.libraryPapersRepository.find({
      where: { paperId },
      relations: ['library'],
    });

    // Filter to only libraries owned by the user
    return libraryPapers
      .map(lp => lp.library)
      .filter(library => library.userId === userId);
  }

  async getLibraryStatistics(libraryId: number, userId: number): Promise<any> {
    await this.findOne(libraryId, userId); // Verify access

    // Get all paper IDs in this library
    const libraryPapers = await this.libraryPapersRepository.find({
      where: { libraryId },
      relations: ['paper'],
    });

    const papers = libraryPapers.map(lp => lp.paper).filter(p => p); // Filter out null papers

    // Calculate statistics
    const total = papers.length;
    const favorites = papers.filter(p => p.favorite).length;
    const byStatus = {
      to_read: papers.filter(p => p.status === 'to_read').length,
      reading: papers.filter(p => p.status === 'reading').length,
      completed: papers.filter(p => p.status === 'completed').length,
    };

    return {
      total,
      favorites,
      byStatus,
    };
  }
}
