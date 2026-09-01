import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/dto/pagination-query.dto';
import { PRODUCT_FIELDS, ProductField } from '../../domain/models/product';

export class ProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Partial, case-insensitive match against the product name',
    example: 'shirt',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by category id',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      'Additional fields to include in the response. Currently supported: productVariants',
    isArray: true,
    enum: PRODUCT_FIELDS,
    example: ['productVariants'],
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) return undefined;
    const values = Array.isArray(value) ? value : [value];
    return values
      .flatMap((v) => String(v).split(','))
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  })
  @IsArray()
  @IsIn(PRODUCT_FIELDS, { each: true })
  fields?: ProductField[];
}
