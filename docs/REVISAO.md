# Revisão da implementação vs requisitos (2026-06-13)

Auditoria estática da implementação do SCO contra `REQUISITOS.md`, `MODELO-DADOS.md` e `CLAUDE.md`, seguida de uma camada de testes de integração real que exercitou o sistema de ponta a ponta. Este documento registra o resultado, os bugs encontrados e corrigidos, e o que ficou pendente.

## Resumo executivo

- **Requisitos funcionais "must" (M):** 22 de 23 IMPLEMENTADOS, 1 PARCIAL (RF-LIQ-2, RPNP por lançamento manual em vez de derivação automática). Os requisitos AUSENTES são todos "should" (S) ou "could" (C).
- **Modelo de dados:** as tabelas `orcamento` e `dominio` existem com as FKs corretas e o par de auditoria em toda tabela de negócio. Sem PostGIS. (O refactor de 2026-06-13 removeu `exercicio` e `pca` e acrescentou `configuracao`; ver seção "Reformulação 2026-06-13" e a lista atual no apêndice de `MODELO-DADOS.md`.)
- **Regras de negócio críticas:** todas verificadas e corretas (classificação NC por previsão no PDR, valor_nc imutável por devolução, liquidação <= empenhado disponível, trava de último admin, linha TOTAL na 3.1, recorte cumulativo). Nota: a regra "um exercício ativo" deixou de existir no refactor de 2026-06-13 (o ano virou só uma coluna, sem entidade nem ano ativo; ver seção acima).
- **Aderência ao "não faça" do CLAUDE.md:** total.
- **Sistema admin-only:** implementado de fim a fim (client e backend; ver abaixo).

## Reformulação 2026-06-13 (refactor estrutural)

Após esta revisão, o modelo foi reformulado para eliminar duas entidades e simplificar a amarração temporal. Seis mudanças:

1. **Fim do "exercício"**: não existe mais a tabela `orcamento.exercicio` nem "ano ativo". Tudo é amarrado ao **ano** (coluna `ano SMALLINT` simples, sem FK, em meta_pit, dfd, licitacao, pdr, nota_credito, nota_empenho, rpnp, relatorio_rpcmtec). O ano de contexto das telas é global (seletor no navbar), com default no ano corrente ou no `ano_referencia`.
2. **Configuração geral**: UASG, CODOM e `ano_referencia` viraram a tabela `orcamento.configuracao` (singleton `id = 1`), com endpoints `/configuracao` (GET/PUT) e `/configuracao/anos` (lista de anos com dado) e a página "Configuração" no client.
3. **Fim do "PCA"**: não existe mais `orcamento.pca` nem `dfd.pca_id`. O "PCA do ano" é o conjunto de DFDs daquele ano (resumo: contagem + total). O DFD mantém `consta_pca` (flag da demanda superveniente, ex.: DFD de IA).
4. **RPNP**: a coluna `ano_exercicio` virou `ano`.
5. **Backend**: features novas `meta/`, `dfd/` e `configuracao/` (antes meta e dfd viviam dentro de `exercicio/` e `pca/`); rotas `/configuracao`, `/metas`, `/dfd` (sem `/exercicios` nem `/pca`). Client com seletor de ano global no navbar.
6. **RPCMTec auto-load**: a tela do relatório carrega automaticamente o último mês cumulativo ao abrir.

As três suítes de teste seguem **todas verdes** após o refactor: **backend mockado 191**, **integração (PostgreSQL real) 37**, **frontend 64**. (Os números de testes ajustaram com a remoção das suítes de `exercicio`/`pca` e a entrada de `configuracao`/`meta`; os totais por suíte da seção "Estrutura de testes" abaixo são da revisão anterior ao refactor.)

## Implementado nesta revisão

- **RF-AUTH-4, admin-only de fim a fim:** o client já usava `adminLoader` em todas as páginas; o backend ainda permitia leitura para qualquer logado (`verifyLogin` nos GET). Por decisão (o sistema é admin-only), as rotas de feature passaram todas a `verifyAdmin` (login e domínios continuam públicos). Backend e client agora consistentes. Coberto por teste E2E (rota protegida sem token -> 401; com token admin -> 200).

## Bugs encontrados pela camada de integração e corrigidos

A camada de testes de integração (PostgreSQL real + serviço de autenticação stub) exercitou o app por HTTP com SQL e constraints reais, e revelou tres bugs que o banco mockado não pegava:

