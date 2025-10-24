import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsUrl,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ReferenceDto } from './reference.dto';

export class CreatePaperDto {
  @ApiProperty({ example: 'Attention Is All You Need' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiProperty({ example: 'Vaswani, A., Shazeer, N., Parmar, N.' })
  @IsString()
  // @IsNotEmpty()
  @IsOptional()
  authors: string;

  @ApiProperty({ example: 'The dominant sequence transduction models...', required: false })
  @IsString()
  @IsOptional()
  abstract?: string;

  @ApiProperty({ example: 2017, required: false })
  @IsInt()
  @IsOptional()
  @Min(1900)
  @Max(2100)
  @Type(() => Number)
  publicationYear?: number;

  @ApiProperty({ example: 'NeurIPS', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  journal?: string;

  @ApiProperty({ example: '30', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  volume?: string;

  @ApiProperty({ example: '1', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  issue?: string;

  @ApiProperty({ example: '6000-6010', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  pages?: string;

  @ApiProperty({ example: '10.1234/example', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  doi?: string;

  @ApiProperty({ example: 'https://arxiv.org/abs/1706.03762', required: false })
  @IsUrl()
  @IsOptional()
  @MaxLength(500)
  url?: string;

  @ApiProperty({ example: 'transformer, attention, neural networks', required: false })
  @IsString()
  @IsOptional()
  keywords?: string;

  @ApiProperty({ example: [1, 2, 3], required: false, type: [Number] })
  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  @Type(() => Number)
  tagIds?: number[];

  @ApiProperty({
    type: () => ReferenceDto,  // Sử dụng lazy resolver và class riêng
    isArray: true,
    required: false,
    example: [
      { title: 'Neural Machine Translation by Jointly Learning to Align and Translate', doi: '10.5555/3295222.3295349' },
    ],
  })
  @IsArray()
  @IsOptional()
  @Type(() => ReferenceDto)  // Sử dụng class-transformer để transform array đúng
  references?: ReferenceDto[];
}
