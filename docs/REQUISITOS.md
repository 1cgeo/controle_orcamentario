# Controle Orçamentário (SCO) - Documento de Requisitos

Versão 0.1 (2026-06-13). Documento de fundação. Define o que o sistema faz, para quem, com qual stack e por quais fases. O modelo de dados detalhado vive em `MODELO-DADOS.md`.

---

## 1. Visão geral e justificativa

### 1.1 Problema
O Chefe da DGEO preenche, mês a mês, a **seção 3 (Execução do PDR / orçamento) do RPCMTec** a partir de fontes dispersas (planilhas, PDFs do PDR, extratos de NC do SIAFI, anotações de empenho e liquidação). Isso é trabalhoso, propenso a erro e difícil de auditar. Hoje a parte orçamentária é a que mais consome esforço manual no fechamento do mês.

### 1.2 Solução
Um sistema web que centraliza o ciclo orçamentário da divisão (do planejamento da contratação à execução) e **gera automaticamente as tabelas 3.1 a 3.7 do RPCMTec** a partir dos dados cadastrados. O sistema é a fonte única de verdade do orçamento da DGEO no ano, do mesmo modo que o SCA é a fonte do acervo.

### 1.3 Objetivos
1. Cadastrar e acompanhar **DFD** e **PCA** (planejamento de contratações, ano A-1).
2. Registrar o **PDR** (crédito autorizado por ND e por meta do PIT).
3. Cadastrar as **NC** (créditos recebidos), classificando-as em PDR ou Extra-PDR.
4. Registrar **empenhos (NE)**, **liquidações** e **recebimentos de material**.
5. Acompanhar **licitações** (próprias e GCALC DSG) e **RPNP** (restos a pagar).
6. **Gerar a seção 3 do RPCMTec** (3.1 a 3.7) para um mês, no formato cumulativo, pronto para colar no relatório.
7. Servir de painel de execução orçamentária vivo (previsto x recebido x empenhado x liquidado).

### 1.4 Não-objetivos (escopo excluído)
- Não substitui o SIAFI nem integra com ele automaticamente (a NC, o empenho e a liquidação são lançados a partir dos documentos do SIAFI; não há leitura direta do SIAFI nesta fase).
- Não gera as demais seções do RPCMTec (produção, desenvolvimento, RH, divulgação): essas vêm do SAP, do acervo e do dashboard de GitHub. O SCO cobre **apenas a seção 3**.
- **Sem client QGIS** e **sem dado espacial** (diferença explícita em relação ao SCA).
- Não faz gestão de processo licitatório completo (pregão, atas): registra apenas o estado/fase de cada licitação para fins de relatório.

### 1.5 Usuários
- **Chefe da DGEO** (administrador): cadastra e edita tudo, gera o relatório. É o titular do cargo (ver convenção do vault: o sistema não se amarra a uma pessoa).
- **Auxiliar do orçamento / secretaria** (usuário comum ou admin, a definir): lança NC, empenhos e liquidações sob orientação.
- Autenticação central pelo serviço de autenticação; autorização binária (admin vs comum), como no SCA.

---

## 2. Glossário do domínio

Definições resumidas; campos e relacionamentos completos em `MODELO-DADOS.md`. Fontes: wiki do vault (pca, pdr, pit, processos-administrativos, rpcmtec) e a referência `gerar-relatorio-dgeo/references/rpcmtec-estrutura.md`.

