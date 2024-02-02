'use strict'
const express = require('express')
const path = require('path')

const { databaseVersion } = require('./database')
const {
  httpCode
} = require('./utils')

const { loginRoute } = require('./login')
const { orcamentarioRoute } = require('./orcamentario')
const { usuarioRoute } = require('./usuario')
const { dashboardRoute } = require('./dashboard')

const router = express.Router()

router.get('/', (req, res, next) => {
  return res.sendJsonAndLog(
    true,
    'Serviço do Controle Orçamentário operacional',
    httpCode.OK,
    {
      database_version: databaseVersion.nome
    }
  )
})

router.use('/login', loginRoute)

router.use(
  '/pdf',
  express.static(path.join(__dirname, 'pdf'))
)

router.use('/orcamentario', orcamentarioRoute)

router.use('/usuarios', usuarioRoute)

router.use('/dashboard', dashboardRoute)

module.exports = router
