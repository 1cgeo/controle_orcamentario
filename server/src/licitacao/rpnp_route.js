// Path: licitacao\rpnp_route.js
'use strict'

const express = require('express')

const { schemaValidation, asyncHandler, httpCode } = require('../utils')

const { verifyAdmin } = require('../login')

const rpnpCtrl = require('./rpnp_ctrl')

const rpnpSchema = require('./rpnp_schema')

const router = express.Router()

router.get(
  '/',
  verifyAdmin,
  schemaValidation({ query: rpnpSchema.listarQuery }),
  asyncHandler(async (req, res, next) => {
    const dados = await rpnpCtrl.listar({
      ano_exercicio: req.query.ano_exercicio
    })

    const msg = 'RPNP retornados com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.get(
  '/:id',
  verifyAdmin,
  schemaValidation({ params: rpnpSchema.idParams }),
  asyncHandler(async (req, res, next) => {
    const dados = await rpnpCtrl.getPorId(req.params.id)

    const msg = 'RPNP retornado com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.post(
  '/',
  verifyAdmin,
  schemaValidation({ body: rpnpSchema.criar }),
  asyncHandler(async (req, res, next) => {
    const dados = await rpnpCtrl.criar(req.body, req.usuarioUuid)

    const msg = 'RPNP criado com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.Created, dados)
  })
)

router.put(
  '/:id',
  verifyAdmin,
  schemaValidation({
    body: rpnpSchema.atualizar,
    params: rpnpSchema.idParams
  }),
  asyncHandler(async (req, res, next) => {
    await rpnpCtrl.atualizar(req.params.id, req.body, req.usuarioUuid)

    const msg = 'RPNP atualizado com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK)
  })
)

router.delete(
  '/:id',
  verifyAdmin,
  schemaValidation({ params: rpnpSchema.idParams }),
  asyncHandler(async (req, res, next) => {
    await rpnpCtrl.deletar(req.params.id)

    const msg = 'RPNP excluido com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK)
  })
)

module.exports = router
