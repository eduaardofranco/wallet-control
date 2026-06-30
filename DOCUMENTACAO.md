# Carteira de Investimentos - Documentacao do Sistema

## Visao Geral

App fullstack para gerenciar uma carteira de investimentos pessoal.
- **Backend:** Node.js + Express + Prisma (SQLite)
- **Frontend:** React + Vite
- **Autenticacao:** JWT (JSON Web Token)

---

## Como Rodar

```bash
cd ~/carteira-investimentos
npm run dev
```

Isso sobe backend (porta 3001) e frontend (porta 5173) simultaneamente usando `concurrently`.

- **Login:** francoeduaardo@gmail.com / 123456
- **URL:** http://localhost:5173

---

## Estrutura de Pastas

```
carteira-investimentos/
  package.json              <- script "dev" que roda backend + frontend juntos
  backend/
    .env                    <- variaveis de ambiente (DB, JWT secret, porta)
    prisma/
      schema.prisma         <- modelos do banco de dados
      seed.js               <- script que importa dados do Excel para o banco
      dev.db                <- banco SQLite (gerado automaticamente)
    src/
      server.js             <- ponto de entrada do Express
      middlewares/
        auth.js             <- middleware de autenticacao JWT
      controllers/
        authController.js   <- registro e login de usuarios
        assetController.js  <- CRUD de ativos (acoes, cripto, RF, etc)
        dividendController.js <- CRUD de dividendos por ativo
        dashboardController.js <- dados agregados para o dashboard
      routes/
        auth.js             <- rotas POST /api/auth/login e /register
        assets.js           <- rotas GET/POST/PUT/DELETE /api/assets
        dividends.js        <- rotas GET/POST/DELETE /api/dividends
        dashboard.js        <- rota GET /api/dashboard
      services/
        prices.js           <- servico de cotacoes online
  frontend/
    src/
      main.jsx              <- ponto de entrada React
      App.jsx               <- rotas e estrutura do app
      index.css             <- estilos globais e variaveis CSS
      context/
        AuthContext.jsx      <- contexto de autenticacao (login/logout/registro)
      services/
        api.js              <- cliente axios configurado com interceptor JWT
      components/
        Layout.jsx + .css   <- sidebar de navegacao + area principal
      pages/
        Login.jsx           <- tela de login
        Register.jsx        <- tela de cadastro
        Auth.css             <- estilos compartilhados login/cadastro
        Dashboard.jsx + .css <- pagina inicial com resumo e listagem
        Assets.jsx           <- CRUD de ativos com tabela e formulario
        AssetDetail.jsx      <- detalhe de um ativo + dividendos
        Dividends.jsx        <- resumo de dividendos com graficos
```

---

## Banco de Dados (Prisma + SQLite)

### Arquivo: `backend/prisma/schema.prisma`

Tres modelos:

**User** - Usuario do sistema
| Campo    | Tipo     | Descricao                    |
|----------|----------|------------------------------|
| id       | Int (PK) | ID auto-incremento           |
| name     | String   | Nome do usuario              |
| email    | String   | Email (unico)                |
| password | String   | Senha com hash bcrypt        |
| assets   | Asset[]  | Ativos do usuario            |

**Asset** - Ativo financeiro
| Campo        | Tipo      | Descricao                                    |
|--------------|-----------|----------------------------------------------|
| id           | Int (PK)  | ID auto-incremento                           |
| ticker       | String    | Codigo do ativo (ex: BBAS3, BTC, IPCA+2050)  |
| name         | String    | Nome descritivo (resolvido automaticamente)   |
| category     | String    | ACAO, FII, ETF, BDR, CRIPTO, RENDA_FIXA      |
| quantity     | Float     | Quantidade de cotas/acoes                    |
| averagePrice | Float     | Preco medio de compra (USD para cripto)      |
| ceilingPrice | Float?    | Preco teto (opcional, metodo Bazin)          |
| currentPrice | Float     | Ultima cotacao buscada online                |
| userId       | Int (FK)  | Dono do ativo                                |
| dividends    | Dividend[]| Dividendos recebidos                         |

