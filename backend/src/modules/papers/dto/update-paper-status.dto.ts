import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsBoolean } from 'class-validator';

export class UpdatePaperStatusDto {
  @ApiProperty({ enum: ['to_read', 'reading', 'completed'], required: false })
  @IsOptional()
  @IsEnum(['to_read', 'reading', 'completed'])
  status?: 'to_read' | 'reading' | 'completed';

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  favorite?: boolean;
}
