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
  Patch,
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
import { LibrariesService } from '../libraries/libraries.service';

@ApiTags('Papers')
@Controller('papers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PapersController {
  constructor(
    private papersService: PapersService,
    private paperMetadataService: PaperMetadataService,
    private citationsService: CitationsService,
    private librariesService: LibrariesService,
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
      metadata.references.forEach((ref, i) => {
        console.log(`     ${i + 1}. ${ref.title?.substring(0, 50)}... (${ref.year || 'no year'})`);
      });
    }
    
    // Log response size
    const responseSize = JSON.stringify(metadata).length;
    console.log(`   Response size: ${(responseSize / 1024).toFixed(2)} KB`);
    if (responseSize > 1024 * 1024) {
      console.warn(`   ⚠️ WARNING: Response exceeds 1MB! This may cause issues.`);
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
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return await this.papersService.findOne(id, req.user.id);
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

  @Post(':id/convert-to-research')
  @ApiOperation({ summary: 'Convert reference paper to research paper' })
  @ApiResponse({ status: 200, description: 'Paper converted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  @ApiResponse({ status: 409, description: 'Already a research paper' })
  async convertToResearch(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return await this.papersService.convertReferenceToResearch(id, req.user.id);
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

  /*
  @Post(':id/auto-rate-references')
  @ApiOperation({ summary: 'Auto-rate all references of a paper using AI' })
  @ApiResponse({ status: 200, description: 'References auto-rated successfully' })
  async autoRateReferences(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.citationsService.autoRateAllReferences(id, req.user.id);
  }
  */

  @Post(':id/fetch-references')
  @ApiOperation({ summary: 'Manually fetch and process references for any paper' })
  @ApiResponse({ status: 200, description: 'References fetched and processed successfully' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  async fetchReferences(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.papersService.fetchReferencesForPaper(id, req.user.id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get statistics for a specific paper' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  async getStatisticsForPaper(
    @Request() req,
  ) {
    return this.papersService.getPaperStatusStatistics( req.user.id);
  }

  @Patch(':id/favorite')
  @ApiOperation({ summary: 'Toggle favorite status of a paper' })
  @ApiResponse({ status: 200, description: 'Favorite status updated successfully' })
  @ApiResponse({ status: 404, description: 'Paper not found' })
  async toggleFavorite(
    @Param('id', ParseIntPipe) id: number,
    @Body('favorite') favorite: boolean,
    @Request() req,
  ) {
    return this.papersService.toggleFavorite(id, favorite, req.user.id);
  }

  // ===== LIBRARY ENDPOINTS (migrated from library module) =====

  @Get('library/filter')
  @ApiOperation({ summary: 'Get filtered library papers (replaces library module)' })
  @ApiResponse({ status: 200, description: 'Library items retrieved successfully' })
  async getFilteredLibrary(
    @Query('status') status?: string,
    @Query('favorite') favorite?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Request() req?,
  ) {
    return this.papersService.getLibrary(req.user.id, {
      status,
      favorite: favorite === 'true' ? true : favorite === 'false' ? false : undefined,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 10,
      search,
    });
  }

  @Get('library/statistics')
  @ApiOperation({ summary: 'Get library statistics (replaces library module)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getLibraryStatistics(@Request() req) {
    return this.papersService.getPaperStatusStatistics(req.user.id);
  }

  @Put('library/:id/status')
  @ApiOperation({ summary: 'Update paper status in library (replaces library module)' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateLibraryStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Request() req,
  ) {
    return this.papersService.updatePaperStatus(id, req.user.id, status);
  }

  @Delete('library/:id')
  @ApiOperation({ summary: 'Remove paper from library (replaces library module)' })
  @ApiResponse({ status: 200, description: 'Paper removed successfully' })
  async removeFromLibrary(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    await this.papersService.removePaper(id, req.user.id);
    return { message: 'Paper removed from library' };
  }

  @Patch('library/:id/favorite')
  @ApiOperation({ summary: 'Toggle favorite in library (replaces library module)' })
  @ApiResponse({ status: 200, description: 'Favorite updated successfully' })
  async toggleLibraryFavorite(
    @Param('id', ParseIntPipe) id: number,
    @Body('favorite') favorite: boolean,
    @Request() req,
  ) {
    return this.papersService.toggleFavorite(id, favorite, req.user.id);
  }

  @Get(':paperId/libraries')
  @ApiOperation({ summary: 'Get all libraries that contain this paper' })
  @ApiResponse({ status: 200, description: 'Libraries retrieved successfully' })
  async getLibrariesForPaper(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Request() req,
  ) {
    return this.librariesService.getLibrariesForPaper(paperId, req.user.id);
  }

}
