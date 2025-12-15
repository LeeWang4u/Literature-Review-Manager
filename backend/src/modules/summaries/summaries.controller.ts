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
import { SuggestTagsFromTextDto } from './dto/suggest-tags-from-text.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('summaries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('summaries')
export class SummariesController {
  constructor(private readonly summariesService: SummariesService) {}

  @Post('generate/:paperId')
  @ApiOperation({ 
    summary: 'Generate AI summary for a paper',
    description: 'Generate summary using Gemini AI. Supports provider selection (gemini).'
  })
  @ApiResponse({ status: 201, description: 'Summary generated successfully' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  @ApiResponse({ status: 400, description: 'Invalid request or API not configured' })
  generateSummary(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Req() req,
    @Body() generateSummaryDto: GenerateSummaryDto,
  ) {
    return this.summariesService.generateSummary(
      paperId,
      req.user.id,
      generateSummaryDto.forceRegenerate || false,
      generateSummaryDto.provider || 'gemini',
      generateSummaryDto.maxKeyFindings || 5,
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

  @Post('suggest-tags/:paperId')
  @ApiOperation({ 
    summary: 'Suggest tags for a paper using AI',
    description: 'Generate relevant tag suggestions based on paper title, abstract, and keywords using Gemini AI.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tag suggestions generated successfully',
    schema: {
      example: {
        suggested: ['Machine Learning', 'Computer Vision', 'Deep Learning'],
        confidence: 0.92
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  suggestTags(@Param('paperId', ParseIntPipe) paperId: number, @Req() req) {
    return this.summariesService.suggestTags(paperId, req.user.id);
  }

  @Post('suggest-tags-from-text')
  @ApiOperation({ 
    summary: 'Suggest tags from text without paper ID',
    description: 'Generate relevant tag suggestions based on title and abstract directly, without requiring a saved paper. Useful for pre-save tag suggestions.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tag suggestions generated successfully',
    schema: {
      example: {
        suggested: ['Machine Learning', 'Computer Vision', 'Deep Learning'],
        confidence: 0.92
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  suggestTagsFromText(@Body() dto: SuggestTagsFromTextDto, @Req() req) {
    return this.summariesService.suggestTagsFromText(
      dto.title,
      dto.abstract,
      dto.authors,
      dto.keywords
    );
  }
}
