import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../users/entities/user.entity';
import { TranscriptionSettingsResponseDto } from './dto/transcription-settings-response.dto';
import { UpdateTranscriptionSettingsDto } from './dto/update-transcription-settings.dto';
import { SettingsService } from './settings.service';

// A ordem importa: JwtAuthGuard autentica e carrega o usuário; RolesGuard confere o papel.
@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('transcription')
  @ApiOperation({
    summary: 'Lê o provedor e o modelo de transcrição e o catálogo de opções',
    description:
      'Nunca devolve chaves de API; "available" indica se a chave do provedor está configurada.',
  })
  @ApiOkResponse({ type: TranscriptionSettingsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sem token ou token inválido.' })
  @ApiForbiddenResponse({ description: 'Usuário com papel user.' })
  getTranscription(): Promise<TranscriptionSettingsResponseDto> {
    return this.settings.getTranscription();
  }

  @Patch('transcription')
  @ApiOperation({
    summary: 'Escolhe o provedor e o modelo de transcrição (global)',
  })
  @ApiOkResponse({ type: TranscriptionSettingsResponseDto })
  @ApiBadRequestResponse({
    description:
      'Campo ausente, extra ou inválido; combinação fora do catálogo; provedor sem chave configurada.',
  })
  @ApiUnauthorizedResponse({ description: 'Sem token ou token inválido.' })
  @ApiForbiddenResponse({ description: 'Usuário com papel user.' })
  updateTranscription(
    @Body() dto: UpdateTranscriptionSettingsDto,
  ): Promise<TranscriptionSettingsResponseDto> {
    return this.settings.updateTranscription(dto);
  }
}
