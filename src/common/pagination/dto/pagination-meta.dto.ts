import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Current page number', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  limit!: number;

  @ApiProperty({
    description: 'Total number of items across all pages',
    example: 100,
  })
  total!: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages!: number;
}
