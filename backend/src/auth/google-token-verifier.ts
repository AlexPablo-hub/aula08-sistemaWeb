import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

// Classe abstrata usada como token de injeção: os testes a sobrescrevem
// e nunca chamam a rede do Google.
export abstract class GoogleTokenVerifier {
  abstract verify(credential: string): Promise<GoogleIdentity>;
}

@Injectable()
export class GoogleOAuthTokenVerifier extends GoogleTokenVerifier {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService) {
    super();
  }

  // Valida assinatura, emissor, validade e audience (GOOGLE_CLIENT_ID).
  // Qualquer falha vira 401; o token nunca é registrado em log.
  async verify(credential: string): Promise<GoogleIdentity> {
    const audience = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim();
    if (!audience) {
      throw new UnauthorizedException('Login com Google não configurado.');
    }
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) {
        throw new Error('payload incompleto');
      }
      return {
        sub: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified === true,
        name: payload.name ?? '',
      };
    } catch {
      throw new UnauthorizedException('Credencial do Google inválida.');
    }
  }
}
