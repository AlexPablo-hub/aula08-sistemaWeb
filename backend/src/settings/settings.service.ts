import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TranscriptionSettingsResponseDto } from './dto/transcription-settings-response.dto';
import { UpdateTranscriptionSettingsDto } from './dto/update-transcription-settings.dto';
import { AppSetting } from './entities/app-setting.entity';
import {
  DEFAULT_MODELS,
  PROVIDER_ORDER,
  TRANSCRIPTION_CATALOG,
  TranscriptionProviderName,
  inCatalog,
  providerApiKey,
} from './transcription-catalog';

const TRANSCRIPTION_KEY = 'transcription';

export interface TranscriptionSelection {
  provider: TranscriptionProviderName;
  model: string;
  source: 'default' | 'admin';
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AppSetting)
    private readonly repo: Repository<AppSetting>,
    private readonly config: ConfigService,
  ) {}

  // Lido do banco a cada chamada: a escolha vale na hora, sem cache.
  // Sem escolha salva (ou com valor inválido), vale o padrão (RN19).
  async resolveTranscription(): Promise<TranscriptionSelection> {
    const saved = await this.readSaved();
    if (saved) {
      return { ...saved, source: 'admin' };
    }
    const provider =
      PROVIDER_ORDER.find((p) => this.hasKey(p)) ??
      TranscriptionProviderName.Groq;
    return { provider, model: DEFAULT_MODELS[provider], source: 'default' };
  }

  async getTranscription(): Promise<TranscriptionSettingsResponseDto> {
    return this.toResponse(await this.resolveTranscription());
  }

  async updateTranscription(
    dto: UpdateTranscriptionSettingsDto,
  ): Promise<TranscriptionSettingsResponseDto> {
    if (!inCatalog(dto.provider, dto.model)) {
      throw new BadRequestException(
        'Combinação de provedor e modelo fora do catálogo.',
      );
    }
    if (!this.hasKey(dto.provider)) {
      throw new BadRequestException(
        'O provedor escolhido não está configurado no servidor.',
      );
    }
    await this.repo.save(
      this.repo.create({
        key: TRANSCRIPTION_KEY,
        value: JSON.stringify({ provider: dto.provider, model: dto.model }),
      }),
    );
    return this.getTranscription();
  }

  private hasKey(provider: TranscriptionProviderName): boolean {
    return providerApiKey(this.config, provider) !== undefined;
  }

  private async readSaved(): Promise<{
    provider: TranscriptionProviderName;
    model: string;
  } | null> {
    const row = await this.repo.findOneBy({ key: TRANSCRIPTION_KEY });
    if (!row) return null;
    try {
      const parsed = JSON.parse(row.value) as {
        provider?: unknown;
        model?: unknown;
      };
      if (
        typeof parsed.provider === 'string' &&
        typeof parsed.model === 'string' &&
        inCatalog(parsed.provider, parsed.model)
      ) {
        return {
          provider: parsed.provider as TranscriptionProviderName,
          model: parsed.model,
        };
      }
    } catch {
      // JSON corrompido: ignora e usa o padrão.
    }
    return null;
  }

  private toResponse(
    selection: TranscriptionSelection,
  ): TranscriptionSettingsResponseDto {
    return {
      provider: selection.provider,
      model: selection.model,
      source: selection.source,
      options: TRANSCRIPTION_CATALOG.map((o) => ({
        provider: o.provider,
        model: o.model,
        label: o.label,
        available: this.hasKey(o.provider),
      })),
    };
  }
}
