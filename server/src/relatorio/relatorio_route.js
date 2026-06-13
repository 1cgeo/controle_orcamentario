// Path: relatorio\relatorio_route.js
'use strict'

const express = require('express')

const { schemaValidation, asyncHandler, httpCode } = require('../utils')

const { verifyAdmin } = require('../login')

const relatorioCtrl = require('./relatorio_ctrl')

const relatorioSchema = require('./relatorio_schema')

const router = express.Router()

// ---------------------------------------------------------------------------
// B) Gerador da secao 3 (Execucao do PDR). Declarado ANTES das rotas com
// parametro (/:id) para que '/secao3' nao seja capturado como um id.
// ---------------------------------------------------------------------------

router.get(
  '/secao3',
  verifyAdmin,
  schemaValidation({ query: relatorioSchema.secao3Query }),
  asyncHandler(async (req, res, next) => {
    const dados = await relatorioCtrl.gerarSecao3({
      ano: req.query.ano,
      mes: req.query.mes,
      cumulativo: req.query.cumulativo
    })

    const msg = 'Secao 3 do RPCMTec gerada com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

// C) Export Markdown da secao 3.
router.get(
  '/secao3/markdown',
  verifyAdmin,
  schemaValidation({ query: relatorioSchema.secao3Query }),
  asyncHandler(async (req, res, next) => {
    const dados = await relatorioCtrl.gerarSecao3Markdown({
      ano: req.query.ano,
      mes: req.query.mes,
      cumulativo: req.query.cumulativo
    })

    const msg = 'Secao 3 do RPCMTec em Markdown gerada com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

// ---------------------------------------------------------------------------
// A) CRUD da edicao mensal orcamento.relatorio_rpcmtec.
// Sistema admin-only: todas as rotas exigem administrador (verifyAdmin).
// ---------------------------------------------------------------------------

router.get(
  '/',
  verifyAdmin,
  schemaValidation({ query: relatorioSchema.listarQuery }),
  asyncHandler(async (req, res, next) => {
    const dados = await relatorioCtrl.listar({ ano: req.query.ano })

    const msg = 'Edicoes do RPCMTec retornadas com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.get(
  '/:id',
  verifyAdmin,
  schemaValidation({ params: relatorioSchema.idParams }),
  asyncHandler(async (req, res, next) => {
    const dados = await relatorioCtrl.getPorId(req.params.id)

    const msg = 'Edicao do RPCMTec retornada com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

router.post(
  '/',
  verifyAdmin,
  schemaValidation({ body: relatorioSchema.criar }),
  asyncHandler(async (req, res, next) => {
    const dados = await relatorioCtrl.criar(req.body, req.usuarioUuid)

    const msg = 'Edicao do RPCMTec criada com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.Created, dados)
  })
)

router.put(
  '/:id',
  verifyAdmin,
  schemaValidation({
    body: relatorioSchema.atualizar,
    params: relatorioSchema.idParams
  }),
  asyncHandler(async (req, res, next) => {
    await relatorioCtrl.atualizar(req.params.id, req.body, req.usuarioUuid)

    const msg = 'Edicao do RPCMTec atualizada com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK)
  })
)

router.delete(
  '/:id',
  verifyAdmin,
  schemaValidation({ params: relatorioSchema.idParams }),
  asyncHandler(async (req, res, next) => {
    await relatorioCtrl.deletar(req.params.id)

    const msg = 'Edicao do RPCMTec excluida com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK)
  })
)

module.exports = router
