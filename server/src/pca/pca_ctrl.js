// Path: pca\pca_ctrl.js
'use strict'

const { db } = require('../database')

const { AppError, httpCode } = require('../utils')

const controller = {}

controller.listar = async ano => {
  return db.conn.any(
    `SELECT id, ano, uasg, valor_total_estimado, observacao,
            data_cadastramento, usuario_cadastramento_uuid,
            data_modificacao, usuario_modificacao_uuid
     FROM orcamento.pca
     WHERE ($<ano> IS NULL OR ano = $<ano>)
     ORDER BY ano DESC, uasg`,
    { ano: ano !== undefined ? ano : null }
  )
}

controller.getPorId = async id => {
  const pca = await db.conn.oneOrNone(
    `SELECT id, ano, uasg, valor_total_estimado, observacao,
            data_cadastramento, usuario_cadastramento_uuid,
            data_modificacao, usuario_modificacao_uuid
     FROM orcamento.pca
     WHERE id = $<id>`,
    { id }
  )
  if (!pca) {
    throw new AppError('PCA não encontrado', httpCode.NotFound)
  }
  return pca
}

controller.criar = async (dados, usuarioUuid) => {
  return db.conn.tx(async t => {
    const existente = await t.oneOrNone(
      'SELECT id FROM orcamento.pca WHERE ano = $<ano> AND uasg IS NOT DISTINCT FROM $<uasg>',
      { ano: dados.ano, uasg: dados.uasg }
    )
    if (existente) {
      throw new AppError(
        'Já existe um PCA cadastrado para este ano e UASG',
        httpCode.Conflict
      )
    }

    return t.one(
      `INSERT INTO orcamento.pca (ano, uasg, valor_total_estimado, observacao, usuario_cadastramento_uuid)
       VALUES ($<ano>, $<uasg>, $<valor_total_estimado>, $<observacao>, $<usuarioUuid>)
       RETURNING id`,
      {
        ano: dados.ano,
        uasg: dados.uasg,
        valor_total_estimado: dados.valor_total_estimado,
        observacao: dados.observacao,
        usuarioUuid
      }
    )
  })
}

controller.atualizar = async (id, dados, usuarioUuid) => {
  return db.conn.tx(async t => {
    const existente = await t.oneOrNone(
      'SELECT id FROM orcamento.pca WHERE id = $<id>',
      { id }
    )
    if (!existente) {
      throw new AppError('PCA não encontrado', httpCode.NotFound)
    }

    const conflito = await t.oneOrNone(
      `SELECT id FROM orcamento.pca
       WHERE ano = $<ano> AND uasg IS NOT DISTINCT FROM $<uasg> AND id <> $<id>`,
      { ano: dados.ano, uasg: dados.uasg, id }
    )
    if (conflito) {
      throw new AppError(
        'Já existe um PCA cadastrado para este ano e UASG',
        httpCode.Conflict
      )
    }

    return t.one(
      `UPDATE orcamento.pca
       SET ano = $<ano>, uasg = $<uasg>, valor_total_estimado = $<valor_total_estimado>,
           observacao = $<observacao>,
           data_modificacao = $<dataModificacao>, usuario_modificacao_uuid = $<usuarioUuid>
       WHERE id = $<id>
       RETURNING id`,
      {
        id,
        ano: dados.ano,
        uasg: dados.uasg,
        valor_total_estimado: dados.valor_total_estimado,
        observacao: dados.observacao,
        dataModificacao: new Date(),
        usuarioUuid
      }
    )
  })
}

controller.deletar = async id => {
  const existente = await db.conn.oneOrNone(
    'SELECT id FROM orcamento.pca WHERE id = $<id>',
    { id }
  )
  if (!existente) {
    throw new AppError('PCA não encontrado', httpCode.NotFound)
  }

  // Bloqueia exclusao se houver DFDs vinculados a este PCA (FK).
  const dependentes = await db.conn.one(
    'SELECT COUNT(*)::int AS n FROM orcamento.dfd WHERE pca_id = $<id>',
    { id }
  )
  if (dependentes.n > 0) {
    throw new AppError(
      'PCA possui DFDs vinculados e não pode ser excluído',
      httpCode.Conflict
    )
  }

  return db.conn.none('DELETE FROM orcamento.pca WHERE id = $<id>', { id })
}

module.exports = controller
