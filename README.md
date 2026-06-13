# Controle Orçamentário (SCO)

Sistema da Divisão de Geoinformação (DGEO) do 1º CGEO para gerir a execução orçamentária e alimentar a seção 3 (Execução do PDR) do RPCMTec. Cadastra DFD e PCA (planejamento de contratações), PDR e NC (crédito), empenhos e liquidações (execução), e gera as tabelas 3.1 a 3.7 do RPCMTec.

É o sistema irmão do [Controle do Acervo (SCA)](https://github.com/1cgeo/controle_acervo): mesmo stack tecnológico (Node.js/Express 5 + PostgreSQL/pg-promise no backend, Vanilla JS + Vite no client web), mesma integração com o serviço de autenticação central. Diferença principal: **sem client QGIS** (o SCO é só backend + web).

## Documentação

- [CLAUDE.md](CLAUDE.md): o stack, as convenções e o método de trabalho neste repositório (leia primeiro).
- [docs/REQUISITOS.md](docs/REQUISITOS.md): documento de requisitos detalhado (escopo, módulos, requisitos funcionais e não-funcionais).
- [docs/MODELO-DADOS.md](docs/MODELO-DADOS.md): modelo de dados (entidades, relacionamentos, esboço do schema SQL).
- [docs/REVISAO.md](docs/REVISAO.md): revisão da implementação vs requisitos e pendências.

## Testes

- Backend: `cd server && npm test` (jest + supertest, banco mockado, sem PostgreSQL).
- Frontend: `cd orcamento_client && npm test` (vitest + jsdom, service mockado).

## Estado

Projeto em concepção (2026-06-13). Esta entrega inicial cobre os documentos de fundação (requisitos e modelo de dados); a implementação do backend e do client virá em fases descritas nos requisitos.

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
