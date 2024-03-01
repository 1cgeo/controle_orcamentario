'use strict'

const express = require('express')

const { schemaValidation, asyncHandler, httpCode } = require('../utils')
const { verifyLogin } = require('../login')
const orcamentarioCtrl = require('./orcamentario_ctrl')
const orcamentarioSchema = require('./orcamentario_schema')
const pdfUpload = require("./pdf_upload");
const { PATH_PDF } = require('../config')
var path = require('path');
const fs = require('fs')

const router = express.Router()

router.get(
  '/creditos',
  asyncHandler(async (req, res, next) => {
    const dados = await orcamentarioCtrl.getCreditos()

    const msg = 'Créditos retornadas'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.get(
  '/creditos/:credito_id',
  asyncHandler(async (req, res, next) => {
    const dados = await orcamentarioCtrl.getCredito(req.params.credito_id)

    const msg = 'Crédito retornado'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.put(
  '/creditos/:credito_id',
  schemaValidation({ body: orcamentarioSchema.editar_credito }),
  asyncHandler(async (req, res, next) => {
    const dados = await orcamentarioCtrl.updateCredito({
      ...req.body,
      id: req.params.credito_id
    })

    const msg = 'Crédito retornado'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

const loadCustomHeader = ({
  key
}) => {
  return (req, res, next) => {
    let data = JSON.parse(req.headers['custom-header'])[key]
    req.body = data
    req[key] = data
    return next()
  }
}

router.post(
  '/credito',
  //verifyLogin,
  loadCustomHeader({ key: 'credito' }),
  schemaValidation({ body: orcamentarioSchema.credito }),
  pdfUpload,
  asyncHandler(async (req, res, next) => {
    await orcamentarioCtrl.insertCredito(req.credito)
    const msg = 'Crédito criado com sucesso'
    return res.sendJsonAndLog(true, msg, httpCode.Created)
  })
)

router.delete(
  '/creditos',
  //verifyLogin,
  schemaValidation({ body: orcamentarioSchema.remover_creditos }),
  asyncHandler(async (req, res, next) => {
    const dados = await orcamentarioCtrl.removerCreditos(req.body.credito_ids)

    const msg = 'Créditos Deletados'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.post(
  '/complementar_credito',
  //verifyLogin,
  loadCustomHeader({ key: 'credito' }),
  schemaValidation({ body: orcamentarioSchema.credito_complementar }),
  pdfUpload,
  asyncHandler(async (req, res, next) => {
    await orcamentarioCtrl.insertCreditoComplementar(req.credito)

    const msg = 'Crédito complementar criado com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.Created)
  })
)

router.get('/creditos/:credito_id/pdf', async (req, res, next) => {
  const dados = await orcamentarioCtrl.getCredito(req.params.credito_id)
  if (dados.length == 0) {
    return res.sendJsonAndLog(true, 'Não encontrado', httpCode.NotFound)
  }
  const credito = dados[0]
  const filePath = path.join(PATH_PDF, 'credito', `${credito.numero}.pdf`)
  var stream = fs.createReadStream(filePath);
  var filename = `${credito.numero}.pdf`;
  filename = encodeURIComponent(filename);
  res.setHeader('Content-disposition', 'inline; filename="' + filename + '"');
  res.setHeader('Content-type', 'application/pdf');
  stream.pipe(res);
});


/////////////////////
router.get(
  '/empenhos',
  asyncHandler(async (req, res, next) => {
    const dados = await orcamentarioCtrl.getEmpenhos()

    const msg = 'Empenhos retornadas'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.post(
  '/empenho',
  //verifyLogin,
  loadCustomHeader({ key: 'credito' }),
  schemaValidation({ body: orcamentarioSchema.empenho }),
  pdfUpload,
  asyncHandler(async (req, res, next) => {
    await orcamentarioCtrl.insertEmpenhos(req.credito)
    const msg = 'Empenho criado com sucesso'
    return res.sendJsonAndLog(true, msg, httpCode.Created)
  })
)

router.delete(
  '/empenhos',
  //verifyLogin,
  schemaValidation({ body: orcamentarioSchema.remover_creditos }),
  asyncHandler(async (req, res, next) => {
    const dados = await orcamentarioCtrl.removerEmpenhos(req.body.empenho_ids)

    const msg = 'Empenhos Deletados'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.get('/empenhos/:empenho_id/pdf', async (req, res, next) => {
  const dados = await orcamentarioCtrl.getEmpenho(req.params.empenho_id)
  if (dados.length == 0) {
    return res.sendJsonAndLog(true, 'Não encontrado', httpCode.NotFound)
  }
  const empenho = dados[0]
  const filePath = path.join(PATH_PDF, 'credito', `${empenho.numero}.pdf`)
  var stream = fs.createReadStream(filePath);
  var filename = `${empenho.numero}.pdf`;
  filename = encodeURIComponent(filename);
  res.setHeader('Content-disposition', 'inline; filename="' + filename + '"');
  res.setHeader('Content-type', 'application/pdf');
  stream.pipe(res);
});

module.exports = router
