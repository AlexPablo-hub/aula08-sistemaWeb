# Ditado — Especificação

Versão: 0.5 (acrescenta a permanência do áudio enviado, guardado num bucket MinIO e reproduzido no histórico; a 0.4 acrescentou a escolha do provedor e do modelo de transcrição no painel do administrador; as diferenças em relação às versões anteriores estão na seção 12)

## 1. Visão geral

O Ditado é uma aplicação web de transcrição de áudio. O visitante conhece o produto numa página inicial, cria uma conta e, na área interna, envia um arquivo de áudio e recebe o texto transcrito. As transcrições ficam salvas num histórico pessoal. Um administrador gerencia as contas.

A transcrição é feita pelo modelo Whisper, na API da Groq ou do OpenRouter (provedor e modelo escolhidos pelo administrador no painel; ver seções 5 e 8). A chave do provedor fica somente no backend.

## 2. Escopo

Dentro do escopo:

- Página inicial pública.
- Cadastro e login com e-mail e senha.
- Login e cadastro com conta Google (botão do Google Identity Services; o navegador obtém um ID token e o backend o valida).
- Envio de um arquivo de áudio por vez, com escolha de idioma.
- Histórico pessoal de transcrições: listar, ler e excluir.
- Área administrativa: listar contas, alterar nome e papel, desativar conta.
- Administrador inicial criado por configuração na inicialização.
- Administrador escolhe, no painel, o provedor e o modelo de transcrição (configuração global).
- Áudio enviado fica guardado (bucket MinIO, compatível com S3) e pode ser reproduzido no histórico.
- Documentação interativa da API (Swagger) em `/docs`, protegida por autenticação Basic. Acrescentada pelo grupo depois da versão 0.1; não faz parte do contrato da API.

Fora do escopo:

- Gravação de áudio pelo navegador.
- Transcrição em tempo real ou em streaming.
- Recuperação de senha por e-mail.
- Edição do texto transcrito.
- Múltiplos idiomas de interface.
- Publicação em produção (tratada na Aula 08).

## 3. Papéis

| Papel | Pode |
|---|---|
| Visitante (sem login) | Ver a página inicial, cadastrar-se, entrar |
| Usuário (`user`) | Tudo do visitante logado: enviar áudio, ver e excluir as próprias transcrições |
| Administrador (`admin`) | Tudo do usuário, mais listar e gerenciar contas |

O cadastro público sempre cria papel `user`. O papel `admin` só é atribuído pelo administrador inicial (seção 8) ou por outro administrador.

## 4. Modelo de dados

### users

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | chave primária |
| name | texto (até 100) | obrigatório |
| email | texto (até 255) | obrigatório, único, em minúsculas |
| passwordHash | texto, opcional | hash bcrypt; nulo para conta criada só pelo Google; nunca retornado pela API |
| googleId | texto (até 255), opcional | identificador (`sub`) da conta Google; único; nunca retornado pela API |
| role | enum `user` \| `admin` | padrão `user` |
| active | booleano | padrão `true`; conta desativada não entra |
| createdAt | data/hora | automático |

### transcriptions

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | chave primária |
| userId | UUID | obrigatório; referencia `users.id`; exclusão de usuário não é prevista |
| fileName | texto (até 255) | nome original do arquivo enviado |
| language | texto (2 letras) | código ISO 639-1, padrão `pt` |
| text | texto longo | transcrição retornada pelo provedor |
| audioKey | texto (até 255), opcional | chave do objeto do áudio no bucket (`audio/{userId}/{id}.{ext}`); nulo quando o áudio não foi guardado; nunca retornado pela API |
| audioMimeType | texto (até 100), opcional | tipo MIME do áudio guardado; nulo quando não há áudio |
| audioSize | inteiro, opcional | tamanho do áudio guardado, em bytes; nulo quando não há áudio |
| createdAt | data/hora | automático; ordenação do histórico |

Transcrições anteriores à versão 0.5 ficam com `audioKey`, `audioMimeType` e `audioSize` nulos (sem áudio guardado).

### settings

Configuração global da aplicação, uma linha por chave. Hoje só existe a chave `transcription`.

| Campo | Tipo | Regras |
|---|---|---|
| key | texto (até 100) | chave primária |
| value | texto longo | JSON da configuração; para `transcription`: `{ "provider", "model" }`. Nunca contém chaves de API |
| updatedAt | data/hora | automático |

