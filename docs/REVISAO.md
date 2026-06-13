# Revisão da implementação vs requisitos (2026-06-13)

Auditoria estática da implementação do SCO contra `REQUISITOS.md`, `MODELO-DADOS.md` e `CLAUDE.md`, mais a estrutura de testes criada na sequência. Este documento registra o resultado e o que ficou pendente.

## Resumo executivo

- **Requisitos funcionais "must" (M):** 21 de 23 IMPLEMENTADOS, 2 PARCIAIS, 0 ausentes (~91%). Os requisitos AUSENTES são todos "should" (S) ou "could" (C).
- **Modelo de dados:** as 14 tabelas `orcamento` e 6 `dominio` existem com as FKs corretas e o par de auditoria em toda tabela de negócio. Sem PostGIS, sem geometria.
- **Regras de negócio críticas:** todas corretas (classificação NC por previsão no PDR, valor_nc imutável por devolução, liquidação <= empenhado disponível, trava de último admin, um exercício ativo, linha TOTAL na 3.1), exceto detalhes de recorte temporal na 3.1 (ver pendências).
- **Aderência ao "não faça" do CLAUDE.md:** total. Sem ORM, sem TypeScript no backend, sem framework de front, sem PostGIS, sem armazenar senha, login como `orcamento_web`.
- **Núcleo de valor (Fases 2 e 3: NC, NE, liquidação e gerador da seção 3) está completo e fiel ao modelo.**

## Corrigido nesta revisão

- **B-1 (alta):** `pca/dfd_ctrl.js:deletar` não checava `orcamento.licitacao` antes de excluir o DFD. Uma licitação vinculada causaria violação de FK (23503) virando 500 genérico. **Corrigido:** agora bloqueia com 409 ("DFD possui licitações vinculadas"), como os demais controllers. Coberto por teste de regressão (`dfd_ctrl.test.js` e `dfd_route.test.js`).

## Pendências (decisão do chefe / próxima iteração)

Itens de menor severidade ou que envolvem decisão de produto, deixados em aberto:

- **B-2 (média), recorte da 3.1:** em `relatorio_ctrl.js:gerarTabela31`, as colunas de fluxo usam recortes de data diferentes (recebido e liquidado usam só `<= cutoff`; empenhado usa `>= inicio AND <= cutoff`). No modo cumulativo (padrão) é inofensivo; no modo `cumulativo=false` as colunas ficam inconsistentes. Padronizar quando o modo não cumulativo for usado de fato.
- **B-3 (média), datas nulas no relatório:** lançamentos com data nula (`data_emissao`, `data_empenho`, `liquidacao.data` IS NULL) somem do recorte (`coluna <= cutoff` é falso para NULL). O modelo permite essas datas nulas de propósito (gap do vault, RF-LIQ-3). Decidir se a data passa a ser obrigatória ou se NULL deve ser incluído.
- **B-4 (baixa, decisão de produto), autorização no client:** `index.js` aplica `adminLoader` a todas as páginas. Se o sistema não for admin-only, trocar por `authLoader` nas telas de leitura para honrar RF-AUTH-4 (leitura = qualquer logado). Default atual: admin-only.
- **D-3 / B-6, NDs da 3.1:** a tabela 3.1 imprime todas as NDs do domínio (10), não as 8 fixas do layout do RPCMTec. Não afeta as somas (a linha TOTAL fecha), mas diverge do layout oficial. Decidir se filtra as 8 NDs.
- **D-1, grau de prioridade do DFD:** virou FK de domínio (`grau_prioridade_id` + tabela `dominio.grau_prioridade`) em vez do `VARCHAR` do modelo. Melhoria (normalização); registrar a decisão no DECISIONS do projeto.
- **Requisitos S/C ausentes (planejados para fases futuras):** RF-EXE-3 (consulta de execução por meta do PIT), RF-PDR-4 (comparativo PCA x PDR), RF-REL-10 (rota de integração read-only `/api/integracao` para o vault), RF-DASH-2 (percentual de execução), RF-DASH-3 (alertas de prazo de empenho).

## Estrutura de testes criada

- **Backend (`server/`, jest + supertest, banco mockado):** 22 suítes, 157 testes. Harness em `src/__tests__/helpers/` (`mockDb`, `testApp`, `mockLogin`, `token`). Cobre controllers (regras de negócio) e rotas (validação, envelope, status). Sem necessidade de PostgreSQL no ar.
- **Frontend (`orcamento_client/`, vitest + jsdom, service mockado):** 16 arquivos, 39 testes. Cobre `format`/`auth-store` (puros), `orcamento-service` (montagem de URL), smoke de cada página (renderiza com o service mockado) e o componente `data-table`.
- Como rodar: `cd server && npm test` e `cd orcamento_client && npm test`.
