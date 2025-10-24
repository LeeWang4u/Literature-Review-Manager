import { IsNotEmpty, IsBoolean, IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateSummaryDto {
  @ApiProperty({ description: 'Force regeneration if summary exists', required: false })
  @IsOptional()
  @IsBoolean()
  forceRegenerate?: boolean;

  @ApiProperty({ 
    description: 'AI provider to use for summary generation', 
    enum: ['gemini', 'openai'],
    default: 'gemini',
    required: false 
  })
  @IsOptional()
  @IsString()
  @IsIn(['gemini', 'openai'])
  provider?: string;
}
