import { Module } from '@nestjs/common';
import { createS3Client } from './config/s3-client';
import { FileStorageService } from './services/file-storage.service';
import { ImageProcessorService } from './services/image-processor.service';
import { S3FileStorageService } from './services/s3-file-storage.service';
import { SharpImageProcessorService } from './services/sharp-image-processor.service';
import { S3_CLIENT } from './storage.constants';

@Module({
  providers: [
    { provide: S3_CLIENT, useFactory: createS3Client },
    { provide: FileStorageService, useClass: S3FileStorageService },
    { provide: ImageProcessorService, useClass: SharpImageProcessorService },
  ],
  exports: [FileStorageService, ImageProcessorService],
})
export class StorageModule {}
