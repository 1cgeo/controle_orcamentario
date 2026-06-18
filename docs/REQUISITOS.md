# Controle Orçamentário (SCO) - Documento de Requisitos

Versão 1.0 (2026-06-13). Define o que o sistema faz, para quem e com qual stack. O sistema está implementado; o estado por requisito está em `REVISAO.md` e o modelo de dados em `MODELO-DADOS.md`.

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
| **PCA** | Plano de Contratações Anual. Consolida os DFDs do ano. **Não é uma entidade no SCO**: o "PCA do ano" é o conjunto de DFDs daquele ano (resumo: contagem + total). PCA 2026 da DGEO = 7 DFDs, R$ 805.600 (UASG 160382). |
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
| **Ano** | A dimensão que recorta tudo no SCO (coluna `ano SMALLINT`, sem FK, em cada tabela de negócio). Não há entidade "exercício" nem "ano ativo": o ano de contexto das telas é global (seletor no navbar), com default no ano corrente ou no `ano_referencia` da configuração. |
| **Configuração** | Linha única (singleton) do sistema com `uasg` (DGEO = 160382), `codom` (048215) e `ano_referencia` (default do seletor de ano). Substitui o que antes morava no "exercício". |

**Cadeia conceitual completa:**
`DFD -> PCA` (A-1, planejamento) `-> LOA -> PDR` (crédito autorizado, = conjunto de itens) `-> NC` (crédito recebido) `-> NE` (empenho, contra a NC) `-> Liquidação` (despesa reconhecida). Em paralelo, a **Licitação** é acompanhada à parte (não tem vínculo direto com DFD nem com NE) e, na virada do ano, `NE não liquidada -> RPNP`. Cada NC e cada item de PDR aponta para uma **meta do PIT**; a NE herda ND/PI/GND da NC.

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
│       ├── configuracao/     # config geral singleton (uasg/codom/ano_referencia) + lista de anos
│       ├── meta/             # metas do PIT (por ano)
│       ├── dfd/              # planejamento (DFD + itens); PCA do ano = conjunto de DFDs
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

### 4.1 Ano, configuração e metas do PIT (RF-EXE)
- **RF-EXE-1 (M)**: manter a **configuração geral** (singleton): UASG (160382), CODOM e `ano_referencia` (default do seletor de ano), via `/configuracao`. O **ano** é a dimensão de cada tabela de negócio (coluna `ano SMALLINT`, sem FK), selecionado globalmente no navbar (default no ano corrente ou no `ano_referencia`); `/configuracao/anos` lista os anos com dado. Não há entidade "exercício" nem "ano ativo".
- **RF-EXE-2 (M)**: cadastrar as **metas do PIT** do ano (número da meta, item, descrição), para que NC e itens de PDR possam apontá-las (rastreabilidade do gasto à produção).
- **RF-EXE-3 (S)**: a relação meta-crédito é a base do "amarra cada NC à meta do PIT que financia" do RPCMTec; o sistema deve permitir consultar quanto cada meta recebeu/empenhou/liquidou.

### 4.2 DFD e PCA - planejamento (RF-PCA)
- **RF-PCA-1 (M)**: cadastrar os **DFDs** do ano. O **PCA** não é uma entidade: o "PCA do ano" é o conjunto de DFDs daquele ano (resumo: contagem + total estimado). A flag `consta_pca` no DFD distingue a demanda do PCA da superveniente.
- **RF-PCA-2 (M)**: cadastrar **DFD** com número, rótulo, objeto, justificativa, área requisitante, grau de prioridade (opcional), data prevista de conclusão, responsável (CPF), vínculo ao plano de gestão, e a flag "consta no PCA" (para demanda superveniente).
- **RF-PCA-3 (M)**: cadastrar os **itens do DFD** (material ou serviço; CATMAT/CATSER ou classe/PDM; descrição; quantidade; valor unitário; valor total). O DFD **não** carrega ND numerada (regra do domínio: não forçar).
- **RF-PCA-4 (S)**: a **licitação não tem vínculo direto com o DFD** (uma licitação pode cobrir vários DFDs); o DFD fica no PCA do ano e a licitação é acompanhada à parte (seção 3.4/3.5).
- **RF-PCA-5 (C)**: importar DFDs a partir de extração estruturada (ex.: dos formulários do Compras.gov.br); nesta fase, entrada manual.

