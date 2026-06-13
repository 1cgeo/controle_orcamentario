# Controle Orçamentário (SCO) - Modelo de Dados

Versão 0.1 (2026-06-13). Define as entidades, os relacionamentos e um esboço do schema SQL. Acompanha `REQUISITOS.md`. O schema final vive em `er/orcamento.sql` (SQL puro, aplicado por `create_config.js`, no padrão do `controle_acervo`).

Convenções (herdadas do SCA):
- Schemas: `dgeo` (usuário), `dominio` (tabelas de domínio `code SMALLINT PK + nome`), `orcamento` (núcleo).
- Toda tabela de negócio tem auditoria: `data_cadastramento TIMESTAMPTZ NOT NULL DEFAULT now()`, `usuario_cadastramento_uuid UUID NOT NULL REFERENCES dgeo.usuario(uuid)`, `data_modificacao TIMESTAMPTZ`, `usuario_modificacao_uuid UUID REFERENCES dgeo.usuario(uuid)`. Abreviado abaixo como `<auditoria>`.
- **Sem PostGIS, sem geometria.** Valores monetários em `NUMERIC(15,2)`.
- Identificadores (tabela/coluna) são ASCII, sem acento.

---

## 1. Visão de alto nível (o fluxo)

```
                 dominio.natureza_despesa   dominio.plano_interno   dominio.fase_licitacao ...
                          |                        |
  exercicio (ano) --- meta_pit                     |
     |   |                 \                        |
     |   |                  \                       |
     |  pca --- dfd --- dfd_item                    |
     |              \                               |
     |               \---------> licitacao <-------/        (3.4 GCALC / 3.5 propria)
     |                               ^
    pdr --- pdr_item                 |
                \                    |
                 \--- nota_credito --+--- nota_empenho --- liquidacao
                       (NC, 3.2/3.7)        (NE)              (valor liquidado)
                                              |
                                              +--- recebimento_material   (3.6)
                                              +--- (saldo a liquidar) ---> rpnp  (3.3)

  relatorio_rpcmtec (edicao mensal)  ->  views agregadas 3.1 .. 3.7
```

Regra de ouro: as tabelas 3.1 a 3.7 do RPCMTec **não são armazenadas**; são **views/consultas agregadas** sobre o modelo abaixo, recortadas por (ano, mês cumulativo).

---

## 2. Dimensões compartilhadas

### exercicio
O ano orçamentário. Um ativo por vez.
| coluna | tipo | nota |
|---|---|---|
| ano | SMALLINT PK | ex.: 2026 |
| uasg | VARCHAR(10) | 160382 (DGEO) |
| codom | VARCHAR(10) | 048215 |
| ativo | BOOLEAN NOT NULL DEFAULT false | só um ano ativo |
| + `<auditoria>` | | |

### meta_pit
Meta da atividade-fim que o crédito financia (rastreabilidade ao PIT).
| coluna | tipo | nota |
|---|---|---|
| id | BIGSERIAL PK | |
| ano | SMALLINT NOT NULL REFERENCES exercicio(ano) | |
| numero_meta | SMALLINT NOT NULL | 1..7 |
| item | VARCHAR(20) | ex.: "1.1" |
| descricao | TEXT | |
| solicitante | VARCHAR(255) | |
| + `<auditoria>` | | |

Cardinalidade: 1 exercicio : N meta_pit.

### dominio.natureza_despesa
| coluna | tipo | nota |
|---|---|---|
| code | VARCHAR(6) PK | ex.: "339015" (sem pontos) |
| nome | VARCHAR(255) | ex.: "Diárias" |
| gnd | SMALLINT | 3 custeio, 4 capital |
| grupo | VARCHAR(20) | "custeio" / "capital" (derivável do gnd) |