**Dividend** - Provento recebido
| Campo   | Tipo     | Descricao                          |
|---------|----------|------------------------------------|
| id      | Int (PK) | ID auto-incremento                 |
| amount  | Float    | Valor em R$                        |
| date    | DateTime | Data do pagamento                  |
| type    | String   | DIVIDENDO, JCP ou RENDIMENTO       |
| assetId | Int (FK) | Ativo relacionado                  |

---

## Backend - Detalhamento

### server.js
Configura Express com CORS e JSON, registra as 4 rotas principais.

### middlewares/auth.js
Extrai o token JWT do header `Authorization: Bearer <token>`, valida e injeta `req.userId` para uso nos controllers. Retorna 401 se invalido.

### controllers/authController.js
- **register:** Cria usuario com senha hashada (bcrypt), retorna token JWT valido por 7 dias
- **login:** Valida email/senha, retorna token JWT

### controllers/assetController.js
- **list:** Lista ativos do usuario, busca cotacoes online e atualiza no banco
- **getById:** Retorna um ativo com seus dividendos + cotacao atualizada
- **create:** Cria ativo com ticker (resolve nome automaticamente), busca cotacao inicial
- **update:** Atualiza quantidade, preco medio e/ou categoria
- **remove:** Deleta ativo e seus dividendos (cascade)

Para cripto, o PM e armazenado em USD. Na listagem, a resposta inclui `usdBrl` e `isCrypto` para o frontend converter.

### controllers/dividendController.js
- **list:** Lista dividendos de um ativo
- **create:** Adiciona dividendo (valor, data, tipo)
- **remove:** Remove dividendo
- **summary:** Retorna totais agrupados por mes e por ativo (para graficos)

### controllers/dashboardController.js
Retorna dados agregados:
- `totalInvested` - soma de (quantidade x PM) de todos os ativos
- `totalCurrent` - soma de (quantidade x cotacao atual)
- `totalDividends` - soma de todos os dividendos
- `profit` / `profitPercent` - lucro/prejuizo total
- `byCategory` - investido e atual agrupados por categoria
- `alertas` - ativos com preco atual <= preco teto
- `assetList` - lista detalhada de cada ativo com:
  - `variacao` - % entre PM e cotacao atual
  - `rentabilidade` - retorno total incluindo dividendos
  - `saldo` - valor atual (quantidade x cotacao)
  - `percentCarteira` - peso do ativo no patrimonio total
  - `averagePriceBrl` - PM convertido para BRL (para cripto)
- `usdBrl` - cotacao atual do dolar

Para cripto, o PM em USD e multiplicado pela cotacao atual do dolar antes de calcular variacao e rentabilidade.

### services/prices.js
Busca cotacoes online de 3 fontes:

| Tipo         | Fonte                    | Como funciona                                    |
|--------------|--------------------------|--------------------------------------------------|
| Acoes/FIIs   | brapi.dev                | API REST, retorna `regularMarketPrice`           |
| Cripto       | CoinGecko                | API REST, retorna preco em BRL                   |
| Tesouro      | StatusInvest (scraping)  | Extrai preco do HTML via regex                   |
| Dolar        | AwesomeAPI               | Retorna cotacao USD/BRL (bid)                    |

Funcoes exportadas:
- `fetchPrices(tickers)` - recebe array de tickers, retorna objeto `{ ticker: preco }`
- `fetchUsdBrl()` - retorna cotacao atual USD/BRL
- `isCrypto(ticker)` - verifica se e cripto pelo mapa interno
- `isTesouro(ticker)` - verifica se e titulo do Tesouro
- `resolveName(ticker)` - retorna nome amigavel (ex: BBAS3 -> "Banco do Brasil")

---

## Frontend - Detalhamento

### App.jsx
Define as rotas com React Router:
- `/login` e `/register` - publicas
- `/` (Dashboard), `/ativos`, `/ativos/:id`, `/dividendos` - protegidas por `PrivateRoute`

### context/AuthContext.jsx
Gerencia estado de autenticacao:
- Armazena `user` e `token` no localStorage
- Expoe `login()`, `register()`, `logout()`
- Ao carregar, recupera usuario do localStorage

