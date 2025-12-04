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

  async create(createNoteDto: CreateNoteDto): Promise<Note> {
    const note = this.notesRepository.create({
      ...createNoteDto,
    });
    return await this.notesRepository.save(note);
  }

  async findByPaper(paperId: number): Promise<Note[]> {
    return await this.notesRepository.find({
      where: { paperId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Note> {
    const note = await this.notesRepository.findOne({
      where: { id },
      relations: ['paper'],
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  async update(id: number, updateNoteDto: UpdateNoteDto): Promise<Note> {
    const note = await this.findOne(id);

    Object.assign(note, updateNoteDto);
    return await this.notesRepository.save(note);
  }

  async remove(id: number): Promise<void> {
    const note = await this.findOne(id);
    await this.notesRepository.remove(note);
  }

  async findAll(): Promise<Note[]> {
    return await this.notesRepository.find({
      relations: ['paper'],
      order: { createdAt: 'DESC' },
    });
  }
}
