# Ditado

Aplicação web de transcrição de áudio. O visitante cria uma conta, envia um arquivo de áudio e recebe o texto transcrito pelo modelo Whisper. As transcrições ficam num histórico pessoal e um administrador gerencia as contas.

A especificação do produto está em [`docs/ESPECIFICACAO.md`](docs/ESPECIFICACAO.md), o sistema de design em [`docs/DESIGN.md`](docs/DESIGN.md) e as regras de trabalho em [`AGENTS.md`](AGENTS.md).

Pilha: React + Vite + TypeScript e Tailwind CSS v4 no frontend; NestJS + TypeORM e PostgreSQL 18 no backend.

Todos os comandos abaixo são para o **PowerShell** no Windows. Não há scripts `.sh`.

## 1. Pré-requisitos

- Node.js 22 ou superior (`node -v`)
- Docker Desktop, aberto e em execução (`docker --version`)
- Git
- PowerShell. Prefira o PowerShell 7 (`pwsh`); veja a seção de solução de problemas sobre o PowerShell 5 e caminhos com acento.
- Uma chave de API do Groq **ou** do OpenRouter, apenas para transcrever áudio (o restante funciona sem ela)

## 2. Clonar

```powershell
git clone <url-do-repositorio> ditado
cd ditado
```

## 3. Configurar o `backend/.env`

Copie o modelo e edite o arquivo copiado. O `backend/.env` não é versionado; **nunca coloque valores reais em `.env.example`**.

```powershell
Copy-Item .env.example backend\.env
notepad backend\.env
```

Preencha as variáveis:

| Variável | O que é |
|---|---|
| `DATABASE_HOST` | Host do PostgreSQL. Use `localhost`. |
| `DATABASE_PORT` | Porta publicada pelo Docker no seu computador: `5433`. |
| `DATABASE_USER` | Usuário do banco, criado pelo Docker na primeira subida (sugestão: `ditado`). |
| `DATABASE_PASSWORD` | Senha do banco, à sua escolha. O Docker a grava na primeira subida. |
| `DATABASE_NAME` | Nome do banco (sugestão: `ditado`). |
| `JWT_SECRET` | Texto longo e aleatório que assina os tokens. Quem o conhece emite tokens válidos. |
| `JWT_EXPIRES_IN` | Validade do token. Padrão `1d`. |
| `ADMIN_EMAIL` | E-mail do administrador inicial, criado na primeira inicialização se não existir. |
| `ADMIN_PASSWORD` | Senha do administrador inicial (mínimo de 8 caracteres; guardada só como hash). |
| `TRANSCRIPTION_PROVIDER` | `groq` ou `openrouter`. Vazio: usa o Groq se `GROQ_API_KEY` estiver preenchida e, senão, o OpenRouter se `OPENROUTER_API_KEY` estiver preenchida. |
| `GROQ_API_KEY` | Chave pessoal do Groq (começa com `gsk_`). |
| `GROQ_MODEL` | Modelo do Groq. Padrão `whisper-large-v3-turbo`. |
| `OPENROUTER_API_KEY` | Chave pessoal do OpenRouter (começa com `sk-or-`). |
| `OPENROUTER_MODEL` | Modelo do OpenRouter. Padrão `openai/whisper-large-v3-turbo`. |
| `PORT` | Porta da API. Padrão `3000`. |
| `DOCS_USER` e `DOCS_PASSWORD` | Usuário e senha (Basic auth) da documentação em `/docs`. Se omitidas, o padrão de desenvolvimento é `admin` / `admin`. |

Use só um provedor: preencha as variáveis do Groq **ou** as do OpenRouter. Sem nenhuma chave, a aplicação sobe normalmente e o envio de áudio responde 502.

Para gerar um `JWT_SECRET` aleatório no PowerShell (cole o resultado no `backend\.env`):

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
```

## 4. Subir o banco

Na raiz do repositório:

```powershell
docker compose --env-file backend/.env up -d
docker compose ps
```

A flag `--env-file backend/.env` é necessária: o `docker-compose.yml` lê `DATABASE_USER`, `DATABASE_PASSWORD` e `DATABASE_NAME` desse arquivo, e o Docker Compose, por padrão, só lê um `.env` na pasta atual (a raiz), onde ele não existe. Sem a flag, o banco sobe com valores em branco.

`docker compose ps` deve mostrar `127.0.0.1:5433->5432/tcp`. A porta é publicada somente em `127.0.0.1`: o banco não fica acessível a outras máquinas da rede.

## 5. Backend

```powershell
cd backend
npm install
npm run start:dev
```

A API sobe em http://localhost:3000 (prefixo `/api`). Teste: `Invoke-RestMethod http://localhost:3000/api/health` retorna `status: ok`. O esquema do banco é criado automaticamente (`synchronize: true`, só para desenvolvimento) e o administrador inicial é criado na primeira inicialização.

Deixe este terminal aberto e abra outro para o frontend.

## 6. Frontend

```powershell
cd frontend
npm install
npm run dev
```

O Vite sobe em http://localhost:5173 e encaminha `/api` para `http://localhost:3000` (proxy do `vite.config.ts`, só em desenvolvimento). O frontend não tem `.env` e não guarda segredo. Rode `npm install` sempre dentro de `backend/` e de `frontend/`, **nunca na raiz**: cada projeto tem o seu `package.json`.

## 7. Acessar e usar

Abra http://localhost:5173.