Seed (8 ND fixas da tabela 3.1 + as demais usadas): 339015 Diárias, 339030 Material de consumo, 339033 Passagens, 339039 Serviços de terceiros, 339040 Software/TIC, 339047 Anuidade CREA/ART, 339139 Publicações oficiais, 449040 Software (capital), 449052 Material permanente.

### dominio.plano_interno
| coluna | tipo | nota |
|---|---|---|
| code | VARCHAR(20) PK | ex.: "K4CAIFGDIAR" |
| nome | VARCHAR(255) | ex.: "Diárias" |
| alinea | CHAR(1) | a..i |

### dominio.* auxiliares
- `dominio.ug` (code VARCHAR, nome) - unidades gestoras emitentes de NC (default DSG; SISFRON/EME, etc.).
- `dominio.tipo_licitacao` (code SMALLINT: 1=GCALC_DSG, 2=PROPRIA).
- `dominio.classificacao_nc` (code SMALLINT: 1=PDR, 2=EXTRA_PDR).
- `dominio.tipo_item_dfd` (code SMALLINT: 1=material, 2=servico).

> Célula orçamentária (PTRES, fonte, PI, ação 20XE, plano orçamentário 000F): nesta versão fica **inline** nas tabelas que precisam (NC), para simplicidade. Se a repetição incomodar, normalizar numa tabela `orcamento.celula_orcamentaria` depois.

---

## 3. Planejamento (DFD / PCA)

### pca
| coluna | tipo | nota |
|---|---|---|
| id | BIGSERIAL PK | |
| ano | SMALLINT NOT NULL REFERENCES exercicio(ano) | |
| uasg | VARCHAR(10) | 160382 |
| valor_total_estimado | NUMERIC(15,2) | |
| observacao | TEXT | janelas de revisão, etc. |
| + `<auditoria>` | | |

Cardinalidade: 1 ano : 1 pca (por UASG). 1 pca : N dfd.

### dfd
| coluna | tipo | nota |
|---|---|---|
| id | BIGSERIAL PK | |
| pca_id | BIGINT REFERENCES pca(id) | nullable se demanda superveniente |
| numero | VARCHAR(20) NOT NULL | ex.: "000007" |
| ano | SMALLINT NOT NULL | |
| rotulo | VARCHAR(120) | ex.: "Insumos_Impr" |
| objeto | TEXT | |
| justificativa | TEXT | obrigatória se prioridade Alta |
| area_requisitante | VARCHAR(255) | |
| grau_prioridade | VARCHAR(20) | Alta/Normal/Baixa, nullable |
| data_prevista_conclusao | DATE | |
| responsavel_cpf | VARCHAR(14) | |
| vinculo_plano_gestao | VARCHAR(60) | ex.: "OE1CGEO1" |
| consta_pca | BOOLEAN NOT NULL DEFAULT true | false = superveniente |
| valor_estimado | NUMERIC(15,2) | soma dos itens |
| + `<auditoria>` | | |

> O DFD **não** carrega ND numerada (regra do domínio). Material vs serviço sai do `dfd_item.tipo`.

### dfd_item
| coluna | tipo | nota |
|---|---|---|
| id | BIGSERIAL PK | |
| dfd_id | BIGINT NOT NULL REFERENCES dfd(id) | |
| tipo_item_id | SMALLINT NOT NULL REFERENCES dominio.tipo_item_dfd(code) | material/servico |
| cod_catmat_catser | VARCHAR(30) | ou classe/PDM |
| descricao | TEXT NOT NULL | |
| quantidade | NUMERIC(15,3) | |
| valor_unitario | NUMERIC(15,2) | |
| valor_total | NUMERIC(15,2) | |
| + `<auditoria>` | | |

Cardinalidade: 1 dfd : N dfd_item.

---

## 4. Crédito autorizado (PDR)

