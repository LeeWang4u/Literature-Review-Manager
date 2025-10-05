import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SummariesService } from './summaries.service';
import { GenerateSummaryDto } from './dto/summary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('summaries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('summaries')
export class SummariesController {
  constructor(private readonly summariesService: SummariesService) {}

  @Post('generate/:paperId')
  @ApiOperation({ summary: 'Generate AI summary for a paper' })
  @ApiResponse({ status: 201, description: 'Summary generated successfully' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  generateSummary(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Req() req,
    @Body() generateSummaryDto: GenerateSummaryDto,
  ) {
    return this.summariesService.generateSummary(
      paperId,
      req.user.id,
      generateSummaryDto.forceRegenerate || false,
    );
  }

  @Get(':paperId')
  @ApiOperation({ summary: 'Get AI summary for a paper' })
  @ApiResponse({ status: 200, description: 'Return summary' })
  @ApiResponse({ status: 404, description: 'Summary not found' })
  getSummary(@Param('paperId', ParseIntPipe) paperId: number, @Req() req) {
    return this.summariesService.getSummary(paperId, req.user.id);
  }

  @Delete(':paperId')
  @ApiOperation({ summary: 'Delete AI summary' })
  @ApiResponse({ status: 200, description: 'Summary deleted successfully' })
  @ApiResponse({ status: 404, description: 'Summary not found' })
  deleteSummary(@Param('paperId', ParseIntPipe) paperId: number, @Req() req) {
    return this.summariesService.deleteSummary(paperId, req.user.id);
  }
}
