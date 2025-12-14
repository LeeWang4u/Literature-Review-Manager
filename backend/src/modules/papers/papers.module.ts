import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paper } from './paper.entity';
import { Citation } from '../citations/citation.entity';
import { Note } from '../notes/note.entity';
import { PapersService } from './papers.service';
import { PapersController } from './papers.controller';
import { PaperMetadataService } from './paper-metadata.service';
import { CitationsModule } from '../citations/citations.module';
import { LibraryService } from '../library/library.service';
import { LibraryModule } from '../library/library.module';
import { PdfModule } from '../pdf/pdf.module';
import { SummariesModule } from '../summaries/summaries.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Paper, Citation, Note]),
    CitationsModule,
    LibraryModule,
    SummariesModule,
    forwardRef(() => PdfModule),
  ],
  providers: [PapersService, PaperMetadataService],
  controllers: [PapersController],
  exports: [PapersService],
})
export class PapersModule { }
