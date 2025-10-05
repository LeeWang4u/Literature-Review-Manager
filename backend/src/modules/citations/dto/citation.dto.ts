import { IsNotEmpty, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCitationDto {
  @ApiProperty({ description: 'Citing paper ID', example: 1 })
  @IsNotEmpty()
  @IsInt()
  citingPaperId: number;

  @ApiProperty({ description: 'Cited paper ID', example: 2 })
  @IsNotEmpty()
  @IsInt()
  citedPaperId: number;
}
