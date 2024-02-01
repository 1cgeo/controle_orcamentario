'use strict'

const express = require('express')

const { schemaValidation, asyncHandler, httpCode } = require('../utils')

const { verifyLogin } = require('../login')

const orcamentarioCtrl = require('./orcamentario_ctrl')
const orcamentarioSchema = require('./orcamentario_schema')

const router = express.Router()

router.get(
  '/credito',
  asyncHandler(async (req, res, next) => {
    const dados = await orcamentarioCtrl.getCredito()

    const msg = 'Créditos retornadas'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.post(
  '/credito',
  verifyLogin,
  schemaValidation({ body: orcamentarioSchema.credito }),
  asyncHandler(async (req, res, next) => {
    await orcamentarioCtrl.insertCredito(req.body.nome)

    const msg = 'Crédito criado com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.Created)
  })
)

router.post(
  '/complementar_credito',
  verifyLogin,
  schemaValidation({ body: orcamentarioSchema.credito_complementar }),
  asyncHandler(async (req, res, next) => {
    await orcamentarioCtrl.insertCreditoComplementar(req.body.credito_complementar)

    const msg = 'Crédito complementar criado com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.Created)
  })
)

module.exports = router
