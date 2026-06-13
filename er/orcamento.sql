BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA orcamento;

-- ---------------------------------------------------------------------------
-- Configuracao geral (linha unica). UASG, CODOM e o ano de referencia (default
-- das telas). Substitui o que antes morava no exercicio. A linha id=1 e criada
-- aqui; o backend so faz UPDATE.
-- ---------------------------------------------------------------------------
CREATE TABLE orcamento.configuracao(
  id SMALLINT NOT NULL PRIMARY KEY DEFAULT 1,
  uasg VARCHAR(10),
  codom VARCHAR(10),
  ano_referencia SMALLINT,
  data_modificacao TIMESTAMP WITH TIME ZONE,
  usuario_modificacao_uuid UUID REFERENCES dgeo.usuario (uuid),
  CONSTRAINT configuracao_singleton CHECK (id = 1)
);

INSERT INTO orcamento.configuracao (id, uasg, codom) VALUES (1, '160382', '048215');

-- ---------------------------------------------------------------------------
-- Tudo e amarrado no ANO (SMALLINT simples, sem FK; nao ha mais entidade
-- exercicio). O par de auditoria segue em toda tabela de negocio.
-- ---------------------------------------------------------------------------

-- Meta do PIT que o credito financia (rastreabilidade do gasto a producao).
CREATE TABLE orcamento.meta_pit(
  id BIGSERIAL NOT NULL PRIMARY KEY,
  ano SMALLINT NOT NULL,
  numero_meta SMALLINT NOT NULL,
  item VARCHAR(20),
  descricao TEXT,
  solicitante VARCHAR(255),
  data_cadastramento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_cadastramento_uuid UUID NOT NULL REFERENCES dgeo.usuario (uuid),
  data_modificacao TIMESTAMP WITH TIME ZONE,
  usuario_modificacao_uuid UUID REFERENCES dgeo.usuario (uuid),
  UNIQUE (ano, numero_meta, item)
);

-- DFD: documento de formalizacao da demanda, amarrado no ano. Nao ha mais
-- entidade PCA: o "PCA do ano" e o conjunto de DFDs daquele ano. consta_pca
-- distingue a demanda no PCA da superveniente (ex.: DFD de IA).
CREATE TABLE orcamento.dfd(
  id BIGSERIAL NOT NULL PRIMARY KEY,
  numero VARCHAR(20) NOT NULL,
  ano SMALLINT NOT NULL,
  rotulo VARCHAR(120),
  objeto TEXT,
  justificativa TEXT,
  area_requisitante VARCHAR(255),
  grau_prioridade_id SMALLINT REFERENCES dominio.grau_prioridade (code),
  data_prevista_conclusao DATE,
  responsavel_cpf VARCHAR(14),
  vinculo_plano_gestao VARCHAR(60),
  consta_pca BOOLEAN NOT NULL DEFAULT TRUE,
  valor_estimado NUMERIC(15,2),
  data_cadastramento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_cadastramento_uuid UUID NOT NULL REFERENCES dgeo.usuario (uuid),
  data_modificacao TIMESTAMP WITH TIME ZONE,
  usuario_modificacao_uuid UUID REFERENCES dgeo.usuario (uuid)
);

CREATE TABLE orcamento.dfd_item(
  id BIGSERIAL NOT NULL PRIMARY KEY,
  dfd_id BIGINT NOT NULL REFERENCES orcamento.dfd (id),
  tipo_item_id SMALLINT NOT NULL REFERENCES dominio.tipo_item_dfd (code),
  cod_catmat_catser VARCHAR(30),
  descricao TEXT NOT NULL,
  quantidade NUMERIC(15,3),
  valor_unitario NUMERIC(15,2),
  valor_total NUMERIC(15,2),
  data_cadastramento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_cadastramento_uuid UUID NOT NULL REFERENCES dgeo.usuario (uuid),
  data_modificacao TIMESTAMP WITH TIME ZONE,
  usuario_modificacao_uuid UUID REFERENCES dgeo.usuario (uuid)
);

