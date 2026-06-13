// Path: pca\pca_schema.js
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
  uasg: Joi.string().max(10).allow(null, ''),
  valor_total_estimado: Joi.number().allow(null),
  observacao: Joi.string().allow(null, '')
})

models.atualizar = Joi.object().keys({
  ano: Joi.number().integer().strict().required(),
  uasg: Joi.string().max(10).allow(null, ''),
  valor_total_estimado: Joi.number().allow(null),
  observacao: Joi.string().allow(null, '')
})

module.exports = models
