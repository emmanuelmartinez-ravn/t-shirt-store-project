import { applyDecorators } from '@nestjs/common';
import { Matches, MinLength, ValidationArguments } from 'class-validator';

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

export function IsStrongPassword(): PropertyDecorator {
  return applyDecorators(
    MinLength(PASSWORD_MIN_LENGTH, {
      message: (args: ValidationArguments) =>
        `${args.property} must be at least ${PASSWORD_MIN_LENGTH} characters long`,
    }),
    Matches(/[a-z]/, {
      message: (args: ValidationArguments) =>
        `${args.property} must contain at least one lowercase letter`,
    }),
    Matches(/[A-Z]/, {
      message: (args: ValidationArguments) =>
        `${args.property} must contain at least one uppercase letter`,
    }),
    Matches(/\d/, {
      message: (args: ValidationArguments) =>
        `${args.property} must contain at least one number`,
    }),
    Matches(new RegExp(`[${PASSWORD_SYMBOLS_PATTERN}]`), {
      message: (args: ValidationArguments) =>
        `${args.property} must contain at least one symbol (${PASSWORD_SYMBOLS.join(' ')})`,
    }),
  );
}
