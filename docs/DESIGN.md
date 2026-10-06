# Ditado — Sistema de design

Este arquivo define a aparência do frontend. Todo agente que mexer em `frontend/src` deve segui-lo. Os tokens vivem em um único lugar: `frontend/src/index.css`.

**Regra central: nunca estilize com cores, fontes ou sombras soltas. Use tokens e componentes.** Nada de `#hex`, `rgb()`, `text-red-500`, `font-[...]`, `shadow-*` ou `style={{ color }}` nas páginas.

## Princípios

- Papel e tinta: o produto transcreve fala em texto, então a interface parece uma página impressa. A tipografia é a protagonista.
- Um único acento (vermelho-tinta), usado com parcimônia.
- Bordas finas de 1px e linhas divisórias no lugar de sombras e cartões flutuantes.
- Layout assimétrico, tabelas e listas com linhas finas, texto direto em português.
- Apenas tema claro.

## Tokens

### Cores

| Token Tailwind | Valor | Uso |
|---|---|---|
| `background` (`paper`) | `#F5F0E6` | Fundo da página |
| `card` / `popover` (`surface`) | `#FBF8F1` | Superfícies: campos, diálogos, tabelas, cartões |
| `foreground` (`ink`) | `#1C1A16` | Texto principal, linha do cabeçalho |
| `muted-foreground` (`ink-soft`) | `#6B6458` | Texto secundário, rótulos de tabela |
| `border` / `input` (`rule`) | `#D8CFBD` | Bordas e divisórias |
| `muted` / `secondary` / `accent` (`wash`) | `#EDE7D9` | Hover de linha e de item de menu, botão secundário |
| `primary` | `#B8361B` | Acento: botão primário, link ativo, foco |
| `primary-hover` | `#962B14` | Hover do botão primário |
| `primary-foreground` | `#FBF8F1` | Texto sobre o acento |
| `success` / `success-soft` | `#2F6B3F` / `#E4ECDA` | Estado de sucesso (texto / fundo) |
| `destructive` / `destructive-soft` | `#8A2A1F` / `#F4E1DA` | Erro e ações destrutivas (texto / fundo) |
| `ring` | `#B8361B` | Anel de foco |

No Tailwind, `accent` do shadcn é o tom de hover (`wash`), não o vermelho. O vermelho de marca é sempre `primary`.

As paletas padrão do Tailwind estão desativadas (`--color-*: initial`): só os tokens acima existem. Uma classe como `bg-blue-500` não gera nada.

Contraste WCAG (mínimo AA = 4,5:1):

| Par | Razão |
|---|---|
| Tinta sobre papel | 15,30:1 |
| Tinta sobre superfície | 16,38:1 |
| Botão primário (superfície sobre acento) | 5,53:1 |
| Botão primário no hover | 7,46:1 |
| Texto secundário sobre papel | 5,15:1 |
| Texto secundário sobre `wash` | 4,75:1 |
| Link/acento sobre papel | 5,16:1 |
| Sucesso sobre fundo de sucesso | 5,25:1 |
| Erro sobre fundo de erro | 6,84:1 |

### Fontes

Self-hosted por `@fontsource-variable` (sem CDN), importadas em `index.css`.

| Utilitário | Fonte | Uso |
|---|---|---|
| `font-serif` | Newsreader | Títulos (`h1` a `h3` já usam), marca "Ditado", títulos de cartão |
| `font-sans` | Instrument Sans | Corpo e interface (padrão do `body`) |
| `font-mono` | JetBrains Mono | Texto transcrito, nomes de arquivo, dados técnicos |

### Escala tipográfica

| Utilitário | Tamanho / linha |
|---|---|
| `text-xs` | 12 / 16 px |
| `text-sm` | 14 / 20 px |
| `text-base` | 16 / 24 px |
| `text-lg` | 18 / 28 px |
| `text-xl` | 22 / 30 px |
| `text-2xl` | 28 / 34 px |
| `text-3xl` | 36 / 40 px |
| `text-4xl` | 48 / 52 px |

`h1` é 36 px no celular e 48 px a partir de 768 px. Não defina tamanhos fora da escala (`text-[17px]`).

### Forma e espaço

- Raio: `rounded-sm` 2px, `rounded-md` 3px, `rounded-lg` 4px. Nunca `rounded-full` em controles, nem círculo em torno de ícone.
- Sem sombras: os utilitários `shadow-*` não existem. Separe com borda de 1px (`border`) ou linha divisória.
- Espaçamento em grade de 4/8px: use a escala do Tailwind (`p-2`, `gap-4`, `py-8`).
- Largura máxima de página: `max-w-page` (72rem).
- Foco: contorno de 2px na cor `ring`, afastado 2px. Já vem nos componentes.
- Animação: apenas transições curtas de cor e o fade de diálogos. Nada chamativo.

