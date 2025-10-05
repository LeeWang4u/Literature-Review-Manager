import { IsString, IsNotEmpty, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ example: 'Machine Learning' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '#3B82F6', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-F]{6}$/i, { message: 'Color must be a valid hex color' })
  color?: string;
}

export class UpdateTagDto {
  @ApiProperty({ example: 'Deep Learning', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: '#8B5CF6', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-F]{6}$/i)
  color?: string;
}