| Termo | Significado |
|---|---|
| **DFD** | Documento de Formalização da Demanda. Formaliza uma necessidade de contratação para entrar no PCA. Nasce em A-1. Tem itens (material/serviço) com quantidade e valor. |
| **PCA** | Plano de Contratações Anual. Consolida os DFDs do ano. PCA 2026 da DGEO = 7 DFDs, R$ 805.600 (UASG 160382). |
| **PDR** | Plano de Descentralização de Recursos. O crédito que a DSG descentraliza ao 1º CGEO para executar o PIT. Estruturado por ND, por Plano Interno (PI) e por meta do PIT. Distingue **solicitado** x **autorizado**. PDR 2026 = R$ 569.300,66 autorizados. |
| **NC** | Nota de Crédito. Documento do SIAFI que descentraliza crédito (o "recebido"). Tem número (ex.: 2026NC400134), ND, PTRES/PI, valor, e cita no histórico a **meta do PIT** que financia. |
| **NE / empenho** | Nota de Empenho. Reserva o crédito para uma despesa específica (ex.: 2025NE000110). Liga-se a uma NC e a uma licitação/material. |
| **Liquidação** | Verificação de que o credor entregou; reconhece a despesa antes do pagamento. Valor liquidado <= valor empenhado. |
| **ND** | Natureza de Despesa, sem pontos no relatório (ex.: 339015 = diárias). GND3 = custeio (33.x), GND4 = capital (44.x). |
| **PI** | Plano Interno (ex.: K4CAIFGDIAR diárias, K4CAIFGPASS passagens, K4CAIFGPRCA serviços). |
| **PTRES** | Plano de Trabalho Resumido (padrão do PDR 2026 = 232039). |
| **RPNP** | Restos a Pagar Não Processados. Empenhos de anos anteriores com saldo a liquidar, carregados para o exercício seguinte. |
| **GCALC DSG** | Aquisições/licitações conjuntas geridas pela DSG das quais o 1º CGEO participa (ex.: imagens de satélite, software, drone via SRP). |
| **Meta do PIT** | Meta da atividade-fim que o crédito financia. Amarra o gasto à produção (rastreabilidade). |
| **Exercício** | Ano orçamentário. UASG da DGEO = 160382, CODOM 048215. |

**Cadeia conceitual completa:**
`DFD -> PCA` (A-1, planejamento) `-> LOA -> PDR` (crédito autorizado) `-> NC` (crédito recebido) `-> NE` (empenho) `-> Liquidação` (despesa reconhecida). Em paralelo: `DFD -> Licitação -> NE` (compra própria) e, na virada do ano, `NE não liquidada -> RPNP`. Cada NC e cada item de PDR aponta para uma **meta do PIT**.

---

## 3. Arquitetura

### 3.1 Stack (clonado do controle_acervo, ver CLAUDE.md)
- **Backend**: Node.js >= 16.15 (CommonJS), Express 5, pg-promise, Joi, jsonwebtoken, winston, axios. Sem ORM, sem migration tool.
- **Banco**: PostgreSQL. Schemas `dgeo`, `dominio`, `orcamento`. SQL puro em `er/`, aplicado por `create_config.js`. **Sem PostGIS.**
- **Client web**: Vanilla JS + Vite 6 + Chart.js. Sem framework de UI, sem mapa. Arquitetura de páginas/componentes copiada do `mapoteca_client`.
- **Autenticação**: serviço de autenticação central (valida credencial) + JWT local (claims `id/uuid/administrador`, 1h). Aplicação registrada como `orcamento_web`.
- **Deploy**: PM2 (sem Docker); front buildado e servido pelo Express.

### 3.2 Estrutura de pastas (alvo)
```
controle_orcamentario/
├── CLAUDE.md
├── README.md
├── docs/
│   ├── REQUISITOS.md
│   └── MODELO-DADOS.md
├── create_config.js          # cria banco, aplica er/*.sql, gera config.env (ESM)
├── create_build.js           # build do client -> server/src/build (ESM)
├── package.json              # scripts install-all/config/build/start (raiz)
├── er/                       # SQL puro do schema
│   ├── versao.sql
│   ├── dominio.sql
│   ├── dgeo.sql
│   ├── orcamento.sql
│   └── permissao.sql
├── server/                   # backend (CommonJS)
│   ├── package.json
│   └── src/
│       ├── index.js / main.js / config.js / routes.js
│       ├── server/{app.js,start_server.js,swagger_options.js}
│       ├── database/{db.js,database_version.js}
│       ├── authentication/   # fala com o servico_autenticacao
│       ├── login/            # JWT local + verifyLogin/verifyAdmin
│       ├── utils/            # app_error, send_json_and_log, schema_validation, ...
│       ├── usuario/          # importa/sincroniza usuarios
│       ├── dominio/          # tabelas de dominio (ND, PI, fase, etc.)
│       ├── exercicio/        # ano orcamentario + metas do PIT
│       ├── dfd/  pca/        # planejamento
│       ├── pdr/              # credito autorizado
│       ├── nota_credito/     # NC
│       ├── nota_empenho/     # NE
│       ├── liquidacao/
│       ├── licitacao/        # 3.4 GCALC + 3.5 proprias
│       ├── recebimento/      # 3.6 material
│       └── relatorio/        # gera a secao 3 do RPCMTec (3.1-3.7)
└── orcamento_client/         # client web (Vanilla JS + Vite)
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── index.html
        └── js/{index.js,router.js,pages/,components/,services/,store/,utils/}
```

