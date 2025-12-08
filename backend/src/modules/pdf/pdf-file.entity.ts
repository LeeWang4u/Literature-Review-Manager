import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Paper } from '../papers/paper.entity';

@Entity('pdf_files')
export class PdfFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'paper_id' })
  @Index()
  paperId: number;

  @Column({ name: 'file_name', length: 255 })
  fileName: string;

  @Column({ name: 'file_path', length: 500, nullable: true })
  filePath: string;

  @Column({ name: 'cloudinary_public_id', length: 500, nullable: true })
  cloudinaryPublicId: string;

  @Column({ name: 'cloudinary_url', length: 1000, nullable: true })
  cloudinaryUrl: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ name: 'original_filename', length: 255 })
  originalFilename: string;

  @Column({ name: 'mime_type', length: 100, nullable: true })
  mimeType: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;

  @ManyToOne(() => Paper, (paper) => paper.pdfFiles)
  @JoinColumn({ name: 'paper_id' })
  paper: Paper;
}
