import { IsNumber } from 'class-validator';

export class AddPaperToLibraryDto {
  @IsNumber()
  paperId: number;
}
