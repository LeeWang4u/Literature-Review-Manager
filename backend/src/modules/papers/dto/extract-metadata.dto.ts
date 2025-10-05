import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExtractMetadataDto {
  @ApiProperty({
    description: 'DOI or URL of the paper',
    example: '10.1038/nature12373',
    examples: {
      doi: {
        value: '10.1038/nature12373',
        description: 'A DOI identifier',
      },
      doiUrl: {
        value: 'https://doi.org/10.1038/nature12373',
        description: 'A DOI URL',
      },
      arxiv: {
        value: 'https://arxiv.org/abs/2103.12345',
        description: 'An arXiv URL',
      },
    },
  })
  @IsString()
  @IsNotEmpty()
  input: string;
}