### 4.3 PDR - crédito autorizado (RF-PDR)
- **RF-PDR-1 (M)**: o **PDR é o conjunto dos seus itens** amarrados no ano; **não há cabeçalho de PDR**. Os totais (solicitado/autorizado, por GND) são **calculados a partir dos itens**, não armazenados (sem ação orçamentária, plano orçamentário, data de assinatura ou revisão).
- **RF-PDR-2 (M)**: cadastrar/editar/excluir os **itens do PDR** (a página lista os itens com adicionar/editar/excluir): ND, meta do PIT (opcional para infraestrutura), rótulo do item (1D, 1E, 1F, 1G, 1I...), descrição, GND, valor solicitado, valor autorizado, observação (ex.: "GCALC 4CGEO", "já empenhado").
- **RF-PDR-3 (M)**: o item de PDR é o lado **"previsto"** da tabela 3.1; o sistema soma o autorizado por ND para o previsto.
- **RF-PDR-4 (S)**: comparar PCA (demandas) x PDR (crédito) evidenciando que os totais não coincidem (instrumentos distintos).

### 4.4 NC - crédito recebido (RF-NC)
- **RF-NC-1 (M)**: cadastrar **NC** com número (e ano do prefixo), data de emissão, ND, célula orçamentária (PTRES, fonte, PI), finalidade/histórico verbatim (que cita a meta do PIT), valor da NC, **valor recolhido** (parte do crédito devolvida/recolhida; informativo, default 0, não altera o valor da NC), documento RO (opcional), prazo de empenho, UG emitente (default DSG; pode ser outra OM, ex.: SISFRON/EME).
- **RF-NC-2 (M)**: **classificar** cada NC em **PDR (3.2)** ou **Extra-PDR (3.7)** pela regra de negócio: crédito previsto no PDR autorizado = PDR; crédito recebido fora do PDR autorizado = Extra-PDR (mesmo usando a célula do PDR). A classificação **não** é pela célula orçamentária.
- **RF-NC-3 (M)**: ligar a NC à **meta do PIT** citada e, quando 3.2, ao **item do PDR** correspondente (o rótulo 1D/1E... casa aqui).
- **RF-NC-4 (M)**: o **valor recebido** usa o valor cheio da NC; uma devolução/anulação corta empenhado/liquidado, **nunca** o recebido. O **valor recolhido** (devolvido) é registrado à parte na NC, de forma explícita e informativa (não desconta do recebido); aparece como coluna nas tabelas 3.1, 3.2 e 3.7.
- **RF-NC-5 (S)**: suportar **NC de complementação** (uma NC que reforça outra: self-referência) e **marcadores de rodapé** (`*`, `**`, `***`, `****`) para anulação/remanejamento, com nota explicativa.
- **RF-NC-6 (S)**: suportar edge cases reais: NC que traz **mais de uma ND no mesmo número** (cadastrada uma vez por ND, com o par `(ano, numero, cod_nd)` único; nos selects escolhe-se a NC olhando "numero - ND"); NC de UG/PTRES/PI diferentes do padrão.

### 4.5 NE - empenho (RF-NE)
- **RF-NE-1 (M)**: cadastrar **NE** com número (e ano), ligação à **NC (obrigatória)**, finalidade, valor empenhado, valor anulado (devolução). A **ND, o PI e o GND são herdados da NC**; a NE não tem esses campos nem licitação. (Empenhos de anos anteriores sem NC entram como **RPNP**, não como NE.)
- **RF-NE-2 (M)**: uma NC pode gerar 0..N NEs (empenho parcial/múltiplo); o sistema soma os empenhos por NC.
- **RF-NE-3 (S)**: marcar a NE como vinculada a **recebimento de material** (3.6).

### 4.6 Liquidação (RF-LIQ)
- **RF-LIQ-1 (M)**: registrar **liquidação** por NE (valor liquidado, data quando disponível). Valor liquidado acumulado <= valor empenhado.
- **RF-LIQ-2 (M)**: o saldo a liquidar (empenhado - liquidado) alimenta o RPNP na virada do ano.
- **RF-LIQ-3 (C)**: registrar granularidade de evento (documento NS, data) se a fonte fornecer; caso contrário, modelar como valor acumulado por NE (gap documentado).

