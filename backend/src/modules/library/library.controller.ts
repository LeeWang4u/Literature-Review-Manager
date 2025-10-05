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
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LibraryService } from './library.service';
import { AddToLibraryDto, UpdateLibraryStatusDto, RatePaperDto } from './dto/library.dto';
import { LibraryStatus } from './user-library.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('library')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Post('add')
  @ApiOperation({ summary: 'Add a paper to user library' })
  @ApiResponse({ status: 201, description: 'Paper added to library' })
  @ApiResponse({ status: 409, description: 'Paper already in library' })
  addToLibrary(@Req() req, @Body() addToLibraryDto: AddToLibraryDto) {
    return this.libraryService.addToLibrary(req.user.id, addToLibraryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user library' })
  @ApiQuery({ name: 'status', enum: LibraryStatus, required: false })
  @ApiResponse({ status: 200, description: 'Return user library' })
  getUserLibrary(@Req() req, @Query('status') status?: LibraryStatus) {
    return this.libraryService.getUserLibrary(req.user.id, status);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get library statistics' })
  @ApiResponse({ status: 200, description: 'Return library statistics' })
  getStatistics(@Req() req) {
    return this.libraryService.getStatistics(req.user.id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update reading status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Library item not found' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Body() updateStatusDto: UpdateLibraryStatusDto,
  ) {
    return this.libraryService.updateStatus(id, req.user.id, updateStatusDto);
  }

  @Put(':id/rating')
  @ApiOperation({ summary: 'Rate a paper' })
  @ApiResponse({ status: 200, description: 'Rating updated successfully' })
  @ApiResponse({ status: 404, description: 'Library item not found' })
  ratePaper(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Body() ratePaperDto: RatePaperDto,
  ) {
    return this.libraryService.ratePaper(id, req.user.id, ratePaperDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove paper from library' })
  @ApiResponse({ status: 200, description: 'Paper removed from library' })
  @ApiResponse({ status: 404, description: 'Library item not found' })
  removeFromLibrary(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.libraryService.removeFromLibrary(id, req.user.id);
  }
}