## 5. Regras de negócio

- **RN1 — E-mail único:** cadastro com e-mail já existente retorna 409.
- **RN2 — Senha:** mínimo de 8 caracteres. Armazenada somente como hash bcrypt.
- **RN3 — Papel no cadastro:** o campo `role` não é aceito no cadastro. Enviá-lo retorna 400.
- **RN4 — Conta desativada:** login de conta com `active = false` retorna 401, com a mesma mensagem de credenciais inválidas. Um administrador não pode desativar a própria conta.
- **RN5 — Dono das transcrições:** cada usuário vê somente as próprias transcrições. Pedir a transcrição de outro usuário retorna 404, como se não existisse.
- **RN6 — Áudio aceito:** formatos `mp3`, `m4a`, `wav`, `ogg`, `webm`, `flac`, `mp4` e `mpeg`. Outro tipo retorna 400.
- **RN7 — Tamanho:** até 25 MB. Acima disso, retorna 413.
- **RN8 — Idioma:** campo `language` opcional no envio, com valor padrão `pt`. Código inválido retorna 400.
- **RN9 — Falha externa:** erro, indisponibilidade ou falta de configuração do provedor de transcrição (Groq ou OpenRouter) retorna 502. Nenhuma transcrição é gravada nesse caso.
- **RN10 — Ordenação:** o histórico vem da transcrição mais recente para a mais antiga.
- **RN11 — Conta criada pelo Google:** tem sempre papel `user` e não tem senha (`passwordHash` nulo). O nome vem do Google; se vier vazio, usa-se a parte local do e-mail (até 100 caracteres). O papel nunca vem do cliente.
- **RN12 — E-mail do Google não verificado:** se o Google não marcar `email_verified` como verdadeiro, o login retorna 401 e nada é criado nem vinculado.
- **RN13 — Vínculo com conta existente:** se o e-mail verificado pelo Google já estiver cadastrado, a conta existente é vinculada ao `googleId` e o login prossegue, sem alterar o papel. Se a conta já estiver vinculada a outro `googleId`, retorna 401.
- **RN14 — Conta desativada no Google:** login com Google de conta com `active = false` retorna 401, com a mesma mensagem de credenciais inválidas (RN4).
- **RN15 — Conta sem senha:** conta criada só pelo Google que tentar entrar por `/api/auth/login` recebe 401, com a mesma mensagem de credenciais inválidas (RN4).
- **RN16 — Configuração global:** o provedor e o modelo de transcrição são uma só configuração para todos os usuários, guardada na tabela `settings`.
- **RN17 — Quem escolhe:** somente um administrador lê e altera a configuração de transcrição; usuário comum recebe 403.
- **RN18 — Escolha válida:** só se pode escolher uma combinação provedor + modelo do catálogo fixo da seção 8, e somente se a chave do provedor estiver configurada no servidor. Caso contrário, retorna 400.
- **RN19 — Padrão:** sem escolha salva, vale o primeiro provedor com chave configurada, na ordem `groq`, `openrouter`, com o modelo padrão `whisper-large-v3-turbo` na Groq e `openai/whisper-large-v3-turbo` no OpenRouter.
- **RN20 — Escolha indisponível:** se a escolha salva ficar indisponível (a chave do provedor foi removida), o envio de áudio retorna 502 com mensagem de serviço não configurado e nada é gravado (RN9).
- **RN21 — Áudio guardado:** com o armazenamento configurado (seção 8), o áudio de cada envio fica guardado no bucket enquanto a transcrição existir. A ordem do envio é: transcrever, guardar o áudio e só então gravar a linha.
- **RN22 — Só o dono ouve:** somente o dono da transcrição lê o áudio. Transcrição inexistente, de outro usuário ou sem áudio guardado retorna 404 (RN5).
- **RN23 — Exclusão leva o áudio:** excluir a transcrição apaga a linha e, em seguida, o objeto do bucket, em melhor esforço. Falha ao apagar o objeto não impede a exclusão: fica um aviso no log com a chave do objeto.
- **RN24 — Falha do armazenamento:** com o armazenamento configurado, erro ou indisponibilidade ao guardar o áudio retorna 502 e nada é gravado (nem linha, nem objeto), como na RN9.
- **RN25 — Sem armazenamento:** com o armazenamento não configurado, o envio funciona normalmente, sem guardar o áudio (`hasAudio` falso), a aplicação sobe e a rota de áudio retorna 404.