### 3.3 Padrões transversais (idênticos ao SCA)
- Envelope de resposta `{ version, success, message, dados, error }` por `res.sendJsonAndLog`.
- `AppError` + `httpCode` + `asyncHandler` + error middleware.
- Feature = `*_route.js` + `*_ctrl.js` + `*_schema.js` + `index.js`.
- Auditoria por linha (`data/usuario_cadastramento_uuid`, `data/usuario_modificacao_uuid`).
- Domínios via rotas `GET` sem auth.
- Logging winston + daily-rotate; rota `/logs`; Swagger em `/api/api_docs`.

---

## 4. Requisitos funcionais

Convenção: **RF-<módulo>-<n>**. Prioridade: **(M)** must, **(S)** should, **(C)** could (MoSCoW). Cada módulo mapeia para uma feature do backend e uma ou mais páginas do client.

### 4.0 Autenticação e usuários (RF-AUTH)
- **RF-AUTH-1 (M)**: login por usuário/senha, delegado ao serviço de autenticação central, com aplicação `orcamento_web`; o backend emite JWT local de 1h.
- **RF-AUTH-2 (M)**: importar e sincronizar usuários do serviço de autenticação para `dgeo.usuario` (espelho local, sem senha).
- **RF-AUTH-3 (M)**: gestão de usuários por admin (ativar/desativar, promover/rebaixar admin), com trava de "último administrador".
- **RF-AUTH-4 (M)**: autorização binária - rotas de leitura exigem `verifyLogin`; rotas de escrita exigem `verifyAdmin` (revalidado no banco).
- **RF-AUTH-5 (S)**: registro de login auditado (quem, quando).

### 4.1 Exercício e metas do PIT (RF-EXE)
- **RF-EXE-1 (M)**: cadastrar o **exercício** (ano orçamentário) com UASG (160382) e CODOM. Um ano ativo por vez; anos anteriores ficam como referência.
- **RF-EXE-2 (M)**: cadastrar as **metas do PIT** do ano (número da meta, item, descrição), para que NC e itens de PDR possam apontá-las (rastreabilidade do gasto à produção).
- **RF-EXE-3 (S)**: a relação meta-crédito é a base do "amarra cada NC à meta do PIT que financia" do RPCMTec; o sistema deve permitir consultar quanto cada meta recebeu/empenhou/liquidou.

### 4.2 DFD e PCA - planejamento (RF-PCA)
- **RF-PCA-1 (M)**: cadastrar um **PCA** por ano (UASG, valor total estimado, janelas de revisão) e seus **DFDs**.
- **RF-PCA-2 (M)**: cadastrar **DFD** com número, rótulo, objeto, justificativa, área requisitante, grau de prioridade (opcional), data prevista de conclusão, responsável (CPF), vínculo ao plano de gestão, e a flag "consta no PCA" (para demanda superveniente).
- **RF-PCA-3 (M)**: cadastrar os **itens do DFD** (material ou serviço; CATMAT/CATSER ou classe/PDM; descrição; quantidade; valor unitário; valor total). O DFD **não** carrega ND numerada (regra do domínio: não forçar).
- **RF-PCA-4 (S)**: ligar um DFD a uma ou mais **licitações** que dele resultam (origem da licitação própria, seção 3.5).
- **RF-PCA-5 (C)**: importar DFDs a partir de extração estruturada (ex.: dos formulários do Compras.gov.br); nesta fase, entrada manual.

### 4.3 PDR - crédito autorizado (RF-PDR)
- **RF-PDR-1 (M)**: cadastrar o **PDR** do ano (valor solicitado x autorizado, GND3/GND4, ação orçamentária 20XE, plano orçamentário 000F, data de assinatura, revisão).
- **RF-PDR-2 (M)**: cadastrar os **itens do PDR** (linha do quadro consolidado): ND, meta do PIT (opcional para infraestrutura), rótulo do item (1D, 1E, 1F, 1G, 1I...), descrição, GND, valor solicitado, valor autorizado, observação (ex.: "GCALC 4CGEO", "já empenhado").
- **RF-PDR-3 (M)**: o item de PDR é o lado **"previsto"** da tabela 3.1; o sistema soma o autorizado por ND para o previsto.
- **RF-PDR-4 (S)**: comparar PCA (demandas) x PDR (crédito) evidenciando que os totais não coincidem (instrumentos distintos).

