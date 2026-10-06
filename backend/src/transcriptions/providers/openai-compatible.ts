import { BadGatewayException } from '@nestjs/common';
import { TIMEOUT_MS, TranscribeInput } from './transcription-provider';

// Envia multipart no formato OpenAI (file, model, language, response_format)
// e devolve o campo "text". Usado pela Groq e pelo OpenRouter.
// Nunca registra a chave, o conteúdo do áudio nem o corpo da resposta.
export async function transcribeMultipart(
  nome: string,
  url: string,
  apiKey: string,
  model: string,
  input: TranscribeInput,
): Promise<string> {
  const form = new FormData();
  form.append(
    'file',
    new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }),
    input.fileName,
  );
  form.append('model', model);
  form.append('language', input.language);
  form.append('response_format', 'json');

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new BadGatewayException(
      `O serviço de transcrição (${nome}) está indisponível. Tente novamente mais tarde.`,
    );
  }

  if (!resposta.ok) {
    throw new BadGatewayException(
      `O serviço de transcrição (${nome}) recusou o pedido (HTTP ${resposta.status}).`,
    );
  }

  let texto: unknown;
  try {
    texto = ((await resposta.json()) as { text?: unknown }).text;
  } catch {
    texto = undefined;
  }
  if (typeof texto !== 'string') {
    throw new BadGatewayException(
      `O serviço de transcrição (${nome}) devolveu uma resposta inválida.`,
    );
  }
  return texto;
}
