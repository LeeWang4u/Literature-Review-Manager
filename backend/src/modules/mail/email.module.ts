import { Module } from '@nestjs/common';
import { EmailService } from './mail.service';

@Module({
  providers: [EmailService],
  exports: [EmailService], // Export để các module khác có thể sử dụng
})
export class EmailModule {}