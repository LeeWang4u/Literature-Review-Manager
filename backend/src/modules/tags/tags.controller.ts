import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';


@ApiTags('Tags')
@Controller('tags')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TagsController {
  constructor(private tagsService: TagsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tag' })
  async create(@Body() createTagDto: CreateTagDto, @Request() req) {
    return await this.tagsService.create(createTagDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tags' })
  async findAll(@Request() req) {
    return await this.tagsService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tag by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return await this.tagsService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tag' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateTagDto: UpdateTagDto, @Request() req) {
    return await this.tagsService.update(id, updateTagDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tag' })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    await this.tagsService.remove(id, req.user.id);
    return { message: 'Tag deleted successfully' };
  }
}
