# Controle Orçamentário (SCO)

Sistema da Divisão de Geoinformação (DGEO) do 1º CGEO para gerir a execução orçamentária e alimentar a seção 3 (Execução do PDR) do RPCMTec. Cadastra DFD e PCA (planejamento de contratações), PDR e NC (crédito), empenhos e liquidações (execução), e gera as tabelas 3.1 a 3.7 do RPCMTec.

É o sistema irmão do [Controle do Acervo (SCA)](https://github.com/1cgeo/controle_acervo): mesmo stack tecnológico (Node.js/Express 5 + PostgreSQL/pg-promise no backend, Vanilla JS + Vite no client web), mesma integração com o serviço de autenticação central. Diferença principal: **sem client QGIS** (o SCO é só backend + web).

## Documentação

- [CLAUDE.md](CLAUDE.md): o stack, as convenções e o método de trabalho neste repositório (leia primeiro).
- [docs/REQUISITOS.md](docs/REQUISITOS.md): documento de requisitos detalhado (escopo, módulos, requisitos funcionais e não-funcionais).
- [docs/MODELO-DADOS.md](docs/MODELO-DADOS.md): modelo de dados (entidades e relacionamentos). O schema real é `er/*.sql`.
- [docs/REVISAO.md](docs/REVISAO.md): revisão da implementação vs requisitos, bugs corrigidos e pendências.

## Testes

- Backend (mockado): `cd server && npm test` (jest + supertest, sem PostgreSQL).
- Backend (integração/E2E): `cd server && npm run test:integration` (PostgreSQL local + serviço de autenticação stub; cria e dropa o banco `sco_test`).
- Frontend: `cd orcamento_client && npm test` (vitest + jsdom, service mockado).

## Estado

Backend e client implementados (2026-06-13). Cobre exercício e metas do PIT, DFD/PCA, PDR, NC, empenhos, liquidações, licitações e RPNP, e gera a seção 3 do RPCMTec (tabelas 3.1 a 3.7) em JSON e Markdown. Sistema **admin-only** (todas as rotas de feature exigem administrador). Suíte de testes em três camadas (mockada, integração com PostgreSQL real e frontend), 300 testes. Pendências de produto em [docs/REVISAO.md](docs/REVISAO.md).

## Como rodar

```
npm run install-all          # instala raiz + server + client
# cadastre a aplicacao 'orcamento_web' (ativa) no servico de autenticacao
npm run config               # cria o banco, aplica er/*.sql, gera server/config.env
npm run build                # build do client -> server/src/build
npm start                    # PM2, porta padrao 3016
```

Desenvolvimento: `npm run start-dev` (server na 3016 + Vite na 3002 com proxy).

## Estrutura

```
controle_orcamentario/
├── er/                    # schema SQL puro (dgeo, dominio, orcamento)
├── server/                # backend Node.js/Express 5 (feature = route+ctrl+schema)
│   └── src/__tests__/     # testes mockados (helpers/) e de integracao (integration/)
├── orcamento_client/      # client web Vanilla JS + Vite
├── create_config.js       # cria banco + config.env
├── create_build.js        # build do client -> server/src/build
└── docs/                  # REQUISITOS, MODELO-DADOS, REVISAO
```

## Stack (resumo)

| Camada | Tecnologia |
|---|---|
| Backend | Node.js (>= 16.15, CommonJS), Express 5, pg-promise, Joi, jsonwebtoken, winston |
| Banco | PostgreSQL (schema `orcamento`), SQL puro em `er/`, sem ORM |
| Client web | Vanilla JS, Vite 6, Chart.js (sem React/Vue, sem framework de UI) |
| Autenticação | Serviço de autenticação central (valida credencial) + JWT local |
| Deploy | PM2 (sem Docker), front buildado e servido pelo Express |

## Licença

Uso interno do 1º CGEO / Exército Brasileiro.