### pdr
| coluna | tipo | nota |
|---|---|---|
| id | BIGSERIAL PK | |
| ano | SMALLINT NOT NULL REFERENCES exercicio(ano) | |
| valor_solicitado | NUMERIC(15,2) | |
| valor_autorizado | NUMERIC(15,2) | |
| gnd3_autorizado | NUMERIC(15,2) | custeio |
| gnd4_autorizado | NUMERIC(15,2) | capital |
| acao_orcamentaria | VARCHAR(10) | "20XE" |
| plano_orcamentario | VARCHAR(10) | "000F" |
| data_assinatura | DATE | |
| revisao | VARCHAR(10) | ex.: "E1" |
| + `<auditoria>` | | |

Cardinalidade: 1 ano : 1 pdr. 1 pdr : N pdr_item.

### pdr_item
Linha do quadro consolidado do PDR; é o lado "previsto" da 3.1.
| coluna | tipo | nota |
|---|---|---|
| id | BIGSERIAL PK | |
| pdr_id | BIGINT NOT NULL REFERENCES pdr(id) | |
| cod_nd | VARCHAR(6) NOT NULL REFERENCES dominio.natureza_despesa(code) | |
| meta_pit_id | BIGINT REFERENCES meta_pit(id) | nullable (infraestrutura) |
| item_label | VARCHAR(10) | rótulo: 1D, 1E, 1F, 1G, 1I... |
| descricao | TEXT | |
| gnd | SMALLINT | 3/4 |
| valor_solicitado | NUMERIC(15,2) | |
| valor_autorizado | NUMERIC(15,2) | base do "previsto" da 3.1 |
| observacao | TEXT | ex.: "GCALC 4CGEO", "já empenhado" |
| + `<auditoria>` | | |

---

## 5. Crédito recebido (NC) e execução (NE, liquidação)

### nota_credito (NC)
| coluna | tipo | nota |
|---|---|---|
| id | BIGSERIAL PK | |
| numero | VARCHAR(20) NOT NULL | ex.: "2026NC400134" |
| ano | SMALLINT NOT NULL REFERENCES exercicio(ano) | do prefixo |
| data_emissao | DATE | |
| cod_nd | VARCHAR(6) NOT NULL REFERENCES dominio.natureza_despesa(code) | |
| ptres | VARCHAR(10) | ex.: "232039" |
| fonte | VARCHAR(15) | ex.: "1000000000" |
| cod_pi | VARCHAR(20) REFERENCES dominio.plano_interno(code) | |
| ug_emitente | VARCHAR(10) REFERENCES dominio.ug(code) | default DSG |
| finalidade_historico | TEXT | verbatim; cita a meta do PIT |
| meta_pit_id | BIGINT REFERENCES meta_pit(id) | meta citada |
| valor_nc | NUMERIC(15,2) NOT NULL | = valor recebido; NUNCA muda por devolução |
| doc_ro | VARCHAR(20) | ex.: "2026RO000696", nullable |
| prazo_empenho | DATE | "Emp até <data>" |
| classificacao_id | SMALLINT NOT NULL REFERENCES dominio.classificacao_nc(code) | PDR (3.2) / EXTRA_PDR (3.7) |
| pdr_item_id | BIGINT REFERENCES pdr_item(id) | preenchido só quando classificacao=PDR |
| nc_complementada_id | BIGINT REFERENCES nota_credito(id) | self-FK (complementação) |
| marcador | VARCHAR(8) | rodapé: `*`, `**`, `***`, `****` (anulação/remanejamento) |
| observacao | TEXT | nota do marcador, edge cases |
| + `<auditoria>` | | |

Regras (ver REQUISITOS RF-NC):
- `classificacao` é regra de negócio (previsto no PDR autorizado?), **não** a célula. Quando PDR, `pdr_item_id` casa o rótulo 1D/1E...
- `valor_nc` é o recebido; devolução afeta `nota_empenho.valor_anulado`, não a NC.
- Edge case "uma NC com duas ND": modelar como duas linhas de NC com o mesmo `numero` e ND distinta (a PK `id` difere), documentado em `observacao`.

