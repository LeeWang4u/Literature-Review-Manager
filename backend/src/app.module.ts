import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';

// Import modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PapersModule } from './modules/papers/papers.module';
import { TagsModule } from './modules/tags/tags.module';
import { NotesModule } from './modules/notes/notes.module';
import { CitationsModule } from './modules/citations/citations.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { SummariesModule } from './modules/summaries/summaries.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRoot(typeOrmConfig),

    // Feature modules
    AuthModule,
    UsersModule,
    PapersModule,
    TagsModule,
    NotesModule,
    CitationsModule,
    PdfModule,
    SummariesModule,
    ChatModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
