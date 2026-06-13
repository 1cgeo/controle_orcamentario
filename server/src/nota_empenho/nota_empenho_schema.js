// Path: nota_empenho\nota_empenho_schema.js
'use strict'

const Joi = require('joi')

const models = {}

// Parametro de rota: id da NE (BIGSERIAL). Coercao numerica (vem como string na URL).
models.idParams = Joi.object().keys({
  id: Joi.number().integer().required()
})

// Query da listagem: filtros opcionais por nota de credito e por ano.
models.listarQuery = Joi.object().keys({
  nota_credito_id: Joi.number().integer(),
  ano: Joi.number().integer()
})

// Campos comuns de criacao/atualizacao da NE.
//
// Regras de negocio centrais (ver tambem o ctrl):
//   * a NE empenha contra uma NC (nota_credito_id obrigatorio). A ND, o PI e o
//     GND sao herdados da NC, entao a NE nao tem esses campos nem licitacao.
//   * valor_empenhado e obrigatorio e estritamente > 0.
//   * valor_anulado tem default 0 e nunca pode exceder o valor_empenhado;
//     o saldo a liquidar e valor_empenhado - valor_anulado - SUM(liquidado).
const camposBase = {
  numero: Joi.string().max(20).required(),
  ano: Joi.number().integer().strict().required(),
  data_empenho: Joi.date().allow(null),
  nota_credito_id: Joi.number().integer().strict().required(),
  finalidade: Joi.string().allow(null, ''),
  valor_empenhado: Joi.number().positive().strict().required(),
  // nunca pode exceder o valor_empenhado (validado tambem no ctrl)
  valor_anulado: Joi.number()
    .min(0)
    .strict()
    .max(Joi.ref('valor_empenhado'))
    .default(0)
}

models.criar = Joi.object().keys({
  ...camposBase
})

models.atualizar = Joi.object().keys({
  ...camposBase
})

module.exports = models
