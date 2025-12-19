import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'Nguyen Van A',
    description: 'Full name',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  fullName?: string;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'Avatar URL',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  @MaxLength(500)
  avatarUrl?: string;
}
