import { BadGatewayException } from '@nestjs/common';
import { AudioInput, TIMEOUT_MS } from './transcription-provider';

// Envia multipart no formato OpenAI (file, model, language, response_format)
// e devolve o campo "text". Usado pela Groq e pelo OpenRouter.
// Nunca registra a chave, o conteúdo do áudio nem o corpo da resposta.
export function transcribeMultipart(
  nome: string,
  url: string,
  apiKey: string,
  model: string,
  input: AudioInput,
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
  return enviar(nome, url, { Authorization: `Bearer ${apiKey}` }, form);
}

// Formato de áudio para o campo input_audio.format: a extensão do arquivo
// (o tipo já foi validado antes); "mpeg" é MP3.
function formatoDoArquivo(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return ext === 'mpeg' ? 'mp3' : ext;
}

// Variante JSON do OpenRouter: input_audio com o áudio em base64.
export function transcribeJsonBase64(
  nome: string,
  url: string,
  apiKey: string,
  model: string,
  input: AudioInput,
): Promise<string> {
  return enviar(
    nome,
    url,
    { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    JSON.stringify({
      model,
      input_audio: {
        data: input.buffer.toString('base64'),
        format: formatoDoArquivo(input.fileName),
      },
      language: input.language,
      response_format: 'json',
    }),
  );
}

async function enviar(
  nome: string,
  url: string,
  headers: Record<string, string>,
  body: FormData | string,
): Promise<string> {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: 'POST',
      headers,
      body,
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
