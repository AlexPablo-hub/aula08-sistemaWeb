import { BadRequestException } from '@nestjs/common';

export const TAMANHO_MAXIMO_BYTES = 25 * 1024 * 1024;

// RN6: formatos aceitos, validados pela extensão do nome original.
export const EXTENSOES_ACEITAS = [
  'mp3',
  'm4a',
  'wav',
  'ogg',
  'webm',
  'flac',
  'mp4',
  'mpeg',
];

// O mimetype informado pelo cliente também precisa ser de áudio, de contêiner
// de vídeo compatível ou genérico (alguns sistemas enviam octet-stream).
const MIMETYPE_ACEITO =
  /^(audio\/.+|video\/(mp4|webm|mpeg)|application\/(ogg|octet-stream))$/i;

// Extensão em minúsculas, sem o ponto; vazia se o nome não tiver extensão.
export function extensaoDoArquivo(nome: string): string {
  const ponto = nome.lastIndexOf('.');
  return ponto >= 0 ? nome.slice(ponto + 1).toLowerCase() : '';
}

export function validarAudio(file: Express.Multer.File | undefined): void {
  if (!file) {
    throw new BadRequestException(
      'Arquivo de áudio ausente: envie o campo "file".',
    );
  }
  const extensao = extensaoDoArquivo(file.originalname);
  if (
    !EXTENSOES_ACEITAS.includes(extensao) ||
    !MIMETYPE_ACEITO.test(file.mimetype)
  ) {
    throw new BadRequestException(
      `Tipo de arquivo não aceito. Formatos permitidos: ${EXTENSOES_ACEITAS.join(', ')}.`,
    );
  }
}
