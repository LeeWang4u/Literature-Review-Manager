import { IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateSummaryDto {
  @ApiProperty({ description: 'Force regeneration if summary exists', required: false })
  @IsOptional()
  @IsBoolean()
  forceRegenerate?: boolean;
}
