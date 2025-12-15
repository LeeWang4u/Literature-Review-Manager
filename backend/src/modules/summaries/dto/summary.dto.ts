import { IsNotEmpty, IsBoolean, IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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

  @ApiProperty({ 
    description: 'Maximum number of key findings to extract (default: 5, min: 3, max: 100)', 
    default: 5,
    minimum: 3,
    maximum: 100,
    required: false 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(100)
  maxKeyFindings?: number;
}
