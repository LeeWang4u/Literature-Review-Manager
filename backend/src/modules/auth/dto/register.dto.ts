import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'Password (min 6 characters)',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'Nguyen Van A',
    description: 'Full name of the user',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName: string;

  @ApiProperty({
    example: 'University of Science',
    description: 'User affiliation',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  affiliation?: string;

  @ApiProperty({
    example: 'Machine Learning, Natural Language Processing',
    description: 'Research interests',
    required: false,
  })
  @IsString()
  @IsOptional()
  researchInterests?: string;
}
