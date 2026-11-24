# Trabalho Integrador – Sistema de Biblioteca com JWT e Refresh Token

26/10/2026 · Projetos de exemplo: [jwt-api (back-end)](https://github.com/ADS-Unipar/jwt-api) e [jwt-app (front-end)](https://github.com/ADS-Unipar/jwt-app)

## 1. Objetivo

Evoluir os projetos **jwt-api** (Node.js + Express 5 + Sequelize + SQLite + JWT) e **jwt-app** (front-end) até formarem um **sistema de gestão de biblioteca** completo. O sistema deve ter login com **access token + refresh token**, cadastro de **categorias**, **autores**, **livros**, **leitores**, **atendentes** e o controle de **empréstimos e devoluções**.

Ao final, o aluno deve demonstrar que sabe:

- Organizar uma API em módulos (`router → controller → service → model`), como já é feito em `auth/` e `user/`.
- Modelar relacionamentos com Sequelize (1:N e N:N).
- Implementar autenticação stateless com JWT, renovação por refresh token e revogação no logout.
- Proteger rotas por perfil (administrador x atendente).
- Consumir a API no front-end, renovando o token automaticamente sem deslogar o usuário.

## 2. Passo a passo: clonar e conectar os dois projetos

### 2.1 Pré-requisitos

- Node.js 20 ou superior e npm
- Git
- VS Code (recomendado) e um cliente HTTP (Insomnia, Postman ou a extensão Thunder Client)

### 2.2 Clonar os repositórios

Crie uma pasta para o trabalho e clone os dois projetos lado a lado:

```bash
mkdir biblioteca && cd biblioteca
git clone https://github.com/ADS-Unipar/jwt-api.git
git clone https://github.com/ADS-Unipar/jwt-app.git
```

Estrutura esperada:

```text
biblioteca/
├── jwt-api/   ← back-end (porta 3000)
└── jwt-app/   ← front-end
```

> Dica: para entregar, faça um **fork** de cada repositório na sua conta (ou do grupo) e clone o fork, assim você consegue dar `git push`.

### 2.3 Subir a API

```bash
cd jwt-api
npm install
cp .envex .env        # no Windows: copy .envex .env
```

Edite o `.env`:

```env
JWT_SECRET=troque-por-uma-chave-grande-e-aleatoria
JWT_REFRESH_SECRET=outra-chave-diferente-da-primeira
PORT=3000
```

Inicie:

```bash
npm start
# SERVIDOR RODANDO http://localhost:3000
```

### 2.4 Liberar o CORS (obrigatório para o front conectar)

A API original **não tem CORS**. Sem isso, o navegador bloqueia as chamadas do front-end, que roda em outra porta.

```bash
npm install cors
```

No `index.js`, antes das rotas:

```js
const cors = require('cors');
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
```

Ajuste `origin` para a porta em que o seu front roda (5173 no Vite, 3001 no CRA, 8081 no Expo web etc.).

### 2.5 Corrigir o bug do login

Em `auth/auth.service.js`, a senha é comparada **antes** de verificar se o usuário existe. Com um e-mail inexistente a API quebra em vez de responder 401. Corrija:

```js
const user = await userService.findByEmail(email);
if (!user) throw new Error('Invalid email or password');
const isMatch = await bcrypt.compare(password, user.password);
if (!isMatch) throw new Error('Invalid email or password');
```

### 2.6 Criar o primeiro usuário e testar o login

```bash
curl -X POST http://localhost:3000/v1/user \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","username":"admin","email":"admin@biblioteca.com","password":"123456","isAdmin":true}'

curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@biblioteca.com","password":"123456"}'
```

Se vier `{ "token": "eyJ..." }`, a API está funcionando.

### 2.7 Subir o front-end e apontar para a API

Em outro terminal:

```bash
cd ../jwt-app
npm install
```

Localize no projeto onde fica a URL da API (arquivo `.env`, `src/services/api.js` ou similar) e aponte para `http://localhost:3000/v1`. Em um projeto Vite, por exemplo:

```env
VITE_API_URL=http://localhost:3000/v1
```

```bash
npm run dev
```

Abra o endereço exibido no terminal, faça login com o usuário criado no passo 2.6 e confira, na aba **Network** do DevTools, que a chamada a `/v1/auth/login` retornou 200.

### 2.8 Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Erro de CORS no console | CORS não habilitado ou `origin` errado | Revise o passo 2.4 |
| `secretOrPrivateKey must have a value` | `.env` não criado ou `JWT_SECRET` vazio | Revise o passo 2.3 |
| Login com e-mail errado derruba a API | Bug original do `auth.service` | Revise o passo 2.5 |
| `ECONNREFUSED` no front | API parada ou porta diferente | Confira se a API está rodando e a URL do front |
| Dados "fantasmas" no banco | `database.sqlite` veio versionado no repositório | Apague o arquivo e adicione `database.sqlite` ao `.gitignore` |

## 3. Escopo do sistema

### 3.1 Perfis de usuário

- **Administrador** (`isAdmin = true`): gerencia atendentes, categorias, autores e livros, e vê todos os relatórios.
- **Atendente** (`isAdmin = false`): cadastra leitores, registra empréstimos e devoluções e consulta o acervo.

O modelo `User` já existente representa os atendentes e administradores.

### 3.2 Entidades

| Entidade | Campos mínimos | Relacionamentos |
|---|---|---|
| **User** (atendente) | name, username, email, password, isAdmin, active | registra muitos Empréstimos |
| **Category** | name (único), description | possui muitos Livros |
| **Author** | name, nationality, birthDate | N:N com Livro |
| **Book** | title, isbn (único), year, totalCopies, availableCopies | pertence a uma Categoria; N:N com Autor (`BookAuthor`) |
| **Reader** (leitor) | name, cpf (único), email, phone | possui muitos Empréstimos |
| **Loan** (empréstimo) | loanDate, dueDate, returnDate, status, fine | pertence a Livro, Leitor e User |
| **RefreshToken** | token, userId, expiresAt, revoked | pertence a User |

### 3.3 Regras de negócio

1. Só é possível emprestar um livro com `availableCopies > 0`. O empréstimo decrementa o estoque e a devolução incrementa.
2. O prazo padrão é de **7 dias** (`dueDate = loanDate + 7`).
3. Um leitor pode ter no máximo **3 empréstimos ativos** e não pode pegar livros se tiver algum atrasado.
4. Na devolução após o prazo, calcular multa de **R$ 1,00 por dia de atraso** e gravar em `fine`.
5. `status` do empréstimo: `ATIVO`, `DEVOLVIDO` ou `ATRASADO` (atrasado é calculado quando `dueDate < hoje` e não há `returnDate`).
6. Não é permitido excluir categoria, autor ou livro que tenha vínculos ativos. Retorne **409 Conflict** com mensagem clara.
7. Empréstimo e devolução devem usar **transação do Sequelize** (`db.transaction`), para o estoque nunca ficar inconsistente.
8. Atendente desativado (`active = false`) não consegue fazer login.

As regras de empréstimo estão disponíveis nestes endpoints (todos exigem `Authorization: Bearer <token>`):

| Método | Rota | Uso |
|---|---|---|
| POST | `/v1/readers` | Cadastra leitor `{ name, cpf, email?, phone? }` |
| POST | `/v1/loans` | Abre empréstimo `{ bookId, readerId }`; o atendente vem do token |
| GET | `/v1/loans?status=ATIVO\|ATRASADO\|DEVOLVIDO` | Lista empréstimos e calcula/sincroniza os atrasos |
| PATCH | `/v1/loans/:id/return` | Devolve livro, atualiza estoque e calcula multa |
| GET | `/v1/readers/:id/loans` | Consulta histórico do leitor |

Empréstimos retornam **409 Conflict** quando não há exemplares, o leitor atingiu o limite, possui atraso, a devolução já foi registrada ou a exclusão violaria vínculos. Categorias e autores não podem ser excluídos enquanto estiverem ligados a livros. Livros com empréstimos ativos/atrasados ou histórico também não são excluídos para preservar o histórico referencial.

As escritas de empréstimo/devolução e as alterações de estoque usam transações SQLite `IMMEDIATE`, que serializam as operações concorrentes antes das verificações de estoque e limite. Escritas de categoria, autor e livro, assim como o gerenciamento de atendentes, exigem administrador; leitores e empréstimos exigem autenticação.

## 4. Autenticação com refresh token

A API usa **access token** de curta duração e **refresh token** rotativo. O access token fica na blacklist `logout_list` no logout; refresh tokens são persistidos e revogados em `RefreshTokens`.

### 4.1 Requisitos

- **Access token**: JWT assinado com `JWT_SECRET`, normalmente válido por **15 minutos** (900 segundos), payload com `id`, `name`, `email` e `isAdmin`. Enviado no header `Authorization: Bearer <token>`. Para o teste atual de refresh, a validade foi reduzida temporariamente para **30 segundos** em `auth/auth.service.js`.
- **Refresh token**: assinado com `JWT_REFRESH_SECRET` (ou string aleatória com `crypto.randomBytes`), validade de **7 dias**, **salvo na tabela `RefreshToken`**.
- `POST /v1/auth/login` retorna `{ accessToken, refreshToken, user }`.
- `POST /v1/auth/refresh` recebe `{ refreshToken }`, valida se existe no banco, não está revogado nem expirado, e devolve um **novo par** de tokens. O refresh antigo é revogado (**rotação de refresh token**).
- Se um refresh token já revogado for reutilizado, revogue **todos** os refresh tokens daquele usuário (detecção de roubo de token).
- `POST /v1/auth/logout` revoga o refresh token informado. A tabela `logout_list` pode ser removida ou mantida para o access token, com justificativa no README.
- `GET /v1/auth/me` retorna os dados do usuário logado.
- Middleware `isAdmin` que retorna **403** quando um atendente acessa rota de administrador.
- Corrigir o middleware atual para responder **401** (e não 400) quando o token é inválido ou expirou. O front depende desse código para saber que precisa renovar.

O login retorna `{ accessToken, refreshToken, user }`. No front, ambos os tokens ficam em cookies `HttpOnly`, `SameSite=Lax`; o access cookie segue a duração de teste de 30 segundos e o refresh cookie dura 7 dias. Para voltar ao access token de 15 minutos, configure `900` segundos no serviço da API e `900` segundos no cookie do front. `604800` segundos correspondem a **7 dias**, a duração do refresh token — não a 15 minutos. `JWT_REFRESH_SECRET` deve ser diferente de `JWT_SECRET` e configurado no `.env` local. O log SQL do Sequelize fica desativado para não registrar valores de tokens.

### 4.2 Fluxo esperado

```text
1. Login            → API devolve accessToken (15 min) + refreshToken (7 dias)
2. Requisições      → Authorization: Bearer <accessToken>
3. Access expira    → API responde 401
4. Front intercepta → POST /auth/refresh { refreshToken }
5. API rotaciona    → revoga o refresh antigo e devolve um novo par
6. Front repete     → refaz a requisição original com o novo accessToken
7. Refresh inválido → front limpa a sessão e manda para a tela de login
```

### 4.3 No front-end

- Na web, guardar access e refresh tokens em cookies `HttpOnly`, `SameSite=Lax`; isso impede leitura direta por JavaScript, embora XSS ainda possa emitir requisições e `SameSite` não substitua proteção CSRF em todos os cenários.
- O cliente Axios chama o backend-for-frontend `/api/backend/*`; ao receber 401, o interceptor chama `/api/auth/refresh` uma única vez e repete a requisição original.
- Requisições concorrentes compartilham a mesma Promise de refresh para evitar rotação duplicada; se a renovação falhar, cookies são limpos e a sessão volta à tela de login.
- O logout chama a API, revoga refresh e access tokens e apaga os cookies.
- Rotas/telas protegidas: sem sessão válida, redireciona para o login.
- Esconder menus de administrador para atendentes (sem depender só disso: a API também deve bloquear).

## 5. Endpoints mínimos da API

Todas as rotas abaixo, exceto login e refresh, exigem access token. **(A)** = somente administrador.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/v1/auth/login` | Login, retorna o par de tokens |
| POST | `/v1/auth/refresh` | Renova o par de tokens |
| POST | `/v1/auth/logout` | Revoga o refresh token |
| GET | `/v1/auth/me` | Usuário logado |
| GET / POST | `/v1/user` | Listar / criar atendente **(A)** |
| PUT / PATCH | `/v1/user/:id` e `/v1/user/:id/active` | Editar / ativar-desativar atendente **(A)** |
| GET / POST / PUT / DELETE | `/v1/categories` | CRUD de categorias (escrita **A**) |
| GET / POST / PUT / DELETE | `/v1/authors` | CRUD de autores (escrita **A**) |
| GET / POST / PUT / DELETE | `/v1/books` | CRUD de livros com autores e categoria (escrita **A**) |
| GET | `/v1/books?title=&categoryId=&authorId=&available=true` | Busca com filtros |
| GET / POST / PUT | `/v1/readers` | Cadastro de leitores |
| GET | `/v1/readers/:id/loans` | Histórico do leitor |
| POST | `/v1/loans` | Registrar empréstimo `{ bookId, readerId }` |
| PATCH | `/v1/loans/:id/return` | Registrar devolução |
| GET | `/v1/loans?status=ATIVO\|ATRASADO\|DEVOLVIDO` | Listar empréstimos |
| GET | `/v1/reports/dashboard` | Totais: livros, emprestados, atrasados, multas **(A)** |

A rota `POST /v1/user` exige autenticação e perfil administrador. O primeiro administrador é criado por seed na inicialização quando o banco não possui usuários. Configure `ADMIN_NAME`, `ADMIN_USERNAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`; em produção, substitua `ADMIN_PASSWORD` por uma senha forte.

Organize cada recurso numa pasta própria, seguindo o padrão do projeto:

```text
jwt-api/
├── auth/        (router, controller, service, middleware, refreshToken.model)
├── user/
├── category/
├── author/
├── book/
├── reader/
├── loan/
├── config/db.js
├── models/index.js   ← associações (hasMany, belongsTo, belongsToMany)
└── index.js
```

## 6. Telas mínimas do front-end

1. **Login** com validação e mensagem de erro.
2. **Dashboard** com cards: total de livros, empréstimos ativos, atrasados e multas.
3. **Categorias** e **Autores**: listagem, cadastro, edição e exclusão.
4. **Livros**: listagem com busca e filtros, cadastro com seleção de categoria e de vários autores, indicação de exemplares disponíveis.
5. **Leitores**: cadastro e histórico de empréstimos.
6. **Empréstimos**: novo empréstimo (buscar leitor + livro), lista com filtro de status, botão de devolução mostrando a multa.
7. **Atendentes** (somente admin): cadastro e ativar/desativar.
8. Botão de **logout** e nome do usuário logado no topo.

## 7. Entregas

| Etapa | Conteúdo |
|---|---|
| **1** | Projetos clonados e conectados (seção 2), CORS e bug do login corrigidos, modelagem das entidades com associações |
| **2** | CRUDs de categoria, autor, livro e leitor na API, testados no Insomnia/Postman |
| **3** | Access + refresh token com rotação, middleware de admin, empréstimo/devolução com regras e transação |
| **4** | Front-end completo com interceptor de refresh |

O que entregar:

- Link dos dois repositórios (fork) com histórico de commits de todos os integrantes.
- `README.md` em cada projeto: como instalar, variáveis de ambiente, usuário admin do seed e decisões tomadas.
- Coleção do Insomnia/Postman exportada (`.json`) dentro do `jwt-api`.
- `.env` **fora** do repositório; apenas o `.envex` atualizado com as novas variáveis.
- Vídeo curto (até 5 min) demonstrando: login, token expirando e sendo renovado sozinho, empréstimo, devolução com multa e bloqueio de atendente em rota de admin.

> Para demonstrar o refresh no vídeo, deixe o access token com validade de 30 segundos temporariamente.

## 8. Critérios de avaliação

| Critério | Peso |
|---|---|
| Autenticação: login, refresh com rotação, logout, 401/403 corretos | 25% |
| Modelagem e associações Sequelize | 15% |
| Regras de negócio de empréstimo/devolução (estoque, limite, multa, transação) | 20% |
| CRUDs completos e validações com mensagens claras | 15% |
| Front-end: integração, interceptor de refresh, telas e usabilidade | 15% |
| Organização do código, README, commits e apresentação | 10% |

## 9. Desafios extras (até +1 ponto)

- Enviar o refresh token em **cookie httpOnly** em vez do corpo da resposta.
- **Reserva** de livro sem exemplar disponível, com fila por ordem de pedido.
- **Paginação** nas listagens (`?page=&limit=`).
- Validação de entrada com **Joi** ou **Zod**.
- **Swagger** com a documentação da API.

## Administrador inicial e execução

Na primeira sincronização, o banco cria um administrador padrão caso não exista nenhum usuário:

- E-mail: `admin@biblioteca.com`
- Senha: `123456`
- Usuário: `admin`

Em produção, substitua essas credenciais pelas variáveis `ADMIN_NAME`, `ADMIN_USERNAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

```bash
copy .envex .env
npm install
npm start
```

A API ficará disponível em `http://localhost:3000/v1`.

## Entregáveis incluídos

- Coleção do Postman/Insomnia: `api.postman_collection.json`.
- Banco SQLite local excluído do Git.
- Arquivo `.env` excluído do Git.
- Modelo de ambiente versionado em `.envex`.
- Refresh token rotativo, revogação no logout e blacklist do access token.
- Middleware de administrador com resposta `403` para atendentes.
- Transações SQLite para empréstimos e devoluções.
- Multa de R$ 1 por dia de atraso.
