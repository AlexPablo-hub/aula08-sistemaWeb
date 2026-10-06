# Ditado — Especificação

Versão: 0.2 (revisada após a implementação; as diferenças em relação à versão 0.1 estão na seção 12)

## 1. Visão geral

O Ditado é uma aplicação web de transcrição de áudio. O visitante conhece o produto numa página inicial, cria uma conta e, na área interna, envia um arquivo de áudio e recebe o texto transcrito. As transcrições ficam salvas num histórico pessoal. Um administrador gerencia as contas.

A transcrição é feita pelo modelo Whisper, na API da Groq ou do OpenRouter (provedor escolhido por configuração; ver seção 8). A chave do provedor fica somente no backend.

## 2. Escopo

Dentro do escopo:

- Página inicial pública.
- Cadastro e login com e-mail e senha.
- Envio de um arquivo de áudio por vez, com escolha de idioma.
- Histórico pessoal de transcrições: listar, ler e excluir.
- Área administrativa: listar contas, alterar nome e papel, desativar conta.
- Administrador inicial criado por configuração na inicialização.
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
| passwordHash | texto | hash bcrypt; nunca retornado pela API |
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
| text | texto longo | transcrição retornada pela Groq |
| createdAt | data/hora | automático; ordenação do histórico |

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
| POST | `/api/auth/login` | não | 200 `{ user, accessToken }` | 400 (corpo inválido), 401 (credenciais inválidas ou conta desativada) |

Corpo de cadastro: `{ "name", "email", "password" }`.
Corpo de login: `{ "email", "password" }`.
Objeto `user` na resposta: `{ "id", "name", "email", "role", "active" }`, sem `passwordHash`.

### Transcrições

| Método | Caminho | Protegida | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/transcriptions` | sim | 200 lista de transcrições do usuário | 401 |
| POST | `/api/transcriptions` | sim | 201 transcrição criada | 400 (arquivo ausente, tipo não aceito, idioma inválido), 401, 413 (acima de 25 MB), 502 (falha do provedor de transcrição) |
| GET | `/api/transcriptions/:id` | sim | 200 transcrição | 401, 404 (inexistente ou de outro usuário) |
| DELETE | `/api/transcriptions/:id` | sim | 204 sem corpo | 401, 404 (inexistente ou de outro usuário) |

Envio (`multipart/form-data`): campo `file` (obrigatório) e campo `language` (opcional, padrão `pt`).
Objeto de transcrição: `{ "id", "fileName", "language", "text", "createdAt" }`.

### Usuários (administrador)

| Método | Caminho | Protegida | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/users` | sim, papel `admin` | 200 lista de usuários | 401, 403 (papel `user`) |
| PATCH | `/api/users/:id` | sim, papel `admin` | 200 usuário atualizado | 400 (campo inválido), 401, 403, 404, 409 (tentativa de desativar a própria conta, RN4) |

Corpo de PATCH: qualquer combinação de `name`, `role` e `active`. Campos fora dessa lista retornam 400.

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
| `/cadastrar` | público | Formulário de nome, e-mail e senha |
| `/entrar` | público | Formulário de e-mail e senha |
| `/app` | usuário logado | Envio de áudio com escolha de idioma; histórico com ver e excluir |
| `/app/admin` | papel `admin` | Lista de contas, com alteração de nome, papel e status ativo |

Regras de tela:

- Rotas internas sem sessão redirecionam para `/entrar`.
- Rota de administrador com papel `user` redireciona para `/app`.
- Resposta 401 de qualquer chamada limpa a sessão e leva a `/entrar`.
- Estados de carregamento e de erro aparecem em toda chamada à API.
- Envio de arquivo mostra o nome do arquivo e recusa, antes do envio, tipo ou tamanho inválidos.
- Rota desconhecida mostra uma página de "não encontrada" com link para `/`.
- A aparência segue `docs/DESIGN.md` (tokens de cor, fontes e componentes shadcn/ui).

## 8. Configuração

Os nomes das variáveis estão em `.env.example`. Os valores reais ficam em `backend/.env`, que não é versionado.

