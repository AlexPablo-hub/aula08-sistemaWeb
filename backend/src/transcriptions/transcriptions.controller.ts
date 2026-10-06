import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  StreamableFile,
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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { TAMANHO_MAXIMO_BYTES } from './audio-upload';
import { CreateTranscriptionDto } from './dto/create-transcription.dto';
import { UpdateTranscriptionDto } from './dto/update-transcription.dto';
import { TranscriptionResponseDto } from './dto/transcription-response.dto';
import { PayloadTooLargeFilter } from './payload-too-large.filter';
import { TranscriptionsService } from './transcriptions.service';

// Id fora do formato UUID também é 404, para não vazar nada (o contrato só prevê 404).
const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Transcrição não encontrada.'),
});

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
      'Falha, indisponibilidade ou falta de configuração do provedor de transcrição, ou falha do armazenamento do áudio.',
  })
  create(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateTranscriptionDto,
  ): Promise<TranscriptionResponseDto> {
    return this.transcriptions.create(user.id, file, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lista as transcrições do usuário, da mais recente para a mais antiga',
  })
  @ApiOkResponse({ type: [TranscriptionResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Sem token ou token inválido.' })
  findAll(@CurrentUser() user: User): Promise<TranscriptionResponseDto[]> {
    return this.transcriptions.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Devolve uma transcrição do usuário' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Id da transcrição.' })
  @ApiOkResponse({ type: TranscriptionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sem token ou token inválido.' })
  @ApiNotFoundResponse({
    description:
      'Transcrição inexistente, de outro usuário ou id fora do formato UUID.',
  })
  findOne(
    @CurrentUser() user: User,
    @Param('id', uuidPipe) id: string,
  ): Promise<TranscriptionResponseDto> {
    return this.transcriptions.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita o título de uma transcrição do usuário' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Id da transcrição.' })
  @ApiBody({ type: UpdateTranscriptionDto })
  @ApiResponse({
    status: 200,
    description: 'Transcrição atualizada.',
    type: TranscriptionResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Título ausente, em branco ou acima de 120 caracteres, ou campo extra.',
  })
  @ApiUnauthorizedResponse({ description: 'Sem token ou token inválido.' })
  @ApiNotFoundResponse({
    description:
      'Transcrição inexistente, de outro usuário ou id fora do formato UUID.',
  })
  update(
    @CurrentUser() user: User,
    @Param('id', uuidPipe) id: string,
    @Body() dto: UpdateTranscriptionDto,
  ): Promise<TranscriptionResponseDto> {
    return this.transcriptions.update(user.id, id, dto);
  }

  @Get(':id/audio')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Devolve o áudio guardado de uma transcrição' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Id da transcrição.' })
  @ApiProduces('audio/*')
  @ApiResponse({
    status: 200,
    description: 'Arquivo de áudio, com o Content-Type do áudio original.',
    content: {
      'audio/*': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Sem token ou token inválido.' })
  @ApiNotFoundResponse({
    description:
      'Transcrição inexistente, de outro usuário, sem áudio guardado ou id fora do formato UUID.',
  })
  async findAudio(
    @CurrentUser() user: User,
    @Param('id', uuidPipe) id: string,
  ): Promise<StreamableFile> {
    const audio = await this.transcriptions.getAudio(user.id, id);
    return new StreamableFile(audio.stream, {
      type: audio.contentType,
      length: audio.contentLength,
      disposition: 'inline',
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui uma transcrição do usuário' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Id da transcrição.' })
  @ApiNoContentResponse({ description: 'Transcrição excluída, sem corpo.' })
  @ApiUnauthorizedResponse({ description: 'Sem token ou token inválido.' })
  @ApiNotFoundResponse({
    description:
      'Transcrição inexistente, de outro usuário ou id fora do formato UUID.',
  })
  remove(
    @CurrentUser() user: User,
    @Param('id', uuidPipe) id: string,
  ): Promise<void> {
    return this.transcriptions.remove(user.id, id);
  }
}
