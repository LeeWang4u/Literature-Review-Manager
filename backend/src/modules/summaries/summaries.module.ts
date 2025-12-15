import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SummariesController } from './summaries.controller';
import { SummariesService } from './summaries.service';
import { AIProviderService } from './ai-provider.service';
import { AiSummary } from './ai-summary.entity';
import { Paper } from '../papers/paper.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiSummary, Paper])],
  controllers: [SummariesController],
  providers: [SummariesService, AIProviderService],
  exports: [SummariesService, AIProviderService],
})
export class SummariesModule {}
