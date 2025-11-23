import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Paper } from '../papers/paper.entity';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

@Entity('citations')
@Index(['citingPaperId', 'citedPaperId'], { unique: true })
export class Citation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'citing_paper_id' })
  @Index()
  citingPaperId: number;

  @Column({ name: 'cited_paper_id' })
  @Index()
  citedPaperId: number;

  @Column({ name: 'citation_context', type: 'text', nullable: true })
  citationContext: string;

  @Column({ name: 'relevance_score', type: 'decimal', precision: 3, scale: 2, nullable: true })
  relevanceScore: number;

  @Column({ name: 'is_influential', type: 'boolean', default: false })
  isInfluential: boolean;

  @Column({ name: 'created_by' })
  createdById: number;

  // Hierarchical citation support
  @Column({ name: 'citation_depth', type: 'int', default: 0 })
  citationDepth: number; // 0 = direct citation, 1 = citation of citation, etc.

  @Column({ name: 'parsed_authors', type: 'text', nullable: true })
  parsedAuthors: string; // AI-parsed author names

  @Column({ name: 'parsed_title', type: 'text', nullable: true })
  parsedTitle: string; // AI-parsed clean title

  @Column({ name: 'parsed_year', type: 'int', nullable: true })
  parsedYear: number; // AI-parsed publication year

  @Column({ name: 'parsing_confidence', type: 'decimal', precision: 3, scale: 2, nullable: true })
  parsingConfidence: number; // AI confidence score (0-1)

  @Column({ name: 'raw_citation', type: 'text', nullable: true })
  rawCitation: string; // Original citation string before parsing

  @Column({ name: 'note_id', nullable: true })
  noteId: number; // Link to auto-generated note

  // Alias for compatibility with services
  get userId(): number {
    return this.createdById;
  }

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  
  // @ApiProperty({ type: () => Paper })
  // @ApiHideProperty()
  @ApiProperty({ type: () => Paper })
  @ManyToOne(() => Paper, (paper) => paper.citations)
  @JoinColumn({ name: 'citing_paper_id' })
  citingPaper: Paper;


  // @ApiProperty({ type: () => Paper })
  // @ApiHideProperty()
  @ApiProperty({ type: () => Paper })
  @ManyToOne(() => Paper, (paper) => paper.citedBy)
  @JoinColumn({ name: 'cited_paper_id' })
  citedPaper: Paper;

  @ManyToOne(() => User, (user) => user.citations)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;
}