Cardinalidade: 1 pdr : N nota_credito (as do PDR); 1 nota_credito : 1 ND, 1 meta; 1 nota_credito : 0..N nota_empenho.

### nota_empenho (NE)
| coluna | tipo | nota |
|---|---|---|
| id | BIGSERIAL PK | |
| numero | VARCHAR(20) NOT NULL | ex.: "2025NE000110" |
| ano | SMALLINT NOT NULL | do prefixo; pode ser < ano do exercício (RPNP) |
| nota_credito_id | BIGINT REFERENCES nota_credito(id) | nullable (RPNP traz NE de anos anteriores) |
| cod_nd | VARCHAR(6) REFERENCES dominio.natureza_despesa(code) | |
| cod_pi | VARCHAR(20) REFERENCES dominio.plano_interno(code) | aparece entre parênteses na 3.3 |
| licitacao_id | BIGINT REFERENCES licitacao(id) | nullable |
| finalidade | TEXT | |
| valor_empenhado | NUMERIC(15,2) NOT NULL | |
| valor_anulado | NUMERIC(15,2) NOT NULL DEFAULT 0 | devolução/anulação |
| + `<auditoria>` | | |

Cardinalidade: 1 nota_credito : 0..N nota_empenho; 1 nota_empenho : N liquidacao.

### liquidacao
| coluna | tipo | nota |
|---|---|---|
| id | BIGSERIAL PK | |
| nota_empenho_id | BIGINT NOT NULL REFERENCES nota_empenho(id) | |
| valor_liquidado | NUMERIC(15,2) NOT NULL | |
| data | DATE | nullable (gap do vault: pode não haver) |
| documento_ns | VARCHAR(20) | nullable (gap: documento NS nem sempre disponível) |
| + `<auditoria>` | | |

Restrição: Σ valor_liquidado por NE <= valor_empenhado - valor_anulado (validar na aplicação; ver RNF-4).
Gap (Q1 dos requisitos): se a granularidade de evento não existir, usar uma única linha por NE com o acumulado.

---

## 6. Licitações, material e RPNP

### licitacao  (3.4 GCALC + 3.5 própria)
| coluna | tipo | nota |
|---|---|---|
| id | BIGSERIAL PK | |
| ano | SMALLINT NOT NULL REFERENCES exercicio(ano) | |
| dfd_id | BIGINT REFERENCES dfd(id) | nullable (própria vem de DFD) |
| tipo_id | SMALLINT NOT NULL REFERENCES dominio.tipo_licitacao(code) | GCALC_DSG / PROPRIA |
| objeto | TEXT NOT NULL | |
| fase_atual | TEXT | "Documentação na SALC", "Homologado", impedimento |
| valor_total_estimado | NUMERIC(15,2) | |
| valor_final_homologado | NUMERIC(15,2) | |
| om_gestora | VARCHAR(60) | para GCALC, ex.: "4CGEO" |
| + `<auditoria>` | | |

### recebimento_material (3.6)
| coluna | tipo | nota |
|---|---|---|
| id | BIGSERIAL PK | |
| nota_empenho_id | BIGINT NOT NULL REFERENCES nota_empenho(id) | |
| material | TEXT NOT NULL | |
| prazo_entrega | VARCHAR(60) | texto livre ("Previsão 24JAN26") |
| situacao | TEXT | "Material recebido", "empenho anulado"... |
| + `<auditoria>` | | |

