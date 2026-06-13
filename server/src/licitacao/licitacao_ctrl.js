// Path: licitacao\licitacao_ctrl.js
'use strict'

const { db } = require('../database')

const { AppError, httpCode } = require('../utils')

const controller = {}

// Codigo SQLSTATE do PostgreSQL para violacao de chave estrangeira.
// Usado para traduzir o erro cru do banco numa mensagem amigavel (400),
// por exemplo quando o ano nao existe em orcamento.exercicio, quando tipo_id
// nao existe em dominio.tipo_licitacao, ou quando dfd_id aponta para um DFD
// inexistente.
const FK_VIOLATION = '23503'

// Mapa de coluna citada no detalhe do erro -> mensagem amigavel. A constraint
// exata depende do nome gerado pelo banco; por isso casamos pela coluna citada
// em err.detail, que e estavel ("Key (coluna)=...").
const mensagemFk = err => {
  const detalhe = (err && err.detail) || ''
  if (detalhe.includes('(ano)')) {
    return 'O ano informado nao possui exercicio cadastrado'
  }
  if (detalhe.includes('(tipo_id)')) {
    return 'O tipo de licitacao informado nao existe'
  }
  if (detalhe.includes('(dfd_id)')) {
    return 'O DFD informado nao existe'
  }
  return 'Referencia invalida em um dos campos da licitacao'
}

// Reembrulha violacao de FK como AppError 400 (amigavel); demais erros sobem.
const tratarFk = err => {
  if (err && err.code === FK_VIOLATION) {
    throw new AppError(mensagemFk(err), httpCode.BadRequest, err)
  }
  throw err
}

controller.listar = async (filtros = {}) => {
  // Lista as licitacoes com o nome do tipo (JOIN dominio.tipo_licitacao) e,
  // quando houver, o numero do DFD (LEFT JOIN orcamento.dfd).
  // Filtros opcionais por ano e tipo_id. Ordenado por ano e id.
  return db.conn.any(
    `SELECT li.id, li.ano, li.dfd_id,
            dfd.numero AS dfd_numero,
            li.tipo_id,
            tl.nome AS tipo_nome,
            li.objeto, li.fase_atual,
            li.valor_total_estimado, li.valor_final_homologado,
            li.om_gestora
     FROM orcamento.licitacao AS li
     INNER JOIN dominio.tipo_licitacao AS tl ON tl.code = li.tipo_id
     LEFT JOIN orcamento.dfd AS dfd ON dfd.id = li.dfd_id
     WHERE ($<ano> IS NULL OR li.ano = $<ano>)
       AND ($<tipoId> IS NULL OR li.tipo_id = $<tipoId>)
     ORDER BY li.ano DESC, li.id`,
    {
      ano: filtros.ano != null ? filtros.ano : null,
      tipoId: filtros.tipo_id != null ? filtros.tipo_id : null
    }
  )
}

controller.getPorId = async id => {
  // Uma licitacao com o nome do tipo e o numero do DFD resolvidos.
  const licitacao = await db.conn.oneOrNone(
    `SELECT li.id, li.ano, li.dfd_id,
            dfd.numero AS dfd_numero,
            li.tipo_id,
            tl.nome AS tipo_nome,
            li.objeto, li.fase_atual,
            li.valor_total_estimado, li.valor_final_homologado,
            li.om_gestora,
            li.data_cadastramento, li.usuario_cadastramento_uuid,
            li.data_modificacao, li.usuario_modificacao_uuid
     FROM orcamento.licitacao AS li
     INNER JOIN dominio.tipo_licitacao AS tl ON tl.code = li.tipo_id
     LEFT JOIN orcamento.dfd AS dfd ON dfd.id = li.dfd_id
     WHERE li.id = $<id>`,
    { id }
  )

  if (!licitacao) {
    throw new AppError('Licitacao nao encontrada', httpCode.NotFound)
  }

  return licitacao
}

controller.criar = async (dados, usuarioUuid) => {
  return db.conn
    .one(
      `INSERT INTO orcamento.licitacao
        (ano, dfd_id, tipo_id, objeto, fase_atual,
         valor_total_estimado, valor_final_homologado, om_gestora,
         usuario_cadastramento_uuid)
       VALUES
        ($<ano>, $<dfdId>, $<tipoId>, $<objeto>, $<faseAtual>,
         $<valorTotalEstimado>, $<valorFinalHomologado>, $<omGestora>,
         $<usuarioUuid>)
       RETURNING id`,
      {
        ano: dados.ano,
        dfdId: dados.dfd_id != null ? dados.dfd_id : null,
        tipoId: dados.tipo_id,
        objeto: dados.objeto,
        faseAtual: dados.fase_atual || null,
        valorTotalEstimado:
          dados.valor_total_estimado != null ? dados.valor_total_estimado : null,
        valorFinalHomologado:
          dados.valor_final_homologado != null
            ? dados.valor_final_homologado
            : null,
        omGestora: dados.om_gestora || null,
        usuarioUuid
      }
    )
    .catch(tratarFk)
}

controller.atualizar = async (id, dados, usuarioUuid) => {
  const existente = await db.conn.oneOrNone(
    'SELECT id FROM orcamento.licitacao WHERE id = $<id>',
    { id }
  )
  if (!existente) {
    throw new AppError('Licitacao nao encontrada', httpCode.NotFound)
  }

  return db.conn
    .one(
      `UPDATE orcamento.licitacao SET
         ano = $<ano>, dfd_id = $<dfdId>, tipo_id = $<tipoId>,
         objeto = $<objeto>, fase_atual = $<faseAtual>,
         valor_total_estimado = $<valorTotalEstimado>,
         valor_final_homologado = $<valorFinalHomologado>,
         om_gestora = $<omGestora>,
         data_modificacao = $<dataModificacao>,
         usuario_modificacao_uuid = $<usuarioUuid>
       WHERE id = $<id>
       RETURNING id`,
      {
        id,
        ano: dados.ano,
        dfdId: dados.dfd_id != null ? dados.dfd_id : null,
        tipoId: dados.tipo_id,
        objeto: dados.objeto,
        faseAtual: dados.fase_atual || null,
        valorTotalEstimado:
          dados.valor_total_estimado != null ? dados.valor_total_estimado : null,
        valorFinalHomologado:
          dados.valor_final_homologado != null
            ? dados.valor_final_homologado
            : null,
        omGestora: dados.om_gestora || null,
        dataModificacao: new Date(),
        usuarioUuid
      }
    )
    .catch(tratarFk)
}

controller.deletar = async id => {
  const existente = await db.conn.oneOrNone(
    'SELECT id FROM orcamento.licitacao WHERE id = $<id>',
    { id }
  )
  if (!existente) {
    throw new AppError('Licitacao nao encontrada', httpCode.NotFound)
  }

  // Bloqueia exclusao se houver nota de empenho referenciando esta licitacao (FK).
  const empenho = await db.conn.oneOrNone(
    'SELECT 1 FROM orcamento.nota_empenho WHERE licitacao_id = $<id> LIMIT 1',
    { id }
  )
  if (empenho) {
    throw new AppError(
      'Licitacao possui notas de empenho vinculadas e nao pode ser excluida',
      httpCode.Conflict
    )
  }

  return db.conn.none('DELETE FROM orcamento.licitacao WHERE id = $<id>', { id })
}

module.exports = controller