## 6. Contrato da API

Base: `/api`. Corpo em JSON, exceto o envio de áudio, que usa `multipart/form-data`. Autenticação por `Authorization: Bearer <token>` nas rotas marcadas como protegidas.

### Saúde

| Método | Caminho | Protegida | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/health` | não | 200 `{ "status": "ok" }` | — |

### Autenticação

| Método | Caminho | Protegida | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/api/auth/register` | não | 201 `{ user, accessToken }` | 400 (corpo inválido ou campo `role`), 409 (e-mail existente) |
| POST | `/api/auth/login` | não | 200 `{ user, accessToken }` | 400 (corpo inválido), 401 (credenciais inválidas, conta desativada ou conta sem senha) |
| POST | `/api/auth/google` | não | 200 `{ user, accessToken }` | 400 (corpo inválido), 401 (token inválido, e-mail não verificado, conta desativada, `googleId` diferente ou login com Google não configurado) |
| GET | `/api/auth/google` | não | 200 `{ "clientId": "..." }` | 404 (`GOOGLE_CLIENT_ID` não configurado) |

Corpo de cadastro: `{ "name", "email", "password" }`.
Corpo de login: `{ "email", "password" }`.
Corpo de login com Google: `{ "credential": "<ID token do Google>" }`.
Objeto `user` na resposta: `{ "id", "name", "email", "role", "active" }`, sem `passwordHash` e sem `googleId`.

O `GET /api/auth/google` existe porque o frontend não tem `.env`: ele descobre o client ID por esta rota. O client ID é público.

### Transcrições

| Método | Caminho | Protegida | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/transcriptions` | sim | 200 lista de transcrições do usuário | 401 |
| POST | `/api/transcriptions` | sim | 201 transcrição criada | 400 (arquivo ausente, tipo não aceito, idioma inválido), 401, 413 (acima de 25 MB), 502 (falha do provedor de transcrição ou do armazenamento do áudio) |
| GET | `/api/transcriptions/:id` | sim | 200 transcrição | 401, 404 (inexistente ou de outro usuário) |
| GET | `/api/transcriptions/:id/audio` | sim | 200 com o arquivo de áudio (`Content-Type` do áudio original e `Content-Length`) | 401, 404 (inexistente, de outro usuário ou sem áudio guardado) |
| DELETE | `/api/transcriptions/:id` | sim | 204 sem corpo | 401, 404 (inexistente ou de outro usuário) |

Envio (`multipart/form-data`): campo `file` (obrigatório) e campo `language` (opcional, padrão `pt`).
Objeto de transcrição: `{ "id", "fileName", "language", "text", "hasAudio", "createdAt" }`. `hasAudio` é booleano: verdadeiro quando o áudio ficou guardado. O objeto nunca traz `userId` nem a chave do objeto no bucket.

`GET /api/transcriptions/:id/audio` devolve os bytes do áudio pelo backend, que confere o dono; o navegador nunca recebe o endereço do bucket nem credenciais. A resposta traz `Cache-Control: private, no-store`. Os erros têm o formato padrão (abaixo).

### Usuários (administrador)

| Método | Caminho | Protegida | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/users` | sim, papel `admin` | 200 lista de usuários | 401, 403 (papel `user`) |
| PATCH | `/api/users/:id` | sim, papel `admin` | 200 usuário atualizado | 400 (campo inválido), 401, 403, 404, 409 (tentativa de desativar a própria conta, RN4) |

Corpo de PATCH: qualquer combinação de `name`, `role` e `active`. Campos fora dessa lista retornam 400.

### Configuração de transcrição (administrador)

