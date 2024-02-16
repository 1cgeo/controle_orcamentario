'use strict'

const express = require('express')

const { schemaValidation, asyncHandler, httpCode } = require('../utils')

const { verifyLogin } = require('../login')

const orcamentarioCtrl = require('./orcamentario_ctrl')
const orcamentarioSchema = require('./orcamentario_schema')
const pdfUpload = require("./pdf_upload");

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
  pdfUpload,
  asyncHandler(async (req, res, next) => {
    await orcamentarioCtrl.insertCredito(req.body.credito)

    const msg = 'Crédito criado com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.Created)
  })
)

router.post(
  '/complementar_credito',
  verifyLogin,
  schemaValidation({ body: orcamentarioSchema.credito_complementar }),
  pdfUpload,
  asyncHandler(async (req, res, next) => {
    await orcamentarioCtrl.insertCreditoComplementar(req.body.credito_complementar)

    const msg = 'Crédito complementar criado com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.Created)
  })
)

router.post(
  '/empenho',
  verifyLogin,
  schemaValidation({ body: orcamentarioSchema.empenho }),
  pdfUpload,
  asyncHandler(async (req, res, next) => {
    await orcamentarioCtrl.insertEmpenho(req.body.empenho)

    const msg = 'Empenho criado com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.Created)
  })
)

module.exports = router
