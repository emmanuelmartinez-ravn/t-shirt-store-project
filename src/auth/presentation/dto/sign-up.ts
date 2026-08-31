import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from '../validators/is-strong-password';

export class SignUpDto {
  @ApiProperty({
    description: 'name of the user',
    example: 'Joe',
  })
  @Transform(({ value }: { value: string }) => value.trim())
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({
    description: 'last name of the user',
    example: 'Doe',
  })
  @Transform(({ value }: { value: string }) => value.trim())
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({
    description: 'email address of the user',
    example: 'joe.doe@example.com',
  })
  @Transform(({ value }: { value: string }) => value.trim())
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'password of the user',
    example: 'Secret1!',
  })
  @Transform(({ value }: { value: string }) => value.trim())
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  password!: string;
}
