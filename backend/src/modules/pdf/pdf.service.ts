import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PdfFile } from './pdf-file.entity';
import { Paper } from '../papers/paper.entity';
import { PdfTextExtractorService } from './pdf-text-extractor.service';
import { PapersService } from '../papers/papers.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    @InjectRepository(PdfFile)
    private pdfRepository: Repository<PdfFile>,
    @InjectRepository(Paper)
    private papersRepository: Repository<Paper>,
    private pdfTextExtractor: PdfTextExtractorService,
    @Inject(forwardRef(() => PapersService))
    private papersService: PapersService,
  ) {}

  async uploadPdf(
    paperId: number,
    file: Express.Multer.File,
  ): Promise<PdfFile> {
    // Verify paper exists
    const paper = await this.papersRepository.findOne({
      where: { id: paperId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    // Validate file type
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    // Get current version number
    const existingFiles = await this.pdfRepository.find({
      where: { paperId },
      order: { version: 'DESC' },
    });

    const version = existingFiles.length > 0 ? existingFiles[0].version + 1 : 1;

    // Create PDF file record
    const pdfFile = this.pdfRepository.create({
      paperId,
      fileName: file.filename,
      originalFilename: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      version,
    });

    const savedPdfFile = await this.pdfRepository.save(pdfFile);

    // 🔥 Extract text from PDF asynchronously (don't block upload on extraction failure)
    try {
      this.logger.log(`📄 Starting PDF text extraction for paper ${paperId}`);
      const extractedText = await this.pdfTextExtractor.extractText(file.path);
      await this.papersService.updateFullText(paperId, extractedText);
      this.logger.log(`✅ PDF text extracted and saved for paper ${paperId} (${extractedText.length} characters)`);
    } catch (error) {
      this.logger.error(`❌ Failed to extract PDF text for paper ${paperId}: ${error.message}`);
      // Don't fail the upload if extraction fails - the PDF is still uploaded successfully
    }

    return savedPdfFile;
  }

  async findByPaper(paperId: number): Promise<PdfFile[]> {
    // Verify the paper exists
    const paper = await this.papersRepository.findOne({
      where: { id: paperId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    // Return all PDFs for this paper
    return await this.pdfRepository.find({
      where: { paperId },
      order: { version: 'DESC' },
    });
  }

  async findOne(id: number): Promise<PdfFile> {
    const pdfFile = await this.pdfRepository.findOne({
      where: { id },
      relations: ['paper'],
    });

    if (!pdfFile) {
      throw new NotFoundException('PDF file not found');
    }

    return pdfFile;
  }

  async downloadPdf(id: number): Promise<{ file: Buffer; filename: string }> {
    const pdfFile = await this.findOne(id);

    if (!fs.existsSync(pdfFile.filePath)) {
      throw new NotFoundException('PDF file not found on disk');
    }

    const file = fs.readFileSync(pdfFile.filePath);

    return {
      file,
      filename: pdfFile.originalFilename,
    };
  }

  async remove(id: number): Promise<void> {
    const pdfFile = await this.findOne(id);

    // Delete file from disk
    if (fs.existsSync(pdfFile.filePath)) {
      fs.unlinkSync(pdfFile.filePath);
    }

    await this.pdfRepository.remove(pdfFile);
  }
}
