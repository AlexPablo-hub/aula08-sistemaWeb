# Ditado — Sistema de design

Este arquivo define a aparência do frontend. Todo agente que mexer em `frontend/src` deve segui-lo. Os tokens vivem em um único lugar: `frontend/src/index.css`.

**Regra central: nunca estilize com cores, fontes ou sombras soltas. Use tokens e componentes.** Nada de `#hex`, `rgb()`, `text-red-500`, `font-[...]`, `shadow-*` ou `style={{ color }}` nas páginas.

## Princípios

- Papel e tinta: o produto transcreve fala em texto, então a interface parece uma página impressa. A tipografia é a protagonista.
- Um único acento (vermelho-tinta), usado com parcimônia.
- Bordas finas de 1px e linhas divisórias no lugar de sombras e cartões flutuantes.
- Layout assimétrico, tabelas e listas com linhas finas, texto direto em português.
- Dois temas, claro e escuro, com os mesmos princípios: o escuro é o claro invertido, com preto quente, nunca preto puro.

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

Contraste WCAG do tema claro (mínimo AA = 4,5:1 para texto; o do tema escuro está na seção "Tema escuro"):

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
| Borda sobre papel / superfície (decorativa) | 1,36:1 / 1,46:1 |

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

## Tema escuro

Papel e tinta invertidos: fundo preto quente, texto creme, o mesmo vermelho-tinta em um tom mais claro. Sem gradientes, sombras, desfoque ou roxo, como no tema claro.

### Mecanismo

- A classe `dark` no `<html>` ativa o tema. `index.css` define o bloco `.dark { ... }`, que só troca os valores dos tokens; os nomes semânticos (`background`, `card`, `primary`...) seguem os tokens e os componentes trocam sozinhos. `color-scheme` é `light` no claro e `dark` no escuro (controles nativos, barras de rolagem, seleção de arquivo).
- Regra: tokens em um lugar só. Nenhum hex, `rgb()` ou `hsl()` fora de `index.css`, e nenhum `dark:` espalhado nos componentes. Se um componente precisar de uma cor diferente por tema, crie um token em `index.css` (foi o que se fez com `scrim` e `panel*`). Hoje não há nenhuma ocorrência de `dark:` em `frontend/src`.
- Sem escolha salva, o tema segue a preferência do sistema operacional (`prefers-color-scheme`) e reage quando ela muda. Ao clicar no botão, a escolha fica salva em `localStorage`, chave `ditado-theme`, valor `light` ou `dark` (texto simples). Escolha salva vence o sistema.
- Para não piscar o tema errado, um script inline e síncrono em `frontend/index.html` aplica a classe antes do React. Ele e `src/lib/theme.ts` precisam concordar na chave e nos valores. A lógica pura está em `lib/theme.ts` (`resolveTheme`, leitura e gravação seguras); o estado, em `store/themeStore.ts` (Zustand, preferência do navegador, nada no servidor).
- `ThemeToggle` (`components/layout`): botão `ghost` `icon-sm` com Sun (no escuro) ou Moon (no claro), `aria-label` e `title` "Mudar para o tema claro" / "Mudar para o tema escuro". Fica no cabeçalho do `AppShell`, no cabeçalho da Home e no canto superior direito da coluna do formulário do `AuthLayout`. A página 404 não tem cabeçalho e não tem o botão; ela apenas usa o tema vigente.

### Tokens do tema escuro

| Token Tailwind | Valor | Uso |
|---|---|---|
| `background` (`paper`) | `#14120F` | Fundo da página |
| `card` / `popover` (`surface`) | `#1C1A16` | Superfícies |
| `foreground` (`ink`) | `#EDE7D9` | Texto principal, linha do cabeçalho |
| `muted-foreground` (`ink-soft`) | `#A39B8C` | Texto secundário |
| `border` (`rule`) | `#34302A` | Bordas e divisórias |
| `input` | `#756E60` | Borda de campos (mais forte, 3:1) e trilho do `Switch` |
| `muted` / `secondary` / `accent` (`wash`) | `#25221D` | Hover, botão secundário |
| `primary` / `ring` | `#E2593B` | Acento, foco |
| `primary-hover` | `#EC735A` | Hover do botão primário |
| `primary-foreground` | `#14120F` | Texto sobre o acento (escuro) |
| `success` / `success-soft` | `#8FCB9B` / `#1B2A1F` | Sucesso (texto / fundo) |
| `destructive` / `destructive-soft` | `#F0907C` / `#34201B` | Erro (texto / fundo) |
| `scrim` | `#0A0909` a 60% | Fundo atrás de diálogos (no claro, tinta a 40%) |
| `panel`, `panel-foreground`, `panel-muted`, `panel-line`, `panel-edge` | `#1C1A16`, `#EDE7D9`, `#A39B8C`, `#34302A`, `#34302A` | Painel de marca do `AuthLayout` |

O painel de marca do `AuthLayout` é escuro no tema claro (tinta). No escuro ele usa a superfície (`#1C1A16`), um tom acima do fundo do formulário (`#14120F`), com linha divisória `panel-edge` entre os dois.

Em componentes shadcn que usavam `bg-ink/40` para o fundo de diálogos foi usado o token `bg-scrim`, porque `ink` é claro no escuro.

### Contraste calculado (WCAG 2.x, razão de luminância relativa)

Texto: mínimo 4,5:1. Bordas e marcadores essenciais: mínimo 3:1.