-- Licitacao (3.4 GCALC DSG / 3.5 propria). Antes de nota_empenho (FK).
CREATE TABLE orcamento.licitacao(
  id BIGSERIAL NOT NULL PRIMARY KEY,
  ano SMALLINT NOT NULL,
  dfd_id BIGINT REFERENCES orcamento.dfd (id),
  tipo_id SMALLINT NOT NULL REFERENCES dominio.tipo_licitacao (code),
  objeto TEXT NOT NULL,
  fase_atual TEXT,
  valor_total_estimado NUMERIC(15,2),
  valor_final_homologado NUMERIC(15,2),
  om_gestora VARCHAR(60),
  data_cadastramento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_cadastramento_uuid UUID NOT NULL REFERENCES dgeo.usuario (uuid),
  data_modificacao TIMESTAMP WITH TIME ZONE,
  usuario_modificacao_uuid UUID REFERENCES dgeo.usuario (uuid)
);

-- Credito autorizado (PDR), amarrado no ano (um PDR por ano).
CREATE TABLE orcamento.pdr(
  id BIGSERIAL NOT NULL PRIMARY KEY,
  ano SMALLINT NOT NULL,
  valor_solicitado NUMERIC(15,2),
  valor_autorizado NUMERIC(15,2),
  gnd3_autorizado NUMERIC(15,2),
  gnd4_autorizado NUMERIC(15,2),
  acao_orcamentaria VARCHAR(10),
  plano_orcamentario VARCHAR(10),
  data_assinatura DATE,
  revisao VARCHAR(10),
  data_cadastramento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_cadastramento_uuid UUID NOT NULL REFERENCES dgeo.usuario (uuid),
  data_modificacao TIMESTAMP WITH TIME ZONE,
  usuario_modificacao_uuid UUID REFERENCES dgeo.usuario (uuid),
  UNIQUE (ano)
);

CREATE TABLE orcamento.pdr_item(
  id BIGSERIAL NOT NULL PRIMARY KEY,
  pdr_id BIGINT NOT NULL REFERENCES orcamento.pdr (id),
  cod_nd VARCHAR(6) NOT NULL REFERENCES dominio.natureza_despesa (code),
  meta_pit_id BIGINT REFERENCES orcamento.meta_pit (id),
  item_label VARCHAR(10),
  descricao TEXT,
  gnd SMALLINT,
  valor_solicitado NUMERIC(15,2),
  valor_autorizado NUMERIC(15,2),
  observacao TEXT,
  data_cadastramento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_cadastramento_uuid UUID NOT NULL REFERENCES dgeo.usuario (uuid),
  data_modificacao TIMESTAMP WITH TIME ZONE,
  usuario_modificacao_uuid UUID REFERENCES dgeo.usuario (uuid)
);

-- Credito recebido (NC) e execucao (NE / liquidacao)
CREATE TABLE orcamento.nota_credito(
  id BIGSERIAL NOT NULL PRIMARY KEY,
  numero VARCHAR(20) NOT NULL,
  ano SMALLINT NOT NULL,
  data_emissao DATE,
  cod_nd VARCHAR(6) NOT NULL REFERENCES dominio.natureza_despesa (code),
  ptres VARCHAR(10),
  fonte VARCHAR(15),
  cod_pi VARCHAR(20) REFERENCES dominio.plano_interno (code),
  ug_emitente VARCHAR(10) REFERENCES dominio.ug (code),
  finalidade_historico TEXT,
  meta_pit_id BIGINT REFERENCES orcamento.meta_pit (id),
  -- valor_nc = valor recebido; NUNCA muda por devolucao (a devolucao corta empenhado/liquidado)
  valor_nc NUMERIC(15,2) NOT NULL,
  doc_ro VARCHAR(20),
  prazo_empenho DATE,
  -- classificacao = regra de negocio (previsto no PDR autorizado?), nao a celula orcamentaria
  classificacao_id SMALLINT NOT NULL REFERENCES dominio.classificacao_nc (code),
  pdr_item_id BIGINT REFERENCES orcamento.pdr_item (id),
  nc_complementada_id BIGINT REFERENCES orcamento.nota_credito (id),
  marcador VARCHAR(8),
  observacao TEXT,
  data_cadastramento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_cadastramento_uuid UUID NOT NULL REFERENCES dgeo.usuario (uuid),
  data_modificacao TIMESTAMP WITH TIME ZONE,
  usuario_modificacao_uuid UUID REFERENCES dgeo.usuario (uuid)
);

