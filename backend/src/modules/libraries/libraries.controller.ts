import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { LibrariesService } from './libraries.service';
import { CreateLibraryDto } from './dto/create-library.dto';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { AddPaperToLibraryDto } from './dto/add-paper-to-library.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('libraries')
@UseGuards(JwtAuthGuard)
export class LibrariesController {
  constructor(private readonly librariesService: LibrariesService) {}

  @Post()
  create(@Request() req, @Body() createLibraryDto: CreateLibraryDto) {
    return this.librariesService.create(req.user.id, createLibraryDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.librariesService.findAll(req.user.id);
  }

  @Post('ensure-default')
  ensureDefaultLibrary(@Request() req) {
    return this.librariesService.createDefaultLibrary(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.librariesService.findOne(id, req.user.id);
  }

  @Put(':id')
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLibraryDto: UpdateLibraryDto,
  ) {
    return this.librariesService.update(id, req.user.id, updateLibraryDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.librariesService.remove(id, req.user.id);
  }

  @Post(':id/papers')
  addPaper(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() addPaperDto: AddPaperToLibraryDto,
  ) {
    return this.librariesService.addPaperToLibrary(id, addPaperDto.paperId, req.user.id);
  }

  @Delete(':id/papers/:paperId')
  removePaper(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('paperId', ParseIntPipe) paperId: number,
  ) {
    return this.librariesService.removePaperFromLibrary(id, paperId, req.user.id);
  }

  @Get(':id/papers')
  getPapers(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.librariesService.getPapersInLibrary(id, req.user.id);
  }

  @Get(':id/statistics')
  getStatistics(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.librariesService.getLibraryStatistics(id, req.user.id);
  }

  @Get('papers/:paperId/libraries')
  getLibrariesForPaper(
    @Request() req,
    @Param('paperId', ParseIntPipe) paperId: number,
  ) {
    return this.librariesService.getLibrariesForPaper(paperId, req.user.id);
  }
}
