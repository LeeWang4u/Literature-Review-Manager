import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './tag.entity';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
  ) { }

  async create(createTagDto: CreateTagDto, userId: number): Promise<Tag> {
    const existing = await this.tagsRepository.findOne({
      where: { name: createTagDto.name },
    });

    if (existing) {
      throw new ConflictException('Tag name already exists');
    }

    const { ...tagData } = createTagDto;

    const tag = this.tagsRepository.create(
      { ...tagData, owner: userId }
    );
    return await this.tagsRepository.save(tag);
  }

  async findAll(userId: number): Promise<Tag[]> {
    const tags = await this.tagsRepository
      .createQueryBuilder('tag')
      .where('tag.owner = :userId', { userId })
      .orderBy('tag.name', 'ASC')
      .getMany();
    return tags;
  }

  async findOne(id: number): Promise<Tag> {
    const tag = await this.tagsRepository.findOne({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }
    return tag;
  }

  async update(id: number, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findOne(id);
    Object.assign(tag, updateTagDto);
    return await this.tagsRepository.save(tag);
  }

  async remove(id: number): Promise<void> {
    const tag = await this.findOne(id);
    await this.tagsRepository.remove(tag);
  }
}
