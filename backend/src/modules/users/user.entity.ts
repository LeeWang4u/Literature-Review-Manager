import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Paper } from '../papers/paper.entity';
import { Note } from '../notes/note.entity';
import { Citation } from '../citations/citation.entity';
import { PdfFile } from '../pdf/pdf-file.entity';
import { Tag } from '../tags/tag.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 255 })
  @Exclude()
  password: string;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ name: 'avatar_url', length: 500, nullable: true })
  avatarUrl: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ length: 255, nullable: true })
  affiliation: string;

  @Column({ name: 'research_interests', type: 'text', nullable: true })
  researchInterests: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'google_id', length: 255, nullable: true })
  @Index()
  googleId: string;

  // Relations
  @OneToMany(() => Paper, (paper) => paper.user)
  papers: Paper[];

  @OneToMany(() => Tag, (tag) => tag.owner)
  tags: Tag[];

}
