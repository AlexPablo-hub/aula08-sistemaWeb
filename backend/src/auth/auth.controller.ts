import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { GoogleAuthDto, GoogleClientIdDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Cadastra uma conta com papel user' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Corpo inválido ou campo role enviado.' })
  @ApiConflictResponse({ description: 'E-mail já cadastrado.' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Entra com e-mail e senha' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Corpo inválido.' })
  @ApiUnauthorizedResponse({
    description: 'Credenciais inválidas ou conta desativada.',
  })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Entra ou cadastra com um ID token do Google',
    description:
      'Papel user para conta nova; conta existente com o mesmo e-mail verificado é vinculada.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Corpo inválido.' })
  @ApiUnauthorizedResponse({
    description:
      'Token inválido, e-mail não verificado, conta desativada, googleId diferente ou login com Google não configurado.',
  })
  google(@Body() dto: GoogleAuthDto): Promise<AuthResponseDto> {
    return this.auth.loginWithGoogle(dto);
  }

  @Get('google')
  @ApiOperation({
    summary: 'Informa o client ID público do Google, usado pelo botão de login',
  })
  @ApiOkResponse({ type: GoogleClientIdDto })
  @ApiNotFoundResponse({ description: 'Login com Google não configurado.' })
  googleClientId(): GoogleClientIdDto {
    const clientId = this.auth.getGoogleClientId();
    if (!clientId) {
      throw new NotFoundException('Login com Google não configurado.');
    }
    return { clientId };
  }
}
