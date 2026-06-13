// Path: pdr\pdr_schema.js
'use strict'

const Joi = require('joi')

const models = {}

models.idParams = Joi.object().keys({
  id: Joi.number().integer().required()
})

models.itemIdParams = Joi.object().keys({
  itemId: Joi.number().integer().required()
})

models.listaQuery = Joi.object().keys({
  ano: Joi.number().integer()
})

// Item do PDR (usado dentro do PDR e nos endpoints de item avulso).
const itemKeys = {
  cod_nd: Joi.string().max(6).required(),
  meta_pit_id: Joi.number().integer().strict().allow(null),
  item_label: Joi.string().max(10).allow(null, ''),
  descricao: Joi.string().allow(null, ''),
  gnd: Joi.number().integer().strict().allow(null),
  valor_solicitado: Joi.number().allow(null),
  valor_autorizado: Joi.number().allow(null),
  observacao: Joi.string().allow(null, '')
}

models.item = Joi.object().keys(itemKeys)

models.criar = Joi.object().keys({
  ano: Joi.number().integer().strict().required(),
  valor_solicitado: Joi.number().allow(null),
  valor_autorizado: Joi.number().allow(null),
  gnd3_autorizado: Joi.number().allow(null),
  gnd4_autorizado: Joi.number().allow(null),
  acao_orcamentaria: Joi.string().max(10).allow(null, ''),
  plano_orcamentario: Joi.string().max(10).allow(null, ''),
  data_assinatura: Joi.date().allow(null),
  revisao: Joi.string().max(10).allow(null, ''),
  itens: Joi.array().items(models.item).default([])
})

models.atualizar = Joi.object().keys({
  ano: Joi.number().integer().strict().required(),
  valor_solicitado: Joi.number().allow(null),
  valor_autorizado: Joi.number().allow(null),
  gnd3_autorizado: Joi.number().allow(null),
  gnd4_autorizado: Joi.number().allow(null),
  acao_orcamentaria: Joi.string().max(10).allow(null, ''),
  plano_orcamentario: Joi.string().max(10).allow(null, ''),
  data_assinatura: Joi.date().allow(null),
  revisao: Joi.string().max(10).allow(null, ''),
  itens: Joi.array().items(models.item).default([])
})

models.criarItem = models.item

models.atualizarItem = models.item

module.exports = models
