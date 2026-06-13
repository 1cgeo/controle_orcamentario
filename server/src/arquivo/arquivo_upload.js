// Path: arquivo\arquivo_upload.js
'use strict'

// Middleware de upload (multer) para um unico arquivo no campo "arquivo".
// O vinculo vem na query (nota_credito_id | dfd_id | pdr_ano), ja validado e
// coercido pelo schemaValidation que roda antes deste middleware. A extensao
// aceita depende do tipo de vinculo: NC e DFD aceitam so PDF; o PDR aceita PDF
// e planilhas. O nome em disco e um UUID (evita colisao e path traversal); o
// nome original do usuario fica so nos metadados.

const multer = require('multer')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const { AppError, httpCode } = require('../utils')
const { ensureDir } = require('./arquivo_storage')

const EXT_NC_DFD = ['.pdf']
const EXT_PDR = ['.pdf', '.xlsx', '.xls', '.csv', '.ods']
const MAX_BYTES = 50 * 1024 * 1024 // 50 MB

const tipoDaQuery = query => {
  if (query.nota_credito_id != null) return 'nota_credito'
  if (query.dfd_id != null) return 'dfd'
  if (query.pdr_ano != null) return 'pdr'
  return null
}

const extensoesPermitidas = tipo => (tipo === 'pdr' ? EXT_PDR : EXT_NC_DFD)

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tipo = tipoDaQuery(req.query)
    if (!tipo) {
      return cb(new AppError('Vínculo do anexo não informado', httpCode.BadRequest))
    }
    try {
      cb(null, ensureDir(tipo))
    } catch (e) {
      cb(e)
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${uuidv4()}${ext}`)
  }
})

const fileFilter = (req, file, cb) => {
  const tipo = tipoDaQuery(req.query)
  const ext = path.extname(file.originalname).toLowerCase()
  const permitidas = extensoesPermitidas(tipo)
  if (!permitidas.includes(ext)) {
    return cb(
      new AppError(
        `Tipo de arquivo não permitido para este anexo (${ext || 'sem extensão'}). Aceitos: ${permitidas.join(', ')}`,
        httpCode.BadRequest
      )
    )
  }
  cb(null, true)
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_BYTES }
}).single('arquivo')

// Wrapper: traduz MulterError (ex.: arquivo grande demais) numa AppError 400
// amigavel; erros do fileFilter/destination ja sao AppError e passam direto.
const uploadArquivo = (req, res, next) => {
  upload(req, res, err => {
    if (!err) return next()
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Arquivo excede o tamanho máximo de 50 MB'
          : `Erro no upload do arquivo: ${err.message}`
      return next(new AppError(msg, httpCode.BadRequest, err))
    }
    return next(err)
  })
}

module.exports = uploadArquivo