### 4.4 NC - crédito recebido (RF-NC)
- **RF-NC-1 (M)**: cadastrar **NC** com número (e ano do prefixo), data de emissão, ND, célula orçamentária (PTRES, fonte, PI), finalidade/histórico verbatim (que cita a meta do PIT), valor da NC, documento RO (opcional), prazo de empenho, UG emitente (default DSG; pode ser outra OM, ex.: SISFRON/EME).
- **RF-NC-2 (M)**: **classificar** cada NC em **PDR (3.2)** ou **Extra-PDR (3.7)** pela regra de negócio: crédito previsto no PDR autorizado = PDR; crédito recebido fora do PDR autorizado = Extra-PDR (mesmo usando a célula do PDR). A classificação **não** é pela célula orçamentária.
- **RF-NC-3 (M)**: ligar a NC à **meta do PIT** citada e, quando 3.2, ao **item do PDR** correspondente (o rótulo 1D/1E... casa aqui).
- **RF-NC-4 (M)**: o **valor recebido** usa o valor cheio da NC; uma devolução/anulação corta empenhado/liquidado, **nunca** o recebido.
- **RF-NC-5 (S)**: suportar **NC de complementação** (uma NC que reforça outra: self-referência) e **marcadores de rodapé** (`*`, `**`, `***`, `****`) para anulação/remanejamento, com nota explicativa.
- **RF-NC-6 (S)**: suportar edge cases reais: NC que mistura duas ND num mesmo número; NC de UG/PTRES/PI diferentes do padrão.

### 4.5 NE - empenho (RF-NE)
- **RF-NE-1 (M)**: cadastrar **NE** com número (e ano), ND, PI, finalidade, valor empenhado, valor anulado (devolução), ligação à NC (opcional, pois RPNP traz NE de anos anteriores) e à licitação (opcional).
- **RF-NE-2 (M)**: uma NC pode gerar 0..N NEs (empenho parcial/múltiplo); o sistema soma os empenhos por NC.
- **RF-NE-3 (S)**: marcar a NE como vinculada a **recebimento de material** (3.6) e/ou a uma licitação (3.4/3.5).

### 4.6 Liquidação (RF-LIQ)
- **RF-LIQ-1 (M)**: registrar **liquidação** por NE (valor liquidado, data quando disponível). Valor liquidado acumulado <= valor empenhado.
- **RF-LIQ-2 (M)**: o saldo a liquidar (empenhado - liquidado) alimenta o RPNP na virada do ano.
- **RF-LIQ-3 (C)**: registrar granularidade de evento (documento NS, data) se a fonte fornecer; caso contrário, modelar como valor acumulado por NE (gap documentado).

### 4.7 Licitações e RPNP (RF-LIC)
- **RF-LIC-1 (M)**: cadastrar **licitações** com tipo (GCALC DSG = 3.4 / própria = 3.5), objeto, fase atual (texto livre: "Documentação na SALC", "Homologado", impedimento), valor total estimado, valor final homologado, OM gestora (para GCALC).
- **RF-LIC-2 (M)**: cadastrar/derivar **RPNP** (3.3): NE de anos anteriores com saldo a liquidar, com valor empenhado e valor a liquidar, carregado para o exercício corrente.
- **RF-LIC-3 (M)**: cadastrar **recebimento de material** (3.6): NE, material, prazo de entrega, situação (texto: "Material recebido", "empenho anulado", etc.).