- `ADMIN_EMAIL` e `ADMIN_PASSWORD`: na inicialização, se não existir nenhum administrador com esse e-mail, a aplicação cria um. Se já existir, não altera nada.
- `GROQ_API_KEY`: chave pessoal da Groq. Nunca vai para o frontend nem para o repositório.
- `GROQ_MODEL`: identificador do modelo de transcrição (padrão `whisper-large-v3-turbo`).
- `TRANSCRIPTION_PROVIDER`: `groq` ou `openrouter`. Se vazio, usa a Groq quando `GROQ_API_KEY` estiver preenchida e, senão, o OpenRouter quando `OPENROUTER_API_KEY` estiver preenchida. Sem chave do provedor escolhido, a aplicação sobe e o envio de áudio retorna 502.
- `OPENROUTER_API_KEY`: chave pessoal do OpenRouter (alternativa à Groq). Nunca vai para o frontend nem para o repositório.
- `OPENROUTER_MODEL`: modelo de fala para texto no OpenRouter (padrão `openai/whisper-large-v3-turbo`).
- `JWT_SECRET` e `JWT_EXPIRES_IN`: assinatura e validade do token (padrão `1d`).
- Banco: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`. O padrão de desenvolvimento de `DATABASE_PORT` é `5433` (seção 12). O `docker-compose.yml` lê essas variáveis de `backend/.env`; por isso o banco sobe com `docker compose --env-file backend/.env up -d`.
- `DOCS_USER` e `DOCS_PASSWORD`: credenciais Basic do Swagger em `/docs`. Se omitidas, o padrão de desenvolvimento é `admin` / `admin`; troque fora do ambiente local.
- `PORT`: porta do backend (padrão `3000`).

O frontend não tem arquivo `.env`. Ele chama a API somente pelo caminho relativo `/api`.

## 9. Requisitos não funcionais e segurança

- Senhas: somente hash bcrypt; senha em texto nunca é gravada, registrada em log ou retornada.
- Token: assinado com `JWT_SECRET`; validade limitada por `JWT_EXPIRES_IN`.
- Validação: corpo das requisições validado por DTO com lista de campos permitidos. Campo não declarado retorna 400.
- Respostas: a entidade do banco nunca é devolvida diretamente; a resposta é montada a partir de um objeto de saída que omite `passwordHash`.
- Banco: a porta do banco (5433 no host, 5432 no contêiner) publica-se somente em `127.0.0.1`.
- Logs: as chaves dos provedores (Groq, OpenRouter) e o token nunca aparecem em log.
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

## 11. Verificação final

- Todas as etapas com critérios de aceite cumpridos e registrados em commits separados.
- `unzip -l entrega.zip | grep -E "\.env$|node_modules"` não lista nada.
- `README.md` inclui a declaração de uso de IA: ferramentas, modelos e etapa em que foram usados.

## 12. Divergências em relação à versão 0.1

Registro do que mudou entre o rascunho (0.1) e o que foi construído, com o motivo. Os valores da coluna "Vale agora" já estão refletidos nas seções acima.

| Assunto | Versão 0.1 | Vale agora | Motivo |
|---|---|---|---|
| Porta do banco no host | 5432 | 5433 (`127.0.0.1:5433->5432/tcp`) | O serviço do PostgreSQL instalado no Windows da máquina de desenvolvimento ocupa a 5432 e não pôde ser parado. O banco continua publicado só em `127.0.0.1`. |
| Versão do PostgreSQL | 17 | 18 (`postgres:18-alpine`), volume em `/var/lib/postgresql` | Escolha do grupo. |
| Credenciais do banco no compose | valores fixos | variáveis de `backend/.env`; subir com `--env-file backend/.env` | Evita senha no repositório. O Compose só lê o `.env` da raiz, daí a flag. |
| Provedor de transcrição | só a Groq | Groq ou OpenRouter, por `TRANSCRIPTION_PROVIDER` | O grupo ainda não tinha chave da Groq e tinha crédito no OpenRouter. O contrato da API não mudou. |
| Documentação da API | não prevista | Swagger em `/docs` com autenticação Basic | Pedido do grupo. Está fora do contrato da API. |
| Interface | Tailwind e lucide-react | também shadcn/ui, com identidade visual em `docs/DESIGN.md` | Pedido do grupo: interface padronizada, com tokens de cor e fonte. |
| Versões da pilha | não fixadas | NestJS 11 (CommonJS), TypeORM 0.3, Jest 29, TypeScript 5.9 no backend; Vite 8, React 19 e Tailwind 4 no frontend | NestJS 12 é só ESM e quebra o Jest e a CLI no Node 22.14. |
| Lint do frontend | ESLint | oxlint (padrão do gerador de projetos do Vite atual) | `npm run lint` continua sendo o comando. |
| Verificação do token | não definida | a guarda consulta o usuário a cada requisição (seção 6) | Faz a desativação e a troca de papel valerem na hora. |

Pontos que a especificação continua sem decidir:

- Um administrador pode rebaixar o próprio papel para `user`, e o sistema pode ficar sem administrador. A regra RN4 só impede desativar a própria conta.
- Prazo de renovação do token: não há refresh; ao expirar, o usuário entra de novo.
