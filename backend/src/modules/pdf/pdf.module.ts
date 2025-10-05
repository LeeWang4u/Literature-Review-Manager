import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { PdfFile } from './pdf-file.entity';
import { Paper } from '../papers/paper.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PdfFile, Paper]),
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [PdfController],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
