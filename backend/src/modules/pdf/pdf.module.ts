import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { PdfTextExtractorService } from './pdf-text-extractor.service';
import { PdfFile } from './pdf-file.entity';
import { Paper } from '../papers/paper.entity';
import { PapersModule } from '../papers/papers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PdfFile, Paper]),
    MulterModule.register({
      dest: './uploads',
    }),
    PapersModule,
  ],
  controllers: [PdfController],
  providers: [PdfService, PdfTextExtractorService],
  exports: [PdfService],
})
export class PdfModule {}
