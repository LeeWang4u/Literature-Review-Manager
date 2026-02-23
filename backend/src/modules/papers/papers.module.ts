import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paper } from './paper.entity';
import { Citation } from '../citations/citation.entity';
import { Note } from '../notes/note.entity';
import { PapersService } from './papers.service';
import { PapersController } from './papers.controller';
import { PaperMetadataService } from './paper-metadata.service';
import { CitationsModule } from '../citations/citations.module';
import { PdfModule } from '../pdf/pdf.module';
import { SummariesModule } from '../summaries/summaries.module';
import { LibrariesModule } from '../libraries/libraries.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Paper, Citation, Note]),
    CitationsModule,
    SummariesModule,
    LibrariesModule,
    forwardRef(() => PdfModule),
  ],
  providers: [PapersService, PaperMetadataService],
  controllers: [PapersController],
  exports: [PapersService],
})
export class PapersModule { }
