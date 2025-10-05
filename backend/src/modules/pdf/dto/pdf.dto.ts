import { IsNotEmpty, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadPdfDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'PDF file' })
  file: any;
}

export class CreatePdfFileDto {
  @ApiProperty({ description: 'Paper ID' })
  @IsNotEmpty()
  @IsInt()
  paperId: number;

  @ApiProperty({ description: 'Original filename' })
  @IsNotEmpty()
  @IsString()
  originalFilename: string;

  @ApiProperty({ description: 'File path on server' })
  @IsNotEmpty()
  @IsString()
  filePath: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNotEmpty()
  @IsInt()
  fileSize: number;

  @ApiProperty({ description: 'File version (optional)', required: false })
  @IsOptional()
  @IsInt()
  version?: number;
}
