import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateProductDto {
  @ApiProperty({
    description: 'Name of the product',
    example: 'Classic Tee',
  })
  @Transform(({ value }: { value: string }) => value.trim())
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Description of the product',
    example: 'A classic cotton t-shirt',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Id of the category this product belongs to',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;
}
