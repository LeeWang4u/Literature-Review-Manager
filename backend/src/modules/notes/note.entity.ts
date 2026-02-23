import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Paper } from '../papers/paper.entity';

@Entity('notes')
@Index(['paperId'])
export class Note {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'paper_id' })
  @Index()
  paperId: number;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'page_number', nullable: true })
  pageNumber: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Paper, (paper) => paper.notes)
  @JoinColumn({ name: 'paper_id' })
  paper: Paper;
}