## Regras de uso

- O acento (`primary`) aparece em: um botão primário por tela, o link ativo da navegação (sublinhado), o foco, o seletor ativo de abas e links de texto. Não pinte títulos, fundos ou ícones com ele.
- Erro e sucesso: use `Badge` (`success`, `destructive`) e `sonner` para avisos. Erros de campo em `text-destructive`, sempre com texto, nunca só cor.
- Telas internas: `AppShell` > `PageContainer` > `PageHeader` + conteúdo. O conteúdo principal é tabela ou lista com linhas finas, não grade de cartões.
- Cartão (`Card`) só para um bloco que realmente precisa de moldura, como um formulário. Nunca repita cartões iguais em grade de três colunas.
- Texto transcrito vai em `font-mono`, em superfície `card` com borda.
- Todo carregamento usa `Skeleton`; todo erro de chamada é mostrado em texto claro.
- Microcopy: direto, em português, verbos no imperativo ("Enviar áudio", "Excluir"). Sem texto de marketing.
- Ícones: `lucide-react`, soltos ao lado do texto, sem fundo colorido.

## O que evitar

Gradientes; roxo ou azul-índigo; glassmorphism e desfoque; brilhos; sombras; herói centralizado com título, subtítulo e dois botões; três cartões iguais em colunas; ícones dentro de círculos coloridos; emojis; texto de marketing genérico; animações chamativas; modo escuro.

## Componentes disponíveis

`components/ui` (shadcn, já ajustados ao design; não sobrescreva estilo nas páginas):

`Button` (variantes `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`; tamanhos `sm`, `default`, `lg`, `icon`), `Input`, `Label`, `Textarea`, `Select`, `Switch`, `RadioGroup` (itens quadrados, sem `rounded-full`; agrupe com `fieldset` e `legend`), `Slider` (trilho fino, marcador quadrado), `Card`, `Badge` (`default`, `accent`, `success`, `destructive`, `outline`), `Table`, `Tabs`, `Dialog`, `AlertDialog` (confirmar exclusão), `DropdownMenu`, `Separator`, `Skeleton`, `Toaster` (sonner; chame `toast.success` e `toast.error`).

`components/layout`:

- `AppShell`: cabeçalho com marca "Ditado" em serifada, navegação (`navigation`, lista de `{to, label}`) e área do usuário (`userArea`). Requer estar dentro de um roteador.
- `PageContainer`: largura máxima e margens padrão.
- `PageHeader`: `title`, `description` opcional e `action` opcional, com linha fina embaixo.
- `AuthLayout`: telas `/entrar` e `/cadastrar`. Duas colunas: à esquerda o painel de marca (fundo tinta, "Ditado" em serifada e uma frase curta); à direita o formulário, centralizado na vertical, com largura máxima `max-w-sm`. Em tela estreita vira uma coluna e o painel se reduz a um cabeçalho com a marca. Props: `title`, `description` opcional, `children` (o formulário) e `footer` (link alternativo, por exemplo "Não tem conta? Cadastrar").
- `GoogleSignInButton` (`components/auth`): separador "ou" (linha fina de 1px entre duas linhas) e o botão do Google Identity Services, renderizado pelo próprio Google (`theme` outline, `shape` rectangular, `locale` pt-BR). Fica abaixo do formulário em `/entrar` e `/cadastrar` e só aparece quando `GET /api/auth/google` informa o client ID. Erros usam o mesmo bloco `role="alert"` dos formulários.

- `AudioPlayer` (`components/transcriptions`): recebe `id`, `fileName` e `hasAudio`; mostra "Áudio não guardado" em texto discreto ou o botão "Ouvir" (`Button` outline `sm`), que baixa o áudio pelo `api`. Depois de baixado, mostra um controle próprio em uma faixa de borda fina: botão quadrado de tocar e pausar (`Button` primário `icon-sm`), tempo atual e duração em `font-mono`, e a barra de posição (`Slider`: trilho `border`, preenchimento `foreground`, marcador quadrado). O `<audio>` nativo fica oculto e nunca é mostrado com seus controles do navegador. Só um toca por vez.

Se faltar um componente, adicione com `npx shadcn@latest add <nome>` dentro de `frontend/` e ajuste-o aos tokens (sem sombras, sem `dark:`, raios pequenos, foco em contorno) antes de usar.

## Utilitários

- `cn()` em `@/lib/utils` combina classes.
- Alias `@` aponta para `frontend/src`.
