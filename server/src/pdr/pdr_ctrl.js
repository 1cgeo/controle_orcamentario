// Path: pdr\pdr_ctrl.js
'use strict'

const { db } = require('../database')

const { AppError, httpCode } = require('../utils')

const controller = {}

// Colunas de item que o cliente controla (sem auditoria nem pdr_id).
const itemFields = [
  'cod_nd',
  'meta_pit_id',
  'item_label',
  'descricao',
  'gnd',
  'valor_solicitado',
  'valor_autorizado',
  'observacao'
]

// Campos opcionais do cabecalho do PDR. Quando o cliente os omite, o pg-promise
// lancaria "Property doesn't exist" nos placeholders $<campo>; por isso
// normalizamos para null antes de montar a query (request valido nao pode 500).
const pdrOpcionais = [
  'valor_solicitado',
  'valor_autorizado',
  'gnd3_autorizado',
  'gnd4_autorizado',
  'acao_orcamentaria',
  'plano_orcamentario',
  'data_assinatura',
  'revisao'
]

const normalizaHeader = pdr => {
  const out = { ano: pdr.ano }
  pdrOpcionais.forEach(campo => {
    out[campo] = pdr[campo] !== undefined ? pdr[campo] : null
  })
  return out
}

const normalizaItem = item => {
  const out = { cod_nd: item.cod_nd }
  itemFields.slice(1).forEach(campo => {
    out[campo] = item[campo] !== undefined ? item[campo] : null
  })
  return out
}

// Insere os itens de um PDR dentro de uma transacao (t), com auditoria.
const inserirItens = async (t, pdrId, itens, usuarioUuid) => {
  if (!Array.isArray(itens) || itens.length === 0) {
    return
  }

  const cs = new db.pgp.helpers.ColumnSet(
    [
      'pdr_id',
      'cod_nd',
      { name: 'meta_pit_id', def: null },
      { name: 'item_label', def: null },
      { name: 'descricao', def: null },
      { name: 'gnd', def: null },
      { name: 'valor_solicitado', def: null },
      { name: 'valor_autorizado', def: null },
      { name: 'observacao', def: null },
      'usuario_cadastramento_uuid'
    ],
    { table: { table: 'pdr_item', schema: 'orcamento' } }
  )

  const values = itens.map(item => {
    const registro = { pdr_id: pdrId, usuario_cadastramento_uuid: usuarioUuid }
    itemFields.forEach(campo => {
      registro[campo] = campo in item ? item[campo] : null
    })
    return registro
  })

  const query = db.pgp.helpers.insert(values, cs)
  return t.none(query)
}

controller.getPdrs = async ano => {
  const where = ano ? 'WHERE p.ano = $<ano>' : ''
  return db.conn.any(
    `
    SELECT p.id, p.ano, p.valor_solicitado, p.valor_autorizado,
      p.gnd3_autorizado, p.gnd4_autorizado, p.acao_orcamentaria,
      p.plano_orcamentario, p.data_assinatura, p.revisao,
      COUNT(i.id)::int AS total_itens
    FROM orcamento.pdr AS p
    LEFT JOIN orcamento.pdr_item AS i ON i.pdr_id = p.id
    ${where}
    GROUP BY p.id
    ORDER BY p.ano DESC
    `,
    { ano }
  )
}

controller.getPdr = async id => {
  const pdr = await db.conn.oneOrNone(
    `
    SELECT p.id, p.ano, p.valor_solicitado, p.valor_autorizado,
      p.gnd3_autorizado, p.gnd4_autorizado, p.acao_orcamentaria,
      p.plano_orcamentario, p.data_assinatura, p.revisao
    FROM orcamento.pdr AS p
    WHERE p.id = $<id>
    `,
    { id }
  )

  if (!pdr) {
    throw new AppError('PDR não encontrado', httpCode.NotFound)
  }

  pdr.itens = await db.conn.any(
    `
    SELECT i.id, i.pdr_id, i.cod_nd, nd.nome AS nd_nome,
      i.meta_pit_id, mp.numero_meta AS meta_numero, mp.item AS meta_item,
      mp.descricao AS meta_descricao,
      i.item_label, i.descricao, i.gnd, i.valor_solicitado,
      i.valor_autorizado, i.observacao
    FROM orcamento.pdr_item AS i
    INNER JOIN dominio.natureza_despesa AS nd ON nd.code = i.cod_nd
    LEFT JOIN orcamento.meta_pit AS mp ON mp.id = i.meta_pit_id
    WHERE i.pdr_id = $<id>
    ORDER BY i.id
    `,
    { id }
  )

  return pdr
}

