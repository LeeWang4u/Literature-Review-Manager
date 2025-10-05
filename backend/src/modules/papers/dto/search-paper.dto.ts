import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchPaperDto {
  @ApiProperty({ example: 'transformer', required: false })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({ example: 2017, required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  year?: number;

  @ApiProperty({ example: 'Vaswani', required: false })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ example: 'NeurIPS', required: false })
  @IsOptional()
  @IsString()
  journal?: string;

  @ApiProperty({ example: '1,2,3', required: false })
  @IsOptional()
  @IsString()
  tags?: string; // Comma-separated tag IDs

  @ApiProperty({ example: 1, default: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ example: 20, default: 20, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number = 20;

  @ApiProperty({ example: 'createdAt', required: false })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ example: 'DESC', required: false })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
