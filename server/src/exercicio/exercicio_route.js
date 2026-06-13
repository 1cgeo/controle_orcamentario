// Path: exercicio\exercicio_route.js
'use strict'

const express = require('express')

const { schemaValidation, asyncHandler, httpCode, AppError } = require('../utils')

const { verifyAdmin } = require('../login')

const exercicioCtrl = require('./exercicio_ctrl')

const exercicioSchema = require('./exercicio_schema')

const router = express.Router()

router.get(
  '/',
  verifyAdmin,
  asyncHandler(async (req, res, next) => {
    const dados = await exercicioCtrl.listar()

    return res.sendJsonAndLog(true, 'Exercícios retornados com sucesso', httpCode.OK, dados)
  })
)

router.get(
  '/ativo',
  verifyAdmin,
  asyncHandler(async (req, res, next) => {
    const dados = await exercicioCtrl.getAtivo()

    return res.sendJsonAndLog(true, 'Exercício ativo retornado com sucesso', httpCode.OK, dados)
  })
)

router.get(
  '/:ano',
  verifyAdmin,
  schemaValidation({ params: exercicioSchema.anoParams }),
  asyncHandler(async (req, res, next) => {
    const dados = await exercicioCtrl.getPorAno(req.params.ano)

    if (!dados) {
      throw new AppError('Exercício não encontrado', httpCode.NotFound)
    }

    return res.sendJsonAndLog(true, 'Exercício retornado com sucesso', httpCode.OK, dados)
  })
)

router.post(
  '/',
  verifyAdmin,
  schemaValidation({ body: exercicioSchema.criar }),
  asyncHandler(async (req, res, next) => {
    const dados = await exercicioCtrl.criar(req.body, req.usuarioUuid)

    return res.sendJsonAndLog(true, 'Exercício criado com sucesso', httpCode.Created, dados)
  })
)

router.put(
  '/:ano',
  verifyAdmin,
  schemaValidation({
    params: exercicioSchema.anoParams,
    body: exercicioSchema.atualizar
  }),
  asyncHandler(async (req, res, next) => {
    const dados = await exercicioCtrl.atualizar(req.params.ano, req.body, req.usuarioUuid)

    return res.sendJsonAndLog(true, 'Exercício atualizado com sucesso', httpCode.OK, dados)
  })
)

router.delete(
  '/:ano',
  verifyAdmin,
  schemaValidation({ params: exercicioSchema.anoParams }),
  asyncHandler(async (req, res, next) => {
    await exercicioCtrl.deletar(req.params.ano)

    return res.sendJsonAndLog(true, 'Exercício excluído com sucesso', httpCode.OK)
  })
)

module.exports = router
