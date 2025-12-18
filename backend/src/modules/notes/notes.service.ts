import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './note.entity';
import { Paper } from '../papers/paper.entity';
import { CreateNoteDto, UpdateNoteDto } from './dto/note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(Paper)
    private papersRepository: Repository<Paper>,
  ) {}

  async create(createNoteDto: CreateNoteDto): Promise<Note> {
    const note = this.notesRepository.create({
      ...createNoteDto,
    });
    return await this.notesRepository.save(note);
  }

  async findByPaper(paperId: number, userId?: number): Promise<Note[]> {
    // Verify paper exists and user owns it
    const paper = await this.papersRepository.findOne({
      where: { id: paperId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    // Check ownership
    if (userId && paper.addedBy !== userId) {
      throw new NotFoundException('Paper not found or you do not have access');
    }

    return await this.notesRepository.find({
      where: { paperId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, userId?: number): Promise<Note> {
    const note = await this.notesRepository.findOne({
      where: { id },
      relations: ['paper'],
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Check ownership via paper
    if (userId && note.paper.addedBy !== userId) {
      throw new NotFoundException('Note not found or you do not have access');
    }

    return note;
  }

  async update(id: number, updateNoteDto: UpdateNoteDto, userId?: number): Promise<Note> {
    const note = await this.findOne(id, userId);

    Object.assign(note, updateNoteDto);
    return await this.notesRepository.save(note);
  }

  async remove(id: number, userId?: number): Promise<void> {
    const note = await this.findOne(id, userId);
    await this.notesRepository.remove(note);
  }

  async findAll(): Promise<Note[]> {
    return await this.notesRepository.find({
      relations: ['paper'],
      order: { createdAt: 'DESC' },
    });
  }
}
