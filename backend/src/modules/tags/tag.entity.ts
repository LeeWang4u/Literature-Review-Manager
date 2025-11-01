import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Paper } from '../papers/paper.entity';
import { User } from '../users/user.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ length: 7, default: '#3B82F6' })
  color: string;

  @Column({ name: 'owner'})
  owner: number;

  @ManyToOne(() => User, (user) => user.tags)
  @JoinColumn({ name: 'owner' })
  ownerId: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
 
  @ManyToMany(() => Paper, (paper) => paper.tags)
  papers: Paper[];
}
