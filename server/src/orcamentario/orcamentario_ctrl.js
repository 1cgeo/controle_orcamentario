'use strict'

const { db } = require('../database')

const { AppError, httpCode } = require('../utils')

const controller = {}

controller.getCredito = async () => {
  return db.conn.any('SELECT id, numero, descricao, data, nd, pi, valor, credito_base_id, tipo_credito_id descricao FROM orcamentario.credito')
}

controller.insertCredito = async (credito) => {
  const { numero, descricao, data, nd, pi, valor, tipo_credito_id } = credito;

  const credito = await db.conn.oneOrNone('SELECT numero FROM orcamentario.credito WHERE numero = $<numero>', { numero })

  if (credito) {
    throw new AppError('Crédito com esse número já existe', httpCode.BadRequest)
  }

  return db.conn.none('INSERT INTO orcamentario.credito(numero, descricao, data, nd, pi, valor, tipo_credito_id) VALUES($1, $2, $3, $4, $5, $6, $7)', [numero, descricao, data, nd, pi, valor, tipo_credito_id]);
}

controller.insertCreditoComplementar = async (creditoComplementar) => {
  const { numero, descricao, data, nd, pi, valor, credito_base_id, tipo_credito_id } = creditoComplementar;

  const credito = await db.conn.oneOrNone('SELECT numero FROM orcamentario.credito WHERE numero = $<numero>', { numero })

  if (credito) {
    throw new AppError('Crédito com esse número já existe', httpCode.BadRequest)
  }

  const creditoBase = await db.conn.oneOrNone('SELECT id FROM orcamentario.credito WHERE id = $<credito_base_id> AND tipo_credito_id = 1', {credito_base_id});

  if (!creditoBase) {
    throw new AppError('Crédito base inválido', httpCode.BadRequest);
  }

  return db.conn.none('INSERT INTO orcamentario.credito(numero, descricao, data, nd, pi, valor, credito_base_id, tipo_credito_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8)', [numero, descricao, data, nd, pi, valor, credito_base_id, tipo_credito_id]);
}

module.exports = controller
