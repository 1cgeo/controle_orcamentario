-- Migracao 1.3.0 -> 1.4.0
-- A unicidade da nota de credito passa a considerar a UG emitente: a numeracao
-- da NC no SIAFI e por UG emitente, logo o mesmo numero+ND pode existir para
-- emitentes distintos (ex.: 2026NC400412 emitida por 160035 e por 167035).
-- Idempotente (IF EXISTS / IF NOT EXISTS / ON CONFLICT).

BEGIN;

-- 1) troca a unicidade (ano, numero, cod_nd) -> (ano, numero, cod_nd, ug_emitente)
ALTER TABLE orcamento.nota_credito
  DROP CONSTRAINT IF EXISTS nota_credito_ano_numero_cod_nd_key;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_nota_credito_num_nd_ug
  ON orcamento.nota_credito (ano, numero, cod_nd, COALESCE(ug_emitente, ''));

-- 2) UGs emitentes do DCT que faltavam no dominio (orgao e gestor)
INSERT INTO dominio.ug (code, nome) VALUES
  ('160035', 'Departamento de Ciencia e Tecnologia'),
  ('167035', 'Departamento de Ciencia e Tecnologia - Gestor')
ON CONFLICT (code) DO NOTHING;

-- 3) versao do banco
UPDATE public.versao SET nome = '1.4.0' WHERE code = 1;

COMMIT;
