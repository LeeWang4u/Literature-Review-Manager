import { IsNotEmpty, IsEnum, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LibraryStatus } from '../user-library.entity';

export class AddToLibraryDto {
  @ApiProperty({ description: 'Paper ID', example: 1 })
  @IsNotEmpty()
  @IsInt()
  paperId: number;


}

export class UpdateLibraryStatusDto {
  @ApiProperty({ enum: LibraryStatus, example: 'reading' })
  @IsNotEmpty()
  @IsEnum(LibraryStatus)
  status: LibraryStatus;
}

export class RatePaperDto {
  @ApiProperty({ description: 'Rating (1-5)', example: 4, minimum: 1, maximum: 5 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}
