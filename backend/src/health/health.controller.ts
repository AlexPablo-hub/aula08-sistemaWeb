import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Saúde')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Verifica se a API está no ar' })
  @ApiOkResponse({
    description: 'API disponível',
    schema: { example: { status: 'ok' } },
  })
  check(): { status: string } {
    return { status: 'ok' };
  }
}
