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

export enum LibraryStatus {
  TO_READ = 'to-read',
  READING = 'reading',
  READ = 'read',
  FAVORITE = 'favorite',
}

@Entity('user_library')
@Index(['userId', 'paperId'], { unique: true })
export class UserLibrary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  @Index()
  userId: number;

  @Column({ name: 'paper_id' })
  @Index()
  paperId: number;

  @Column({ type: 'enum', enum: LibraryStatus, default: LibraryStatus.TO_READ })
  @Index()
  status: LibraryStatus;

  @Column({ nullable: true, type: 'int' })
  rating: number;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;

  @ManyToOne(() => User, (user) => user.library)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Paper, (paper) => paper.inLibraries)
  @JoinColumn({ name: 'paper_id' })
  paper: Paper;
}
