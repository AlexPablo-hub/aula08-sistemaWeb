import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Transcription } from './entities/transcription.entity';
import { TRANSCRIPTION_PROVIDER } from './providers/transcription-provider';
import { criarProvedor } from './providers/transcription-provider.factory';
import { TranscriptionsController } from './transcriptions.controller';
import { TranscriptionsService } from './transcriptions.service';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    TypeOrmModule.forFeature([Transcription]),
  ],
  controllers: [TranscriptionsController],
  providers: [
    TranscriptionsService,
    {
      provide: TRANSCRIPTION_PROVIDER,
      inject: [ConfigService],
      useFactory: criarProvedor,
    },
  ],
})
export class TranscriptionsModule {}
