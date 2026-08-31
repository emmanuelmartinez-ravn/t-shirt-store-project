import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from '../../../auth/presentation/validators/is-strong-password';
import { MatchesProperty } from './validators/matches-property';

export class UpdatePasswordDto {
  @ApiProperty({
    description: "current password of the authenticated user's account",
    example: 'Secret1!',
  })
  @Transform(({ value }: { value: string }) => value.trim())
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @ApiProperty({
    description: 'new password to set',
    example: 'NewSecret1!',
  })
  @Transform(({ value }: { value: string }) => value.trim())
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  newPassword!: string;

  @ApiProperty({
    description: 'must match newPassword',
    example: 'NewSecret1!',
  })
  @Transform(({ value }: { value: string }) => value.trim())
  @IsString()
  @IsNotEmpty()
  @MatchesProperty('newPassword', {
    message: 'confirmPassword must match newPassword',
  })
  confirmPassword!: string;
}
