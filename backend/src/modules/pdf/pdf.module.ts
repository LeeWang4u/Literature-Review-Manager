import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
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
    ConfigModule,
    forwardRef(() => PapersModule),
  ],
  controllers: [PdfController],
  providers: [PdfService, PdfTextExtractorService],
  exports: [PdfService],
})
export class PdfModule {}
