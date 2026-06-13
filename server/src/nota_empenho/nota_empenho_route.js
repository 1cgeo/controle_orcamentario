// Path: nota_empenho\nota_empenho_route.js
'use strict'

const express = require('express')

const { schemaValidation, asyncHandler, httpCode } = require('../utils')

const { verifyLogin, verifyAdmin } = require('../login')

const notaEmpenhoCtrl = require('./nota_empenho_ctrl')

const notaEmpenhoSchema = require('./nota_empenho_schema')

const router = express.Router()

router.get(
  '/',
  verifyLogin,
  schemaValidation({ query: notaEmpenhoSchema.listarQuery }),
  asyncHandler(async (req, res, next) => {
    const dados = await notaEmpenhoCtrl.listar({
      nota_credito_id: req.query.nota_credito_id,
      ano: req.query.ano
    })

    const msg = 'Notas de empenho retornadas com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.get(
  '/:id',
  verifyLogin,
  schemaValidation({ params: notaEmpenhoSchema.idParams }),
  asyncHandler(async (req, res, next) => {
    const dados = await notaEmpenhoCtrl.getPorId(req.params.id)

    const msg = 'Nota de empenho retornada com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.post(
  '/',
  verifyAdmin,
  schemaValidation({ body: notaEmpenhoSchema.criar }),
  asyncHandler(async (req, res, next) => {
    const dados = await notaEmpenhoCtrl.criar(req.body, req.usuarioUuid)

    const msg = 'Nota de empenho criada com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.Created, dados)
  })
)

router.put(
  '/:id',
  verifyAdmin,
  schemaValidation({
    body: notaEmpenhoSchema.atualizar,
    params: notaEmpenhoSchema.idParams
  }),
  asyncHandler(async (req, res, next) => {
    await notaEmpenhoCtrl.atualizar(req.params.id, req.body, req.usuarioUuid)

    const msg = 'Nota de empenho atualizada com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK)
  })
)

router.delete(
  '/:id',
  verifyAdmin,
  schemaValidation({ params: notaEmpenhoSchema.idParams }),
  asyncHandler(async (req, res, next) => {
    await notaEmpenhoCtrl.deletar(req.params.id)

    const msg = 'Nota de empenho excluida com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK)
  })
)

module.exports = router