### 4.8 Geração do RPCMTec - seção 3 (RF-REL)
Esta é a feature de maior valor. Gera as 7 subtabelas para um (ano, mês) no formato cumulativo (cada mês soma ao anterior).
- **RF-REL-1 (M)**: gerar **3.1 Execução por ND** - 8 linhas fixas de ND, colunas: previsto (Σ PDR autorizado por ND), recebido (Σ NC PDR por ND), empenhado (Σ NE), liquidado (Σ liquidação).
- **RF-REL-2 (M)**: gerar **3.2 Créditos recebidos (PDR)** - colunas NC, NE, ND, finalidade, valor NC, valor empenhado, valor liquidado (a coluna NE foi adicionada em 2026).
- **RF-REL-3 (M)**: gerar **3.3 RPNP** - empenho (NE, com PI entre parênteses quando houver), finalidade, valor empenhado, valor a liquidar.
- **RF-REL-4 (M)**: gerar **3.4 GCALC DSG** e **3.5 Licitações próprias** - objeto, fase atual, valor total estimado, valor final homologado.
- **RF-REL-5 (M)**: gerar **3.6 Recebimento de material** - empenho, material, prazo de entrega, situação.
- **RF-REL-6 (M)**: gerar **3.7 Extra-PDR** - mesma estrutura da 3.2 (NC, NE, ND, finalidade, valor NC, empenhado, liquidado).
- **RF-REL-7 (M)**: regras de formatação do relatório: cumulativo (nunca zera no mês); tabela vazia imprime cabeçalho + linha de `-` (não se omite a subseção); valores `R$ 0.000,00`; preservar divergências da fonte com anotação, sem "consertar".
- **RF-REL-8 (M)**: exportar a seção 3 em formato fácil de colar no RPCMTec (Markdown e/ou DOCX/HTML tabular).
- **RF-REL-9 (S)**: comparar mês a mês (evolução do empenhado/liquidado), painel de execução.
- **RF-REL-10 (C)**: expor as tabelas por rota de integração read-only (no padrão `/api/integracao` do SCA) para a skill `gerar-relatorio-dgeo` consumir direto, dispensando recadastro no vault.

### 4.9 Dashboard e consultas (RF-DASH)
- **RF-DASH-1 (S)**: painel com previsto x recebido x empenhado x liquidado do ano (gráficos Chart.js), por ND e por meta do PIT.
- **RF-DASH-2 (S)**: percentual de execução (liquidado/recebido, empenhado/recebido).
- **RF-DASH-3 (C)**: alerta de prazo de empenho ("Emp até <data>") e de NE não liquidada perto da virada do ano.

---

## 5. Requisitos não-funcionais

- **RNF-1 Paridade**: o stack e os padrões devem espelhar o `controle_acervo`; desvios precisam de decisão registrada. Reduz custo de manutenção (uma equipe mantém os dois).
- **RNF-2 Auditabilidade**: toda alteração registra usuário e data (par de auditoria). Valores e divergências são preservados, não silenciosamente corrigidos.
- **RNF-3 Segurança**: senha nunca trafega/armazena no SCO (delegada ao auth); JWT local de 1h; rotas de escrita só admin; helmet/cors/hpp/rate-limit como no SCA. Rede interna confiável (intranet), como o SCA.
- **RNF-4 Confiabilidade do dado orçamentário**: somas (3.1) devem fechar com os lançamentos (3.2/3.7 + execução); o sistema deve sinalizar inconsistências (ex.: liquidado > empenhado).
- **RNF-5 Usabilidade**: cadastro de NC e empenho é a tarefa mais frequente no fechamento; deve ser rápido (poucos cliques, selects de domínio pré-carregados).
- **RNF-6 Portabilidade**: roda em Windows e Linux (Node + PostgreSQL), igual ao SCA. Sem dependência de serviço externo além do PostgreSQL e do serviço de autenticação.
- **RNF-7 Versionamento de schema**: `public.versao` + `semver`, validado no boot.
- **RNF-8 Documentação viva**: Swagger em `/api/api_docs`; este documento e o `MODELO-DADOS.md` acompanham a evolução.

---

## 6. Integrações

- **Serviço de autenticação** (`servico_autenticacao`): obrigatória. Login (`POST /api/login`), lista de usuários (`GET /api/usuarios`), health (`GET /api`). Aplicação `orcamento_web` registrada e ativa na tabela `dgeo.aplicacao` do auth.
- **PIT / SAP** (futuro, opcional): as metas do PIT poderiam vir do SAP em vez de cadastro manual. Nesta fase, cadastro manual das metas no SCO.
- **Vault do Chefe da DGEO** (futuro): rota de integração read-only (RF-REL-10) para a skill `gerar-relatorio-dgeo` puxar a seção 3 por HTTP, no mesmo padrão das rotas `/api/integracao` do SCA.
- **SIAFI**: fora de escopo (entrada manual a partir dos documentos do SIAFI).

---

## 7. Fases de implementação (roadmap)

