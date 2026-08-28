import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

const PASSWORD_MIN_LENGTH = 8;

const PASSWORD_SYMBOLS = [
  '!',
  '@',
  '#',
  '$',
  '%',
  '^',
  '&',
  '*',
  '(',
  ')',
  '-',
  '_',
  '+',
  '=',
  '[',
  ']',
  '{',
  '}',
  '|',
  ':',
  ';',
  '"',
  "'",
  ',',
  '.',
  '<',
  '>',
  '/',
  '?',
  '~',
  '`',
  '\\',
];

const PASSWORD_SYMBOLS_PATTERN = PASSWORD_SYMBOLS.map(
  (symbol) => `\\${symbol}`,
).join('');

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
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
  })
  @Matches(/[a-z]/, {
    message: 'password must contain at least one lowercase letter',
  })
  @Matches(/[A-Z]/, {
    message: 'password must contain at least one uppercase letter',
  })
  @Matches(/\d/, {
    message: 'password must contain at least one number',
  })
  @Matches(new RegExp(`[${PASSWORD_SYMBOLS_PATTERN}]`), {
    message: `password must contain at least one symbol (${PASSWORD_SYMBOLS.join(' ')})`,
  })
  password!: string;
}
