'use strict'

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Controle Orçamentário',
      version: '2.0.0',
      description: 'API HTTP para utilização do Controle Orçamentário'
    }
  },
  apis: ['./src/**/*.js']
}

module.exports = swaggerOptions
