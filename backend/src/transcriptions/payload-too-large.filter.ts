import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Response } from 'express';

// O multer devolve "File too large" em inglês; troca por mensagem em português.
@Catch(PayloadTooLargeException)
export class PayloadTooLargeFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    host.switchToHttp().getResponse<Response>().status(413).json({
      statusCode: 413,
      message: 'Arquivo grande demais: o limite é de 25 MB.',
      error: 'Payload Too Large',
    });
  }
}