controller.criaPdr = async (pdr, usuarioUuid) => {
  return db.conn.tx(async t => {
    const existente = await t.oneOrNone(
      'SELECT id FROM orcamento.pdr WHERE ano = $<ano>',
      { ano: pdr.ano }
    )

    if (existente) {
      throw new AppError('Já existe PDR para este ano', httpCode.Conflict)
    }

    const novo = await t.one(
      `
      INSERT INTO orcamento.pdr
        (ano, valor_solicitado, valor_autorizado, gnd3_autorizado,
         gnd4_autorizado, acao_orcamentaria, plano_orcamentario,
         data_assinatura, revisao, usuario_cadastramento_uuid)
      VALUES
        ($<ano>, $<valor_solicitado>, $<valor_autorizado>, $<gnd3_autorizado>,
         $<gnd4_autorizado>, $<acao_orcamentaria>, $<plano_orcamentario>,
         $<data_assinatura>, $<revisao>, $<usuarioUuid>)
      RETURNING id
      `,
      { ...normalizaHeader(pdr), usuarioUuid }
    )

    await inserirItens(t, novo.id, pdr.itens, usuarioUuid)

    return { id: novo.id }
  })
}

controller.atualizaPdr = async (id, pdr, usuarioUuid) => {
  return db.conn.tx(async t => {
    const existente = await t.oneOrNone(
      'SELECT id FROM orcamento.pdr WHERE id = $<id>',
      { id }
    )

    if (!existente) {
      throw new AppError('PDR não encontrado', httpCode.NotFound)
    }

    // Conflito de UNIQUE(ano): outro PDR ja usa o ano informado.
    const conflito = await t.oneOrNone(
      'SELECT id FROM orcamento.pdr WHERE ano = $<ano> AND id <> $<id>',
      { ano: pdr.ano, id }
    )

    if (conflito) {
      throw new AppError('Já existe PDR para este ano', httpCode.Conflict)
    }

    await t.none(
      `
      UPDATE orcamento.pdr SET
        ano = $<ano>,
        valor_solicitado = $<valor_solicitado>,
        valor_autorizado = $<valor_autorizado>,
        gnd3_autorizado = $<gnd3_autorizado>,
        gnd4_autorizado = $<gnd4_autorizado>,
        acao_orcamentaria = $<acao_orcamentaria>,
        plano_orcamentario = $<plano_orcamentario>,
        data_assinatura = $<data_assinatura>,
        revisao = $<revisao>,
        data_modificacao = $<dataModificacao>,
        usuario_modificacao_uuid = $<usuarioUuid>
      WHERE id = $<id>
      `,
      { ...normalizaHeader(pdr), id, usuarioUuid, dataModificacao: new Date() }
    )

    // Substitui os itens: bloqueia se houver nota_credito referenciando
    // algum item atual (nao podemos remover o item nesse caso).
    const referenciados = await t.oneOrNone(
      `
      SELECT 1 FROM orcamento.nota_credito
      WHERE pdr_item_id IN (
        SELECT id FROM orcamento.pdr_item WHERE pdr_id = $<id>
      )
      LIMIT 1
      `,
      { id }
    )

    if (referenciados) {
      throw new AppError(
        'Não é possível substituir os itens: existe nota de crédito vinculada a um item deste PDR',
        httpCode.Conflict
      )
    }

    await t.none('DELETE FROM orcamento.pdr_item WHERE pdr_id = $<id>', { id })

    await inserirItens(t, id, pdr.itens, usuarioUuid)
  })
}

