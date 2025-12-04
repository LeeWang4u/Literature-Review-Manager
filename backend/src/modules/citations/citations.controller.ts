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
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CitationsService } from './citations.service';
import { CitationParserService } from './citation-parser.service';
import { CreateCitationDto } from './dto/citation.dto';
import { UpdateCitationDto } from './dto/update-citation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('citations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('citations')
export class CitationsController {
  constructor(
    private readonly citationsService: CitationsService,
    private readonly citationParserService: CitationParserService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a citation relationship' })
  @ApiResponse({ status: 201, description: 'Citation created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid citation (self-citation or already exists)' })
  create(@Body() createCitationDto: CreateCitationDto) {
    return this.citationsService.create(createCitationDto);
  }

  @Get('paper/:paperId')
  @ApiOperation({ summary: 'Get citations for a paper' })
  @ApiResponse({ status: 200, description: 'Return citing and cited papers' })
  findByPaper(@Param('paperId', ParseIntPipe) paperId: number) {
    return this.citationsService.findByPaper(paperId);
  }

  @Get('paper/:paperId/references')
  @ApiOperation({ summary: 'Get references (papers this paper cites)' })
  @ApiResponse({ status: 200, description: 'Return list of references with metadata' })
  getReferences(@Param('paperId', ParseIntPipe) paperId: number) {
    return this.citationsService.getReferences(paperId);
  }

  @Get('paper/:paperId/cited-by')
  @ApiOperation({ summary: 'Get citing papers (papers that cite this paper)' })
  @ApiResponse({ status: 200, description: 'Return list of citing papers with metadata' })
  getCitedBy(@Param('paperId', ParseIntPipe) paperId: number) {
    return this.citationsService.getCitedBy(paperId);
  }

  @Get('network/:paperId')
  @ApiOperation({ summary: 'Get citation network for D3.js visualization' })
  @ApiQuery({ name: 'depth', required: false, type: Number, description: 'Network depth (default: 2)' })
  @ApiResponse({ status: 200, description: 'Return nodes and edges for citation network' })
  getCitationNetwork(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Query('depth', new DefaultValuePipe(2), ParseIntPipe) depth: number,
  ) {
    return this.citationsService.getCitationNetwork(paperId, depth);
  }

  @Get('stats/:paperId')
  @ApiOperation({ summary: 'Get citation statistics' })
  @ApiResponse({ status: 200, description: 'Return citation counts' })
  getCitationStats(@Param('paperId', ParseIntPipe) paperId: number) {
    return this.citationsService.getCitationStats(paperId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update citation relevance and context' })
  @ApiResponse({ status: 200, description: 'Citation updated successfully' })
  @ApiResponse({ status: 404, description: 'Citation not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCitationDto: UpdateCitationDto,
  ) {
    return this.citationsService.update(id, updateCitationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a citation' })
  @ApiResponse({ status: 200, description: 'Citation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Citation not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.citationsService.remove(id);
  }

  @Post(':id/auto-rate')
  @ApiOperation({ summary: 'AI auto-rate citation relevance' })
  @ApiResponse({ status: 200, description: 'Citation rated successfully by AI' })
  @ApiResponse({ status: 400, description: 'AI service not available' })
  @ApiResponse({ status: 404, description: 'Citation not found' })
  autoRateRelevance(@Param('id', ParseIntPipe) id: number) {
    return this.citationsService.autoRateRelevance(id);
  }

  @Post('paper/:paperId/auto-rate-all')
  @ApiOperation({ summary: 'AI auto-rate all references for a paper' })
  @ApiResponse({ status: 200, description: 'All citations rated successfully' })
  @ApiResponse({ status: 400, description: 'AI service not available' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  autoRateAllReferences(@Param('paperId', ParseIntPipe) paperId: number) {
    return this.citationsService.autoRateAllReferences(paperId);
  }

  @Get('paper/:paperId/analyze')
  @ApiOperation({ summary: 'Analyze and rank references by importance' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of top references to return (default: 10)' })
  @ApiQuery({ name: 'minRelevance', required: false, type: Number, description: 'Minimum relevance score (0-1, default: 0.5)' })
  @ApiResponse({ status: 200, description: 'Analysis completed successfully' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  analyzeReferences(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('minRelevance', new DefaultValuePipe(0.5)) minRelevance: number,
  ) {
    return this.citationsService.analyzeReferences(paperId, { limit, minRelevance });
  }

  @Get('debug/paper/:paperId')
  @ApiOperation({ summary: 'Debug: Get raw citation data for a paper' })
  @ApiResponse({ status: 200, description: 'Return raw citation data' })
  async debugCitations(@Param('paperId', ParseIntPipe) paperId: number) {
    return this.citationsService.debugCitations(paperId);
  }

  @Post('test-parser')
  @ApiOperation({ summary: 'Test AI citation parser with sample citation strings' })
  @ApiResponse({ status: 200, description: 'Parsing results returned' })
  async testParser(@Body() body: { citations: string[] }) {
    const results = await this.citationParserService.parseCitations(body.citations);
    return {
      success: true,
      count: results.length,
      results: results.map(r => ({
        rawCitation: r.rawCitation,
        parsed: {
          authors: r.authors,
          year: r.year,
          title: r.title,
          doi: r.doi,
          confidence: r.confidence,
        },
      })),
    };
  }
}
