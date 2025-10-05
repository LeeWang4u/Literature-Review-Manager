import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paper } from './paper.entity';
import { PapersService } from './papers.service';
import { PapersController } from './papers.controller';
import { PaperMetadataService } from './paper-metadata.service';

@Module({
  imports: [TypeOrmModule.forFeature([Paper])],
  providers: [PapersService, PaperMetadataService],
  controllers: [PapersController],
  exports: [PapersService],
})
export class PapersModule {}
