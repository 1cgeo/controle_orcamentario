BEGIN;

CREATE SCHEMA orcamentario;

CREATE TABLE orcamentario.credito(
  id SERIAL NOT NULL PRIMARY KEY,
  numero VARCHAR(12) NOT NULL,
  descricao TEXT NOT NULL,
  data DATE NOT NULL,
  nd VARCHAR(6) NOT NULL,
  pi VARCHAR(11) NOT NULL,
  valor REAL NOT NULL,
  credito_base_id INTEGER REFERENCES orcamentario.credito (id),
  tipo_credito_id SMALLINT NOT NULL REFERENCES dominio.tipo_credito (code),
  UNIQUE(numero),
  CONSTRAINT credito_base_constraint CHECK
    (
        tipo_credito_id = 1
        OR credito_base_id IS NOT NULL
    )
);

COMMIT;


