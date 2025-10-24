import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Tag } from '../tags/tag.entity';
import { UserLibrary } from '../library/user-library.entity';
import { Note } from '../notes/note.entity';
import { PdfFile } from '../pdf/pdf-file.entity';
import { Citation } from '../citations/citation.entity';
import { AiSummary } from '../summaries/ai-summary.entity';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

@Entity('papers')
@Index('idx_title', ['title'])
@Index('idx_year', ['publicationYear'])
@Index(['title', 'abstract', 'keywords'], { fulltext: true })
export class Paper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  authors: string;

  @Column({ type: 'text', nullable: true })
  abstract: string;

  @Column({ type: 'longtext', nullable: true })
  fullText: string;

  @Column({ name: 'publication_year', nullable: true })
  publicationYear: number;

  @Column({ length: 255, nullable: true })
  journal: string;

  @Column({ length: 50, nullable: true })
  volume: string;

  @Column({ length: 50, nullable: true })
  issue: string;

  @Column({ length: 50, nullable: true })
  pages: string;

  @Column({ length: 255, nullable: true })
  doi: string;

  @Column({ length: 500, nullable: true })
  url: string;

  @Column({ type: 'text', nullable: true })
  keywords: string;

  @Column({ name: 'added_by' })
  @Index()
  addedBy: number;

  // Alias for compatibility with services
  get userId(): number {
    return this.addedBy;
  }

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({
    type: 'enum',
    enum: ['to_read', 'reading', 'completed'],
    default: 'to_read',
  })
  status: 'to_read' | 'reading' | 'completed';

  @Column({ type: 'boolean', default: false })
  favorite: boolean;


  @Column({ type: 'boolean', default: false, name: 'is_reference' })
  isReference: boolean;


  // Relations
  @ManyToOne(() => User, (user) => user.papers)
  @JoinColumn({ name: 'added_by' })
  user: User;

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'paper_tags',
    joinColumn: { name: 'paper_id' },
    inverseJoinColumn: { name: 'tag_id' },
  })
  tags: Tag[];

  @OneToMany(() => UserLibrary, (library) => library.paper)
  inLibraries: UserLibrary[];

  @OneToMany(() => Note, (note) => note.paper)
  notes: Note[];

  @OneToMany(() => PdfFile, (pdf) => pdf.paper)
  pdfFiles: PdfFile[];

  // @ApiHideProperty()
  // @ApiProperty({ type: () => [Citation] })
  @ApiProperty({ type: () => Citation, isArray: true })
  @OneToMany(() => Citation, (citation) => citation.citingPaper)
  citations: Citation[];

  // @ApiHideProperty()
  // @ApiProperty({ type: () => [Citation] })
  @ApiProperty({ type: () => Citation, isArray: true })
  @OneToMany(() => Citation, (citation) => citation.citedPaper)
  citedBy: Citation[];

  @OneToMany(() => AiSummary, (summary) => summary.paper)
  summaries: AiSummary[];
}