1. **Entrar como administrador:** em `/entrar`, use `ADMIN_EMAIL` e `ADMIN_PASSWORD` do `backend/.env`.
2. **Cadastrar:** em `/cadastrar`, crie uma conta comum (nome, e-mail e senha de 8 ou mais caracteres). O cadastro público sempre cria papel `user`.
3. **Enviar áudio:** em `/app`, escolha um arquivo (`mp3`, `m4a`, `wav`, `ogg`, `webm`, `flac`, `mp4` ou `mpeg`, até 25 MB) e o idioma, e clique em Enviar áudio. O texto aparece na tela.
4. **Histórico:** na mesma página, cada transcrição pode ser vista por inteiro ou excluída.
5. **Administração:** o administrador vê o link Administração e acessa `/app/admin`, onde lista as contas e altera nome, papel e situação (ativa ou inativa). O administrador não consegue desativar a própria conta. Usuário comum que abrir `/app/admin` é levado a `/app`.

## 8. Documentação da API (`/docs`)

Com o backend em execução, abra http://localhost:3000/docs (Swagger UI). O acesso pede autenticação Basic com `DOCS_USER` e `DOCS_PASSWORD` (ou `admin` / `admin` se não definidas).

## 9. Testes e verificação

```powershell
# Backend (o banco precisa estar de pé; os testes e2e usam o banco configurado)
cd backend
npm test
npm run build

# Frontend
cd ..\frontend
npm run build
npm run lint
```

## 10. Estrutura de pastas

```
docs/ESPECIFICACAO.md   produto: o que construir (fonte da verdade)
docs/DESIGN.md          sistema de design do frontend
AGENTS.md               como trabalhar no repositório
.env.example            nomes das variáveis, sem valores sensíveis
docker-compose.yml      PostgreSQL local
backend/src/            módulos: common, health, auth, users, transcriptions
backend/test/           testes e2e (supertest)
frontend/src/           pages, components (ui, layout), services, store, types
```

## 11. Solução de problemas

**Porta 3000 (ou 5173) ocupada.** Descubra o processo e encerre-o:

```powershell
netstat -ano | findstr :3000
taskkill /PID <numero-do-pid> /F
```

**Porta do banco ocupada.** O `docker compose up` falha com "port is already allocated" se algo já usa a 5433. Descubra com `netstat -ano | findstr :5433`. O compose usa a 5433 justamente porque um PostgreSQL instalado no Windows costuma ocupar a 5432. Se precisar trocar, altere a porta em `docker-compose.yml` e `DATABASE_PORT` no `backend/.env`.

**Esqueci o `--env-file`.** Sintoma: avisos `The "DATABASE_USER" variable is not set` e banco com usuário ou senha em branco. Se o volume já foi criado assim, o banco guardou valores errados; apague o volume (isso apaga os dados locais) e suba de novo com a flag:

```powershell
docker compose down -v
docker compose --env-file backend/.env up -d
```

**Erro de autenticação no banco depois de mudar `DATABASE_PASSWORD`.** O Docker só grava usuário e senha na primeira criação do volume. Use `docker compose down -v` (apaga os dados) para recriar.

**PowerShell 5 (Windows PowerShell) e caminhos com acento.** Em pastas como `TÓPICOS ESPECIAIS`, scripts e comandos podem falhar no PowerShell 5 por causa da codificação. Use o PowerShell 7 (`pwsh`) ou clone o projeto num caminho sem acentos.

**Envio de áudio responde 502.** Falta a chave do provedor, ela é inválida ou o provedor está indisponível. Confira `GROQ_API_KEY` ou `OPENROUTER_API_KEY` e reinicie o backend.

## 12. Divergências conhecidas da especificação

A especificação (`docs/ESPECIFICACAO.md`, seção 12) registra o que mudou em relação ao rascunho inicial. Os pontos que afetam quem roda o projeto:

- **Porta do banco 5433, não 5432.** O repositório publica `127.0.0.1:5433` porque o serviço do PostgreSQL do Windows ocupa a 5432 na máquina de desenvolvimento. `DATABASE_PORT` no `.env.example` é `5433`.
- **PostgreSQL 18** (`postgres:18-alpine`).
- **Banco com `--env-file`.** O compose lê usuário, senha e nome do banco de `backend/.env`.
- **Groq ou OpenRouter** para a transcrição, escolhidos por `TRANSCRIPTION_PROVIDER`.

## 13. Declaração de uso de IA

Ferramentas de IA foram usadas no **desenvolvimento** do projeto, conforme a seção 11 da especificação.

| Etapa | Ferramenta | Modelo |
|---|---|---|
| 1. Infraestrutura e esqueleto do backend | Claude Code (Anthropic) | [confirmar o modelo usado na Etapa 1] |
| 2 a 9. Backend (usuários, autenticação, transcrição, histórico, administração), frontend (páginas, envio, histórico, administração) e README | Claude Code (Anthropic), por meio de agentes (subagentes) do Claude Code | Claude Sonnet 5.5 (`claude-sonnet-5-5`) |

Como foi usado: a especificação e o `AGENTS.md` serviram de guia para os agentes. O plano da Etapa 2 foi proposto e aprovado antes de qualquer arquivo ser criado. As Etapas 3 a 9 foram executadas em sequência, uma por agente, com a execução autorizada de uma vez, sem aprovação de plano a cada etapa; cada agente rodou os critérios de aceite da sua etapa e fez o commit dela. O que os agentes não puderam verificar, o comportamento das telas no navegador, ficou para conferência manual do grupo, assim como a revisão do código.

O **Whisper** (via Groq ou OpenRouter) é usado apenas **em tempo de execução**, para transcrever os áudios enviados à aplicação. Ele não é ferramenta de desenvolvimento.
