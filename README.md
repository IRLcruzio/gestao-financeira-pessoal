# Gestão Financeira Pessoal

App pessoal de gestão financeira mensal — PWA instalável no iOS e Windows,
construída com Next.js + Tailwind + Supabase.

Este projeto corresponde às **Fases 0, 1, 2, 3, 4 e parte da 5** do roteiro em `roadmap_app_financas.md`.

## O que já está feito (Reestruturação da ligação bancária — novo)

- ✅ **Sincronização 100% automática, em qualquer página** — verifica de minuto a minuto sozinha, em segundo plano, sem precisares de clicar nada
- ✅ **Reconciliação** — se uma transação desaparecer do lado do banco (ex: pendente cancelada), a app remove-a automaticamente
- ✅ **Cada movimento fica associado ao banco de onde veio** — Rendimentos, Despesas e Movimentos mostram/organizam por banco
- ✅ **Resumo por banco no topo** — Dashboard, Rendimentos, Despesas e Movimentos mostram o saldo real de cada banco ligado
- ✅ **Categoria automática "Outros"** ao chegar do banco — categorizas depois à vontade, com um menu direto em cada despesa (já não é preciso rever antes de importar)
- ✅ **Página "Histórico" nova** — a importação manual de CSV/PDF mudou-se para aqui, para extratos antigos que o banco já não mostra
- 🚧 **Subscrições continuam manuais** — detetar automaticamente pagamentos recorrentes do banco é um problema mais complexo (padrões), fica para uma fase futura

## O que já está feito (Fase 5 — ligação bancária automática)

- ✅ **Ligação bancária via Enable Banking** — em Definições, escolhes o teu banco e autorizas o acesso através do login normal do teu banco
- ✅ **Páginas de Privacidade e Termos** — necessárias para o registo da aplicação na Enable Banking

### ⚠️ Configuração manual necessária — variáveis de ambiente

Para a ligação bancária funcionar, precisas de adicionar 2 variáveis de ambiente — **tanto no
teu computador (`.env.local`) como no Vercel**:

```
ENABLE_BANKING_APP_ID=1833b3ca-5356-455c-94e2-c4f8d68e7d77
ENABLE_BANKING_PRIVATE_KEY=<conteúdo do ficheiro .pem que descarregaste>
```

**No teu computador:** abre o ficheiro `.env.local` na pasta `app` e acrescenta essas duas linhas
no fim. Para a chave privada, abre o ficheiro `.pem` num editor de texto, copia todo o conteúdo tal
como está (incluindo as linhas `-----BEGIN...` e `-----END...`), e cola tudo numa única linha,
substituindo as quebras de linha por `\n` — ou mais simples: cola o ficheiro `.pem` inteiro entre
aspas, assim:
```
ENABLE_BANKING_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQ...
-----END PRIVATE KEY-----"
```

**No Vercel:** Settings → Environment Variables → adiciona as mesmas duas, com os mesmos valores,
depois faz um novo deploy (Redeploy) para as aplicar.



- ✅ **Histórico mensal** — setas ◀ ▶ no Dashboard para navegar entre meses passados, cada um com o seu resumo e gráfico
- ✅ **Saldo total da conta** — novo cartão no Dashboard, soma o saldo inicial (definido em Definições) com tudo o que já registaste, em toda a história — independente do mês selecionado
- ✅ **Saldo inicial editável** — em Definições, define quanto tinhas na conta antes de começares a usar a app

## O que já está feito (Fase 5 — importação manual)

