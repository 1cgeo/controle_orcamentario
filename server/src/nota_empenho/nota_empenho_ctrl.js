// Path: nota_empenho\nota_empenho_ctrl.js
'use strict'

const { db } = require('../database')

const { AppError, httpCode } = require('../utils')

const controller = {}

// Codigo SQLSTATE do PostgreSQL para violacao de chave estrangeira.
// Usado para traduzir o erro cru do banco numa mensagem amigavel (400),
// por exemplo quando nota_credito_id, cod_nd, cod_pi ou licitacao_id
// apontam para um registro inexistente.
const FK_VIOLATION = '23503'

// Mapa de coluna -> mensagem amigavel. A constraint exata depende do nome
// gerado pelo banco; por isso casamos pela coluna citada no detalhe do erro
// (err.detail), que e estavel ("Key (coluna)=...").
const mensagemFk = err => {
  const detalhe = (err && err.detail) || ''
  if (detalhe.includes('(nota_credito_id)')) {
    return 'A nota de credito informada nao existe'
  }
  if (detalhe.includes('(cod_nd)')) {
    return 'A natureza de despesa (cod_nd) informada nao existe'
  }
  if (detalhe.includes('(cod_pi)')) {
    return 'O plano interno (cod_pi) informado nao existe'
  }
  if (detalhe.includes('(licitacao_id)')) {
    return 'A licitacao informada nao existe'
  }
  return 'Referencia invalida em um dos campos da nota de empenho'
}

// Reembrulha violacao de FK como AppError 400 (amigavel); demais erros sobem.
const tratarFk = err => {
  if (err && err.code === FK_VIOLATION) {
    throw new AppError(mensagemFk(err), httpCode.BadRequest, err)
  }
  throw err
}

controller.listar = async (filtros = {}) => {
  // Lista as NEs com o numero da NC, o nome da ND e o total ja liquidado
  // (subselect SUM em orcamento.liquidacao). Filtros opcionais por
  // nota_credito_id e ano. Ordenado por ano e numero.
  return db.conn.any(
    `SELECT ne.id, ne.numero, ne.ano, ne.data_empenho,
            ne.nota_credito_id,
            nc.numero AS nota_credito_numero,
            ne.cod_nd,
            nd.nome AS nd_nome,
            ne.cod_pi, ne.licitacao_id,
            ne.valor_empenhado, ne.valor_anulado,
            COALESCE((SELECT SUM(li.valor_liquidado)
                      FROM orcamento.liquidacao AS li
                      WHERE li.nota_empenho_id = ne.id), 0) AS total_liquidado
     FROM orcamento.nota_empenho AS ne
     LEFT JOIN orcamento.nota_credito AS nc ON nc.id = ne.nota_credito_id
     LEFT JOIN dominio.natureza_despesa AS nd ON nd.code = ne.cod_nd
     WHERE ($<notaCreditoId> IS NULL OR ne.nota_credito_id = $<notaCreditoId>)
       AND ($<ano> IS NULL OR ne.ano = $<ano>)
     ORDER BY ne.ano, ne.numero`,
    {
      notaCreditoId:
        filtros.nota_credito_id != null ? filtros.nota_credito_id : null,
      ano: filtros.ano != null ? filtros.ano : null
    }
  )
}

controller.getPorId = async id => {
  // Uma NE com nomes resolvidos, suas liquidacoes (array) e o saldo a
  // liquidar = valor_empenhado - valor_anulado - SUM(liquidado).
  const ne = await db.conn.oneOrNone(
    `SELECT ne.id, ne.numero, ne.ano, ne.data_empenho,
            ne.nota_credito_id,
            nc.numero AS nota_credito_numero,
            ne.cod_nd,
            nd.nome AS nd_nome,
            ne.cod_pi,
            pi.nome AS pi_nome,
            ne.licitacao_id, ne.finalidade,
            ne.valor_empenhado, ne.valor_anulado,
            ne.data_cadastramento, ne.usuario_cadastramento_uuid,
            ne.data_modificacao, ne.usuario_modificacao_uuid
     FROM orcamento.nota_empenho AS ne
     LEFT JOIN orcamento.nota_credito AS nc ON nc.id = ne.nota_credito_id
     LEFT JOIN dominio.natureza_despesa AS nd ON nd.code = ne.cod_nd
     LEFT JOIN dominio.plano_interno AS pi ON pi.code = ne.cod_pi
     WHERE ne.id = $<id>`,
    { id }
  )

  if (!ne) {
    throw new AppError('Nota de empenho nao encontrada', httpCode.NotFound)
  }

  // Liquidacoes da NE (array, possivelmente vazio).
  ne.liquidacoes = await db.conn.any(
    `SELECT id, valor_liquidado, data, documento_ns
     FROM orcamento.liquidacao
     WHERE nota_empenho_id = $<id>
     ORDER BY data, id`,
    { id }
  )

  // Saldo a liquidar = valor_empenhado - valor_anulado - SUM(liquidado).
  const totalLiquidado = ne.liquidacoes.reduce(
    (soma, li) => soma + Number(li.valor_liquidado),
    0
  )
  ne.total_liquidado = totalLiquidado
  ne.saldo_a_liquidar =
    Number(ne.valor_empenhado) - Number(ne.valor_anulado) - totalLiquidado

  return ne
}

