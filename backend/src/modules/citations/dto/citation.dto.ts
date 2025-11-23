import { IsNotEmpty, IsInt, IsOptional, IsString, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCitationDto {
  @ApiProperty({ description: 'Citing paper ID', example: 1 })
  @IsNotEmpty()
  @IsInt()
  citingPaperId: number;

  @ApiProperty({ description: 'Cited paper ID', example: 2 })
  @IsNotEmpty()
  @IsInt()
  citedPaperId: number;

  @ApiProperty({ description: 'Citation context or quote', example: 'This paper builds upon the work of...', required: false })
  @IsOptional()
  @IsString()
  citationContext?: string;

  @ApiProperty({ description: 'Relevance score (0-1)', example: 0.85, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  relevanceScore?: number;

  @ApiProperty({ description: 'Mark as influential reference', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isInfluential?: boolean;
}
