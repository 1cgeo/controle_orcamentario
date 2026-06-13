'use strict'

// globalSetup do Jest (camada de integracao): cria do zero o banco de teste no
// PostgreSQL local, aplica o schema real (er/*.sql) e semeia o usuario admin.
// Roda UMA vez antes de todas as suites de integracao. Os parametros de conexao
// vem de server/config_testing.env (mesmo arquivo que o app usa em NODE_ENV=test).

const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')
const pgPromise = require('pg-promise')

const { TEST_ADMIN } = require('./helpers/constants')

module.exports = async function globalSetup () {
  dotenv.config({ path: path.join(__dirname, '..', '..', '..', 'config_testing.env') })

  // Limpa a pasta de anexos de teste (STORAGE_PATH, relativa a server/) para que
  // os uploads do fluxo de arquivos comecem do zero.
  const serverRoot = path.join(__dirname, '..', '..', '..')
  const storagePath = process.env.STORAGE_PATH || './.uploads_test'
  const storageDir = path.isAbsolute(storagePath)
    ? storagePath
    : path.join(serverRoot, storagePath)
  fs.rmSync(storageDir, { recursive: true, force: true })

  const {
    DB_SERVER = 'localhost',
    DB_PORT = '5432',
    DB_USER = 'postgres',
    DB_PASSWORD = 'postgres',
    DB_NAME = 'sco_test'
  } = process.env

  const pgp = pgPromise()
  const erDir = path.join(__dirname, '..', '..', '..', '..', 'er')
  const lerEr = arquivo => fs.readFileSync(path.join(erDir, arquivo), 'utf8')

  // 1) Conecta no banco de manutencao (postgres) para recriar o banco de teste.
  const admin = pgp(`postgres://${DB_USER}:${DB_PASSWORD}@${DB_SERVER}:${DB_PORT}/postgres`)
  try {
    // Derruba conexoes ativas ao banco de teste (se existir) e recria do zero.
    await admin.none(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = $<db> AND pid <> pg_backend_pid()`,
      { db: DB_NAME }
    )
    await admin.none('DROP DATABASE IF EXISTS $1:name', [DB_NAME])
    await admin.none('CREATE DATABASE $1:name', [DB_NAME])
  } finally {
    await admin.$pool.end()
  }

  // 2) Conecta no banco de teste e aplica o schema na ordem de dependencia.
  const db = pgp(`postgres://${DB_USER}:${DB_PASSWORD}@${DB_SERVER}:${DB_PORT}/${DB_NAME}`)
  try {
    await db.none(lerEr('versao.sql'))
    await db.none(lerEr('dominio.sql'))
    await db.none(lerEr('dgeo.sql'))
    await db.none(lerEr('orcamento.sql'))

    // 3) Semeia o usuario admin de teste (FK usuario_cadastramento_uuid depende dele).
    await db.none(
      `INSERT INTO dgeo.usuario (login, nome, nome_guerra, tipo_posto_grad_id, administrador, ativo, uuid)
       VALUES ($<login>, $<nome>, $<nome_guerra>, $<tipo_posto_grad_id>, TRUE, TRUE, $<uuid>)`,
      TEST_ADMIN
    )
  } finally {
    await db.$pool.end()
  }

  // eslint-disable-next-line no-console
  console.log(`\n[integration] banco ${DB_NAME} criado e schema aplicado.`)
}
