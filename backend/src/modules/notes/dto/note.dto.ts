import { IsNotEmpty, IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateNoteDto {

  @ApiProperty({ description: 'Note title', example: 'This note ... ' })
  @IsNotEmpty()
  @IsString()
  title: string;


  @ApiProperty({ description: 'Note content', example: 'This paper presents a novel approach...' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ description: 'Paper ID', example: 1 })
  @IsNotEmpty()
  @IsInt()
  paperId: number;

  @ApiProperty({ description: 'Highlighted text (optional)', required: false })
  @IsOptional()
  @IsString()
  highlightedText?: string;

  @ApiProperty({ description: 'Page number (optional)', required: false })
  @IsOptional()
  @IsInt()
  pageNumber?: number;
}

export class UpdateNoteDto extends PartialType(CreateNoteDto) {}
