import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CitationsController } from './citations.controller';
import { CitationsService } from './citations.service';
import { CitationParserService } from './citation-parser.service';
import { CitationMetricsService } from './citation-metrics.service';
import { Citation } from './citation.entity';
import { Paper } from '../papers/paper.entity';
import { Note } from '../notes/note.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Citation, Paper, Note]),
    ConfigModule,
  ],
  
  controllers: [CitationsController],
  providers: [CitationsService, CitationParserService, CitationMetricsService],
  exports: [CitationsService, CitationParserService, CitationMetricsService, TypeOrmModule],
})
export class CitationsModule {}
