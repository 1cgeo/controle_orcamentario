// Path: pdr\pdr_route.js
'use strict'

const express = require('express')

const { schemaValidation, asyncHandler, httpCode } = require('../utils')

const { verifyLogin, verifyAdmin } = require('../login')

const pdrCtrl = require('./pdr_ctrl')

const pdrSchema = require('./pdr_schema')

const router = express.Router()

router.get(
  '/',
  verifyLogin,
  schemaValidation({ query: pdrSchema.listaQuery }),
  asyncHandler(async (req, res, next) => {
    const dados = await pdrCtrl.getPdrs(req.query.ano)

    const msg = 'PDRs retornados com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.get(
  '/:id',
  verifyLogin,
  schemaValidation({ params: pdrSchema.idParams }),
  asyncHandler(async (req, res, next) => {
    const dados = await pdrCtrl.getPdr(req.params.id)

    const msg = 'PDR retornado com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.post(
  '/',
  verifyAdmin,
  schemaValidation({ body: pdrSchema.criar }),
  asyncHandler(async (req, res, next) => {
    const dados = await pdrCtrl.criaPdr(req.body, req.usuarioUuid)

    const msg = 'PDR criado com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.Created, dados)
  })
)

router.put(
  '/:id',
  verifyAdmin,
  schemaValidation({ params: pdrSchema.idParams, body: pdrSchema.atualizar }),
  asyncHandler(async (req, res, next) => {
    await pdrCtrl.atualizaPdr(req.params.id, req.body, req.usuarioUuid)

    const msg = 'PDR atualizado com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK)
  })
)

router.delete(
  '/:id',
  verifyAdmin,
  schemaValidation({ params: pdrSchema.idParams }),
  asyncHandler(async (req, res, next) => {
    await pdrCtrl.deletaPdr(req.params.id)

    const msg = 'PDR removido com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK)
  })
)

router.post(
  '/:id/itens',
  verifyAdmin,
  schemaValidation({ params: pdrSchema.idParams, body: pdrSchema.criarItem }),
  asyncHandler(async (req, res, next) => {
    const dados = await pdrCtrl.criaItem(req.params.id, req.body, req.usuarioUuid)

    const msg = 'Item do PDR criado com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.Created, dados)
  })
)

router.put(
  '/item/:itemId',
  verifyAdmin,
  schemaValidation({
    params: pdrSchema.itemIdParams,
    body: pdrSchema.atualizarItem
  }),
  asyncHandler(async (req, res, next) => {
    await pdrCtrl.atualizaItem(req.params.itemId, req.body, req.usuarioUuid)

    const msg = 'Item do PDR atualizado com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK)
  })
)

router.delete(
  '/item/:itemId',
  verifyAdmin,
  schemaValidation({ params: pdrSchema.itemIdParams }),
  asyncHandler(async (req, res, next) => {
    await pdrCtrl.deletaItem(req.params.itemId)

    const msg = 'Item do PDR removido com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK)
  })
)

module.exports = router
