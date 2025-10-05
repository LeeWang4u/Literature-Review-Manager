import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PdfFile } from './pdf-file.entity';
import { Paper } from '../papers/paper.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfService {
  constructor(
    @InjectRepository(PdfFile)
    private pdfRepository: Repository<PdfFile>,
    @InjectRepository(Paper)
    private papersRepository: Repository<Paper>,
  ) {}

  async uploadPdf(
    paperId: number,
    userId: number,
    file: Express.Multer.File,
  ): Promise<PdfFile> {
    // Verify paper exists and belongs to user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
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
      uploadedById: userId,
      fileName: file.filename,
      originalFilename: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      version,
    });

    return await this.pdfRepository.save(pdfFile);
  }

  async findByPaper(paperId: number, userId: number): Promise<PdfFile[]> {
    // First verify the paper belongs to the user
    const paper = await this.papersRepository.findOne({
      where: { id: paperId, addedBy: userId },
    });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    // Return all PDFs for this paper (regardless of who uploaded)
    return await this.pdfRepository.find({
      where: { paperId },
      order: { version: 'DESC' },
    });
  }

  async findOne(id: number, userId: number): Promise<PdfFile> {
    const pdfFile = await this.pdfRepository.findOne({
      where: { id, uploadedById: userId },
      relations: ['paper'],
    });

    if (!pdfFile) {
      throw new NotFoundException('PDF file not found');
    }

    return pdfFile;
  }

  async downloadPdf(id: number, userId: number): Promise<{ file: Buffer; filename: string }> {
    const pdfFile = await this.findOne(id, userId);

    if (!fs.existsSync(pdfFile.filePath)) {
      throw new NotFoundException('PDF file not found on disk');
    }

    const file = fs.readFileSync(pdfFile.filePath);

    return {
      file,
      filename: pdfFile.originalFilename,
    };
  }

  async remove(id: number, userId: number): Promise<void> {
    const pdfFile = await this.findOne(id, userId);

    // Delete file from disk
    if (fs.existsSync(pdfFile.filePath)) {
      fs.unlinkSync(pdfFile.filePath);
    }

    await this.pdfRepository.remove(pdfFile);
  }
}
