import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { UserLibrary } from './user-library.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserLibrary])],
  controllers: [LibraryController],
  providers: [LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}