- **BUG-1 (alta), ids BIGINT chegavam como string e eram rejeitados.** O PostgreSQL devolve `BIGINT/BIGSERIAL` como string; os schemas validam ids com `Joi...strict()`, que rejeita string. Na prática o client quebraria ao criar PDR/DFD/NC com um item selecionado (o id da meta/PDR-item vinha como string da API). **Corrigido** em `database/db.js` com um type parser que devolve `BIGINT` (OID 20) como número, fazendo os ids circularem como número na API e no client.
- **BUG-2 (média), 500 ao omitir campo opcional no PDR.** `pdr_ctrl` montava os params do INSERT/UPDATE só com os campos presentes; omitir um campo opcional (válido pelo schema) fazia o pg-promise lançar "Property doesn't exist" -> 500. **Corrigido** normalizando os campos opcionais para null antes da query (`normalizaHeader`/`normalizaItem`). Regressão travada por teste de corpo mínimo.
- **BUG-3 (média), liquidado/recebido da 3.1 vazavam de outro ano.** Em `gerarTabela31`, a coluna `liquidado` filtrava só por `data <= cutoff` (sem limite inferior), então uma liquidação de dez/2025 entrava no relatório de 2026. As três colunas de fluxo usavam recortes diferentes (B-2/B-3 da auditoria original). **Corrigido**: recebido/empenhado/liquidado agora usam o MESMO recorte `[inicio, cutoff]`; registros sem data são contados no modo cumulativo (visão do ano) e ignorados no mês isolado. Coberto por teste E2E que cria liquidações em anos distintos.

- **B-1 (alta), corrigido antes da integração:** `dfd_ctrl.deletar` não checava `orcamento.licitacao` antes de excluir o DFD (virava 500 por FK). Agora bloqueia com 409. Regressão coberta no E2E de dfd.

## Pendências (decisão do chefe / próxima iteração)

- **D-3, NDs da 3.1:** a tabela 3.1 imprime todas as NDs do domínio (10), não as 8 fixas do layout do RPCMTec. Não afeta as somas (a linha TOTAL fecha). Decidir se filtra as 8 NDs do layout oficial.
- **D-1, grau de prioridade do DFD:** virou FK de domínio (`grau_prioridade_id` + tabela `dominio.grau_prioridade`) em vez do `VARCHAR` do modelo. Melhoria (normalização); registrar a decisão no DECISIONS do projeto.
- **RF-LIQ-2, RPNP manual:** o saldo a liquidar é calculado e exposto, mas não há derivação automática para o RPNP na virada do ano (o RPNP é lançado à mão). Automatizar é trabalho futuro.
- **Requisitos S/C ausentes (fases futuras):** RF-EXE-3 (execução por meta do PIT), RF-PDR-4 (comparativo PCA x PDR), RF-REL-10 (rota de integração read-only para o vault), RF-DASH-2 (percentual de execução), RF-DASH-3 (alertas de prazo).

## Estrutura de testes

Snapshot da revisão anterior ao refactor de 2026-06-13 (os totais atuais estão na seção "Reformulação 2026-06-13"). Três camadas, todas verdes (300 testes no total à época):

- **Backend unitario/rota (`server/`, jest + supertest, banco MOCKADO):** 23 suítes, 196 testes. Controllers (regras de negócio), rotas (envelope, status) e validação negativa (campo faltando, tipo errado, enum inválido, 404). Roda sem PostgreSQL: `cd server && npm test`.
- **Backend integração/E2E (`server/`, jest, PostgreSQL REAL + serviço de autenticação stub):** 6 suítes, 41 testes. Sobe o app real, cria o banco `sco_test`, aplica `er/*.sql`, autentica de verdade (JWT do SCO via stub) e exercita a cadeia completa (ano/meta -> PDR -> NC -> NE -> liquidação -> RPCMTec) validando os números da seção 3, mais constraints (FK 409, UNIQUE 409, liquidação > empenho 400, trava de último admin). É a camada que encontra bugs de SQL/agregação/recorte. Requer PostgreSQL local (`localhost:5432`, params em `config_testing.env`): `cd server && npm run test:integration`. `npm run test:all` roda as duas.
- **Frontend (`orcamento_client/`, vitest + jsdom, service/fetch MOCKADOS):** 19 arquivos, 63 testes. `format`/`auth-store`, montagem de URL do service, comportamento do api-client (401/403 limpam sessão e redirecionam; !success lança), smoke de cada página, interação de dialog (preenche form, submete, valida payload) e do componente data-table (busca, ordenação, paginação). `cd orcamento_client && npm test`.
