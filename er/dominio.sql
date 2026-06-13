BEGIN;

CREATE SCHEMA dominio;

-- Posto/graduacao (necessario para dgeo.usuario, importado do servico de autenticacao)
CREATE TABLE dominio.tipo_posto_grad(
  code SMALLINT NOT NULL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  nome_abrev VARCHAR(255) NOT NULL
);

INSERT INTO dominio.tipo_posto_grad (code, nome, nome_abrev) VALUES
(1, 'Civil', 'Civ'),
(2, 'Mao de Obra Temporaria', 'MOT'),
(3, 'Soldado EV', 'Sd EV'),
(4, 'Soldado EP', 'Sd EP'),
(5, 'Cabo', 'Cb'),
(6, 'Terceiro Sargento', '3 Sgt'),
(7, 'Segundo Sargento', '2 Sgt'),
(8, 'Primeiro Sargento', '1 Sgt'),
(9, 'Subtenente', 'ST'),
(10, 'Aspirante', 'Asp'),
(11, 'Segundo Tenente', '2 Ten'),
(12, 'Primeiro Tenente', '1 Ten'),
(13, 'Capitao', 'Cap'),
(14, 'Major', 'Maj'),
(15, 'Tenente Coronel', 'TC'),
(16, 'Coronel', 'Cel'),
(17, 'General de Brigada', 'Gen Bda'),
(18, 'General de Divisao', 'Gen Div'),
(19, 'General de Exercito', 'Gen Ex');

-- Natureza de Despesa (ND). code = ND sem pontos (ex.: 339015). gnd: 3 custeio, 4 capital.
CREATE TABLE dominio.natureza_despesa(
  code VARCHAR(6) NOT NULL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  gnd SMALLINT NOT NULL,
  grupo VARCHAR(20) NOT NULL
);

INSERT INTO dominio.natureza_despesa (code, nome, gnd, grupo) VALUES
('339014', 'Diarias - pessoal civil', 3, 'custeio'),
('339015', 'Diarias - pessoal militar', 3, 'custeio'),
('339030', 'Material de consumo', 3, 'custeio'),
('339033', 'Passagens e despesas com locomocao', 3, 'custeio'),
('339039', 'Servicos de terceiros - pessoa juridica', 3, 'custeio'),
('339040', 'Servicos de TIC - pessoa juridica', 3, 'custeio'),
('339047', 'Obrigacoes tributarias e contributivas', 3, 'custeio'),
('339139', 'Publicacoes oficiais', 3, 'custeio'),
('449040', 'Servicos de TIC (capital)', 4, 'capital'),
('449052', 'Equipamentos e material permanente', 4, 'capital');

-- Plano Interno (PI)
CREATE TABLE dominio.plano_interno(
  code VARCHAR(20) NOT NULL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  alinea CHAR(1)
);

INSERT INTO dominio.plano_interno (code, nome, alinea) VALUES
('K4CAIFGDIAR', 'Diarias', 'a'),
('K4CAIFGPASS', 'Passagens', 'b'),
('K4CAIFGPRCA', 'Servicos, materiais e capital', 'c');

-- Unidade Gestora emitente da NC (default DSG)
CREATE TABLE dominio.ug(
  code VARCHAR(10) NOT NULL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL
);

INSERT INTO dominio.ug (code, nome) VALUES
('160089', 'DSG - Diretoria de Servico Geografico'),
('160382', '1 CGEO - Primeiro Centro de Geoinformacao'),
('160507', 'EME - Estado-Maior do Exercito');

-- Tipo de licitacao (3.4 GCALC DSG / 3.5 propria)
CREATE TABLE dominio.tipo_licitacao(
  code SMALLINT NOT NULL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL
);

INSERT INTO dominio.tipo_licitacao (code, nome) VALUES
(1, 'GCALC DSG'),
(2, 'Propria');

-- Classificacao da NC (3.2 PDR / 3.7 Extra-PDR)
CREATE TABLE dominio.classificacao_nc(
  code SMALLINT NOT NULL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL
);

INSERT INTO dominio.classificacao_nc (code, nome) VALUES
(1, 'PDR'),
(2, 'Extra-PDR');

-- Tipo de item do DFD (material / servico)
CREATE TABLE dominio.tipo_item_dfd(
  code SMALLINT NOT NULL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL
);

INSERT INTO dominio.tipo_item_dfd (code, nome) VALUES
(1, 'Material'),
(2, 'Servico');

-- Grau de prioridade do DFD
CREATE TABLE dominio.grau_prioridade(
  code SMALLINT NOT NULL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL
);

INSERT INTO dominio.grau_prioridade (code, nome) VALUES
(1, 'Alta'),
(2, 'Normal'),
(3, 'Baixa');

COMMIT;
