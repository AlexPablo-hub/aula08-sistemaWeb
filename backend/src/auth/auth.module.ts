import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  GoogleOAuthTokenVerifier,
  GoogleTokenVerifier,
} from './google-token-verifier';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // Aceita "1d", "2h" etc.
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '1d') as never,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: GoogleTokenVerifier, useClass: GoogleOAuthTokenVerifier },
  ],
  exports: [PassportModule],
})
export class AuthModule {}
