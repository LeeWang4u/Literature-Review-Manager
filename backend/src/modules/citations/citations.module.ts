import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CitationsController } from './citations.controller';
import { CitationsService } from './citations.service';
import { Citation } from './citation.entity';
import { Paper } from '../papers/paper.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Citation, Paper]),
    ConfigModule,
  ],
  
  controllers: [CitationsController],
  providers: [CitationsService],
  // exports: [CitationsService],
   exports: [CitationsService, TypeOrmModule],
})
export class CitationsModule {}