controller.criar = async (dados, usuarioUuid) => {
  return db.conn
    .one(
      `INSERT INTO orcamento.nota_empenho
        (numero, ano, data_empenho, nota_credito_id, cod_nd, cod_pi,
         licitacao_id, finalidade, valor_empenhado, valor_anulado,
         usuario_cadastramento_uuid)
       VALUES
        ($<numero>, $<ano>, $<dataEmpenho>, $<notaCreditoId>, $<codNd>, $<codPi>,
         $<licitacaoId>, $<finalidade>, $<valorEmpenhado>, $<valorAnulado>,
         $<usuarioUuid>)
       RETURNING id`,
      {
        numero: dados.numero,
        ano: dados.ano,
        dataEmpenho: dados.data_empenho || null,
        notaCreditoId:
          dados.nota_credito_id != null ? dados.nota_credito_id : null,
        codNd: dados.cod_nd || null,
        codPi: dados.cod_pi || null,
        licitacaoId: dados.licitacao_id != null ? dados.licitacao_id : null,
        finalidade: dados.finalidade || null,
        valorEmpenhado: dados.valor_empenhado,
        valorAnulado: dados.valor_anulado != null ? dados.valor_anulado : 0,
        usuarioUuid
      }
    )
    .catch(tratarFk)
}

controller.atualizar = async (id, dados, usuarioUuid) => {
  const existente = await db.conn.oneOrNone(
    'SELECT id FROM orcamento.nota_empenho WHERE id = $<id>',
    { id }
  )
  if (!existente) {
    throw new AppError('Nota de empenho nao encontrada', httpCode.NotFound)
  }

  // O valor_anulado nao pode deixar o saldo negativo: o total ja liquidado
  // nao pode exceder valor_empenhado - valor_anulado.
  const liquidado = await db.conn.one(
    `SELECT COALESCE(SUM(valor_liquidado), 0) AS total
     FROM orcamento.liquidacao
     WHERE nota_empenho_id = $<id>`,
    { id }
  )
  const totalLiquidado = Number(liquidado.total)
  const disponivel = Number(dados.valor_empenhado) - Number(dados.valor_anulado)
  if (totalLiquidado > disponivel) {
    throw new AppError(
      'Valor empenhado disponivel nao cobre as liquidacoes ja registradas',
      httpCode.BadRequest
    )
  }

  return db.conn
    .one(
      `UPDATE orcamento.nota_empenho SET
         numero = $<numero>, ano = $<ano>, data_empenho = $<dataEmpenho>,
         nota_credito_id = $<notaCreditoId>, cod_nd = $<codNd>, cod_pi = $<codPi>,
         licitacao_id = $<licitacaoId>, finalidade = $<finalidade>,
         valor_empenhado = $<valorEmpenhado>, valor_anulado = $<valorAnulado>,
         data_modificacao = $<dataModificacao>,
         usuario_modificacao_uuid = $<usuarioUuid>
       WHERE id = $<id>
       RETURNING id`,
      {
        id,
        numero: dados.numero,
        ano: dados.ano,
        dataEmpenho: dados.data_empenho || null,
        notaCreditoId:
          dados.nota_credito_id != null ? dados.nota_credito_id : null,
        codNd: dados.cod_nd || null,
        codPi: dados.cod_pi || null,
        licitacaoId: dados.licitacao_id != null ? dados.licitacao_id : null,
        finalidade: dados.finalidade || null,
        valorEmpenhado: dados.valor_empenhado,
        valorAnulado: dados.valor_anulado != null ? dados.valor_anulado : 0,
        dataModificacao: new Date(),
        usuarioUuid
      }
    )
    .catch(tratarFk)
}

controller.deletar = async id => {
  const existente = await db.conn.oneOrNone(
    'SELECT id FROM orcamento.nota_empenho WHERE id = $<id>',
    { id }
  )
  if (!existente) {
    throw new AppError('Nota de empenho nao encontrada', httpCode.NotFound)
  }

  // Bloqueia exclusao se houver liquidacao referenciando esta NE.
  const liquidacao = await db.conn.oneOrNone(
    'SELECT 1 FROM orcamento.liquidacao WHERE nota_empenho_id = $<id> LIMIT 1',
    { id }
  )
  if (liquidacao) {
    throw new AppError(
      'Nota de empenho possui liquidacoes vinculadas e nao pode ser excluida',
      httpCode.Conflict
    )
  }

  // Bloqueia exclusao se houver recebimento de material referenciando esta NE.
  const recebimento = await db.conn.oneOrNone(
    'SELECT 1 FROM orcamento.recebimento_material WHERE nota_empenho_id = $<id> LIMIT 1',
    { id }
  )
  if (recebimento) {
    throw new AppError(
      'Nota de empenho possui recebimentos de material vinculados e nao pode ser excluida',
      httpCode.Conflict
    )
  }

  return db.conn.none('DELETE FROM orcamento.nota_empenho WHERE id = $<id>', {
    id
  })
}

module.exports = controller
