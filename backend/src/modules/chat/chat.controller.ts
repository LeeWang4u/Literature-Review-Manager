import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessageDto, ChatResponse } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() chatDto: ChatMessageDto): Promise<ChatResponse> {
    return this.chatService.chat(chatDto);
  }

  @Get('prompts')
  getSuggestedPrompts(): { prompts: string[] } {
    return {
      prompts: this.chatService.getSuggestedPrompts(),
    };
  }
}
