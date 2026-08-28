import { ApiResponseExamples } from '@nestjs/swagger';

export const internalServerErrorExample: ApiResponseExamples = {
  summary: 'Unexpected server error',
  value: {
    error: 'Internal Server Error',
    details: [],
  },
};
