import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { TAMANHO_MAXIMO_BYTES } from './audio-upload';
import { CreateTranscriptionDto } from './dto/create-transcription.dto';
import { TranscriptionResponseDto } from './dto/transcription-response.dto';
import { PayloadTooLargeFilter } from './payload-too-large.filter';
import { TranscriptionsService } from './transcriptions.service';

@ApiTags('transcriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transcriptions')
export class TranscriptionsController {
  constructor(private readonly transcriptions: TranscriptionsService) {}

  @Post()
  @UseFilters(PayloadTooLargeFilter)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: TAMANHO_MAXIMO_BYTES } }),
  )
  @ApiOperation({ summary: 'Envia um áudio e recebe o texto transcrito' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Áudio até 25 MB: mp3, m4a, wav, ogg, webm, flac, mp4 ou mpeg.',
        },
        language: {
          type: 'string',
          default: 'pt',
          description: 'Código ISO 639-1 de duas letras minúsculas.',
        },
      },
    },
  })
  @ApiCreatedResponse({ type: TranscriptionResponseDto })
  @ApiBadRequestResponse({
    description: 'Arquivo ausente, tipo não aceito ou idioma inválido.',
  })
  @ApiUnauthorizedResponse({ description: 'Sem token ou token inválido.' })
  @ApiResponse({ status: 413, description: 'Arquivo acima de 25 MB.' })
  @ApiBadGatewayResponse({
    description:
      'Falha, indisponibilidade ou falta de configuração do provedor.',
  })
  create(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateTranscriptionDto,
  ): Promise<TranscriptionResponseDto> {
    return this.transcriptions.create(user.id, file, dto);
  }
}
