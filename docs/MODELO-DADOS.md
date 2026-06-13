# Controle Orçamentário (SCO) - Modelo de Dados

Versão 1.0 (2026-06-13). Modelo conceitual: entidades, relacionamentos e regras. O DDL exato (fonte da verdade) vive em `er/*.sql`, aplicado por `create_config.js`. Este documento dá a visão de alto nível; ao mudar o schema, mude `er/` e atualize aqui.

Convenções (herdadas do SCA):
- Schemas: `dgeo` (usuário, importado do serviço de autenticação), `dominio` (tabelas `code` + `nome`), `orcamento` (núcleo).
- Toda tabela de negócio tem auditoria: `data_cadastramento`/`usuario_cadastramento_uuid` (NOT NULL) e `data_modificacao`/`usuario_modificacao_uuid`, com FK para `dgeo.usuario(uuid)`.
- **Sem PostGIS, sem geometria.** Valores monetários em `NUMERIC(15,2)`. Identificadores ASCII.

---

## 1. Visão de alto nível (o fluxo)

O **ano** (coluna `ano SMALLINT`, sem FK) é a dimensão que recorta todas as entidades; não há tabela `exercicio`. A `configuracao` (singleton) é transversal: guarda `uasg`, `codom` e o `ano_referencia` (default do seletor de ano).

```
  configuracao (singleton id=1: uasg, codom, ano_referencia)

  ano (SMALLINT, dimensao em toda tabela; NAO ha entidade exercicio)
     |        \              \                 \
  meta_pit   dfd --- dfd_item  licitacao     relatorio_rpcmtec (edicao mensal)
     |       (PCA do ano =     (3.4 GCALC /        |
     |        conjunto de       3.5 propria /      | (as tabelas 3.1..3.7 sao
     |        DFDs do ano)      participante)      |  consultas agregadas,
  pdr_item                                         |  nao armazenadas)
     |  (o PDR e o conjunto dos itens do ano;
     |   nao ha cabecalho de PDR)
  nota_credito --- nota_empenho --- liquidacao
   (NC, 3.2/3.7;    (NE; herda ND/PI    |
    par numero/ND    da NC)            (saldo a liquidar)
    unico)              +-- recebimento_material (3.6)

  rpnp (3.3, carregamento anual; opcionalmente referencia uma NE)
```

Regra de ouro: as tabelas 3.1 a 3.7 do RPCMTec **não são armazenadas**; são consultas agregadas (feature `relatorio`) sobre o modelo abaixo, recortadas por (ano, mês, cumulativo).

---

## 2. Entidades do schema `orcamento`

Por entidade: propósito, colunas-chave/FKs (a auditoria fica implícita) e cardinalidade. Para tipos e constraints exatos, ver `er/orcamento.sql`.

