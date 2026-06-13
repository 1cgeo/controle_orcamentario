// Path: exercicio\meta_schema.js
'use strict'

const Joi = require('joi')

const models = {}

models.idParams = Joi.object().keys({
  id: Joi.number().integer().required()
})

models.listarQuery = Joi.object().keys({
  ano: Joi.number().integer()
})

models.criar = Joi.object().keys({
  ano: Joi.number().integer().strict().required(),
  numero_meta: Joi.number().integer().strict().required(),
  item: Joi.string().max(20).allow(null, ''),
  descricao: Joi.string().allow(null, ''),
  solicitante: Joi.string().max(255).allow(null, '')
})

models.atualizar = Joi.object().keys({
  ano: Joi.number().integer().strict().required(),
  numero_meta: Joi.number().integer().strict().required(),
  item: Joi.string().max(20).allow(null, ''),
  descricao: Joi.string().allow(null, ''),
  solicitante: Joi.string().max(255).allow(null, '')
})

module.exports = models