### rpnp (3.3)
Pode ser uma **view** sobre `nota_empenho` + `liquidacao` (NE de anos anteriores com saldo a liquidar) ou uma **tabela de carregamento anual** (quando o resto é trazido manualmente na virada do ano). Default: tabela, porque o RPNP é declarado no fechamento.
| coluna | tipo | nota |
|---|---|---|
| id | BIGSERIAL PK | |
| ano_exercicio | SMALLINT NOT NULL REFERENCES exercicio(ano) | ano para o qual o resto foi carregado |
| nota_empenho_id | BIGINT REFERENCES nota_empenho(id) | nullable se a NE antiga não está cadastrada |
| empenho_label | VARCHAR(60) | ex.: "2023NE000261 (PI K1PDMGCDEGE - DCT)" |
| finalidade | TEXT | |
| valor_empenhado | NUMERIC(15,2) | |
| valor_a_liquidar | NUMERIC(15,2) | saldo |
| + `<auditoria>` | | |

---

## 7. O relatório

### relatorio_rpcmtec
Edição mensal (metadados; as tabelas 3.x são geradas por consulta).
| coluna | tipo | nota |
|---|---|---|
| id | BIGSERIAL PK | |
| ano | SMALLINT NOT NULL REFERENCES exercicio(ano) | |
| mes | SMALLINT NOT NULL | 1..12 |
| assinante | VARCHAR(255) | |
| data_assinatura | DATE | |
| + `<auditoria>` | | |

### Tabelas 3.x = views (recorte por ano, mês cumulativo)
- **3.1** = agregação por `cod_nd`: previsto = Σ `pdr_item.valor_autorizado`; recebido = Σ `nota_credito.valor_nc` (classificacao=PDR); empenhado = Σ `nota_empenho.valor_empenhado - valor_anulado`; liquidado = Σ `liquidacao.valor_liquidado`. Sempre as 8 ND fixas (LEFT JOIN para imprimir linha com `-`/0).
- **3.2** = `nota_credito` WHERE classificacao=PDR, join a NE/liquidação (colunas NC, NE, ND, finalidade, valor NC, empenhado, liquidado).
- **3.3** = `rpnp`.
- **3.4** = `licitacao` WHERE tipo=GCALC_DSG. **3.5** = `licitacao` WHERE tipo=PROPRIA.
- **3.6** = `recebimento_material`.
- **3.7** = `nota_credito` WHERE classificacao=EXTRA_PDR (estrutura igual à 3.2).

Regras de geração (RF-REL-7): cumulativo até o mês; tabela vazia imprime cabeçalho + linha de `-`; valores `R$ 0.000,00`; coluna NE presente a partir de 2026 (parametrizar por ano).

---

## 8. Esboço SQL (trecho de `er/orcamento.sql`)

Ilustrativo; o arquivo final segue o estilo do `controle_acervo/er/acervo.sql` (sem PostGIS).

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA orcamento;

CREATE TABLE orcamento.exercicio (
    ano SMALLINT NOT NULL PRIMARY KEY,
    uasg VARCHAR(10),
    codom VARCHAR(10),
    ativo BOOLEAN NOT NULL DEFAULT false,
    data_cadastramento TIMESTAMPTZ NOT NULL DEFAULT now(),
    usuario_cadastramento_uuid UUID NOT NULL REFERENCES dgeo.usuario(uuid),
    data_modificacao TIMESTAMPTZ,
    usuario_modificacao_uuid UUID REFERENCES dgeo.usuario(uuid)
);

CREATE TABLE orcamento.nota_credito (
    id BIGSERIAL NOT NULL PRIMARY KEY,
    numero VARCHAR(20) NOT NULL,
    ano SMALLINT NOT NULL REFERENCES orcamento.exercicio(ano),
    data_emissao DATE,
    cod_nd VARCHAR(6) NOT NULL REFERENCES dominio.natureza_despesa(code),
    ptres VARCHAR(10),
    fonte VARCHAR(15),
    cod_pi VARCHAR(20) REFERENCES dominio.plano_interno(code),
    ug_emitente VARCHAR(10) REFERENCES dominio.ug(code),
    finalidade_historico TEXT,
    meta_pit_id BIGINT REFERENCES orcamento.meta_pit(id),
    valor_nc NUMERIC(15,2) NOT NULL,
    doc_ro VARCHAR(20),
    prazo_empenho DATE,
    classificacao_id SMALLINT NOT NULL REFERENCES dominio.classificacao_nc(code),
    pdr_item_id BIGINT REFERENCES orcamento.pdr_item(id),
    nc_complementada_id BIGINT REFERENCES orcamento.nota_credito(id),
    marcador VARCHAR(8),
    observacao TEXT,
    data_cadastramento TIMESTAMPTZ NOT NULL DEFAULT now(),
    usuario_cadastramento_uuid UUID NOT NULL REFERENCES dgeo.usuario(uuid),
    data_modificacao TIMESTAMPTZ,
    usuario_modificacao_uuid UUID REFERENCES dgeo.usuario(uuid)
);

