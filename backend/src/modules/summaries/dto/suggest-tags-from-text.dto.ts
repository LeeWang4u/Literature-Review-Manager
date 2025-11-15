import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuggestTagsFromTextDto {
  @ApiProperty({
    description: 'Paper title',
    example: 'Deep Learning for Computer Vision: A Comprehensive Survey',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiProperty({
    description: 'Paper abstract',
    example: 'This paper presents a comprehensive survey of deep learning techniques...',
  })
  @IsString()
  @IsNotEmpty()
  abstract: string;

  @ApiPropertyOptional({
    description: 'Paper authors',
    example: 'John Doe, Jane Smith',
  })
  @IsString()
  @IsOptional()
  authors?: string;

  @ApiPropertyOptional({
    description: 'Paper keywords',
    example: 'machine learning, neural networks, computer vision',
  })
  @IsString()
  @IsOptional()
  keywords?: string;
}
