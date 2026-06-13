// Path: utils\schema_validation.js
'use strict'

const AppError = require('./app_error')
const httpCode = require('./http_code')

const validationError = (error, context) => {
  const { details } = error
  const message = details.map(i => i.message).join(',')

  return new AppError(
    `Erro de validação dos ${context}. Mensagem de erro: ${message}`,
    httpCode.BadRequest,
    message
  )
}

const middleware = ({
  body: bodySchema,
  query: querySchema,
  params: paramsSchema
}) => {
  return (req, res, next) => {
    if (querySchema) {
      const { error, value } = querySchema.validate(req.query, {
        abortEarly: false
      })
      if (error) {
        return next(validationError(error, 'Query'))
      }
      // Express 5: req.query is a getter-only property, override with defineProperty
      Object.defineProperty(req, 'query', { value, configurable: true })
    }
    if (paramsSchema) {
      const { error, value } = paramsSchema.validate(req.params, {
        abortEarly: false
      })
      if (error) {
        return next(validationError(error, 'Parâmetros'))
      }
      // Express 5: req.params is a getter-only property, override with defineProperty
      Object.defineProperty(req, 'params', { value, configurable: true })
    }
    if (bodySchema) {
      const { error, value } = bodySchema.validate(req.body, {
        stripUnknown: true,
        abortEarly: false
      })
      if (error) {
        return next(validationError(error, 'Dados'))
      }
      req.body = value
    }

    return next()
  }
}

module.exports = middleware
