import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
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
  async create(@Body() createTagDto: CreateTagDto) {
    return await this.tagsService.create(createTagDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tags' })
  async findAll() {
    return await this.tagsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tag by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.tagsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tag' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateTagDto: UpdateTagDto) {
    return await this.tagsService.update(id, updateTagDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tag' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.tagsService.remove(id);
    return { message: 'Tag deleted successfully' };
  }
}
