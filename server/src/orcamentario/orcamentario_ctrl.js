'use strict'

const { db } = require('../database')
const { AppError, httpCode } = require('../utils')
const { PATH_PDF } = require('../config')
var path = require('path');
const fs = require('fs')
const { promisify } = require('util')
const unlinkAsync = promisify(fs.unlink)

const controller = {}

controller.getCreditos = async () => {
  return db.conn.any(`
    SELECT 
        a.id, 
        a.numero, 
        a.descricao, 
        a.data, 
        a.nd, 
        a.pi, 
        a.valor, 
        a.credito_base_id, 
        a.tipo_credito_id,
        b.nome AS "tipo_credito_nome"
    FROM orcamentario.credito AS a
    LEFT JOIN dominio.tipo_credito AS b
    ON a.tipo_credito_id = b.code;
  `)
}

controller.getCredito = async (creditoId) => {
  return db.conn.any(`
    WITH credito AS (
        SELECT * FROM orcamentario.credito WHERE id = $1
    )
    SELECT 
        a.id, 
        a.numero, 
        a.descricao, 
        a.data, 
        a.nd, 
        a.pi, 
        a.valor, 
        a.credito_base_id, 
        a.tipo_credito_id,
        b.nome AS "tipo_credito_nome"
    FROM credito AS a
    LEFT JOIN dominio.tipo_credito AS b
    ON a.tipo_credito_id = b.code;
  `, [creditoId])
}


controller.updateCredito = async ({
  id,
  numero,
  descricao,
  data,
  nd,
  pi,
  valor,
  tipo_credito_id
}) => {
  return db.conn.any(`
  UPDATE
    orcamentario.credito
  SET 
    numero = $2, 
    descricao = $3, 
    data = $4, 
    nd = $5, 
    pi = $6, 
    valor = $7, 
    tipo_credito_id = $8
  WHERE id = $1
  `, [
    id,
    numero,
    descricao,
    data,
    nd,
    pi,
    valor,
    tipo_credito_id
  ])
}

controller.insertCredito = async (credito) => {
  const { numero, descricao, data, nd, pi, valor, tipo_credito_id } = credito;
  const existeCredito = await db.conn.oneOrNone('SELECT numero FROM orcamentario.credito WHERE numero = $<numero>', { numero })

  if (existeCredito) {
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
  const creditoBase = await db.conn.oneOrNone('SELECT id FROM orcamentario.credito WHERE id = $<credito_base_id> AND tipo_credito_id = 1', { credito_base_id });
  if (!creditoBase) {
    throw new AppError('Crédito base inválido', httpCode.BadRequest);
  }

  return db.conn.none('INSERT INTO orcamentario.credito(numero, descricao, data, nd, pi, valor, credito_base_id, tipo_credito_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8)', [numero, descricao, data, nd, pi, valor, credito_base_id, tipo_credito_id]);
}

controller.removerCreditos = async (creditoIds) => {
  let deleted = await db.conn.any('DELETE FROM orcamentario.credito WHERE id IN ($1:csv) RETURNING numero', [creditoIds])
  await Promise.all(
    deleted.map(i => {
      return unlinkAsync(path.join(PATH_PDF, 'credito', `${i.numero}.pdf`))
    })
  )
  return deleted
}

controller.getEmpenhos = async () => {
  return db.conn.any(`
    SELECT 
        id,
        numero,
        data,
        valor,
        cnpj_credor,
        nome_credor,
        descricao,
        quantidade,
        tipo_empenho_id,
        b.nome AS "tipo_empenho_nome"
    FROM orcamentario.empenho AS a
    LEFT JOIN dominio.tipo_empenho AS b
    ON a.tipo_empenho_id = b.code;
  `)
}

controller.insertEmpenhos = async ({
  numero,
  data,
  descricao,
  cnpj_credor,
  nome_credor,
  valor,
  quantidade,
  nc,
  tipo_empenho_id
}) => {
  const existeEmpenho = await db.conn.oneOrNone('SELECT id FROM orcamentario.empenho WHERE numero = $<numero>', { numero });
  if (existeEmpenho) {
    throw new AppError('Já existe empenho com esse número!', httpCode.BadRequest);
  }

  const creditoBase = await db.conn.oneOrNone('SELECT id FROM orcamentario.credito WHERE numero = $<nc> AND tipo_credito_id = 1', { nc });
  if (!creditoBase) {
    throw new AppError('Não existe nota de crédito base!', httpCode.BadRequest);
  }

  return db.conn.none(`
    INSERT INTO 
      orcamentario.empenho (
        numero,
        data,
        valor,
        cnpj_credor,
        nome_credor,
        descricao,
        quantidade,
        tipo_empenho_id,
        credito_base_id
      ) 
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9);
  `, [
    numero,
    data,
    valor,
    cnpj_credor,
    nome_credor,
    descricao,
    quantidade,
    tipo_empenho_id,
    creditoBase.id
  ]);
}

controller.removerEmpenhos = async (empenhoIds) => {
  let deleted = await db.conn.any('DELETE FROM orcamentario.empenho WHERE id IN ($1:csv) RETURNING numero', [empenhoIds])
  await Promise.all(
    deleted.map(i => {
      return unlinkAsync(path.join(PATH_PDF, 'credito', `${i.numero}.pdf`))
    })
  )
  return deleted
}

controller.getEmpenho = async (empenhoId) => {
  return db.conn.any(`
    WITH empenho AS (
        SELECT * FROM orcamentario.empenho WHERE id = $1
    )
    SELECT 
        a.numero,
        a.data,
        a.valor,
        a.cnpj_credor,
        a.nome_credor,
        a.descricao,
        a.quantidade,
        a.tipo_empenho_id,
        b.nome AS "tipo_empenho_nome"
    FROM empenho AS a
    LEFT JOIN dominio.tipo_empenho AS b
    ON a.tipo_empenho_id = b.code;
  `, [empenhoId])
}


module.exports = controller
