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

  @Column({ name: 'created_by' })
  createdById: number;

  // Alias for compatibility with services
  get userId(): number {
    return this.createdById;
  }

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Paper, (paper) => paper.citations)
  @JoinColumn({ name: 'citing_paper_id' })
  citingPaper: Paper;

  @ManyToOne(() => Paper, (paper) => paper.citedBy)
  @JoinColumn({ name: 'cited_paper_id' })
  citedPaper: Paper;

  @ManyToOne(() => User, (user) => user.citations)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;
}
