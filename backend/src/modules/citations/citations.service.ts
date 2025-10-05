import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Citation } from './citation.entity';
import { Paper } from '../papers/paper.entity';
import { CreateCitationDto } from './dto/citation.dto';

@Injectable()
export class CitationsService {
  constructor(
    @InjectRepository(Citation)
    private citationsRepository: Repository<Citation>,
    @InjectRepository(Paper)
    private papersRepository: Repository<Paper>,
  ) {}

  async create(userId: number, createCitationDto: CreateCitationDto): Promise<Citation> {
    const { citingPaperId, citedPaperId } = createCitationDto;

    // Prevent self-citation
    if (citingPaperId === citedPaperId) {
      throw new BadRequestException('A paper cannot cite itself');
    }

    // Check if both papers exist
    const citingPaper = await this.papersRepository.findOne({
      where: { id: citingPaperId, addedBy: userId },
    });

    const citedPaper = await this.papersRepository.findOne({
      where: { id: citedPaperId, addedBy: userId },
    });

    if (!citingPaper || !citedPaper) {
      throw new NotFoundException('One or both papers not found');
    }

    // Check if citation already exists
    const existing = await this.citationsRepository.findOne({
      where: { citingPaperId, citedPaperId },
    });

    if (existing) {
      throw new BadRequestException('Citation already exists');
    }

    const citation = this.citationsRepository.create({
      citingPaperId,
      citedPaperId,
      userId,
    });

    return await this.citationsRepository.save(citation);
  }

  async findByPaper(paperId: number, userId: number) {
    // Verify paper belongs to user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    // Papers that cite this paper
    const citing = await this.citationsRepository.find({
      where: { citedPaperId: paperId },
      relations: ['citingPaper'],
    });

    // Papers cited by this paper
    const citedBy = await this.citationsRepository.find({
      where: { citingPaperId: paperId },
      relations: ['citedPaper'],
    });

    return {
      citing: citing.map((c) => c.citingPaper),
      citedBy: citedBy.map((c) => c.citedPaper),
    };
  }

  async getCitationNetwork(paperId: number, userId: number, depth: number = 2) {
    // Verify paper belongs to user
    const rootPaper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!rootPaper) {
      throw new NotFoundException('Paper not found');
    }

    const visited = new Set<number>();
    const nodes = [];
    const edges = [];

    const traverse = async (currentPaperId: number, currentDepth: number) => {
      if (currentDepth > depth || visited.has(currentPaperId)) {
        return;
      }

      visited.add(currentPaperId);

      const paper = await this.papersRepository.findOne({
        where: { id: currentPaperId },
      });

      if (!paper) return;

      nodes.push({
        id: paper.id,
        title: paper.title,
        year: paper.publicationYear,
        authors: paper.authors,
      });

      // Get all citations for this paper (regardless of who created them)
      const citations = await this.citationsRepository.find({
        where: [
          { citingPaperId: currentPaperId },
          { citedPaperId: currentPaperId },
        ],
      });

      for (const citation of citations) {
        edges.push({
          source: citation.citingPaperId,
          target: citation.citedPaperId,
        });

        // Traverse connected papers
        if (citation.citingPaperId === currentPaperId) {
          await traverse(citation.citedPaperId, currentDepth + 1);
        } else {
          await traverse(citation.citingPaperId, currentDepth + 1);
        }
      }
    };

    await traverse(paperId, 0);

    return { nodes, edges };
  }

  async getCitationStats(paperId: number, userId: number) {
    // Verify paper belongs to user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    const citedByCount = await this.citationsRepository.count({
      where: { citedPaperId: paperId },
    });

    const citingCount = await this.citationsRepository.count({
      where: { citingPaperId: paperId },
    });

    return {
      citedBy: citedByCount,
      citing: citingCount,
    };
  }

  async remove(id: number, userId: number): Promise<void> {
    const citation = await this.citationsRepository.findOne({
      where: { id, createdById: userId },
    });

    if (!citation) {
      throw new NotFoundException('Citation not found');
    }

    await this.citationsRepository.remove(citation);
  }
}
