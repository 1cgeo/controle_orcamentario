-- Migracao 1.4.0 -> 1.5.0
-- Perfil de acesso por modulo. Ate aqui o SCO so distinguia "administrador" de
-- "todo o resto", e como TODA rota de dados exige administrador, quem nao e
-- admin nao consegue nada alem de logar. A partir daqui existe nivel dentro do
-- modulo (consulta, operador, gerente), e o administrador passa a ser a flag
-- GLOBAL da plataforma, acima de qualquer modulo.
--
-- Aditiva e idempotente (IF NOT EXISTS / ON CONFLICT). Nao altera o acesso de
-- ninguem: administrador continua administrador, e quem nao e admin continua
-- sem acesso (nao ganha perfil automatico). A concessao de perfil e ato
-- explicito, feita depois pela tela de usuarios.

BEGIN;

-- 1) Nivel dentro do modulo. O administrador NAO e um nivel daqui.
CREATE TABLE IF NOT EXISTS dominio.tipo_perfil(
  code SMALLINT NOT NULL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL
);

INSERT INTO dominio.tipo_perfil (code, nome) VALUES
  (1, 'Consulta'),
  (2, 'Operador'),
  (3, 'Gerente')
ON CONFLICT (code) DO NOTHING;

-- 2) Modulo funcional. Tabela, e nao CHECK, para que absorver acervo, mapoteca
-- e producao seja INSERT em vez de migracao de constraint.
CREATE TABLE IF NOT EXISTS dominio.modulo(
  code SMALLINT NOT NULL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  nome_abrev VARCHAR(255) UNIQUE NOT NULL
);

INSERT INTO dominio.modulo (code, nome, nome_abrev) VALUES
  (1, 'Controle Orçamentário', 'orcamento')
ON CONFLICT (code) DO NOTHING;

-- 3) Perfil da pessoa por modulo.
CREATE TABLE IF NOT EXISTS dgeo.usuario_perfil(
  id SERIAL NOT NULL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES dgeo.usuario (id),
  modulo_id SMALLINT NOT NULL REFERENCES dominio.modulo (code),
  perfil_id SMALLINT NOT NULL REFERENCES dominio.tipo_perfil (code),
  UNIQUE (usuario_id, modulo_id)
);

-- 4) Backfill: NENHUM, de proposito.
-- Administrador nao precisa de linha (a flag global ja autoriza tudo), e dar
-- 'consulta' automatico a quem hoje nao le nada seria AMPLIAR acesso numa
-- migracao. Para conceder depois de conferida a lista nominal:
--
--   INSERT INTO dgeo.usuario_perfil (usuario_id, modulo_id, perfil_id)
--   SELECT id, 1, 1 FROM dgeo.usuario WHERE login IN ('...')
--   ON CONFLICT (usuario_id, modulo_id) DO UPDATE SET perfil_id = EXCLUDED.perfil_id;

-- 5) versao do banco
UPDATE public.versao SET nome = '1.5.0' WHERE code = 1;

COMMIT;