### services/api.js
Cliente axios com:
- `baseURL: http://localhost:3001/api`
- Interceptor de request: adiciona header `Authorization` com token
- Interceptor de response: redireciona para `/login` em caso de 401

### components/Layout.jsx
Sidebar fixa com:
- Nome do usuario
- Links: Dashboard, Ativos, Dividendos
- Botao de logout

### pages/Dashboard.jsx
Pagina principal com:
1. **Cards de resumo** - Total investido, Patrimonio atual (com %), Dividendos recebidos
2. **Botao ocultar valores** - esconde todos os valores monetarios e percentuais
3. **Secoes por categoria** (accordion) - cada categoria mostra:
   - Cabecalho: icone, nome, qtd ativos, valor total, variacao, rentabilidade, % carteira
   - Tabela expandivel: ticker, quantidade, PM, preco atual, variacao, rentabilidade, saldo, % carteira
   - Para cripto: PM exibido em BRL (com tooltip em USD)
4. **Grafico de pizza** - distribuicao do patrimonio por categoria (Recharts)
5. **Alertas de preco teto** - ativos com cotacao abaixo do teto Bazin

### pages/Assets.jsx
CRUD de ativos com:
- Filtro por categoria (botoes)
- Formulario simplificado: apenas Ticker, Categoria, Quantidade, Preco Medio
  - Nome e resolvido automaticamente no backend
  - Preco atual e buscado online
  - Preco teto nao e lancado individualmente
- Tabela com: ticker, categoria, qtd, PM, atual, teto, total, lucro
- Botoes de editar e excluir por ativo

### pages/AssetDetail.jsx
Detalhe de um ativo com:
- Resumo: ticker, nome, preco atual vs teto, total investido, lucro/prejuizo
- Gestao de dividendos: adicionar (valor, data, tipo), listar, remover
- Tipos de dividendo: Dividendo, JCP, Rendimento

### pages/Dividends.jsx
Resumo de dividendos com:
- Total recebido
- Grafico de barras mensal (Recharts)
- Tabela ranking por ativo (total e % do total)

---

## Fluxo de Dados

```
Usuario abre o app
  -> Frontend verifica token no localStorage
  -> Se nao tem: redireciona para /login
  -> Se tem: carrega Dashboard

Dashboard:
  -> GET /api/dashboard (com token no header)
  -> Backend busca ativos do usuario no banco
  -> Backend busca cotacoes online (brapi, CoinGecko, StatusInvest)
  -> Backend busca cotacao USD/BRL (AwesomeAPI)
  -> Backend calcula variacao, rentabilidade, saldo, % carteira
  -> Backend salva cotacoes atualizadas no banco (async, nao bloqueia)
  -> Retorna JSON com tudo agregado
  -> Frontend renderiza cards, secoes por categoria, graficos

Criar ativo:
  -> POST /api/assets { ticker, category, quantity, averagePrice }
  -> Backend resolve nome pelo ticker
  -> Backend busca cotacao atual
  -> Salva no banco e retorna
  -> Frontend recarrega lista

Adicionar dividendo:
  -> POST /api/dividends/:assetId { amount, date, type }
  -> Salva no banco vinculado ao ativo
  -> Frontend recarrega detalhe do ativo
```

---

## Dados Importados do Excel

O script `prisma/seed.js` leu o arquivo `Carteira Completa ultima.xlsx` e importou:

| Ticker      | Categoria   | Qtd      | PM (moeda original) |
|-------------|-------------|----------|----------------------|
| BBAS3       | Acao        | 700      | R$ 20,88             |
| RANI3       | Acao        | 380      | R$ 8,76              |
| BBSE3       | Acao        | 96       | R$ 35,07             |
| AXIA3       | Acao        | 0        | R$ 1,00 (candidata)  |
| ISAE4       | Acao        | 0        | R$ 1,00 (candidata)  |
| IPCA+2050   | Renda Fixa  | 28,75    | R$ 869,22            |
| RENDA+2060  | Renda Fixa  | 86       | R$ 251,00            |
| ETH         | Cripto      | 0,58     | US$ 3.999,21         |
| BTC         | Cripto      | 0,019    | US$ 71.023,39        |
| XRP         | Cripto      | 761,2    | US$ 1,98             |