CREATE TABLE orcamento.nota_empenho(
  id BIGSERIAL NOT NULL PRIMARY KEY,
  numero VARCHAR(20) NOT NULL,
  ano SMALLINT NOT NULL,
  data_empenho DATE,
  nota_credito_id BIGINT REFERENCES orcamento.nota_credito (id),
  cod_nd VARCHAR(6) REFERENCES dominio.natureza_despesa (code),
  cod_pi VARCHAR(20) REFERENCES dominio.plano_interno (code),
  licitacao_id BIGINT REFERENCES orcamento.licitacao (id),
  finalidade TEXT,
  valor_empenhado NUMERIC(15,2) NOT NULL,
  valor_anulado NUMERIC(15,2) NOT NULL DEFAULT 0,
  data_cadastramento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_cadastramento_uuid UUID NOT NULL REFERENCES dgeo.usuario (uuid),
  data_modificacao TIMESTAMP WITH TIME ZONE,
  usuario_modificacao_uuid UUID REFERENCES dgeo.usuario (uuid)
);

CREATE TABLE orcamento.liquidacao(
  id BIGSERIAL NOT NULL PRIMARY KEY,
  nota_empenho_id BIGINT NOT NULL REFERENCES orcamento.nota_empenho (id),
  valor_liquidado NUMERIC(15,2) NOT NULL,
  data DATE,
  documento_ns VARCHAR(20),
  data_cadastramento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_cadastramento_uuid UUID NOT NULL REFERENCES dgeo.usuario (uuid),
  data_modificacao TIMESTAMP WITH TIME ZONE,
  usuario_modificacao_uuid UUID REFERENCES dgeo.usuario (uuid)
);

CREATE TABLE orcamento.recebimento_material(
  id BIGSERIAL NOT NULL PRIMARY KEY,
  nota_empenho_id BIGINT NOT NULL REFERENCES orcamento.nota_empenho (id),
  material TEXT NOT NULL,
  prazo_entrega VARCHAR(60),
  situacao TEXT,
  data_cadastramento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_cadastramento_uuid UUID NOT NULL REFERENCES dgeo.usuario (uuid),
  data_modificacao TIMESTAMP WITH TIME ZONE,
  usuario_modificacao_uuid UUID REFERENCES dgeo.usuario (uuid)
);

-- RPNP (3.3): restos a pagar nao processados carregados para o ano.
CREATE TABLE orcamento.rpnp(
  id BIGSERIAL NOT NULL PRIMARY KEY,
  ano SMALLINT NOT NULL,
  nota_empenho_id BIGINT REFERENCES orcamento.nota_empenho (id),
  empenho_label VARCHAR(60),
  finalidade TEXT,
  valor_empenhado NUMERIC(15,2),
  valor_a_liquidar NUMERIC(15,2),
  data_cadastramento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_cadastramento_uuid UUID NOT NULL REFERENCES dgeo.usuario (uuid),
  data_modificacao TIMESTAMP WITH TIME ZONE,
  usuario_modificacao_uuid UUID REFERENCES dgeo.usuario (uuid)
);

-- Edicao mensal do RPCMTec (metadados; as tabelas 3.1-3.7 sao consultas geradas
-- pela feature relatorio, recortadas por ano e mes cumulativo)
CREATE TABLE orcamento.relatorio_rpcmtec(
  id BIGSERIAL NOT NULL PRIMARY KEY,
  ano SMALLINT NOT NULL,
  mes SMALLINT NOT NULL,
  assinante VARCHAR(255),
  data_assinatura DATE,
  data_cadastramento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_cadastramento_uuid UUID NOT NULL REFERENCES dgeo.usuario (uuid),
  data_modificacao TIMESTAMP WITH TIME ZONE,
  usuario_modificacao_uuid UUID REFERENCES dgeo.usuario (uuid),
  UNIQUE (ano, mes)
);

-- Indices uteis para as agregacoes do relatorio
CREATE INDEX idx_nota_credito_ano ON orcamento.nota_credito (ano);
CREATE INDEX idx_nota_credito_nd ON orcamento.nota_credito (cod_nd);
CREATE INDEX idx_nota_credito_classificacao ON orcamento.nota_credito (classificacao_id);
CREATE INDEX idx_nota_empenho_nc ON orcamento.nota_empenho (nota_credito_id);
CREATE INDEX idx_nota_empenho_nd ON orcamento.nota_empenho (cod_nd);
CREATE INDEX idx_liquidacao_ne ON orcamento.liquidacao (nota_empenho_id);
CREATE INDEX idx_pdr_item_nd ON orcamento.pdr_item (cod_nd);
CREATE INDEX idx_meta_pit_ano ON orcamento.meta_pit (ano);
CREATE INDEX idx_dfd_ano ON orcamento.dfd (ano);

COMMIT;
