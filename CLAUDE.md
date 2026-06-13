# Controle Orçamentário (SCO) - Guia do Repositório

Você está ajudando a construir o **SCO (Sistema de Controle Orçamentário)** da Divisão de Geoinformação (DGEO) do 1º CGEO. O objetivo do sistema é facilitar o preenchimento da parte orçamentária do RPCMTec (Relatório de Prestação de Contas Mensal Técnico), seção 3 (Execução do PDR): cadastrar DFD e NC, registrar PCA, PDR, empenhos e liquidações, e gerar as informações necessárias para o relatório.

Antes de qualquer tarefa, leia `docs/REQUISITOS.md` (o que construir) e `docs/MODELO-DADOS.md` (como os dados se ligam).

## Princípio mestre: clonar o stack do controle_acervo

O SCO **reusa, sem reinventar, o stack e os padrões do sistema irmão `controle_acervo` (SCA)**, que fica em `../controle_acervo` (repo https://github.com/1cgeo/controle_acervo). Quando em dúvida sobre como estruturar algo (uma rota, um controller, o envelope de resposta, o middleware de auth, a criação do banco), **abra o arquivo equivalente no `controle_acervo` e siga o mesmo padrão**. A única subtração deliberada é o client QGIS: o SCO é **backend + client web apenas**.

Arquivos-âncora do SCA para consultar (caminhos relativos a `../controle_acervo`):
- Backend: `server/src/server/app.js`, `server/src/routes.js`, `server/src/config.js`, `server/src/utils/{app_error,error_handler,send_json_and_log,http_code,schema_validation,async_handler,logger,http_client}.js`, `server/src/login/{login_ctrl,validate_token,verify_login,verify_admin}.js`, `server/src/authentication/{authenticate_user,get_usuarios,verify_server}.js`, `server/src/database/db.js`, e uma feature CRUD modelo como `server/src/produto/{produto_route,produto_ctrl,produto_schema}.js`.
- Criação do banco e config: `create_config.js`, `create_build.js`, `er/*.sql`.
- Front: `acervo_client/src/js/{index.js,router.js,services/api-client.js,store/auth-store.js,pages/login.js,utils/dom.js}`, `acervo_client/vite.config.js`. O `mapoteca_client` é o exemplo de client **CRUD completo** (mais próximo do que o SCO precisa) - use-o como referência principal do front.

## Stack (não desvie sem motivo registrado)

### Backend (`server/`)
- **Node.js >= 16.15, CommonJS** (`require`/`module.exports`, `'use strict'` no topo). Scripts de orquestração da raiz podem ser ESM, como no SCA.
- **Express 5** (`express@^5`). Atenção: em Express 5 `req.query` e `req.params` são read-only; o middleware de validação reescreve com `Object.defineProperty` (copie de `schema_validation.js` do SCA).
- **PostgreSQL via pg-promise** (singleton `db.conn`, `db.pgp.helpers` para bulk insert/update, `db.conn.tx` para transações). **Sem ORM. Sem ferramenta de migration.** O schema é **SQL puro** numa pasta `er/`, aplicado em transação por `create_config.js`.
- **Joi** para validação de entrada, via middleware `schemaValidation({ body, query, params })`; schemas por feature em `*_schema.js`.
- **jsonwebtoken** (JWT local), **winston** + **winston-daily-rotate-file** (log), **axios** (chamar o serviço de autenticação), **helmet/cors/hpp/express-rate-limit/nocache** (segurança HTTP), **node-cron** se precisar de jobs.

### Banco
- Schemas: `dgeo` (tabela `usuario`, importada do serviço de autenticação), `dominio` (tabelas de domínio `code SMALLINT PK + nome`), e **`orcamento`** (o núcleo: dfd, pca, pdr, nota_credito, nota_empenho, liquidacao, etc. - ver `docs/MODELO-DADOS.md`).
- Toda tabela de negócio carrega o par de auditoria: `data_cadastramento` + `usuario_cadastramento_uuid` e `data_modificacao` + `usuario_modificacao_uuid` (FK para `dgeo.usuario(uuid)`).
- Versão do schema em `public.versao`, validada com `semver` no boot.
- **Sem PostGIS / sem geometria**: o SCO não tem dado espacial (ao contrário do SCA). Não inclua a extensão postgis nem colunas `geom`.

### Client web (`*_client/`)
- **Vanilla JS + Vite 6**, módulos ES nativos. **Sem React, Vue, Angular ou TypeScript.** **Sem Bootstrap/Tailwind/MUI** (design system próprio com `design-tokens.css` e CSS por preocupação; tema claro/escuro via `data-theme`).
- Render por factory `el(tag, attrs, children)`; cada página é `renderX(container, ctx)` que devolve cleanup opcional. Roteador hash próprio com guards (`authLoader`/`adminLoader`). Copie a arquitetura do `mapoteca_client`.
- **Sem biblioteca de mapa** (não há dado espacial). **Gráficos com Chart.js** (`chart.js@^4`) em chunk Vite separado. Tabelas/modais/wizard/forms são componentes próprios (copie do `mapoteca_client`).
- Chamadas à API sempre por caminho relativo `/api/...` (proxy do Vite em dev, mesmo-origin em prod). Não hard-code URL no front.

## Padrões obrigatórios (herdados do SCA)

- **Envelope de resposta único**: toda resposta sai por `res.sendJsonAndLog(success, message, status, dados, error, metadata)`, no formato `{ version, success, message, dados, error }`. 500 sempre vira a mensagem genérica `'Erro no servidor'`.
- **Erros**: classe `AppError(message, statusCode, errorTrace)` + enum `httpCode` + `asyncHandler` (catch → next) + error middleware final. Falha de boot cai em `errorHandler.critical` (exit 1).
- **Organização por feature**: cada feature é uma pasta com `*_route.js` (router + middlewares de auth + validação + asyncHandler), `*_ctrl.js` (lógica + DB, sem `req`/`res`), `*_schema.js` (Joi), `index.js` (re-export). Montadas em `routes.js` sob `/api/<feature>`.
- **Domínios**: tabelas de domínio servidas por rotas `GET` sem auth (para popular selects), no padrão `/dominio` do SCA.

## Autenticação (duas camadas, idêntico ao SCA)

1. **Serviço de autenticação central** (`servico_autenticacao`, em `../servico_autenticacao`, repo https://github.com/dsgoficial/servico_autenticacao), configurado pela env `AUTH_SERVER`. O backend **delega a verificação de senha** a ele (`POST {AUTH_SERVER}/api/login` com `{ usuario, senha, aplicacao }`) e **importa usuários** dele (`GET {AUTH_SERVER}/api/usuarios`). **O SCO não guarda senha.**
2. **JWT local**: depois que o auth confirma a senha, o próprio SCO assina um JWT com seu `JWT_SECRET` local (claims `{ id, uuid, administrador }`, expiração 1h). Middlewares `verifyLogin` (logado) e `verifyAdmin` (admin, revalidado no banco). Autorização binária admin vs comum por middleware na rota.
- **Registrar a aplicação no auth**: o SCO precisa estar cadastrado na tabela `dgeo.aplicacao` do serviço de autenticação, com `nome_abrev = 'orcamento_web'` e `ativa = TRUE`, senão o login é recusado. O backend usa esse `nome_abrev` no campo `aplicacao` do login.

## Convenções de escrita (preferências do usuário)

- **Não use em-dash (—)** em nada. Use vírgula, parênteses ou frases separadas.
- **Acentuação correta sempre** em português (á, â, ã, à, é, ê, í, ó, ô, õ, ú, ç). Nunca acentue dentro de código, nomes de arquivo, identificadores, URLs ou nomes de tabela/coluna (esses são ASCII: `nota_credito`, `valor_liquidado`).
- **Datas absolutas** (2026-06-13), nunca "ontem" ou "semana passada".
- Termos do domínio em português (DFD, NC, NE, PDR, PCA, empenho, liquidação) são fixos; ver `docs/REQUISITOS.md` para o glossário.

## Testes

- **Backend (`server/`)**: jest + supertest, **banco mockado** (não precisa de PostgreSQL no ar). Rode `cd server && npm test`. Harness em `server/src/__tests__/helpers/`: `mockDb` (mock de `db.conn`, com `createMockDb()` e `mockDb.reset()` por teste; `db.pgp.helpers` reais), `testApp` (app Express mínimo para supertest), `mockLogin` (passthrough admin), `token` (JWT de teste). Testes de controller mockam `../../database`; testes de rota mockam também `../../login`. Exemplares: `__tests__/unit/exercicio_ctrl.test.js`, `__tests__/routes/login_route.test.js`. Config em `server/config_testing.env` (valores fake, versionado).
- **Frontend (`orcamento_client/`)**: vitest + jsdom, **service mockado**. Rode `cd orcamento_client && npm test`. Mocke `@services/orcamento-service.js` com `vi.mock` e renderize a página num `div`. Exemplar: `src/js/pages/exercicios/list.test.js`.
- Ao adicionar uma feature/página, adicione o teste correspondente seguindo esses padrões. Regra de ouro do mock de banco: cada query resolve um valor NOVO (o pg-promise real devolve array/objeto novo por chamada), nunca uma instância compartilhada.

## Deploy

- **PM2 direto, sem Docker** (`pm2 start server/src/index.js --name controle-orcamentario`), HTTP ou HTTPS por flag. O front é buildado (`vite build`) e copiado para `server/src/build/`, servido pelo Express (`express.static` + fallback SPA para `index.html`).
- Config gerada por `npm run config` (commander + inquirer): cria o banco, aplica `er/*.sql`, gera `server/config.env` com `JWT_SECRET` aleatório de 64 bytes e a URL do `AUTH_SERVER`. `config.js` valida as envs com Joi no boot.

## Não faça

- Não introduza ORM, TypeScript no backend, framework de front (React/Vue), Docker, ou biblioteca de UI sem registrar a decisão e o motivo (este projeto vale pela paridade com o SCA).
- Não inclua PostGIS, geometria ou client QGIS: o SCO não tem dado espacial nem cliente desktop.
- Não armazene senha de usuário: a verificação é sempre delegada ao serviço de autenticação.
- Não invente campos do domínio orçamentário não documentados: se um campo não está em `docs/MODELO-DADOS.md` nem nas fontes, marque como pendência em vez de supor.
