// Path: pca\dfd_schema.js
'use strict'

const Joi = require('joi')

const models = {}

models.idParams = Joi.object().keys({
  id: Joi.number().integer().required()
})

models.listarQuery = Joi.object().keys({
  ano: Joi.number().integer()
})

const item = Joi.object().keys({
  tipo_item_id: Joi.number().integer().strict().required(),
  cod_catmat_catser: Joi.string().max(30).allow(null, ''),
  descricao: Joi.string().required(),
  quantidade: Joi.number().allow(null),
  valor_unitario: Joi.number().allow(null),
  valor_total: Joi.number().allow(null)
})

models.criar = Joi.object().keys({
  numero: Joi.string().max(20).required(),
  ano: Joi.number().integer().strict().required(),
  rotulo: Joi.string().max(120).allow(null, ''),
  objeto: Joi.string().allow(null, ''),
  justificativa: Joi.string().allow(null, ''),
  area_requisitante: Joi.string().max(255).allow(null, ''),
  grau_prioridade_id: Joi.number().integer().strict().allow(null),
  data_prevista_conclusao: Joi.date().allow(null),
  responsavel_cpf: Joi.string().max(14).allow(null, ''),
  vinculo_plano_gestao: Joi.string().max(60).allow(null, ''),
  consta_pca: Joi.boolean().strict().default(true),
  valor_estimado: Joi.number().allow(null),
  itens: Joi.array().items(item).default([])
})

models.atualizar = Joi.object().keys({
  numero: Joi.string().max(20).required(),
  ano: Joi.number().integer().strict().required(),
  rotulo: Joi.string().max(120).allow(null, ''),
  objeto: Joi.string().allow(null, ''),
  justificativa: Joi.string().allow(null, ''),
  area_requisitante: Joi.string().max(255).allow(null, ''),
  grau_prioridade_id: Joi.number().integer().strict().allow(null),
  data_prevista_conclusao: Joi.date().allow(null),
  responsavel_cpf: Joi.string().max(14).allow(null, ''),
  vinculo_plano_gestao: Joi.string().max(60).allow(null, ''),
  consta_pca: Joi.boolean().strict().default(true),
  valor_estimado: Joi.number().allow(null),
  itens: Joi.array().items(item).default([])
})

module.exports = models