controller.deletaPdr = async id => {
  return db.conn.tx(async t => {
    const existente = await t.oneOrNone(
      'SELECT id FROM orcamento.pdr WHERE id = $<id>',
      { id }
    )

    if (!existente) {
      throw new AppError('PDR não encontrado', httpCode.NotFound)
    }

    const referenciados = await t.oneOrNone(
      `
      SELECT 1 FROM orcamento.nota_credito
      WHERE pdr_item_id IN (
        SELECT id FROM orcamento.pdr_item WHERE pdr_id = $<id>
      )
      LIMIT 1
      `,
      { id }
    )

    if (referenciados) {
      throw new AppError(
        'Não é possível remover o PDR: existe nota de crédito vinculada a um de seus itens',
        httpCode.Conflict
      )
    }

    await t.none('DELETE FROM orcamento.pdr_item WHERE pdr_id = $<id>', { id })

    await t.none('DELETE FROM orcamento.pdr WHERE id = $<id>', { id })
  })
}

controller.criaItem = async (pdrId, item, usuarioUuid) => {
  return db.conn.tx(async t => {
    const pdr = await t.oneOrNone(
      'SELECT id FROM orcamento.pdr WHERE id = $<pdrId>',
      { pdrId }
    )

    if (!pdr) {
      throw new AppError('PDR não encontrado', httpCode.NotFound)
    }

    const novo = await t.one(
      `
      INSERT INTO orcamento.pdr_item
        (pdr_id, cod_nd, meta_pit_id, item_label, descricao, gnd,
         valor_solicitado, valor_autorizado, observacao,
         usuario_cadastramento_uuid)
      VALUES
        ($<pdrId>, $<cod_nd>, $<meta_pit_id>, $<item_label>, $<descricao>,
         $<gnd>, $<valor_solicitado>, $<valor_autorizado>, $<observacao>,
         $<usuarioUuid>)
      RETURNING id
      `,
      { ...normalizaItem(item), pdrId, usuarioUuid }
    )

    return { id: novo.id }
  })
}

controller.atualizaItem = async (itemId, item, usuarioUuid) => {
  const result = await db.conn.result(
    `
    UPDATE orcamento.pdr_item SET
      cod_nd = $<cod_nd>,
      meta_pit_id = $<meta_pit_id>,
      item_label = $<item_label>,
      descricao = $<descricao>,
      gnd = $<gnd>,
      valor_solicitado = $<valor_solicitado>,
      valor_autorizado = $<valor_autorizado>,
      observacao = $<observacao>,
      data_modificacao = $<dataModificacao>,
      usuario_modificacao_uuid = $<usuarioUuid>
    WHERE id = $<itemId>
    `,
    { ...normalizaItem(item), itemId, usuarioUuid, dataModificacao: new Date() }
  )

  if (!result.rowCount || result.rowCount !== 1) {
    throw new AppError('Item do PDR não encontrado', httpCode.NotFound)
  }
}

controller.deletaItem = async itemId => {
  return db.conn.tx(async t => {
    const item = await t.oneOrNone(
      'SELECT id FROM orcamento.pdr_item WHERE id = $<itemId>',
      { itemId }
    )

    if (!item) {
      throw new AppError('Item do PDR não encontrado', httpCode.NotFound)
    }

    const referenciado = await t.oneOrNone(
      'SELECT 1 FROM orcamento.nota_credito WHERE pdr_item_id = $<itemId> LIMIT 1',
      { itemId }
    )

    if (referenciado) {
      throw new AppError(
        'Não é possível remover o item: existe nota de crédito vinculada a ele',
        httpCode.Conflict
      )
    }

    await t.none('DELETE FROM orcamento.pdr_item WHERE id = $<itemId>', { itemId })
  })
}

module.exports = controller
