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

  @Column({ name: 'relevance_score', type: 'decimal', precision: 3, scale: 2, nullable: true })
  relevanceScore: number;

  // Hierarchical citation support
  @Column({ name: 'citation_depth', type: 'int', default: 0 })
  citationDepth: number; // 0 = direct citation, 1 = citation of citation, etc.

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
}
