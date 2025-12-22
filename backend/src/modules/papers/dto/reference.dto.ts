import { IsString, IsOptional, MaxLength, IsInt, Min, Max, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ReferenceDto {
  @ApiProperty({ example: 'Neural Machine Translation by Jointly Learning to Align and Translate' })
  @IsString()
  @IsOptional()  // Nếu title không bắt buộc, dùng IsOptional
  @MaxLength(500)  // Giữ max length tương tự title chính
  title: string;

  @ApiProperty({ example: 'Dzmitry Bahdanau, Kyunghyun Cho, Yoshua Bengio', required: false })
  @IsString()
  @IsOptional()
  authors?: string;

  @ApiProperty({ example: 2014, required: false, description: 'Publication year of the reference' })
  @IsInt()
  @IsOptional()
  @Min(1900)
  @Max(2100)
  @Type(() => Number)
  year?: number;

  @ApiProperty({ example: '10.5555/3295222.3295349', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  doi?: string;

  @ApiProperty({ example: 'This paper introduced the attention mechanism which we build upon...', required: false, description: 'Context or quote where this reference is cited' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  citationContext?: string;

  // abstract
  @ApiProperty({ example: 'In this paper, we propose a novel attention mechanism...', required: false })
  @IsString()
  @IsOptional()
  abstract?: string;

  @ApiProperty({ example: 0.85, required: false, description: 'Relevance score (0-1) indicating how related this reference is to the main paper' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  relevanceScore?: number;

  @ApiProperty({ example: true, required: false, description: 'Whether this is marked as an influential/key reference' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isInfluential?: boolean;
}