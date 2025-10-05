import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './note.entity';
import { CreateNoteDto, UpdateNoteDto } from './dto/note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
  ) {}

  async create(userId: number, createNoteDto: CreateNoteDto): Promise<Note> {
    const note = this.notesRepository.create({
      ...createNoteDto,
      userId,
    });
    return await this.notesRepository.save(note);
  }

  async findByPaper(paperId: number, userId: number): Promise<Note[]> {
    return await this.notesRepository.find({
      where: { paperId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, userId: number): Promise<Note> {
    const note = await this.notesRepository.findOne({
      where: { id, userId },
      relations: ['paper'],
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  async update(id: number, userId: number, updateNoteDto: UpdateNoteDto): Promise<Note> {
    const note = await this.findOne(id, userId);

    Object.assign(note, updateNoteDto);
    return await this.notesRepository.save(note);
  }

  async remove(id: number, userId: number): Promise<void> {
    const note = await this.findOne(id, userId);
    await this.notesRepository.remove(note);
  }

  async findAll(userId: number): Promise<Note[]> {
    return await this.notesRepository.find({
      where: { userId },
      relations: ['paper'],
      order: { createdAt: 'DESC' },
    });
  }
}
