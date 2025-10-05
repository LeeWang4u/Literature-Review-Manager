import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import { Paper } from '../papers/paper.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ length: 7, default: '#3B82F6' })
  color: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToMany(() => Paper, (paper) => paper.tags)
  papers: Paper[];
}
