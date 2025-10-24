import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paper } from './paper.entity';
import { Citation } from '../citations/citation.entity';
import { PapersService } from './papers.service';
import { PapersController } from './papers.controller';
import { PaperMetadataService } from './paper-metadata.service';
import { CitationsModule } from '../citations/citations.module';

@Module({
  imports: [TypeOrmModule.forFeature([Paper])
    ,CitationsModule],
  providers: [PapersService, PaperMetadataService],
  controllers: [PapersController],
  exports: [PapersService],
})
export class PapersModule { }
