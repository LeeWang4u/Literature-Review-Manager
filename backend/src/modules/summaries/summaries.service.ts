import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiSummary } from './ai-summary.entity';
import { Paper } from '../papers/paper.entity';

@Injectable()
export class SummariesService {
  constructor(
    @InjectRepository(AiSummary)
    private summariesRepository: Repository<AiSummary>,
    @InjectRepository(Paper)
    private papersRepository: Repository<Paper>,
  ) {}

  async generateSummary(paperId: number, userId: number, forceRegenerate: boolean = false): Promise<AiSummary> {
    // Verify paper exists and belongs to user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    // Check if summary already exists
    const existingSummary = await this.summariesRepository.findOne({
      where: { paperId },
    });

    if (existingSummary && !forceRegenerate) {
      return existingSummary;
    }

    // TODO: Integrate with OpenAI API for actual summary generation
    // For now, create a placeholder summary
    const summaryText = this.generatePlaceholderSummary(paper);
    const keyFindings = this.extractPlaceholderKeyFindings(paper);

    if (existingSummary) {
      // Update existing summary
      existingSummary.summary = summaryText;
      existingSummary.keyFindings = keyFindings;
      existingSummary.generatedAt = new Date();
      return await this.summariesRepository.save(existingSummary);
    } else {
      // Create new summary
      const summary = this.summariesRepository.create({
        paperId,
        summary: summaryText,
        keyFindings,
      });
      return await this.summariesRepository.save(summary);
    }
  }

  async getSummary(paperId: number, userId: number): Promise<AiSummary> {
    // Verify paper belongs to user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    const summary = await this.summariesRepository.findOne({
      where: { paperId },
      relations: ['paper'],
    });

    if (!summary) {
      throw new NotFoundException('Summary not found. Please generate it first.');
    }

    return summary;
  }

  async deleteSummary(paperId: number, userId: number): Promise<void> {
    // Verify paper belongs to user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    const summary = await this.summariesRepository.findOne({
      where: { paperId },
    });

    if (!summary) {
      throw new NotFoundException('Summary not found');
    }

    await this.summariesRepository.remove(summary);
  }

  // Placeholder methods - Replace with actual AI integration
  private generatePlaceholderSummary(paper: Paper): string {
    const keywords = paper.keywords?.split(',').slice(0, 3).join(', ') || 'various topics';
    return `This is an AI-generated summary of "${paper.title}". 
    
The paper, published in ${paper.publicationYear}, presents research on ${keywords}.

Abstract: ${paper.abstract}

This summary is a placeholder. Integrate with OpenAI API for actual AI-generated summaries.`;
  }

  private extractPlaceholderKeyFindings(paper: Paper): string[] {
    return [
      'Key finding 1: (Placeholder - integrate with OpenAI API)',
      'Key finding 2: (Placeholder - integrate with OpenAI API)',
      'Key finding 3: (Placeholder - integrate with OpenAI API)',
    ];
  }

  // TODO: Add method to integrate with OpenAI API
  // private async callOpenAI(prompt: string): Promise<string> {
  //   // Use OpenAI SDK to generate summary
  // }
}
