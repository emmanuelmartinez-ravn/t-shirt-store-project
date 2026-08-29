import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the category',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  id!: string;

  @ApiProperty({
    description: 'Unique name of the category',
    example: 'T-Shirts',
  })
  name!: string;

  @ApiProperty({
    description: 'Date the category was created',
    example: '2026-08-26T16:38:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date the category was last updated',
    example: '2026-08-26T16:38:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Date the category was soft-deleted, if applicable',
    example: null,
    nullable: true,
    type: String,
  })
  deletedAt!: Date | null;
}