| Método | Caminho | Protegida | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/settings/transcription` | sim, papel `admin` | 200 `{ "provider": "groq" \| "openrouter", "model": string, "source": "default" \| "admin", "options": [{ "provider", "model", "label", "available": boolean }] }` | 401, 403 (papel `user`) |
| PATCH | `/api/settings/transcription` | sim, papel `admin` | 200 com o mesmo objeto do GET | 400 (campo inválido, combinação fora do catálogo ou provedor sem chave configurada), 401, 403 |

Corpo de PATCH: `{ "provider", "model" }`, ambos obrigatórios. Campo ausente ou extra retorna 400. `source` é `default` quando vale o padrão (RN19) e `admin` quando há escolha salva. `options` é o catálogo da seção 8; `available` é verdadeiro quando a chave do provedor está configurada. Se a escolha salva for de uma combinação que não está disponível, o GET devolve `source` `admin` e a opção correspondente com `available` falso. Nenhuma resposta contém chaves de API.

### Comportamentos definidos na implementação

Pontos que a versão 0.1 deixava em aberto e que a implementação fixou:

- **Identificador malformado:** `:id` que não é um UUID retorna 404, igual a um recurso inexistente (transcrições e usuários).
- **PATCH vazio:** corpo sem nenhum dos campos `name`, `role` ou `active` retorna 400.
- **Token de conta desativada:** a guarda de autenticação consulta o usuário a cada requisição. Token de conta desativada ou inexistente retorna 401, e mudança de papel vale na hora, sem esperar o token expirar.
- **Administrador inicial:** é criado com o nome `Administrador`.
- **Tipo de áudio (RN6):** a validação confere a extensão do nome do arquivo, em minúsculas, e o tipo MIME declarado.
- **Falta de chave do provedor:** o envio de áudio retorna 502 com mensagem de serviço não configurado; nada é gravado.
- **Formatos no OpenRouter:** a documentação do OpenRouter não lista `mp4` e `mpeg`. O backend não converte áudio, então esses formatos podem retornar 502 quando o provedor for o OpenRouter.

### Códigos de erro

Todas as respostas de erro têm a forma `{ "statusCode", "message", "error" }`.

## 7. Telas e rotas do frontend

| Rota | Acesso | Conteúdo |
|---|---|---|
| `/` | público | Apresentação do Ditado, botões Entrar e Cadastrar |
| `/cadastrar` | público | Formulário de nome, e-mail e senha; botão "Entrar com Google" quando `GET /api/auth/google` retorna o client ID |
| `/entrar` | público | Formulário de e-mail e senha; botão "Entrar com Google" quando `GET /api/auth/google` retorna o client ID |
| `/app` | usuário logado | Envio de áudio com escolha de idioma; histórico com ver, ouvir e excluir |
| `/app/admin` | papel `admin` | Seção "Contas": lista de contas, com alteração de nome, papel e status ativo. Seção "Transcrição": escolha do provedor e do modelo de transcrição |

Regras de tela:

- Rotas internas sem sessão redirecionam para `/entrar`.
- Rota de administrador com papel `user` redireciona para `/app`.
- Resposta 401 de qualquer chamada limpa a sessão e leva a `/entrar`.
- Estados de carregamento e de erro aparecem em toda chamada à API.
- Envio de arquivo mostra o nome do arquivo e recusa, antes do envio, tipo ou tamanho inválidos.
- O histórico e o diálogo da transcrição mostram o botão "Ouvir" quando `hasAudio` é verdadeiro; caso contrário mostram "Áudio não guardado".
- Rota desconhecida mostra uma página de "não encontrada" com link para `/`.
- A aparência segue `docs/DESIGN.md` (tokens de cor, fontes e componentes shadcn/ui).

## 8. Configuração

Os nomes das variáveis estão em `.env.example`. Os valores reais ficam em `backend/.env`, que não é versionado.

- `ADMIN_EMAIL` e `ADMIN_PASSWORD`: na inicialização, se não existir nenhum administrador com esse e-mail, a aplicação cria um. Se já existir, não altera nada.
- `GROQ_API_KEY`: chave pessoal da Groq. Nunca vai para o frontend, para o banco nem para o repositório.
- `OPENROUTER_API_KEY`: chave pessoal do OpenRouter (alternativa à Groq). Nunca vai para o frontend, para o banco nem para o repositório.
- Provedor e modelo de transcrição não são mais variáveis de ambiente: o administrador os escolhe no painel (seção 7) e a escolha fica na tabela `settings`. Sem escolha salva vale o padrão da RN19. Sem chave do provedor em uso, a aplicação sobe e o envio de áudio retorna 502.
- `JWT_SECRET` e `JWT_EXPIRES_IN`: assinatura e validade do token (padrão `1d`).
- Banco: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`. O padrão de desenvolvimento de `DATABASE_PORT` é `5433` (seção 12). O `docker-compose.yml` lê essas variáveis de `backend/.env`; por isso o banco sobe com `docker compose --env-file backend/.env up -d`.
- `DOCS_USER` e `DOCS_PASSWORD`: credenciais Basic do Swagger em `/docs`. Se omitidas, o padrão de desenvolvimento é `admin` / `admin`; troque fora do ambiente local.
- `GOOGLE_CLIENT_ID`: client ID OAuth do Google (público, termina em `.apps.googleusercontent.com`). É usado como `audience` na validação do ID token. Sem ele, `GET /api/auth/google` retorna 404 e `POST /api/auth/google` retorna 401 com mensagem de login com Google não configurado. O client secret não é usado neste fluxo e não deve ficar no repositório.
- Armazenamento do áudio (MinIO, compatível com S3): `MINIO_ENDPOINT` (endereço `https://...` do servidor), `MINIO_BUCKET` (nome do bucket), `MINIO_ACCESS_KEY` e `MINIO_SECRET_KEY` (credenciais) e `MINIO_REGION` (opcional; padrão `us-east-1`). Se qualquer uma das quatro primeiras estiver vazia, o armazenamento fica desligado: a aplicação sobe, o envio transcreve sem guardar o áudio e a rota de áudio retorna 404 (RN25). As credenciais nunca vão para o frontend, para o banco nem para o repositório.
- `PORT`: porta do backend (padrão `3000`).

