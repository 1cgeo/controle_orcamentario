// Path: routes.js
'use strict'
const express = require('express')

const { databaseVersion } = require('./database')
const { httpCode } = require('./utils')

const { loginRoute } = require('./login')
const { usuarioRoute } = require('./usuario')
const { dominioRoute } = require('./dominio')
const { exercicioRoute, metaRoute } = require('./exercicio')
const { pcaRoute, dfdRoute } = require('./pca')
const { pdrRoute } = require('./pdr')
const { notaCreditoRoute } = require('./nota_credito')
const { notaEmpenhoRoute, liquidacaoRoute, recebimentoRoute } = require('./nota_empenho')
const { licitacaoRoute, rpnpRoute } = require('./licitacao')
const { relatorioRoute } = require('./relatorio')

const router = express.Router()

router.get('/', (req, res, next) => {
  return res.sendJsonAndLog(
    true,
    'Sistema de Controle Orçamentário operacional',
    httpCode.OK,
    {
      database_version: databaseVersion.nome
    }
  )
})

router.use('/login', loginRoute)

router.use('/usuarios', usuarioRoute)

router.use('/dominio', dominioRoute)

router.use('/exercicios', exercicioRoute)

router.use('/metas', metaRoute)

router.use('/pca', pcaRoute)

router.use('/dfd', dfdRoute)

router.use('/pdr', pdrRoute)

router.use('/notas_credito', notaCreditoRoute)

router.use('/notas_empenho', notaEmpenhoRoute)

router.use('/liquidacoes', liquidacaoRoute)

router.use('/recebimentos', recebimentoRoute)

router.use('/licitacoes', licitacaoRoute)

router.use('/rpnp', rpnpRoute)

router.use('/relatorio', relatorioRoute)

module.exports = router
