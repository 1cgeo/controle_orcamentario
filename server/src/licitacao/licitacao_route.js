// Path: licitacao\licitacao_route.js
'use strict'

const express = require('express')

const { schemaValidation, asyncHandler, httpCode } = require('../utils')

const { verifyAdmin } = require('../login')

const licitacaoCtrl = require('./licitacao_ctrl')

const licitacaoSchema = require('./licitacao_schema')

const router = express.Router()

router.get(
  '/',
  verifyAdmin,
  schemaValidation({ query: licitacaoSchema.listarQuery }),
  asyncHandler(async (req, res, next) => {
    const dados = await licitacaoCtrl.listar({
      ano: req.query.ano,
      tipo_id: req.query.tipo_id
    })

    const msg = 'Licitacoes retornadas com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.get(
  '/:id',
  verifyAdmin,
  schemaValidation({ params: licitacaoSchema.idParams }),
  asyncHandler(async (req, res, next) => {
    const dados = await licitacaoCtrl.getPorId(req.params.id)

    const msg = 'Licitacao retornada com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.post(
  '/',
  verifyAdmin,
  schemaValidation({ body: licitacaoSchema.criar }),
  asyncHandler(async (req, res, next) => {
    const dados = await licitacaoCtrl.criar(req.body, req.usuarioUuid)

    const msg = 'Licitacao criada com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.Created, dados)
  })
)

router.put(
  '/:id',
  verifyAdmin,
  schemaValidation({
    body: licitacaoSchema.atualizar,
    params: licitacaoSchema.idParams
  }),
  asyncHandler(async (req, res, next) => {
    await licitacaoCtrl.atualizar(req.params.id, req.body, req.usuarioUuid)

    const msg = 'Licitacao atualizada com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK)
  })
)

router.delete(
  '/:id',
  verifyAdmin,
  schemaValidation({ params: licitacaoSchema.idParams }),
  asyncHandler(async (req, res, next) => {
    await licitacaoCtrl.deletar(req.params.id)

    const msg = 'Licitacao excluida com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK)
  })
)

module.exports = router
