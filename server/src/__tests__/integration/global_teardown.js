'use strict'

// globalTeardown do Jest (integracao): dropa o banco de teste ao final.
// Deixa o PostgreSQL local limpo. Se DB_KEEP=1 estiver setado, preserva o banco
// para inspecao manual.

const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')
const pgPromise = require('pg-promise')

module.exports = async function globalTeardown () {
  if (process.env.DB_KEEP === '1') return

  dotenv.config({ path: path.join(__dirname, '..', '..', '..', 'config_testing.env') })

  // Remove a pasta de anexos de teste criada pelos uploads de integracao.
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
  const admin = pgp(`postgres://${DB_USER}:${DB_PASSWORD}@${DB_SERVER}:${DB_PORT}/postgres`)
  try {
    await admin.none(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = $<db> AND pid <> pg_backend_pid()`,
      { db: DB_NAME }
    )
    await admin.none('DROP DATABASE IF EXISTS $1:name', [DB_NAME])
  } finally {
    await admin.$pool.end()
  }
}
