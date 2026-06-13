// Path: exercicio\exercicio_schema.js
'use strict'

const Joi = require('joi')

const models = {}

models.anoParams = Joi.object().keys({
  ano: Joi.number().integer().required()
})

models.criar = Joi.object().keys({
  ano: Joi.number().integer().strict().required(),
  uasg: Joi.string().max(10).allow(null, ''),
  codom: Joi.string().max(10).allow(null, ''),
  ativo: Joi.boolean().strict().default(false)
})

models.atualizar = Joi.object().keys({
  uasg: Joi.string().max(10).allow(null, ''),
  codom: Joi.string().max(10).allow(null, ''),
  ativo: Joi.boolean().strict().required()
})

module.exports = models
