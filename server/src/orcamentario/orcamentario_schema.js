'use strict'

const Joi = require('joi').extend(require('@joi/date'));

const models = {}

models.credito = Joi.object({
    numero: Joi.string().max(12).required(),
    descricao: Joi.string().required(),
    data: Joi.date().format('DD/MM/YY').required(),
    nd: Joi.string().max(6).required(),
    pi: Joi.string().max(11).required(),
    valor: Joi.number().required(),
    credito_base_id: Joi.any().forbidden(),
    tipo_credito_id: Joi.number().valid(1).required()
});

models.credito_complementar = Joi.object({
    numero: Joi.string().max(12).required(),
    descricao: Joi.string().required(),
    data: Joi.date().format('DD/MM/YY').required(),
    nd: Joi.string().max(6).required(),
    pi: Joi.string().max(11).required(),
    valor: Joi.number().required(),
    credito_base_id: Joi.number().required(),
    tipo_credito_id: Joi.number().valid(2, 3).required()
});

models.remover_credito = Joi.object({
    credito_ids: Joi.array().items(Joi.number().required()),
});

models.editar_credito = Joi.object({
    numero: Joi.string().max(12).required(),
    descricao: Joi.string().required(),
    data: Joi.date().format('DD/MM/YY').required(),
    nd: Joi.string().max(6).required(),
    pi: Joi.string().max(11).required(),
    valor: Joi.number().required(),
    credito_base_id: Joi.any().forbidden(),
    tipo_credito_id: Joi.number().valid(1).required()
});

models.empenho = Joi.object({
    numero: Joi.string().max(12).required(),
    descricao: Joi.string().required(),
    nome_credor: Joi.string().required(),
    cnpj_credor: Joi.string().required(),
    data: Joi.date().format('DD/MM/YY').required(),
    valor: Joi.number().required(),
    quantidade: Joi.number().required(),
    nc: Joi.string().required(),
    credito_base_id: Joi.any().forbidden(),
    tipo_empenho_id: Joi.number().valid(1).required()
});

models.editar_empenho = Joi.object({
    numero: Joi.string().max(12).required(),
    descricao: Joi.string().required(),
    nome_credor: Joi.string().required(),
    cnpj_credor: Joi.string().required(),
    data: Joi.date().format('DD/MM/YY').required(),
    valor: Joi.number().required(),
    quantidade: Joi.number().required(),
    nc: Joi.string().required(),
    credito_base_id: Joi.any().forbidden(),
    tipo_empenho_id: Joi.number().valid(1).required()
});

models.remover_empenhos = Joi.object({
    empenho_ids: Joi.array().items(Joi.number().required()),
});

module.exports = models
