import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateCitationDto {
  @ApiProperty({ description: 'User-assigned relevance score (0-1)', example: 0.85, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  relevanceScore?: number;

  @ApiProperty({ description: 'Citation context or notes', example: 'This paper provides key methodology...', required: false })
  @IsOptional()
  @IsString()
  citationContext?: string;
}
