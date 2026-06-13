// Path: dominio\dominio_route.js
'use strict'

// Rotas de dominio (GET, sem autenticacao) para popular selects no client,
// no mesmo padrao do /dominio do controle_acervo.

const express = require('express')

const { asyncHandler, httpCode } = require('../utils')

const dominioCtrl = require('./dominio_ctrl')

const router = express.Router()

router.get(
  '/tipo_posto_grad',
  asyncHandler(async (req, res, next) => {
    const dados = await dominioCtrl.getTipoPostoGrad()
    return res.sendJsonAndLog(true, 'Domínio Tipo Posto Graduação retornado com sucesso', httpCode.OK, dados)
  })
)

router.get(
  '/natureza_despesa',
  asyncHandler(async (req, res, next) => {
    const dados = await dominioCtrl.getNaturezaDespesa()
    return res.sendJsonAndLog(true, 'Domínio Natureza de Despesa retornado com sucesso', httpCode.OK, dados)
  })
)

router.get(
  '/plano_interno',
  asyncHandler(async (req, res, next) => {
    const dados = await dominioCtrl.getPlanoInterno()
    return res.sendJsonAndLog(true, 'Domínio Plano Interno retornado com sucesso', httpCode.OK, dados)
  })
)

router.get(
  '/ug',
  asyncHandler(async (req, res, next) => {
    const dados = await dominioCtrl.getUg()
    return res.sendJsonAndLog(true, 'Domínio Unidade Gestora retornado com sucesso', httpCode.OK, dados)
  })
)

router.get(
  '/tipo_licitacao',
  asyncHandler(async (req, res, next) => {
    const dados = await dominioCtrl.getTipoLicitacao()
    return res.sendJsonAndLog(true, 'Domínio Tipo de Licitação retornado com sucesso', httpCode.OK, dados)
  })
)

router.get(
  '/classificacao_nc',
  asyncHandler(async (req, res, next) => {
    const dados = await dominioCtrl.getClassificacaoNc()
    return res.sendJsonAndLog(true, 'Domínio Classificação da NC retornado com sucesso', httpCode.OK, dados)
  })
)

router.get(
  '/tipo_item_dfd',
  asyncHandler(async (req, res, next) => {
    const dados = await dominioCtrl.getTipoItemDfd()
    return res.sendJsonAndLog(true, 'Domínio Tipo de Item do DFD retornado com sucesso', httpCode.OK, dados)
  })
)

router.get(
  '/grau_prioridade',
  asyncHandler(async (req, res, next) => {
    const dados = await dominioCtrl.getGrauPrioridade()
    return res.sendJsonAndLog(true, 'Domínio Grau de Prioridade retornado com sucesso', httpCode.OK, dados)
  })
)

module.exports = router
