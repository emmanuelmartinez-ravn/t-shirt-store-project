import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { MatchesProperty } from '../../../users/presentation/dto/validators/matches-property';
import { IsStrongPassword } from '../validators/is-strong-password';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'password reset token received via email',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  @Transform(({ value }: { value: string }) => value.trim())
  @IsString()
  @IsNotEmpty()
  token!: string;

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
