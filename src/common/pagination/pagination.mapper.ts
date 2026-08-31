import { PaginationMetaDto } from './dto/pagination-meta.dto';

export class PaginationMapper {
  static buildMeta(
    page: number,
    limit: number,
    total: number,
  ): PaginationMetaDto {
    const meta = new PaginationMetaDto();
    meta.page = page;
    meta.limit = limit;
    meta.total = total;
    meta.totalPages = Math.ceil(total / limit);
    return meta;
  }
}
