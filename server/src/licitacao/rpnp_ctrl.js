// Path: licitacao\rpnp_ctrl.js
'use strict'

const { db } = require('../database')

const { AppError, httpCode } = require('../utils')

const controller = {}

// Codigo SQLSTATE do PostgreSQL para violacao de chave estrangeira.
// Usado para traduzir o erro cru do banco numa mensagem amigavel (400),
// por exemplo quando ano_exercicio nao existe em orcamento.exercicio ou quando
// nota_empenho_id aponta para uma nota de empenho inexistente.
const FK_VIOLATION = '23503'

// Mapa de coluna citada no detalhe do erro -> mensagem amigavel. A constraint
// exata depende do nome gerado pelo banco; por isso casamos pela coluna citada
// em err.detail, que e estavel ("Key (coluna)=...").
const mensagemFk = err => {
  const detalhe = (err && err.detail) || ''
  if (detalhe.includes('(ano_exercicio)')) {
    return 'O ano de exercicio informado nao possui exercicio cadastrado'
  }
  if (detalhe.includes('(nota_empenho_id)')) {
    return 'A nota de empenho informada nao existe'
  }
  return 'Referencia invalida em um dos campos do RPNP'
}

// Reembrulha violacao de FK como AppError 400 (amigavel); demais erros sobem.
const tratarFk = err => {
  if (err && err.code === FK_VIOLATION) {
    throw new AppError(mensagemFk(err), httpCode.BadRequest, err)
  }
  throw err
}

controller.listar = async (filtros = {}) => {
  // Lista os RPNP (restos a pagar nao processados). Quando a nota de empenho
  // esta cadastrada, traz o rotulo dela; senao usa o empenho_label livre.
  // Filtro opcional por ano de exercicio. Ordenado por ano e id.
  return db.conn.any(
    `SELECT rp.id, rp.ano_exercicio, rp.nota_empenho_id,
            ne.numero AS nota_empenho_numero,
            rp.empenho_label, rp.finalidade,
            rp.valor_empenhado, rp.valor_a_liquidar
     FROM orcamento.rpnp AS rp
     LEFT JOIN orcamento.nota_empenho AS ne ON ne.id = rp.nota_empenho_id
     WHERE ($<anoExercicio> IS NULL OR rp.ano_exercicio = $<anoExercicio>)
     ORDER BY rp.ano_exercicio DESC, rp.id`,
    {
      anoExercicio:
        filtros.ano_exercicio != null ? filtros.ano_exercicio : null
    }
  )
}

controller.getPorId = async id => {
  // Um RPNP com o numero da nota de empenho resolvido quando houver.
  const rpnp = await db.conn.oneOrNone(
    `SELECT rp.id, rp.ano_exercicio, rp.nota_empenho_id,
            ne.numero AS nota_empenho_numero,
            rp.empenho_label, rp.finalidade,
            rp.valor_empenhado, rp.valor_a_liquidar,
            rp.data_cadastramento, rp.usuario_cadastramento_uuid,
            rp.data_modificacao, rp.usuario_modificacao_uuid
     FROM orcamento.rpnp AS rp
     LEFT JOIN orcamento.nota_empenho AS ne ON ne.id = rp.nota_empenho_id
     WHERE rp.id = $<id>`,
    { id }
  )

  if (!rpnp) {
    throw new AppError('RPNP nao encontrado', httpCode.NotFound)
  }

  return rpnp
}

controller.criar = async (dados, usuarioUuid) => {
  return db.conn
    .one(
      `INSERT INTO orcamento.rpnp
        (ano_exercicio, nota_empenho_id, empenho_label, finalidade,
         valor_empenhado, valor_a_liquidar, usuario_cadastramento_uuid)
       VALUES
        ($<anoExercicio>, $<notaEmpenhoId>, $<empenhoLabel>, $<finalidade>,
         $<valorEmpenhado>, $<valorALiquidar>, $<usuarioUuid>)
       RETURNING id`,
      {
        anoExercicio: dados.ano_exercicio,
        notaEmpenhoId:
          dados.nota_empenho_id != null ? dados.nota_empenho_id : null,
        empenhoLabel: dados.empenho_label || null,
        finalidade: dados.finalidade || null,
        valorEmpenhado:
          dados.valor_empenhado != null ? dados.valor_empenhado : null,
        valorALiquidar:
          dados.valor_a_liquidar != null ? dados.valor_a_liquidar : null,
        usuarioUuid
      }
    )
    .catch(tratarFk)
}

controller.atualizar = async (id, dados, usuarioUuid) => {
  const existente = await db.conn.oneOrNone(
    'SELECT id FROM orcamento.rpnp WHERE id = $<id>',
    { id }
  )
  if (!existente) {
    throw new AppError('RPNP nao encontrado', httpCode.NotFound)
  }

  return db.conn
    .one(
      `UPDATE orcamento.rpnp SET
         ano_exercicio = $<anoExercicio>, nota_empenho_id = $<notaEmpenhoId>,
         empenho_label = $<empenhoLabel>, finalidade = $<finalidade>,
         valor_empenhado = $<valorEmpenhado>, valor_a_liquidar = $<valorALiquidar>,
         data_modificacao = $<dataModificacao>,
         usuario_modificacao_uuid = $<usuarioUuid>
       WHERE id = $<id>
       RETURNING id`,
      {
        id,
        anoExercicio: dados.ano_exercicio,
        notaEmpenhoId:
          dados.nota_empenho_id != null ? dados.nota_empenho_id : null,
        empenhoLabel: dados.empenho_label || null,
        finalidade: dados.finalidade || null,
        valorEmpenhado:
          dados.valor_empenhado != null ? dados.valor_empenhado : null,
        valorALiquidar:
          dados.valor_a_liquidar != null ? dados.valor_a_liquidar : null,
        dataModificacao: new Date(),
        usuarioUuid
      }
    )
    .catch(tratarFk)
}

controller.deletar = async id => {
  const existente = await db.conn.oneOrNone(
    'SELECT id FROM orcamento.rpnp WHERE id = $<id>',
    { id }
  )
  if (!existente) {
    throw new AppError('RPNP nao encontrado', httpCode.NotFound)
  }

  return db.conn.none('DELETE FROM orcamento.rpnp WHERE id = $<id>', { id })
}

module.exports = controller
