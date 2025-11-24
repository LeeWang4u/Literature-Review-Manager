import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PapersService } from './papers.service';
import { CreatePaperDto } from './dto/create-paper.dto';
import { UpdatePaperDto } from './dto/update-paper.dto';
import { SearchPaperDto } from './dto/search-paper.dto';
import { ExtractMetadataDto } from './dto/extract-metadata.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaperMetadataService } from './paper-metadata.service';
import { UpdatePaperStatusDto } from './dto/update-paper-status.dto';
import { CitationsService } from '../citations/citations.service';

@ApiTags('Papers')
@Controller('papers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PapersController {
  constructor(
    private papersService: PapersService,
    private paperMetadataService: PaperMetadataService,
    private citationsService: CitationsService,
  ) { }

  @Post('extract-metadata')
  @ApiOperation({
    summary: 'Extract paper metadata from DOI or URL',
    description: 'Automatically fetch paper information from DOI or URL (Crossref, Semantic Scholar, ArXiv)',
  })
  @ApiResponse({
    status: 200,
    description: 'Metadata extracted successfully',
    schema: {
      example: {
        title: 'Example Paper Title',
        authors: 'John Doe, Jane Smith',
        abstract: 'This is the abstract...',
        publicationYear: 2023,
        journal: 'Nature',
        doi: '10.1038/nature12373',
        url: 'https://doi.org/10.1038/nature12373',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid DOI or URL format' })
  @ApiResponse({ status: 404, description: 'Paper metadata not found' })
  async extractMetadata(@Body() dto: ExtractMetadataDto) {
    const metadata = await this.paperMetadataService.extractMetadata(dto.input);

    // Log reference count for debugging
    console.log(`\n📊 METADATA EXTRACTION RESULT for: ${dto.input}`);
    console.log(`   Title: ${metadata.title?.substring(0, 60)}...`);
    console.log(`   References found: ${metadata.references?.length || 0}`);
    if (metadata.references && metadata.references.length > 0) {
      console.log(`   First 3 references:`);
      metadata.references.slice(0, 3).forEach((ref, i) => {
        console.log(`     ${i + 1}. ${ref.title?.substring(0, 50)}... (${ref.year || 'no year'})`);
      });
    }
    console.log('');

    // Check if it's an ArXiv paper and add PDF availability info
    const arxivId = this.paperMetadataService.extractArxivId(dto.input);

    return {
      ...metadata,
      arxivId,
      pdfAvailable: !!arxivId,
      pdfUrl: arxivId ? this.paperMetadataService.getArxivPdfUrl(arxivId) : null,
    };
  }

  @Post('download-arxiv-pdf')
  @ApiOperation({
    summary: 'Download PDF from ArXiv',
    description: 'Download PDF file from ArXiv for a given ArXiv ID or URL',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF downloaded successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid ArXiv ID' })
  @ApiResponse({ status: 500, description: 'Failed to download PDF' })
  async downloadArxivPdf(@Body() dto: ExtractMetadataDto) {
    const arxivId = this.paperMetadataService.extractArxivId(dto.input);

    if (!arxivId) {
      throw new Error('Invalid ArXiv ID or URL');
    }

    const pdfBuffer = await this.paperMetadataService.downloadArxivPdf(arxivId);

    return {
      arxivId,
      filename: `${arxivId}.pdf`,
      size: pdfBuffer.length,
      data: pdfBuffer.toString('base64'), // Return as base64 for JSON response
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new paper' })
  @ApiResponse({ status: 201, description: 'Paper created successfully' })
  async create(@Body() createPaperDto: CreatePaperDto, @Request() req) {
    return await this.papersService.create(createPaperDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all papers with search and filters' })
  @ApiResponse({ status: 200, description: 'Papers retrieved successfully' })
  async findAll(@Query() searchDto: SearchPaperDto, @Request() req) {
    return await this.papersService.findAll(searchDto, req.user.id);
  }

  @Get('find')
  @ApiOperation({ summary: 'Find paper by DOI or URL' })
  @ApiResponse({ status: 200, description: 'Paper found' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  async findByDoiOrUrl(@Query('doi') doi?: string, @Query('url') url?: string, @Request() req?) {
    return await this.papersService.findByDoiOrUrl(doi, url, req.user.id);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get papers statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStatistics(@Request() req) {
    return await this.papersService.getStatistics(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get paper by ID' })
  @ApiResponse({ status: 200, description: 'Paper found' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.papersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a paper' })
  @ApiResponse({ status: 200, description: 'Paper updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePaperDto: UpdatePaperDto,
    @Request() req,
  ) {
    return await this.papersService.update(id, updatePaperDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a paper' })
  @ApiResponse({ status: 200, description: 'Paper deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    await this.papersService.remove(id, req.user.id);
    return { message: 'Paper deleted successfully' };
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update paper status or favorite flag' })
  @ApiResponse({ status: 200, description: 'Status or favorite updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaperStatusDto,
    @Request() req,
  ) {
    return await this.papersService.updateStatus(id, dto, req.user.id);
  }


  @Get('library')
  @ApiOperation({ summary: 'Get all papers in user library (filterable)' })
  async getLibrary(
    @Query('status') status: 'to_read' | 'reading' | 'completed' | undefined,
    @Query('favorite') favorite: 'true' | 'false' | undefined,
    @Request() req,
  ) {
    // return this.papersService.getStatisticsInLibrary(req.user.id, status, favorite);
    return this.papersService.getUserLibrary(req.user.id, status, favorite);
  }

  @Post(':id/auto-rate-references')
  @ApiOperation({ summary: 'Auto-rate all references of a paper using AI' })
  @ApiResponse({ status: 200, description: 'References auto-rated successfully' })
  async autoRateReferences(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.citationsService.autoRateAllReferences(id, req.user.id);
  }

  @Post(':id/fetch-nested-references')
  @ApiOperation({ 
    summary: 'Manually fetch nested references (references of references)',
    description: 'Fetch and process references at specified depth level. Useful for manually building multi-level citation networks.'
  })
  @ApiResponse({ status: 200, description: 'Nested references fetched successfully' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  async fetchNestedReferences(
    @Param('id', ParseIntPipe) paperId: number,
    @Body() body: { depth?: number; maxDepth?: number },
    @Request() req,
  ) {
    const depth = body.depth || 1;
    const maxDepth = body.maxDepth || 2;
    
    return this.papersService.manuallyFetchNestedReferences(
      paperId, 
      req.user.id, 
      depth, 
      maxDepth
    );
  }


  @Post(':id/fetch-nested/eager')
  async fetchNestedEager(
    @Param('id') id: string,
    @Body() body: { targetDepth?: number; maxDepth?: number },
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    const paperId = Number(id);
    const targetDepth = body?.targetDepth ?? 1;
    const maxDepth = body?.maxDepth ?? 2;

    // Calls the existing method that already does "find DOI if missing then fetch refs"
    const result = await this.papersService.manuallyFetchNestedReferences(paperId, userId, targetDepth, maxDepth);
    return { success: true, ...result };
  }

}
