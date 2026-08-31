import { PaginationMetaDto } from './dto/pagination-meta.dto';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetaDto;
}
