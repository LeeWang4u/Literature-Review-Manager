import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsNumber()
  paperId?: number;

  @IsOptional()
  @IsString()
  paperContext?: string; // Title, abstract, or full text context
}

export class ChatResponse {
  response: string;
  timestamp: Date;
}
