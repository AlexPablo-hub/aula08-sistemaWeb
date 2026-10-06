import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AudioStorage } from './audio-storage';
import { S3AudioStorage } from './s3-audio-storage';

@Module({
  imports: [ConfigModule],
  providers: [{ provide: AudioStorage, useClass: S3AudioStorage }],
  exports: [AudioStorage],
})
export class StorageModule {}