| Par | Claro | Escuro |
|---|---|---|
| Texto principal sobre papel | 15,30 | 15,17 |
| Texto principal sobre superfície | 16,38 | 14,09 |
| Texto principal sobre `wash` | n/c | 12,85 |
| Texto secundário sobre papel | 5,15 | 6,79 |
| Texto secundário sobre superfície | n/c | 6,31 |
| Texto secundário sobre `wash` | 4,75 | 5,75 |
| Botão primário (texto sobre acento) | 5,53 | 5,10 |
| Botão primário no hover | 7,46 | 6,38 |
| Link/acento sobre papel | 5,16 | 5,10 |
| Link/acento sobre superfície | n/c | 4,74 |
| Sucesso sobre fundo de sucesso | 5,25 | 8,00 |
| Erro sobre fundo de erro | 6,84 | 6,57 |
| Erro sobre papel | n/c | 8,00 |
| Borda de campo (`input`) sobre superfície | 1,46 | 3,44 |
| Borda decorativa (`border`) sobre papel | 1,36 | 1,43 |

Notas: bordas decorativas (divisórias de 1px) não carregam informação sozinha e ficam abaixo de 3:1 nos dois temas, como no desenho original. No tema claro a borda de campo (`input`) continua em 1,46:1, abaixo do 3:1; é herança do desenho original e não foi alterada nesta etapa. No tema escuro, o campo já tem borda de 3,44:1. "n/c" = não calculado.

### Pontos que acompanham o tema

- `Toaster` (sonner) recebe o tema efetivo do `themeStore`; as cores vêm dos tokens.
- `GoogleSignInButton`: `theme` `outline` no claro e `filled_black` no escuro. Ao trocar o tema, o botão é renderizado de novo; `initialize` roda uma vez por client ID.

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

Gradientes; roxo ou azul-índigo; glassmorphism e desfoque; brilhos; sombras; herói centralizado com título, subtítulo e dois botões; três cartões iguais em colunas; ícones dentro de círculos coloridos; emojis; texto de marketing genérico; animações chamativas; cor escrita fora de `index.css`.

## Componentes disponíveis

`components/ui` (shadcn, já ajustados ao design; não sobrescreva estilo nas páginas):

`Button` (variantes `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`; tamanhos `sm`, `default`, `lg`, `icon`), `Input`, `Label`, `Textarea`, `Select`, `Switch`, `RadioGroup` (itens quadrados, sem `rounded-full`; agrupe com `fieldset` e `legend`), `Slider` (trilho fino, marcador quadrado), `Card`, `Badge` (`default`, `accent`, `success`, `destructive`, `outline`), `Table`, `Tabs`, `Dialog`, `AlertDialog` (confirmar exclusão), `DropdownMenu`, `Separator`, `Skeleton`, `Toaster` (sonner; chame `toast.success` e `toast.error`).

`components/layout`:

- `AppShell`: cabeçalho com marca "Ditado" em serifada, navegação (`navigation`, lista de `{to, label}`), área do usuário (`userArea`) e o `ThemeToggle`. Requer estar dentro de um roteador.
- `ThemeToggle`: alterna o tema claro e escuro (ver "Tema escuro").
- `PageContainer`: largura máxima e margens padrão.
- `PageHeader`: `title`, `description` opcional e `action` opcional, com linha fina embaixo.
- `AuthLayout`: telas `/entrar` e `/cadastrar`. Duas colunas: à esquerda o painel de marca (fundo tinta no claro, superfície no escuro, "Ditado" em serifada e uma frase curta); à direita o formulário, centralizado na vertical, com largura máxima `max-w-sm`. Em tela estreita vira uma coluna e o painel se reduz a um cabeçalho com a marca. Props: `title`, `description` opcional, `children` (o formulário) e `footer` (link alternativo, por exemplo "Não tem conta? Cadastrar").
- `GoogleSignInButton` (`components/auth`): separador "ou" (linha fina de 1px entre duas linhas) e o botão do Google Identity Services, renderizado pelo próprio Google (`theme` outline no claro e filled_black no escuro, `shape` rectangular, `locale` pt-BR). Fica abaixo do formulário em `/entrar` e `/cadastrar` e só aparece quando `GET /api/auth/google` informa o client ID. Erros usam o mesmo bloco `role="alert"` dos formulários.

- `AudioPlayer` (`components/transcriptions`): recebe `id`, `fileName` e `hasAudio`; mostra "Áudio não guardado" em texto discreto ou o botão "Ouvir" (`Button` outline `sm`), que baixa o áudio pelo `api`. Depois de baixado, mostra um controle próprio em uma faixa de borda fina: botão quadrado de tocar e pausar (`Button` primário `icon-sm`), tempo atual e duração em `font-mono`, e a barra de posição (`Slider`: trilho `border`, preenchimento `foreground`, marcador quadrado). O `<audio>` nativo fica oculto e nunca é mostrado com seus controles do navegador. Só um toca por vez.

- `EditableTitle` (`components/transcriptions`): edição inline do título, no histórico e no diálogo. O título aparece como texto, com o `fileName` original abaixo em `font-mono` discreto (só se for diferente) e um botão fantasma `icon-xs` com lápis ("Editar título"). Em edição, vira um `Input` com o valor selecionado, `Salvar` e `Cancelar` (`sm`) e contador em `font-mono`; Enter salva, Esc cancela, e o erro aparece em bloco `destructive-soft` com `role="alert"`.

Se faltar um componente, adicione com `npx shadcn@latest add <nome>` dentro de `frontend/` e ajuste-o aos tokens (sem sombras, sem `dark:`, só tokens, raios pequenos, foco em contorno) antes de usar.

## Utilitários

- `cn()` em `@/lib/utils` combina classes.
- Alias `@` aponta para `frontend/src`.
