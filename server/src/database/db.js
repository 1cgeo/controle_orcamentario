// Path: database\db.js
'use strict'

const { errorHandler } = require('../utils')

const { DB_USER, DB_PASSWORD, DB_SERVER, DB_PORT, DB_NAME } = require('../config')

const db = {}

db.pgp = require('pg-promise')()

// BIGINT/BIGSERIAL (OID 20) volta como Number em vez de string. Os ids deste
// sistema cabem com folga no inteiro seguro do JS, e assim a API devolve ids
// numericos e as validacoes Joi .strict() dos campos de id (meta_pit_id,
// pdr_item_id, nota_credito_id, ...) aceitam o que o client envia de volta.
db.pgp.pg.types.setTypeParser(20, value => (value === null ? null : parseInt(value, 10)))

db.createConn = async () => {
  const cn = {
    host: DB_SERVER,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD
  }
  const conn = db.pgp(cn)

  await conn
    .connect()
    .then(obj => {
      obj.done() // success, release connection;
    })
    .catch(errorHandler.critical)

  db.conn = conn
}

module.exports = db