Catálogo fixo de opções de transcrição (a disponibilidade depende da chave do provedor):

| Provedor | Modelo | Rótulo |
|---|---|---|
| `groq` | `whisper-large-v3-turbo` | Groq: Whisper Large v3 Turbo |
| `groq` | `whisper-large-v3` | Groq: Whisper Large v3 |
| `openrouter` | `openai/whisper-large-v3-turbo` | OpenRouter: Whisper Large v3 Turbo |
| `openrouter` | `openai/whisper-large-v3` | OpenRouter: Whisper Large v3 |
| `openrouter` | `openai/whisper-1` | OpenRouter: Whisper 1 |
| `openrouter` | `fish-audio/transcribe-1-pro` | OpenRouter: Fish Audio Transcribe 1 Pro |

Os ids do OpenRouter foram conferidos na lista pública de modelos de transcrição (`GET https://openrouter.ai/api/v1/models?output_modalities=transcription`). O `fish-audio/transcribe-1-pro` é chamado no mesmo endpoint `/api/v1/audio/transcriptions`, mas com corpo JSON (`input_audio` em base64 e `format`) em vez de multipart; os demais modelos continuam em multipart.

O frontend não tem arquivo `.env`. Ele chama a API somente pelo caminho relativo `/api`.

## 9. Requisitos não funcionais e segurança

- Senhas: somente hash bcrypt; senha em texto nunca é gravada, registrada em log ou retornada.
- Token: assinado com `JWT_SECRET`; validade limitada por `JWT_EXPIRES_IN`.
- Validação: corpo das requisições validado por DTO com lista de campos permitidos. Campo não declarado retorna 400.
- Respostas: a entidade do banco nunca é devolvida diretamente; a resposta é montada a partir de um objeto de saída que omite `passwordHash` e `googleId`.
- Login com Google: o ID token é validado no backend (assinatura, emissor e `audience` igual a `GOOGLE_CLIENT_ID`). Nenhum token do Google é gravado nem registrado em log.
- Banco: a porta do banco (5433 no host, 5432 no contêiner) publica-se somente em `127.0.0.1`.
- Logs: as chaves dos provedores (Groq, OpenRouter) e o token nunca aparecem em log.
- Painel de transcrição: as chaves dos provedores nunca são gravadas no banco nem devolvidas pela API; o painel mostra apenas se cada provedor está disponível.
- Áudio guardado: o bucket é privado. O acesso ao áudio é somente pelo backend, com checagem de dono (RN22); o navegador nunca recebe o endereço do bucket. As credenciais do MinIO ficam só no backend e nunca aparecem em log.
- Áudio é dado pessoal e fica num servidor externo (MinIO). Risco registrado: quem tiver acesso ao bucket lê os áudios. Mitigação: bucket privado e credenciais restritas; excluir a transcrição apaga o áudio (RN23).
- Esquema do banco: `synchronize: true` durante o desenvolvimento. Migrações versionadas ficam para a Aula 08.