- ✅ **Página "Movimentos" nova** — separada de Rendimentos/Despesas/Subscrições, mostra só as transações importadas do banco, já divididas em entradas/saídas
- ✅ **Navegação mobile redesenhada** — em vez da barra inferior (que estava a ficar cheia com 7 páginas), agora há uma barra superior com um menu (☰) que abre a lista completa
- ✅ **Importar extrato (CSV)** — botão "Importar extrato" agora na página Movimentos
  - Assistente em 3 passos: carregar ficheiro → mapear colunas (data/descrição/valor) → rever e categorizar
  - Deteta automaticamente quais colunas são quais pelo nome (mas podes corrigir)
  - Cada linha pode ser incluída/excluída antes de confirmar
  - Continua também a somar aos totais de Rendimentos/Despesas e ao Dashboard, como seria de esperar
- ✅ **Suporte a PDF do ActivoBank** — o "Extrato Combinado" já é lido diretamente, sem precisares de converter para CSV. Testado com um extrato real (80 transações lidas corretamente, valores e datas certos)
- 🚧 **Ligação automática via Enable Banking** — ainda por fazer (substituto da GoCardless, que fechou registos novos)

## O que já está feito (Fase 4 — novo)

- ✅ **Contribuições manuais de investimento** — registo simples, sem precisares de ligar nada
- ✅ **Ligação Trading212** — guarda a **chave e o segredo** da API em Investimentos (a Trading212 mudou recentemente para exigir os dois)
- ✅ **Atualização automática** — sempre que abres a página de Investimentos (com credenciais guardadas), os dados atualizam-se sozinhos, sem precisares de clicar em nada. Só grava um novo ponto no histórico do gráfico uma vez a cada 24h, para o gráfico não ficar cheio de picos
- ✅ **Posições individuais** — ticker, quantidade, % do portfólio, valor e variação (lucro/prejuízo) de cada ação
- ✅ **Variação total do portfólio** — soma do lucro/prejuízo de todas as posições, ao lado do valor total
- ✅ **Gráfico de evolução** — valor do portfólio ao longo do tempo (Recharts), assim que houver mais do que uma sincronização
- ✅ **Correção:** categoria "Subscrições" já não aparece na gestão manual de categorias nem no dropdown de Despesas — é atribuída automaticamente sempre que crias uma subscrição
- ✅ **Correção:** o PIN volta a ser pedido depois de fazeres logout e login outra vez

### ⚠️ Nota sobre a Trading212
A autenticação da API da Trading212 tem tido alterações recentes (alguns exemplos mostram um
esquema com chave+segredo combinados via Basic Auth, em vez de só uma chave). Implementei a
versão mais comum e testada por a comunidade. **Se a sincronização falhar com "chave inválida"**,
diz-me o erro exato e ajusto o formato da autenticação rapidamente.

## O que já está feito

- ✅ Projeto Next.js 14 + TypeScript + Tailwind, configurado como PWA
- ✅ Base de dados Supabase criada (projeto `gestao-financeira-pessoal`, região Paris/eu-west-3)
  com as 8 tabelas do esquema e Row Level Security ativa (cada utilizador só vê os seus dados)
- ✅ Login/registo por email via Supabase Auth
- ✅ **Autenticação em duas etapas (2FA)** via app autenticadora (Google Authenticator, Authy, etc.) — opcional, ativa-se em Definições
- ✅ **PIN de 6 dígitos** para desbloqueio rápido sempre que abres a app — opcional, ativa-se em Definições
- ✅ **Assistente de registo (onboarding)** — nome/país já ficam no ecrã de criar conta; depois 4 passos rápidos (foto, PIN, banco, investimentos), todos skippable
- ✅ **Link de confirmação de email "suave"** — clicar no link do email já entra na conta automaticamente, sem passar pelo login (ver configuração manual abaixo)
- ✅ **"Lembrar-me neste dispositivo"** no login
- ✅ **Área de perfil**: nome e foto de perfil (armazenada no Supabase Storage)
- ✅ **Botão de esconder valores** (ícone de olho) — oculta os montantes no Dashboard com um clique
- ✅ Navegação entre as 6 páginas (sidebar no desktop, barra inferior no telemóvel),
  já com a identidade visual definida (escuro, dourado, minimalista)