### 4.7 Licitações e RPNP (RF-LIC)
- **RF-LIC-1 (M)**: cadastrar **licitações** com tipo (**GCALC DSG = 3.4 / Própria = 3.5 / Participante**), objeto, fase atual (texto livre: "Documentação na SALC", "Homologado", impedimento), valor total estimado, valor final homologado, OM gestora. A **OM gestora só se aplica a Participante** (a OM que conduz a licitação); em GCALC DSG e Própria a gestora é a própria OM.
- **RF-LIC-2 (M)**: cadastrar/derivar **RPNP** (3.3): NE de anos anteriores com saldo a liquidar, com valor empenhado e valor a liquidar, carregado para o exercício corrente.
- **RF-LIC-3 (M)**: cadastrar **recebimento de material** (3.6): NE, material, prazo de entrega, situação (texto: "Material recebido", "empenho anulado", etc.).

### 4.8 Geração do RPCMTec - seção 3 (RF-REL)
Esta é a feature de maior valor. Gera as 7 subtabelas para um (ano, mês) no formato cumulativo (cada mês soma ao anterior).
- **RF-REL-1 (M)**: gerar **3.1 Execução por ND** - 8 linhas fixas de ND, colunas: previsto (Σ PDR autorizado por ND), recebido (Σ NC PDR por ND), recolhido (Σ valor recolhido das NC por ND), empenhado (Σ NE), liquidado (Σ liquidação).
- **RF-REL-2 (M)**: gerar **3.2 Créditos recebidos (PDR)** - colunas NC, NE, ND, finalidade, valor NC, valor recolhido, valor empenhado, valor liquidado (a coluna NE foi adicionada em 2026; a coluna Valor Recolhido em 2026-06-18).
- **RF-REL-3 (M)**: gerar **3.3 RPNP** - empenho (NE, com PI entre parênteses quando houver), finalidade, valor empenhado, valor a liquidar.
- **RF-REL-4 (M)**: gerar **3.4 GCALC DSG** e **3.5 Licitações próprias** - objeto, fase atual, valor total estimado, valor final homologado.
- **RF-REL-5 (M)**: gerar **3.6 Recebimento de material** - empenho, material, prazo de entrega, situação.
- **RF-REL-6 (M)**: gerar **3.7 Extra-PDR** - mesma estrutura da 3.2 (NC, NE, ND, finalidade, valor NC, valor recolhido, empenhado, liquidado).
- **RF-REL-7 (M)**: regras de formatação do relatório: cumulativo (nunca zera no mês); tabela vazia imprime cabeçalho + linha de `-` (não se omite a subseção); valores `R$ 0.000,00`; preservar divergências da fonte com anotação, sem "consertar".
- **RF-REL-8 (M)**: exportar a seção 3 em formato fácil de colar no RPCMTec (Markdown e/ou DOCX/HTML tabular).
- **RF-REL-9 (S)**: comparar mês a mês (evolução do empenhado/liquidado), painel de execução.
- **RF-REL-10 (C)**: expor as tabelas por rota de integração read-only (no padrão `/api/integracao` do SCA) para a skill `gerar-relatorio-dgeo` consumir direto, dispensando recadastro no vault.

### 4.9 Dashboard e consultas (RF-DASH)
- **RF-DASH-1 (S)**: painel com previsto x recebido x empenhado x liquidado do ano (gráficos Chart.js), por ND e por meta do PIT.
- **RF-DASH-2 (S)**: percentual de execução (liquidado/recebido, empenhado/recebido).
- **RF-DASH-3 (C)**: alerta de prazo de empenho ("Emp até <data>") e de NE não liquidada perto da virada do ano.

### 4.10 Anexos de documentos (RF-ANEXO)
- **RF-ANEXO-1 (S)**: anexar o **documento original** às entidades, guardando os bytes no filesystem (`STORAGE_PATH`) e os metadados na tabela `arquivo`. Rotas em `/api/arquivo` (listar por vínculo, upload, download, excluir), todas admin.
- **RF-ANEXO-2 (S)**: **NC** e **DFD** têm **no máximo 1 anexo** (reenviar substitui o anterior, removendo o arquivo antigo do disco); aceitam só **PDF**. O download usa o nome original.
- **RF-ANEXO-3 (S)**: o **PDR** aceita **vários** anexos (planilhas e PDFs: XLSX/XLS/CSV/ODS/PDF), no **nível do ano** (`arquivo.pdr_ano`), pois não há cabeçalho de PDR. Geridos por um modal "Anexos do PDR <ano>" na página do PDR.
- **RF-ANEXO-4 (S)**: excluir a NC ou o DFD remove seus anexos (linha por ON DELETE CASCADE e o arquivo do disco pela aplicação).

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

