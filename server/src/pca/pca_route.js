// Path: pca\pca_route.js
'use strict'

const express = require('express')

const { schemaValidation, asyncHandler, httpCode } = require('../utils')

const { verifyAdmin } = require('../login')

const pcaCtrl = require('./pca_ctrl')

const pcaSchema = require('./pca_schema')

const router = express.Router()

router.get(
  '/',
  verifyAdmin,
  schemaValidation({ query: pcaSchema.listarQuery }),
  asyncHandler(async (req, res, next) => {
    const dados = await pcaCtrl.listar(req.query.ano)

    return res.sendJsonAndLog(true, 'PCAs retornados com sucesso', httpCode.OK, dados)
  })
)

router.get(
  '/:id',
  verifyAdmin,
  schemaValidation({ params: pcaSchema.idParams }),
  asyncHandler(async (req, res, next) => {
    const dados = await pcaCtrl.getPorId(req.params.id)

    return res.sendJsonAndLog(true, 'PCA retornado com sucesso', httpCode.OK, dados)
  })
)

router.post(
  '/',
  verifyAdmin,
  schemaValidation({ body: pcaSchema.criar }),
  asyncHandler(async (req, res, next) => {
    const dados = await pcaCtrl.criar(req.body, req.usuarioUuid)

    return res.sendJsonAndLog(true, 'PCA criado com sucesso', httpCode.Created, dados)
  })
)

router.put(
  '/:id',
  verifyAdmin,
  schemaValidation({ params: pcaSchema.idParams, body: pcaSchema.atualizar }),
  asyncHandler(async (req, res, next) => {
    const dados = await pcaCtrl.atualizar(req.params.id, req.body, req.usuarioUuid)

    return res.sendJsonAndLog(true, 'PCA atualizado com sucesso', httpCode.OK, dados)
  })
)

router.delete(
  '/:id',
  verifyAdmin,
  schemaValidation({ params: pcaSchema.idParams }),
  asyncHandler(async (req, res, next) => {
    await pcaCtrl.deletar(req.params.id)

    return res.sendJsonAndLog(true, 'PCA excluído com sucesso', httpCode.OK)
  })
)

module.exports = router
