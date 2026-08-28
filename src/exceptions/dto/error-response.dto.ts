import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Short description of the error',
    example: 'Bad Request',
  })
  error!: string;

  @ApiProperty({
    description: 'Additional details about the error, if any',
    example: [],
    type: [String],
  })
  details!: string[];
}
