// Path: nota_empenho\recebimento_schema.js
'use strict'

const Joi = require('joi')

const models = {}

// Parametro de rota: id do recebimento (BIGSERIAL). Coercao numerica.
models.idParams = Joi.object().keys({
  id: Joi.number().integer().required()
})

// Query da listagem: filtro opcional por nota de empenho.
models.listarQuery = Joi.object().keys({
  nota_empenho_id: Joi.number().integer()
})

// Campos comuns de criacao/atualizacao do recebimento de material.
const camposBase = {
  nota_empenho_id: Joi.number().integer().strict().required(),
  material: Joi.string().required(),
  prazo_entrega: Joi.string().max(60).allow(null, ''),
  situacao: Joi.string().allow(null, '')
}

models.criar = Joi.object().keys({
  ...camposBase
})

models.atualizar = Joi.object().keys({
  ...camposBase
})

module.exports = models