Entrega incremental, cada fase utilizável de ponta a ponta.

- **Fase 0 - Fundação (esta entrega, 2026-06-13)**: git, CLAUDE.md, REQUISITOS.md, MODELO-DADOS.md.
- **Fase 1 - Esqueleto + auth**: scaffold do backend (clonando o molde do SCA), `er/` com `versao/dominio/dgeo` + tabelas de domínio do orçamento, `create_config.js`, login e usuários, app shell do client com login. Registrar `orcamento_web` no auth.
- **Fase 2 - Crédito e execução (núcleo)**: features e telas de Exercício/Metas, NC, NE, Liquidação. É o mínimo para alimentar a 3.1, 3.2, 3.3 e 3.7. Maior valor por esforço.
- **Fase 3 - Geração do RPCMTec**: feature `relatorio` (views agregadas 3.1-3.7), tela de geração por mês, export Markdown/DOCX. Inclui 3.4/3.5/3.6 (licitações e material).
- **Fase 4 - Planejamento**: DFD e PCA, ligação DFD-licitação.
- **Fase 5 - Dashboard e integração**: painel de execução (Chart.js), rota de integração read-only para o vault, alertas de prazo.

Prioridade de valor: **Fases 2 e 3 primeiro** (o que tira o trabalho manual do fechamento). DFD/PCA (Fase 4) é planejamento de A-1, menos urgente no meio do ano.

---

## 8. Riscos e questões em aberto

- **Q1 Granularidade da liquidação**: o vault só registra valor liquidado acumulado, não eventos (data, documento NS). Decidir se a entidade `liquidacao` guarda eventos ou só o acumulado por NE. Default: entidade de eventos, com fallback para acumulado.
- **Q2 Origem das metas do PIT**: cadastro manual (simples) x integração com SAP (sem retrabalho, mais acoplamento). Default da Fase 2: manual.
- **Q3 Formato de export do relatório**: Markdown (fácil, casa com o vault) x DOCX (cola direto no documento oficial). Default: Markdown primeiro, DOCX depois.
- **Q4 Quem além do Chefe usa o sistema** e com qual papel (define se precisa de granularidade de permissão além de admin/comum). Default: admin/comum como no SCA.
- **Q5 Dois clients ou um**: o SCA tem dois clients (dashboard + CRUD). O SCO provavelmente é **um único client CRUD com dashboard embutido** (como o `mapoteca_client`). A confirmar na Fase 1.
- **R1 Mudança da estrutura do RPCMTec**: a seção 3 ganhou a coluna NE de 2025 para 2026. O gerador deve ser parametrizável por ano para absorver mudanças finas sem reescrita.

---

## 9. Critérios de aceitação da fundação (Fase 0)

- [x] Repositório git inicializado em `controle_orcamentario` com commit inicial.
- [x] `CLAUDE.md` define stack, padrões e a regra "clonar o SCA".
- [x] `docs/REQUISITOS.md` cobre escopo, glossário, arquitetura, requisitos funcionais por módulo (DFD, PCA, PDR, NC, NE, liquidação, licitação, RPNP, geração do RPCMTec), não-funcionais, integrações e roadmap.
- [x] `docs/MODELO-DADOS.md` define entidades, relacionamentos e esboço do schema `orcamento`.

---

## Apêndice A - rastreabilidade requisito -> tabela 3.x do RPCMTec

| Tabela RPCMTec | Fonte no SCO | Requisito |
|---|---|---|
| 3.1 Execução por ND | agregação de `pdr_item` (previsto) + `nota_credito` + `nota_empenho` + `liquidacao` | RF-REL-1 |
| 3.2 Créditos recebidos (PDR) | `nota_credito` (classificacao=PDR) + `nota_empenho` + `liquidacao` | RF-REL-2 |
| 3.3 RPNP | `nota_empenho` de anos anteriores com saldo (ou tabela `rpnp`) | RF-REL-3 |
| 3.4 GCALC DSG | `licitacao` (tipo=GCALC_DSG) | RF-REL-4 |
| 3.5 Licitações próprias | `licitacao` (tipo=PROPRIA) | RF-REL-4 |
| 3.6 Recebimento de material | `recebimento_material` | RF-REL-5 |
| 3.7 Extra-PDR | `nota_credito` (classificacao=EXTRA_PDR) + `nota_empenho` + `liquidacao` | RF-REL-6 |
