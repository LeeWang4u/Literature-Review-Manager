import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CitationsService } from './citations.service';
import { CreateCitationDto } from './dto/citation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('citations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('citations')
export class CitationsController {
  constructor(private readonly citationsService: CitationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a citation relationship' })
  @ApiResponse({ status: 201, description: 'Citation created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid citation (self-citation or already exists)' })
  create(@Req() req, @Body() createCitationDto: CreateCitationDto) {
    return this.citationsService.create(req.user.id, createCitationDto);
  }

  @Get('paper/:paperId')
  @ApiOperation({ summary: 'Get citations for a paper' })
  @ApiResponse({ status: 200, description: 'Return citing and cited papers' })
  findByPaper(@Param('paperId', ParseIntPipe) paperId: number, @Req() req) {
    return this.citationsService.findByPaper(paperId, req.user.id);
  }

  @Get('network/:paperId')
  @ApiOperation({ summary: 'Get citation network for D3.js visualization' })
  @ApiQuery({ name: 'depth', required: false, type: Number, description: 'Network depth (default: 2)' })
  @ApiResponse({ status: 200, description: 'Return nodes and edges for citation network' })
  getCitationNetwork(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Req() req,
    @Query('depth', new DefaultValuePipe(2), ParseIntPipe) depth: number,
  ) {
    return this.citationsService.getCitationNetwork(paperId, req.user.id, depth);
  }

  @Get('stats/:paperId')
  @ApiOperation({ summary: 'Get citation statistics' })
  @ApiResponse({ status: 200, description: 'Return citation counts' })
  getCitationStats(@Param('paperId', ParseIntPipe) paperId: number, @Req() req) {
    return this.citationsService.getCitationStats(paperId, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a citation' })
  @ApiResponse({ status: 200, description: 'Citation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Citation not found' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.citationsService.remove(id, req.user.id);
  }
}
