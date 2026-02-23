import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibrariesController } from './libraries.controller';
import { LibrariesService } from './libraries.service';
import { Library } from './library.entity';
import { LibraryPaper } from './library-paper.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Library, LibraryPaper])],
  controllers: [LibrariesController],
  providers: [LibrariesService],
  exports: [LibrariesService],
})
export class LibrariesModule {}