-- nota_empenho, liquidacao, licitacao, recebimento_material, rpnp,
-- pca, dfd, dfd_item, pdr, pdr_item, meta_pit: mesmo padrao (auditoria + FKs acima).

-- View ilustrativa da 3.1 (execucao por ND), recorte por ano e mes cumulativo:
CREATE VIEW orcamento.vw_rpcmtec_31 AS
SELECT nd.code AS cod_nd, nd.nome,
       COALESCE(prev.valor, 0) AS previsto,
       COALESCE(rec.valor, 0)  AS recebido,
       COALESCE(emp.valor, 0)  AS empenhado,
       COALESCE(liq.valor, 0)  AS liquidado
FROM dominio.natureza_despesa nd
LEFT JOIN (/* Sum pdr_item.valor_autorizado por nd */) prev ON prev.cod_nd = nd.code
LEFT JOIN (/* Sum nota_credito.valor_nc (PDR) por nd */) rec ON rec.cod_nd = nd.code
LEFT JOIN (/* Sum nota_empenho.(valor_empenhado-valor_anulado) por nd */) emp ON emp.cod_nd = nd.code
LEFT JOIN (/* Sum liquidacao.valor_liquidado por nd */) liq ON liq.cod_nd = nd.code;
-- O recorte por (ano, mes) entra como parametro na consulta da feature relatorio,
-- nao na view (a view define as colunas; a feature filtra cumulativo ate o mes).
```

---

## 9. Decisões e gaps de modelagem (não inventar)

- **NE/empenhado/liquidado não vêm da NC**: moram em `nota_empenho`/`liquidacao`. A NC só fornece o recebido (`valor_nc`).
- **Classificação 3.2 vs 3.7** é a regra "está previsto no PDR autorizado?", não a célula orçamentária. Critério prático: `pdr_item_id` preenchido => PDR.
- **Devolução/anulação** corta empenhado/liquidado (`valor_anulado`), nunca o recebido.
- **Granularidade da liquidação** (data, documento NS): gap do vault. Modelado como entidade de eventos, com fallback para acumulado por NE.
- **ND não vem do DFD**: não criar FK dfd -> natureza_despesa.
- **Edge cases a suportar**: NC com duas ND (duas linhas, mesmo número); NC de UG/PTRES/PI diferentes; NC de complementação (self-FK); marcadores de rodapé; valores com erro de digitação na fonte preservados (não corrigir silenciosamente).
- **RPNP**: tabela de carregamento anual (declarado no fechamento), não só view, porque pode trazer NE antiga não cadastrada (`empenho_label` textual como fallback).

---

## Apêndice - lista de tabelas

`orcamento`: exercicio, meta_pit, pca, dfd, dfd_item, pdr, pdr_item, nota_credito, nota_empenho, liquidacao, licitacao, recebimento_material, rpnp, relatorio_rpcmtec.
`dominio`: natureza_despesa, plano_interno, ug, tipo_licitacao, classificacao_nc, tipo_item_dfd.
`dgeo`: usuario (importada do serviço de autenticação, como no SCA).
`public`: versao (controle de versão do schema).
