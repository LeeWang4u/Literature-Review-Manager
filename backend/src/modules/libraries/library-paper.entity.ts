import { Entity, Column, ManyToOne, PrimaryColumn, CreateDateColumn, JoinColumn } from 'typeorm';
import { Library } from './library.entity';
import { Paper } from '../papers/paper.entity';

@Entity('library_papers')
export class LibraryPaper {
  @PrimaryColumn({ name: 'library_id' })
  libraryId: number;

  @PrimaryColumn({ name: 'paper_id' })
  paperId: number;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;

  @ManyToOne(() => Library, library => library.libraryPapers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'library_id' })
  library: Library;

  @ManyToOne(() => Paper, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paper_id' })
  paper: Paper;
}