- **configuracao** - configuração geral do sistema, **linha única** (`id = 1`, com `CHECK (id = 1)`; o backend só faz UPDATE). Guarda `uasg`, `codom` e `ano_referencia` (o default do seletor de ano das telas). Substitui o que antes morava no `exercicio`. **Não há entidade `exercicio` nem "ano ativo"**: o ano é só um `SMALLINT` em cada tabela de negócio (sem FK), e o "ano de contexto" das telas é global (seletor no navbar), com default no ano corrente ou no `ano_referencia`.
- **meta_pit** - meta do PIT que o crédito financia (rastreabilidade). PK `id`; `ano` (SMALLINT, sem FK); `numero_meta`, `item`, `descricao`. UNIQUE(ano, numero_meta, item).
- **dfd** - documento de formalização da demanda, amarrado no ano. PK `id`; `ano` (SMALLINT, sem FK), FK `grau_prioridade_id` -> dominio.grau_prioridade; `numero`, `rotulo`, `objeto`, `justificativa`, `area_requisitante`, `data_prevista_conclusao`, `responsavel_cpf`, `vinculo_plano_gestao`, `consta_pca` (flag: distingue a demanda do PCA da superveniente, ex.: DFD de IA), `valor_estimado`. **O DFD não tem ND** (regra do domínio) **e não tem `pca_id`** (não existe entidade PCA). 1 dfd : N dfd_item. O "PCA do ano" é o conjunto de DFDs daquele ano (resumo: contagem + total), não uma tabela.
- **dfd_item** - item do DFD. PK `id`; FK `dfd_id`, `tipo_item_id` -> dominio.tipo_item_dfd (material/serviço); `cod_catmat_catser`, `descricao`, `quantidade`, `valor_unitario`, `valor_total`.
- **licitacao** - 3.4 (GCALC DSG) e 3.5 (própria). PK `id`; `ano` (SMALLINT, sem FK), `tipo_id` -> dominio.tipo_licitacao (1 GCALC DSG / 2 própria / 3 participante); `objeto`, `fase_atual`, `valor_total_estimado`, `valor_final_homologado`, `om_gestora`. **Não tem vínculo com DFD** (uma licitação pode cobrir vários DFDs). `om_gestora` só se aplica a Participante (a OM que conduz); em GCALC DSG e Própria a gestora é a própria OM (regra de aplicação, gravada como null).
- **pdr_item** - o PDR é o conjunto dos seus itens, amarrados no ano; **não há cabeçalho de PDR**. Lado "previsto" da 3.1. PK `id`; `ano` (SMALLINT, sem FK), FK `cod_nd` -> dominio.natureza_despesa, `meta_pit_id` (nullable); `item_label` (1D, 1E...), `descricao`, `gnd`, `valor_solicitado`, `valor_autorizado`, `observacao`. Os totais (solicitado/autorizado por GND) são calculados a partir dos itens.
- **nota_credito (NC)** - crédito recebido (3.2/3.7). PK `id`; `numero`, `ano` (SMALLINT, sem FK), `data_emissao`, FK `cod_nd`; célula inline `ptres`, `fonte`, FK `cod_pi` -> plano_interno, FK `ug_emitente` -> ug; `finalidade_historico` (cita a meta), FK `meta_pit_id`; `valor_nc` (= recebido, NUNCA muda por devolução); `doc_ro`, `prazo_empenho`; FK `classificacao_id` -> classificacao_nc (1 PDR / 2 Extra-PDR); FK `pdr_item_id` (preenchido só quando classificacao=PDR); FK `nc_complementada_id` -> nota_credito (self, complementação); `marcador`, `observacao`. **UNIQUE(ano, numero, cod_nd)**: uma NC com mais de uma ND é cadastrada uma vez por ND (o par numero/ND é único). 1 NC : 0..N nota_empenho.
- **nota_empenho (NE)** - empenho. PK `id`; `numero`, `ano` (SMALLINT, sem FK), `data_empenho`; FK `nota_credito_id` (**NOT NULL**: a NE empenha contra uma NC); `finalidade`, `valor_empenhado`, `valor_anulado` (devolução/anulação). **A ND, o PI e o GND são herdados da NC** (a NE não guarda esses campos nem licitação). 1 NE : N liquidacao.
- **liquidacao** - PK `id`; FK `nota_empenho_id`; `valor_liquidado`, `data`, `documento_ns` (data/documento nuláveis). Regra: Σ liquidado por NE <= valor_empenhado - valor_anulado.
- **recebimento_material (3.6)** - PK `id`; FK `nota_empenho_id`; `material`, `prazo_entrega`, `situacao`.
- **rpnp (3.3)** - restos a pagar não processados, carregamento anual. PK `id`; `ano` (SMALLINT, sem FK), FK `nota_empenho_id` (nullable); `empenho_label` (identificação textual quando a NE antiga não está cadastrada), `finalidade`, `valor_empenhado`, `valor_a_liquidar`.
- **relatorio_rpcmtec** - edição mensal (metadados). PK `id`; `ano` (SMALLINT, sem FK); `mes`, `assinante`, `data_assinatura`. UNIQUE(ano, mes). As tabelas 3.x são geradas por consulta, não guardadas aqui.
- **arquivo** - anexo (documento original) com vínculo polimórfico. PK `id`; FKs nuláveis `nota_credito_id` e `dfd_id` (ambos ON DELETE CASCADE) e a coluna `pdr_ano` (SMALLINT, sem FK; o PDR é nível ano, não há tabela `pdr`); `nome_original`, `nome_armazenado` (UUID em disco), `extensao`, `mimetype`, `tamanho_bytes`. **CHECK exatamente um vínculo** (`arquivo_um_vinculo`): NC ou DFD ou PDR(ano). **NC e DFD admitem no máximo 1 anexo** (índices únicos parciais `uniq_arquivo_nc`/`uniq_arquivo_dfd`; reenviar substitui); o **PDR admite vários**. Os bytes ficam no filesystem (`STORAGE_PATH`); aqui só os metadados. Tipos aceitos por vínculo: NC e DFD só PDF; PDR PDF + planilha (XLSX/XLS/CSV/ODS).

## 3. Domínios (schema `dominio`)

