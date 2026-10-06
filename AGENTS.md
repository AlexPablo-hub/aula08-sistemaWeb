# AGENTS.md — Ditado

Este arquivo descreve como trabalhar neste repositório. A especificação do produto está em `docs/ESPECIFICACAO.md`; em caso de dúvida sobre o que construir, ela prevalece. Em caso de dúvida sobre como construir, este arquivo prevalece.

## Pilha

- Frontend: React + Vite + TypeScript, react-router-dom, axios, TanStack Query (dados do servidor), Zustand (sessão), react-hook-form + zod, Tailwind CSS v4, shadcn/ui, lucide-react.
- Backend: NestJS + TypeScript, TypeORM + PostgreSQL 17, @nestjs/jwt + passport-jwt, bcryptjs, class-validator + class-transformer, multer.
- Banco local: `docker compose --env-file backend/.env up -d` na raiz (somente PostgreSQL). A flag é necessária: o compose lê as credenciais de `backend/.env`.
- Plataforma de desenvolvimento: Windows com PowerShell. Não use comandos Bash nem scripts `.sh`.

## Comandos

Rodar tudo (dois terminais):

- Backend, em `backend/`: `npm run start:dev` (porta 3000)
- Frontend, em `frontend/`: `npm run dev` (porta 5173)

Verificação:

- Backend: `npm test` (testes e2e com supertest) e `npm run build`
- Frontend: `npm run build` e `npm run lint`
- Banco: `docker compose ps` deve mostrar `127.0.0.1:5433->5432/tcp`

Nunca rode `npm install` a partir da raiz: cada projeto tem o seu `package.json`.

## Estrutura

```
docs/ESPECIFICACAO.md   produto: o que construir (fonte da verdade)
docs/DESIGN.md          sistema de design do frontend
AGENTS.md               como trabalhar
.env.example            nomes das variáveis, sem valores
docker-compose.yml      PostgreSQL local
backend/src/            módulos: common, health, auth, users, transcriptions
frontend/src/           pages, components (ui, layout), services, store, types
```

Cada módulo do backend tem `dto/`, `entities/` quando houver tabela, o controlador, o serviço e o módulo.

## Convenções de idioma

- Texto da documentação, mensagens de erro para o usuário, comentários e a interface: português.
- Identificadores de código, rotas, campos JSON, nomes de tabelas e de colunas: inglês, como na especificação (`/api/transcriptions`, `role`, `passwordHash`).
- Mensagens de commit: português, no imperativo, nomeando a etapa. Exemplo: `Etapa 3: cadastro e login`.

## Regras de arquitetura

Backend:

- O controlador só recebe a requisição, valida o acesso pelos guardas, chama o serviço e devolve a resposta. Ele não importa `Repository` do TypeORM e não tem regra de negócio.
- A regra de negócio e o acesso ao banco ficam no serviço.
- Corpo de requisição é validado por DTO com `whitelist` e `forbidNonWhitelisted` ativos. Campo não declarado retorna 400.
- A resposta é um objeto de saída montado a partir da entidade. Nunca devolva uma entidade diretamente, porque ela contém `passwordHash`.
- Dono do recurso: toda consulta a transcrição filtra por `userId` do token. Recurso de outro usuário retorna 404, não 403.
- Papel `admin` é verificado pela guarda de papel, não por `if` dentro do serviço.
- Senha: somente hash bcrypt. Nunca logue senha, token ou chave da Groq.

Frontend:

- Toda chamada HTTP passa por `services/api.ts`, a única instância do axios. Não crie outra instância nem use `fetch` direto.
- A URL da API é sempre relativa, começando com `/api`. Nunca escreva `http://localhost:3000` no código do frontend.
- O token é injetado pelo interceptador de requisição. Páginas não leem nem montam o cabeçalho `Authorization`.
- Resposta 401 é tratada pelo interceptador de resposta, que limpa a sessão.
- Dados do servidor ficam no TanStack Query. Sessão (usuário e token) fica no Zustand. Não duplique um no outro.
- O frontend não tem `.env` e não guarda segredo.
- Estilo: use somente os tokens e componentes de docs/DESIGN.md; sem cores, fontes ou sombras soltas.

Tipos:

- Os tipos em `frontend/src/types/` espelham o contrato da seção 6 da especificação. Se o contrato mudar, altere backend e frontend no mesmo commit.

## Banco de dados

- Em desenvolvimento, o esquema é criado com `synchronize: true`.
- Ao renomear ou remover um campo de entidade, avise o usuário antes: a coluna e os dados são perdidos sem aviso.
- Não crie migrações nesta disciplina sem pedido explícito; elas são assunto da Aula 08.

## Segredos e arquivos versionados

- Nunca crie, edite ou leia `backend/.env` com valores reais para exibi-los no chat.
- `.env.example` contém nomes e nenhum valor sensível. Ao adicionar uma variável, adicione-a lá com um comentário.
- Não versione: `.env`, `node_modules/`, `dist/`, logs e arquivos de PID. O `.gitignore` já cobre esses casos; não o remova.
- Antes de qualquer commit, confira que nenhum segredo está na área de stage (`git diff --cached`).

## Git

- Um commit por etapa da especificação, ou por unidade lógica dentro dela.
- Commits separados: nunca junte etapas diferentes num único commit.
- Não adicione trailers `Co-Authored-By` nem qualquer atribuição ao agente nas mensagens de commit.
- Não faça `push`, não crie repositório remoto e não altere configuração de git sem pedido do usuário.

## Verificação antes de declarar uma etapa concluída

1. Rode os comandos de aceite da etapa na especificação.
2. Mostre a saída real dos comandos, não apenas o resultado esperado.
3. Se algum critério falhar, corrija antes de avançar e informe o que falhou.
4. Só então faça o commit da etapa.

## O que nunca fazer

- Expor a porta 5432 em `0.0.0.0`.
- Enviar a chave da Groq ao frontend ou a qualquer arquivo versionado.
- Aceitar `role` no cadastro.
- Retornar `passwordHash` em qualquer resposta.
- Permitir que um usuário leia ou exclua transcrição de outro.
- Adicionar funcionalidades fora da seção 2 da especificação.
- Mudar o contrato da API sem atualizar `docs/ESPECIFICACAO.md`.
