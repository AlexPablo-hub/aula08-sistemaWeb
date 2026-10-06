import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { Role, User } from './entities/user.entity';
import { UsersService } from './users.service';

// Id fora do formato UUID também é 404 (o contrato só prevê 404).
const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Usuário não encontrado.'),
});

// A ordem importa: JwtAuthGuard autentica e carrega o usuário; RolesGuard confere o papel.
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as contas, da mais antiga para a mais nova' })
  @ApiOkResponse({ type: [UserResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Sem token ou token inválido.' })
  @ApiForbiddenResponse({ description: 'Usuário com papel user.' })
  findAll(): Promise<UserResponseDto[]> {
    return this.users.findAll();
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Altera nome, papel e/ou situação (ativa) de uma conta',
    description:
      'Exige ao menos um campo entre name, role e active; corpo vazio retorna 400.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Id do usuário.' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({
    description: 'Campo não permitido, valor inválido ou corpo sem campos.',
  })
  @ApiUnauthorizedResponse({ description: 'Sem token ou token inválido.' })
  @ApiForbiddenResponse({ description: 'Usuário com papel user.' })
  @ApiNotFoundResponse({
    description: 'Usuário inexistente ou id fora do formato UUID.',
  })
  @ApiConflictResponse({
    description: 'Administrador tentando desativar a própria conta (RN4).',
  })
  update(
    @CurrentUser() admin: User,
    @Param('id', uuidPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.users.update(admin.id, id, dto);
  }
}
