// Path: exercicio\exercicio_ctrl.js
'use strict'

const { db } = require('../database')

const { AppError, httpCode } = require('../utils')

const controller = {}

controller.listar = async () => {
  return db.conn.any(
    `SELECT ano, uasg, codom, ativo, data_cadastramento, usuario_cadastramento_uuid,
            data_modificacao, usuario_modificacao_uuid
     FROM orcamento.exercicio
     ORDER BY ano DESC`
  )
}

controller.getAtivo = async () => {
  return db.conn.oneOrNone(
    `SELECT ano, uasg, codom, ativo, data_cadastramento, usuario_cadastramento_uuid,
            data_modificacao, usuario_modificacao_uuid
     FROM orcamento.exercicio
     WHERE ativo IS TRUE`
  )
}

controller.getPorAno = async ano => {
  return db.conn.oneOrNone(
    `SELECT ano, uasg, codom, ativo, data_cadastramento, usuario_cadastramento_uuid,
            data_modificacao, usuario_modificacao_uuid
     FROM orcamento.exercicio
     WHERE ano = $<ano>`,
    { ano }
  )
}

controller.criar = async (dados, usuarioUuid) => {
  return db.conn.tx(async t => {
    const existente = await t.oneOrNone(
      'SELECT ano FROM orcamento.exercicio WHERE ano = $<ano>',
      { ano: dados.ano }
    )
    if (existente) {
      throw new AppError(
        'Já existe um exercício cadastrado para este ano',
        httpCode.Conflict
      )
    }

    // So um exercicio ativo por vez: zera todos antes de gravar o novo como ativo.
    if (dados.ativo === true) {
      await t.none('UPDATE orcamento.exercicio SET ativo = FALSE WHERE ativo IS TRUE')
    }

    return t.one(
      `INSERT INTO orcamento.exercicio (ano, uasg, codom, ativo, usuario_cadastramento_uuid)
       VALUES ($<ano>, $<uasg>, $<codom>, $<ativo>, $<usuarioUuid>)
       RETURNING ano`,
      {
        ano: dados.ano,
        uasg: dados.uasg,
        codom: dados.codom,
        ativo: dados.ativo,
        usuarioUuid
      }
    )
  })
}

controller.atualizar = async (ano, dados, usuarioUuid) => {
  return db.conn.tx(async t => {
    const existente = await t.oneOrNone(
      'SELECT ano FROM orcamento.exercicio WHERE ano = $<ano>',
      { ano }
    )
    if (!existente) {
      throw new AppError('Exercício não encontrado', httpCode.NotFound)
    }

    // So um exercicio ativo por vez: zera todos antes de marcar este como ativo.
    if (dados.ativo === true) {
      await t.none(
        'UPDATE orcamento.exercicio SET ativo = FALSE WHERE ativo IS TRUE AND ano <> $<ano>',
        { ano }
      )
    }

    return t.one(
      `UPDATE orcamento.exercicio
       SET uasg = $<uasg>, codom = $<codom>, ativo = $<ativo>,
           data_modificacao = $<dataModificacao>, usuario_modificacao_uuid = $<usuarioUuid>
       WHERE ano = $<ano>
       RETURNING ano`,
      {
        ano,
        uasg: dados.uasg,
        codom: dados.codom,
        ativo: dados.ativo,
        dataModificacao: new Date(),
        usuarioUuid
      }
    )
  })
}

controller.deletar = async ano => {
  const existente = await db.conn.oneOrNone(
    'SELECT ano FROM orcamento.exercicio WHERE ano = $<ano>',
    { ano }
  )
  if (!existente) {
    throw new AppError('Exercício não encontrado', httpCode.NotFound)
  }

  // Bloqueia exclusao se houver metas do PIT vinculadas a este exercicio (FK).
  const dependentes = await db.conn.one(
    'SELECT COUNT(*)::int AS n FROM orcamento.meta_pit WHERE ano = $<ano>',
    { ano }
  )
  if (dependentes.n > 0) {
    throw new AppError(
      'Exercício possui metas do PIT vinculadas e não pode ser excluído',
      httpCode.Conflict
    )
  }

  return db.conn.none('DELETE FROM orcamento.exercicio WHERE ano = $<ano>', { ano })
}

module.exports = controller
