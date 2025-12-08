import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PdfFile } from './pdf-file.entity';
import { Paper } from '../papers/paper.entity';
import { PdfTextExtractorService } from './pdf-text-extractor.service';
import { PapersService } from '../papers/papers.service';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

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
    private configService: ConfigService,
  ) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

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

    // Validate file size (Cloudinary free tier: 10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum allowed is 10MB. Please upgrade your Cloudinary plan or use a smaller file.`
      );
    }

    // Get current version number
    const existingFiles = await this.pdfRepository.find({
      where: { paperId },
      order: { version: 'DESC' },
    });

    const version = existingFiles.length > 0 ? existingFiles[0].version + 1 : 1;

    try {
      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: 'Literature_Review',
        resource_type: 'raw', // Important for PDFs
        public_id: `paper_${paperId}_v${version}_${Date.now()}`,
        format: 'pdf',
        access_mode: 'public', // Make file publicly accessible
      });

      // Create PDF file record with Cloudinary data
      const pdfFile = this.pdfRepository.create({
        paperId,
        fileName: file.filename,
        originalFilename: file.originalname,
        filePath: null, // No longer storing locally
        cloudinaryPublicId: uploadResult.public_id,
        cloudinaryUrl: uploadResult.secure_url,
        fileSize: file.size,
        mimeType: file.mimetype,
        version,
      });

      const savedPdfFile = await this.pdfRepository.save(pdfFile);

      // 🔥 Extract text from PDF asynchronously (BEFORE deleting local file)
      try {
        this.logger.log(`📄 Starting PDF text extraction for paper ${paperId}`);
        
        const extractedText = await this.pdfTextExtractor.extractText(file.path);
        await this.papersService.updateFullText(paperId, extractedText);
        
        this.logger.log(`✅ PDF text extracted and saved for paper ${paperId} (${extractedText.length} characters)`);
      } catch (error) {
        this.logger.error(`❌ Failed to extract PDF text for paper ${paperId}: ${error.message}`);
      }

      // Delete local file after upload AND extraction
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return savedPdfFile;
    } catch (error) {
      // Delete local file if upload failed
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      this.logger.error(`Failed to upload PDF to Cloudinary: ${error.message}`);
      
      // Provide more helpful error messages
      if (error.message?.includes('File size too large')) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(`Failed to upload PDF to cloud storage: ${error.message}`);
    }
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

    if (!pdfFile.cloudinaryUrl) {
      throw new NotFoundException('PDF file URL not found');
    }

    try {
      this.logger.log(`Downloading PDF from Cloudinary: ${pdfFile.cloudinaryUrl}`);
      
      // Download file from Cloudinary
      const response = await axios.get(pdfFile.cloudinaryUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
      });

      return {
        file: Buffer.from(response.data),
        filename: pdfFile.originalFilename,
      };
    } catch (error) {
      this.logger.error(`Failed to download PDF from Cloudinary: ${error.message}`);
      this.logger.error(`URL attempted: ${pdfFile.cloudinaryUrl}`);
      
      if (error.response?.status === 401) {
        throw new NotFoundException('PDF file access denied. The file may have been deleted or access has expired.');
      }
      
      throw new NotFoundException(`PDF file not found on cloud storage: ${error.message}`);
    }
  }

  async remove(id: number): Promise<void> {
    const pdfFile = await this.findOne(id);

    // Delete file from Cloudinary
    if (pdfFile.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(pdfFile.cloudinaryPublicId, {
          resource_type: 'raw',
        });
        this.logger.log(`Deleted PDF from Cloudinary: ${pdfFile.cloudinaryPublicId}`);
      } catch (error) {
        this.logger.error(`Failed to delete PDF from Cloudinary: ${error.message}`);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    await this.pdfRepository.remove(pdfFile);
  }
}