## 10. Plano de etapas

Cada etapa termina com um commit que nomeia a etapa. A etapa só é considerada concluída quando todos os critérios de aceite passam na sua máquina.

### Etapa 1 — Infraestrutura e esqueleto do backend

- Entrega: `docker-compose.yml` com PostgreSQL 18; projeto NestJS em `backend/`; módulo `health`.
- Aceite:
  - `docker compose ps` mostra `127.0.0.1:5433->5432/tcp`.
  - `npm run start:dev` em `backend/` sobe sem erro.
  - `GET /api/health` retorna 200 com `{ "status": "ok" }`.

### Etapa 2 — Usuários e administrador inicial

- Entrega: entidade `User`; criação do administrador a partir de `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
- Aceite:
  - Após a primeira inicialização, existe um usuário com papel `admin` e o e-mail configurado.
  - Na segunda inicialização, o administrador não é duplicado.
  - A coluna `passwordHash` contém um hash bcrypt, não a senha.

### Etapa 3 — Cadastro e login

- Entrega: `POST /api/auth/register`, `POST /api/auth/login`, guarda JWT.
- Aceite:
  - Cadastro válido retorna 201 com `user` e `accessToken`, sem `passwordHash`.
  - E-mail repetido retorna 409.
  - Enviar `role` no cadastro retorna 400.
  - Login com senha errada retorna 401.
  - Login de conta desativada retorna 401.
  - Rota protegida sem token retorna 401.

### Etapa 4 — Envio e transcrição

- Entrega: `POST /api/transcriptions` com integração à Groq.
- Aceite:
  - Envio de áudio válido (Volume 07, seção 1.3) retorna 201 com `text` não vazio.
  - Arquivo de tipo não aceito retorna 400.
  - Arquivo acima de 25 MB retorna 413.
  - Chave da Groq inválida retorna 502, e nenhuma linha é gravada na tabela.

### Etapa 5 — Histórico e exclusão

- Entrega: `GET /api/transcriptions`, `GET /api/transcriptions/:id`, `DELETE /api/transcriptions/:id`.
- Aceite:
  - Listagem retorna somente as transcrições do usuário, da mais recente para a mais antiga.
  - Usuário A pedindo transcrição de usuário B recebe 404.
  - Exclusão retorna 204, e a leitura seguinte retorna 404.

### Etapa 6 — Administração de contas

- Entrega: `GET /api/users`, `PATCH /api/users/:id`, com guarda de papel.
- Aceite:
  - Usuário com papel `user` recebe 403 em ambas as rotas.
  - Administrador lista as contas sem `passwordHash`.
  - Administrador desativa outra conta, e o login dela passa a retornar 401.
  - Administrador tentando desativar a própria conta recebe 409.

### Etapa 7 — Frontend: página inicial, cadastro e login

- Entrega: páginas `/`, `/cadastrar`, `/entrar`; `services/api.ts` com interceptadores; `store/authStore.ts`; rota protegida.
- Aceite:
  - Cadastro e login funcionam pelo navegador, com a sessão mantida após recarregar a página.
  - Visitante sem sessão acessando `/app` é redirecionado para `/entrar`.
  - Resposta 401 limpa a sessão e leva a `/entrar`.
  - Nenhum endereço absoluto de API aparece no código do frontend.

### Etapa 8 — Frontend: envio e histórico

- Entrega: página `/app` com envio, histórico, visualização e exclusão.
- Aceite:
  - Fluxo completo: enviar áudio, ver a transcrição na tela e encontrá-la no histórico.
  - Excluir uma transcrição a remove da lista imediatamente.
  - Arquivo de tipo ou tamanho inválido é recusado antes do envio.

### Etapa 9 — Administração no frontend e documentação de execução

- Entrega: página `/app/admin`; `README.md` com comandos para rodar do zero no PowerShell.
- Aceite:
  - Administrador altera o papel de uma conta pela tela.
  - Usuário comum não consegue abrir `/app/admin`.
  - Seguindo somente o `README.md` em uma pasta limpa, a aplicação sobe e o fluxo da etapa 8 funciona.

### Etapa 10 — Login com Google

- Entrega: `POST /api/auth/google` e `GET /api/auth/google`; campo `googleId` e `passwordHash` opcional em `users`; variável `GOOGLE_CLIENT_ID`; botão "Entrar com Google" nas telas `/entrar` e `/cadastrar`.
- Aceite:
  - ID token válido de e-mail novo cria conta com papel `user`, sem senha, e retorna 200 com `user` e `accessToken`.
  - E-mail já cadastrado e verificado pelo Google é vinculado à conta existente, sem alterar o papel.
  - E-mail não verificado pelo Google retorna 401.
  - Token inválido retorna 401.
  - Conta desativada retorna 401, com a mesma mensagem de credenciais inválidas.
  - Conta vinculada a outro `googleId` retorna 401.
  - Login por senha de conta criada só pelo Google retorna 401, com a mesma mensagem de credenciais inválidas.
  - A resposta não contém `passwordHash` nem `googleId`.
  - `GET /api/auth/google` retorna 200 com `clientId` quando `GOOGLE_CLIENT_ID` está configurado e 404 quando não está.

### Etapa 11 — Provedor de transcrição no painel

- Entrega: tabela `settings`; `GET` e `PATCH /api/settings/transcription`; envio de áudio passa a usar a escolha salva; remoção de `TRANSCRIPTION_PROVIDER`, `GROQ_MODEL` e `OPENROUTER_MODEL`; modelo `fish-audio/transcribe-1-pro` no catálogo; seção "Transcrição" em `/app/admin`.
- Aceite:
  - Usuário com papel `user` recebe 403 no GET e no PATCH; sem token, 401.
  - Administrador lê o padrão (`source` `default`) com as opções e a disponibilidade de cada uma.
  - PATCH válido retorna 200, e o GET seguinte mostra a escolha com `source` `admin`.
  - Combinação fora do catálogo retorna 400; provedor sem chave configurada retorna 400; campo extra ou corpo vazio retorna 400.
  - O envio de áudio usa o provedor e o modelo salvos; sem escolha salva usa o padrão.
  - Escolha salva sem chave: o envio retorna 502 e nada é gravado.
  - Nenhuma resposta contém chaves.

### Etapa 12 — Permanência do áudio

- Entrega: serviço de armazenamento (cliente S3 para o MinIO); campos `audioKey`, `audioMimeType` e `audioSize` em `transcriptions`; `hasAudio` no objeto de transcrição; `GET /api/transcriptions/:id/audio`; exclusão da transcrição apaga o objeto; variáveis `MINIO_*`; botão "Ouvir" no histórico e no diálogo.
- Aceite:
  - O envio com armazenamento configurado guarda o objeto (`audio/{userId}/{id}.{ext}`) e a resposta tem `hasAudio` verdadeiro.
  - O dono baixa o áudio pela rota e o conteúdo e o `Content-Type` batem com o enviado.
  - Outro usuário recebe 404; sem token, 401; id malformado, 404.
  - Excluir a transcrição apaga o objeto, e a leitura seguinte do áudio retorna 404; falha ao apagar o objeto não impede a exclusão (204).
  - Falha do armazenamento retorna 502 e nada é gravado; falha do provedor de transcrição retorna 502 e nenhum objeto é criado.
  - Sem armazenamento configurado, o envio retorna 201 com `hasAudio` falso e a rota de áudio retorna 404.
  - Transcrições antigas continuam listáveis (`hasAudio` falso).
  - Nenhuma resposta contém `audioKey`, `userId`, endereço do bucket ou credenciais.

## 11. Verificação final

- Todas as etapas com critérios de aceite cumpridos e registrados em commits separados.
- `unzip -l entrega.zip | grep -E "\.env$|node_modules"` não lista nada.
- `README.md` inclui a declaração de uso de IA: ferramentas, modelos e etapa em que foram usados.

## 12. Divergências em relação às versões anteriores

Registro do que mudou entre o rascunho (0.1), a revisão 0.2 e as versões 0.3, 0.4 e 0.5, com o motivo. Os valores da coluna "Vale agora" já estão refletidos nas seções acima. As linhas sobre o Google são da versão 0.3; as sobre a configuração de transcrição, da 0.4; as sobre o áudio guardado, da 0.5; as demais, da 0.2.

| Assunto | Versão 0.1 | Vale agora | Motivo |
|---|---|---|---|
| Porta do banco no host | 5432 | 5433 (`127.0.0.1:5433->5432/tcp`) | O serviço do PostgreSQL instalado no Windows da máquina de desenvolvimento ocupa a 5432 e não pôde ser parado. O banco continua publicado só em `127.0.0.1`. |
| Versão do PostgreSQL | 17 | 18 (`postgres:18-alpine`), volume em `/var/lib/postgresql` | Escolha do grupo. |
| Credenciais do banco no compose | valores fixos | variáveis de `backend/.env`; subir com `--env-file backend/.env` | Evita senha no repositório. O Compose só lê o `.env` da raiz, daí a flag. |
| Provedor de transcrição | só a Groq | Groq ou OpenRouter, escolhido no painel do administrador (versão 0.4; na 0.2 era por `TRANSCRIPTION_PROVIDER`) | O grupo ainda não tinha chave da Groq e tinha crédito no OpenRouter. O contrato da API não mudou. |
| Documentação da API | não prevista | Swagger em `/docs` com autenticação Basic | Pedido do grupo. Está fora do contrato da API. |
| Interface | Tailwind e lucide-react | também shadcn/ui, com identidade visual em `docs/DESIGN.md` | Pedido do grupo: interface padronizada, com tokens de cor e fonte. |
| Versões da pilha | não fixadas | NestJS 11 (CommonJS), TypeORM 0.3, Jest 29, TypeScript 5.9 no backend; Vite 8, React 19 e Tailwind 4 no frontend | NestJS 12 é só ESM e quebra o Jest e a CLI no Node 22.14. |
| Lint do frontend | ESLint | oxlint (padrão do gerador de projetos do Vite atual) | `npm run lint` continua sendo o comando. |
| Verificação do token | não definida | a guarda consulta o usuário a cada requisição (seção 6) | Faz a desativação e a troca de papel valerem na hora. |
| Login com Google | fora do escopo | dentro do escopo (Etapa 10), com ID token validado no backend | Pedido do grupo, para entrar sem criar senha. Usa só o client ID, sem client secret. |
| `passwordHash` | obrigatório | opcional (nulo para conta só do Google); novo campo `googleId` | Conta criada pelo Google não tem senha. |
| `GOOGLE_CLIENT_ID` | não existia | variável de configuração; público | Define a `audience` do ID token e é entregue ao frontend por `GET /api/auth/google`. |
| `TRANSCRIPTION_PROVIDER`, `GROQ_MODEL`, `OPENROUTER_MODEL` | variáveis de ambiente | removidas; valem as escolhas do painel, com padrão na RN19 | Trocar de provedor ou modelo não deve exigir editar o `.env` e reiniciar. Linhas antigas no `.env` ficam sem efeito. |
| Configuração de transcrição | por instalação, no `.env` | global, no banco (tabela `settings`), alterada só por administrador | Uma escolha única para todos os usuários, feita pelo site. As chaves continuam só no `.env`. |
| Modelo `fish-audio/transcribe-1-pro` | não existia | opção do catálogo no OpenRouter, chamada por JSON com `input_audio` | Pedido do grupo. O modelo existe na lista pública do OpenRouter. |
| Áudio enviado | descartado depois da transcrição; só o texto era gravado | guardado num bucket MinIO enquanto a transcrição existir; `hasAudio` no objeto de transcrição (versão 0.5) | Pedido do grupo: ouvir de novo o áudio no histórico. Sem MinIO configurado, o envio continua funcionando sem guardar o áudio. |
| Armazenamento | não existia | MinIO (compatível com S3), bucket privado, variáveis `MINIO_*` só no backend | O áudio é dado pessoal; o bucket não é público e as credenciais não saem do servidor. |
| Reprodução do áudio | não existia | `GET /api/transcriptions/:id/audio`, servida pelo backend com checagem de dono | O navegador nunca recebe o endereço do bucket nem credenciais; transcrição de outro usuário continua 404 (RN5). |

Pontos que a especificação continua sem decidir:

- Um administrador pode rebaixar o próprio papel para `user`, e o sistema pode ficar sem administrador. A regra RN4 só impede desativar a própria conta.
- Prazo de renovação do token: não há refresh; ao expirar, o usuário entra de novo.