## 7. Estado de implementação

Tudo implementado (backend + client + testes em três camadas). Detalhe requisito a requisito em `REVISAO.md`.

- **Crédito e execução (núcleo)**: Configuração/Ano/Metas, PDR, NC, NE, Liquidação, e a geração da seção 3 (3.1, 3.2, 3.3, 3.7). Feito.
- **Geração do RPCMTec**: feature `relatorio` gera as 7 subtabelas (3.1 a 3.7) por mês, em JSON e Markdown. 3.4/3.5/3.6 (licitações e material) inclusas. Export DOCX não feito (Markdown atende).
- **Planejamento**: DFD com itens (o PCA do ano é o agregado dos DFDs); licitação liga-se ao DFD. Feito.
- **Dashboard**: painel de execução por ND com Chart.js. Feito.

Pendências (todas "should"/"could", em `REVISAO.md`): consulta de execução por meta do PIT (RF-EXE-3), comparativo PCA x PDR (RF-PDR-4), rota de integração read-only para o vault (RF-REL-10), percentual de execução (RF-DASH-2) e alertas de prazo (RF-DASH-3). RPNP é lançamento manual, não derivação automática (RF-LIQ-2).

---

## 8. Decisões tomadas

- **Valor recolhido na NC (2026-06-18): coluna nova nas tabelas 3.1, 3.2 e 3.7.** O Chefe da DGEO passou a registrar no RPCMTec, de forma explícita, o crédito recebido que foi **recolhido/devolvido**. Modelado como um campo informado **na NC** (`orcamento.nota_credito.valor_recolhido NUMERIC(15,2) NOT NULL DEFAULT 0`), digitado pelo usuário, **separado de `valor_nc`** (o recebido continua cheio; a regra "devolução não muda o recebido" segue valendo). A geração da Seção 3 ganhou a coluna: na 3.1 agrega por ND com split PDR/Extra-PDR (mesmo recorte do recebido, por `data_emissao`); na 3.2/3.7 é a coluna "Valor Recolhido" da NC (logo após "Valor NC"). Migração aditiva (ALTER ADD COLUMN ... DEFAULT 0); linhas existentes ficam em 0. Tocou schema (`er/orcamento.sql`), `nota_credito` (schema/ctrl/dialog/list), `relatorio` (query + Markdown + DOCX) e o client da Seção 3. Suítes verdes (backend mockado 220, integração 52, frontend 78).
- **Anexos de documentos (2026-06-13): tabela `arquivo` polimórfica + arquivos no filesystem.** Adicionada a feature `arquivo` (rotas `/api/arquivo`) e a tabela `orcamento.arquivo` com vínculo a **exatamente um** dono (CHECK): `nota_credito_id`, `dfd_id` (FKs, ON DELETE CASCADE) ou `pdr_ano` (o PDR é nível ano, sem tabela). **NC e DFD = 1 anexo PDF** (reenviar substitui, garantido por índice único parcial); **PDR = vários** (PDF + planilha), geridos por um modal na página do PDR. Os bytes ficam em `STORAGE_PATH` (nova env, criada pelo `create_config.js`) com nome em disco UUID; o banco guarda só metadados. No client, componente reutilizável `file-attachment` (modo single/multi); ao criar NC/DFD o anexo é enviado após o registro existir (precisa do id). Suítes verdes (backend mockado 218, integração 48, frontend 77).
- **Reformulação de execução (2026-06-13): PDR como itens, empenho a partir da NC, licitação independente.** (1) O **PDR virou só os itens** (sem cabeçalho): a página lista os itens com adicionar/editar/excluir e os totais (solicitado/autorizado por GND) são calculados deles; removidos ação orçamentária, plano orçamentário, data de assinatura e revisão. (2) O **empenho** passou a empenhar contra uma **NC obrigatória** e **herda dela ND/PI/GND**; a NE perdeu os campos próprios de ND, PI e licitação; o "empenhado por ND" da 3.1 agrega por `nota_empenho -> nota_credito -> cod_nd`. (3) A **licitação** perdeu o vínculo com DFD (pode cobrir vários) e ganhou o tipo **Participante** (além de GCALC DSG e Própria); a **OM gestora só vale para Participante**. (4) A **NC** ganhou UNIQUE `(ano, numero, cod_nd)`: uma NC com mais de uma ND é cadastrada uma vez por ND (escolha por "numero - ND"). (5) **Meta do PIT** perdeu o campo `solicitante`. (6) Os domínios **natureza_despesa, plano_interno e ug** ganharam **CRUD admin** na página Configuração. (7) O seletor de ano no navbar permite **trabalhar em um ano ainda sem dados** ("+ Outro ano…") e os diálogos de cadastro mostram o ano no título. Suítes verdes (backend mockado 203, integração 38, frontend 74).
- **Reformulação estrutural (2026-06-13): ano como chave, configuração geral, PCA = conjunto de DFDs.** Eliminadas as entidades `exercicio` e `pca`. (1) O **ano** passou a ser a dimensão única (coluna `ano SMALLINT` simples, sem FK, em meta_pit, dfd, licitacao, pdr, nota_credito, nota_empenho, rpnp, relatorio_rpcmtec); não há mais "ano ativo". (2) UASG, CODOM e o `ano_referencia` viraram a tabela **`configuracao`** (singleton `id = 1`), com endpoints `/configuracao` (GET/PUT) e `/configuracao/anos` (lista de anos com dado) e uma página "Configuração" no client. (3) O **PCA** deixou de ser tabela: o "PCA do ano" é o conjunto de DFDs daquele ano (resumo: contagem + total); o DFD mantém a flag `consta_pca` (demanda superveniente, ex.: DFD de IA). (4) Em `rpnp`, a coluna `ano_exercicio` virou `ano`. (5) No backend, as features `meta/`, `dfd/` e `configuracao/` (antes meta e dfd viviam dentro de `exercicio/` e `pca/`); as rotas viraram `/configuracao`, `/metas` e `/dfd` (sem `/exercicios` nem `/pca`). (6) No client, **seletor de ano global no navbar** (default no ano corrente ou no `ano_referencia`); a tela do **RPCMTec carrega automaticamente o último mês cumulativo ao abrir**. As três suítes de teste seguem verdes após o refactor (backend mockado 191, integração 37, frontend 64).
- **Liquidação como evento**: a tabela `liquidacao` guarda eventos (valor, `data`, `documento_ns` nuláveis), permitindo várias por NE; o acumulado é somado nas consultas.
- **Metas do PIT por cadastro manual** (sem integração com o SAP nesta versão).
- **Export do relatório em DOCX** (para colar no Google Docs); a exibição/cópia de Markdown e as "edições mensais" foram removidas da tela do RPCMTec.
- **Sistema admin-only** (decisão 2026-06-13): todas as rotas de feature exigem administrador; login e domínios são públicos. Não há perfil de leitura para usuário comum.
- **Client único** CRUD com dashboard embutido (modelo `mapoteca_client`), sem o segundo client do SCA.
- **Gerador do RPCMTec parametrizável** por mês e modo cumulativo; a coluna NE (delta 2025->2026) já é contemplada.

---

## Apêndice A - rastreabilidade requisito -> tabela 3.x do RPCMTec

| Tabela RPCMTec | Fonte no SCO | Requisito |
|---|---|---|
| 3.1 Execução por ND | agregação de `pdr_item` (previsto) + `nota_credito` + `nota_empenho` + `liquidacao` | RF-REL-1 |
| 3.2 Créditos recebidos (PDR) | `nota_credito` (classificacao=PDR) + `nota_empenho` + `liquidacao` | RF-REL-2 |
| 3.3 RPNP | tabela `rpnp` (carregamento anual) | RF-REL-3 |
| 3.4 GCALC DSG | `licitacao` (tipo=GCALC_DSG) | RF-REL-4 |
| 3.5 Licitações próprias | `licitacao` (tipo=PROPRIA) | RF-REL-4 |
| 3.6 Recebimento de material | `recebimento_material` | RF-REL-5 |
| 3.7 Extra-PDR | `nota_credito` (classificacao=EXTRA_PDR) + `nota_empenho` + `liquidacao` | RF-REL-6 |
