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

@Entity('ai_summaries')
export class AiSummary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'paper_id' })
  @Index()
  paperId: number;

  @Column({ type: 'text' })
  summary: string;

  @Column({ name: 'key_findings', type: 'json', nullable: true })
  keyFindings: string[];

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt: Date;

  @ManyToOne(() => Paper, (paper) => paper.summaries)
  @JoinColumn({ name: 'paper_id' })
  paper: Paper;
}
