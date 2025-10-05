import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { CreateNoteDto, UpdateNoteDto } from './dto/note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new note' })
  @ApiResponse({ status: 201, description: 'Note created successfully' })
  create(@Req() req, @Body() createNoteDto: CreateNoteDto) {
    return this.notesService.create(req.user.id, createNoteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notes for current user' })
  @ApiResponse({ status: 200, description: 'Return all notes' })
  findAll(@Req() req) {
    return this.notesService.findAll(req.user.id);
  }

  @Get('paper/:paperId')
  @ApiOperation({ summary: 'Get all notes for a specific paper' })
  @ApiResponse({ status: 200, description: 'Return all notes for the paper' })
  findByPaper(@Param('paperId', ParseIntPipe) paperId: number, @Req() req) {
    return this.notesService.findByPaper(paperId, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a note by ID' })
  @ApiResponse({ status: 200, description: 'Return the note' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.notesService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a note' })
  @ApiResponse({ status: 200, description: 'Note updated successfully' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return this.notesService.update(id, req.user.id, updateNoteDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a note' })
  @ApiResponse({ status: 200, description: 'Note deleted successfully' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.notesService.remove(id, req.user.id);
  }
}