`code` + `nome` (e campos extras), populados no seed de `er/dominio.sql`. **natureza_despesa, plano_interno e ug têm CRUD admin** (geridos pela página Configuração); os demais são fixos no seed:
- **natureza_despesa** (`code` VARCHAR PK, `nome`, `gnd`, `grupo`): 10 NDs usadas pela DGEO (339014/339015 diárias, 339030 material, 339033 passagens, 339039 serviços, 339040 TIC, 339047 obrigações, 339139 publicações, 449040 TIC capital, 449052 permanente). GND 3 = custeio, 4 = capital (o grupo é derivado do GND).
- **plano_interno** (`code` VARCHAR PK, `nome`, `alinea`): K4CAIFGDIAR, K4CAIFGPASS, K4CAIFGPRCA.
- **ug** (`code`, `nome`): DSG (160089), 1 CGEO (160382), EME (160507).
- **tipo_licitacao** (1 GCALC DSG, 2 Própria, 3 Participante), **classificacao_nc** (1 PDR, 2 Extra-PDR), **tipo_item_dfd** (1 Material, 2 Serviço), **grau_prioridade** (1 Alta, 2 Normal, 3 Baixa), **tipo_posto_grad** (postos/graduações, para `dgeo.usuario`).

---

## 4. Regras de negócio embutidas no modelo

- **Classificação NC 3.2 vs 3.7** é regra de negócio (está previsto no PDR autorizado?), NÃO a célula orçamentária. Critério prático: `pdr_item_id` preenchido => PDR (3.2); ausente => Extra-PDR (3.7). O schema/ctrl força `pdr_item_id = null` quando classificacao = 2.
- **Empenho herda da NC**: a NE referencia uma NC (obrigatória) e dela herda ND, PI e GND; a NE não tem esses campos nem licitação. O "empenhado por ND" da 3.1 é agregado por `nota_empenho -> nota_credito -> cod_nd`.
- **valor_nc** é o recebido e nunca muda por devolução; a devolução/anulação vive em `nota_empenho.valor_anulado`.
- **Liquidação** acumulada por NE <= `valor_empenhado - valor_anulado` (validado na aplicação, em transação).
- **Ano como chave**: não há entidade `exercicio` nem "ano ativo". Toda tabela de negócio carrega `ano SMALLINT` (sem FK); o "ano de contexto" é global (seletor no navbar), com default no ano corrente ou no `configuracao.ano_referencia`.
- **PCA = conjunto de DFDs do ano**: não há tabela `pca` nem `dfd.pca_id`. O "PCA do ano" é o agregado dos DFDs daquele ano (resumo: contagem + total). A flag `dfd.consta_pca` distingue a demanda do PCA da superveniente (ex.: DFD de IA).
- **Recorte do relatório**: as colunas de fluxo da 3.1 (recebido, empenhado, liquidado) e as 3.2/3.7 usam o mesmo recorte `[inicio, cutoff]` pela data do documento; registros sem data são contados só no modo cumulativo (visão do ano), nunca num mês isolado. `inicio` = 1 de janeiro (cumulativo) ou 1º do mês; `cutoff` = último dia do mês.
- **Ids** (`BIGINT/BIGSERIAL`) circulam como número (type parser em `database/db.js`), para casar com as validações `Joi...strict()`.

## 5. Notas e edge cases suportados

- NC que mistura duas ND no mesmo número: duas linhas com o mesmo `numero` e ND distinta. O par `(ano, numero, cod_nd)` é UNIQUE, então cada ND entra uma vez; nos selects a NC é escolhida olhando "numero - ND".
- NC de UG/PTRES/PI diferentes do padrão (célula livre).
- NC de complementação (self-FK `nc_complementada_id`); o DELETE bloqueia se a NC for complementada por outra.
- Marcadores de rodapé (`*`, `**`, ...) para anulação/remanejamento em `marcador`.
- Datas nuláveis em `liquidacao`, `data_empenho`, `data_emissao` (gap do vault); tratadas no recorte do relatório (ver regra acima).

---

## Apêndice - lista de tabelas

`orcamento`: configuracao, meta_pit, dfd, dfd_item, licitacao, pdr_item, nota_credito, nota_empenho, liquidacao, recebimento_material, rpnp, relatorio_rpcmtec, arquivo. (Não há tabela `pdr`: o PDR é o conjunto dos `pdr_item` do ano; os anexos do PDR ligam-se ao `ano` em `arquivo.pdr_ano`.)
`dominio`: natureza_despesa, plano_interno, ug, tipo_licitacao, classificacao_nc, tipo_item_dfd, grau_prioridade, tipo_posto_grad.
`dgeo`: usuario. `public`: versao (controle de versão do schema).