- ✅ Dashboard já ligado a dados reais (mostra saldo do mês, vazio até adicionares dados)
- 🚧 Rendimentos, Despesas, Subscrições, Investimentos — placeholders, por construir na Fase 2+

## ⚠️ Configuração manual necessária (só uma vez) — link de confirmação suave

Para o link de confirmação de email já entrar automaticamente na conta (sem passares
pelo ecrã de login), precisas de 2 ajustes rápidos no painel do Supabase — coisas que
as minhas ferramentas não conseguem alterar diretamente:

### 1. Atualizar o template do email de confirmação
1. Vai a [supabase.com/dashboard](https://supabase.com/dashboard) → projeto `gestao-financeira-pessoal`
2. **Authentication** → **Email Templates** → escolhe **"Confirm signup"**
3. No HTML do template, encontra o link `<a href="{{ .ConfirmationURL }}">` e substitui por:
   ```
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirmar email</a>
   ```
4. Guarda

### 2. Configurar os URLs permitidos
1. **Authentication** → **URL Configuration**
2. **Site URL:** `https://gestao-financeira-pessoal-beige.vercel.app`
3. **Redirect URLs** — adiciona estas duas linhas:
   ```
   http://localhost:3000/**
   https://gestao-financeira-pessoal-beige.vercel.app/**
   ```
4. Guarda

Sem isto, os links de confirmação continuam a funcionar da forma antiga (funcional,
mas pedem para voltares ao login depois de confirmar).

## Como atualizar a tua instalação existente (se já tinhas a Fase 0 a correr)

1. Para a app (`Ctrl+C` no terminal onde corre `npm run dev`)
2. Apaga a pasta `app` antiga (ou renomeia) e extrai este zip no mesmo sítio
3. **Copia de volta o teu `.env.local`** se por acaso não o tiveres guardado à parte (já vem incluído neste zip, com as mesmas credenciais de sempre — não muda nada)
4. Corre:
   ```bash
   npm install
   npm run dev
   ```
5. Testa em `localhost:3000` — cria uma conta nova (ou usa a existente) e experimenta o onboarding, o PIN e o 2FA em Definições
6. Quando estiver tudo bem, envia para o GitHub para o Vercel publicar automaticamente:
   ```bash
   git add .
   git commit -m "Fase 1: seguranca (2FA + PIN), onboarding, perfil, esconder valores"
   git push
   ```

## Como correr localmente

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). As credenciais do Supabase já estão
configuradas em `.env.local` (não precisas de mexer nisto).

## Como publicar (deploy)

A app já está pronta para deploy no Vercel, mas o passo de ligação é manual (ainda não
existe um conector direto GitHub → Vercel automatizável a partir daqui). Passos:

1. **Cria um repositório no GitHub** (se ainda não tiveres um) e envia este código:
   ```bash
   git init
   git add .
   git commit -m "Fase 0: fundação da app"
   git remote add origin <URL_DO_TEU_REPOSITORIO>
   git push -u origin main
   ```
2. Vai a [vercel.com](https://vercel.com), inicia sessão com a tua conta GitHub
3. Clica em "Add New Project" e escolhe o repositório que acabaste de criar
4. Nas variáveis de ambiente do Vercel, adiciona as mesmas duas que estão em `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Clica em "Deploy" — em cerca de 1 minuto tens a app online, com um link `https://....vercel.app`

## Como instalar no telemóvel/computador (depois do deploy)

- **iOS:** abre o link no Safari → botão de partilha → "Adicionar ao Ecrã Principal"
- **Windows:** abre o link no Edge ou Chrome → ícone de instalar na barra de endereço

## Próximos passos (Fase 5)

- Upload manual de CSV/PDF do extrato com mapeamento para categorias
- Tentativa de integração automática via GoCardless (com seletor de banco nas Definições)

Consulta `roadmap_app_financas.md` para o roteiro completo.
