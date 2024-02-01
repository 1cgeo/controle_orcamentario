'use strict'

const Joi = require('joi')

const models = {}

models.credito = Joi.credito({
    numero: Joi.string().max(12).required(),
    descricao: Joi.string().required(),
    data: Joi.date().required(),
    nd: Joi.string().max(6).required(),
    pi: Joi.string().max(11).required(),
    valor: Joi.number().required(),
    credito_base_id: Joi.any().forbidden(),
    tipo_credito_id: Joi.number().valid(1).required()
});

models.credito_complementar = Joi.credito({
    numero: Joi.string().max(12).required(),
    descricao: Joi.string().required(),
    data: Joi.date().required(),
    nd: Joi.string().max(6).required(),
    pi: Joi.string().max(11).required(),
    valor: Joi.number().required(),
    credito_base_id: Joi.number().required(),
    tipo_credito_id: Joi.number().valid(2, 3).required()
});

module.exports = models
