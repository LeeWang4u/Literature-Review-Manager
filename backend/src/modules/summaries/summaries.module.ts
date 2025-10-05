import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SummariesController } from './summaries.controller';
import { SummariesService } from './summaries.service';
import { AiSummary } from './ai-summary.entity';
import { Paper } from '../papers/paper.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiSummary, Paper])],
  controllers: [SummariesController],
  providers: [SummariesService],
  exports: [SummariesService],
})
export class SummariesModule {}
