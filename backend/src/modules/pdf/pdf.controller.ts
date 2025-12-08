import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PdfService } from './pdf.service';
import { UploadPdfDto } from './dto/pdf.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Multer configuration
const multerConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      cb(null, `pdf-${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new BadRequestException('Only PDF files are allowed'), false);
    }
  },
};

@ApiTags('pdf')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('upload/:paperId')
  @ApiOperation({ summary: 'Upload a PDF file for a paper' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'PDF file',
    type: UploadPdfDto,
  })
  @ApiResponse({ status: 201, description: 'PDF uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadPdf(
    @Param('paperId', ParseIntPipe) paperId: number,
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return await this.pdfService.uploadPdf(paperId, file);
  }

  @Get('paper/:paperId')
  @ApiOperation({ summary: 'Get all PDF files for a paper' })
  @ApiResponse({ status: 200, description: 'Return PDF files list' })
  findByPaper(@Param('paperId', ParseIntPipe) paperId: number) {
    return this.pdfService.findByPaper(paperId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get PDF file metadata' })
  @ApiResponse({ status: 200, description: 'Return PDF file metadata' })
  @ApiResponse({ status: 404, description: 'PDF file not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pdfService.findOne(id);
  }

  @Get('view/:id')
  @ApiOperation({ summary: 'Get PDF file URL for viewing' })
  @ApiResponse({ status: 200, description: 'Return PDF file URL' })
  @ApiResponse({ status: 404, description: 'PDF file not found' })
  async getViewUrl(@Param('id', ParseIntPipe) id: number) {
    const pdfFile = await this.pdfService.findOne(id);
    return {
      url: pdfFile.cloudinaryUrl,
      filename: pdfFile.originalFilename,
    };
  }

  @Get('download/:id')
  @ApiOperation({ summary: 'Download a PDF file' })
  @ApiResponse({ status: 200, description: 'Return PDF file' })
  @ApiResponse({ status: 404, description: 'PDF file not found' })
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { file, filename } = await this.pdfService.downloadPdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return new StreamableFile(file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a PDF file' })
  @ApiResponse({ status: 200, description: 'PDF deleted successfully' })
  @ApiResponse({ status: 404, description: 'PDF file not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pdfService.remove(id);
  }
}
