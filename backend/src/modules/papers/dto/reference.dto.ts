import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReferenceDto {
  @ApiProperty({ example: 'Neural Machine Translation by Jointly Learning to Align and Translate' })
  @IsString()
  @IsOptional()  // Nếu title không bắt buộc, dùng IsOptional
  @MaxLength(500)  // Giữ max length tương tự title chính
  title: string;

  @ApiProperty({ example: '10.5555/3295222.3295349', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  doi?: string;
}