// Path: arquivo\arquivo_route.js
'use strict'

const express = require('express')
const fs = require('fs')

const { schemaValidation, asyncHandler, httpCode, AppError } = require('../utils')
const { verifyAdmin } = require('../login')

const arquivoCtrl = require('./arquivo_ctrl')
const arquivoSchema = require('./arquivo_schema')
const uploadArquivo = require('./arquivo_upload')

const router = express.Router()

// Lista os anexos de um vinculo (?nota_credito_id= | ?dfd_id= | ?pdr_ano=).
router.get(
  '/',
  verifyAdmin,
  schemaValidation({ query: arquivoSchema.vinculoQuery }),
  asyncHandler(async (req, res, next) => {
    const dados = await arquivoCtrl.listarPorVinculo(req.query)

    const msg = 'Arquivos retornados com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK, dados)
  })
)

// Anexa um arquivo a um vinculo. O vinculo vem na query; o arquivo no campo
// multipart "arquivo". Ordem: auth -> valida query -> multer -> handler.
router.post(
  '/',
  verifyAdmin,
  schemaValidation({ query: arquivoSchema.vinculoQuery }),
  uploadArquivo,
  asyncHandler(async (req, res, next) => {
    if (!req.file) {
      throw new AppError(
        'Nenhum arquivo enviado (campo "arquivo")',
        httpCode.BadRequest
      )
    }

    const dados = await arquivoCtrl.criar(req.file, req.query, req.usuarioUuid)

    const msg = 'Arquivo anexado com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.Created, dados)
  })
)

// Baixa o arquivo (stream) com o nome original no Content-Disposition.
router.get(
  '/:id/download',
  verifyAdmin,
  schemaValidation({ params: arquivoSchema.idParams }),
  asyncHandler(async (req, res, next) => {
    const arquivo = await arquivoCtrl.getParaDownload(req.params.id)

    res.setHeader(
      'Content-Type',
      arquivo.mimetype || 'application/octet-stream'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(arquivo.nome_original)}`
    )

    const stream = fs.createReadStream(arquivo.caminho)
    // Erro tardio (apos cabecalhos): derruba a conexao; o middleware de erro do
    // app.js delega ao handler default quando res.headersSent.
    stream.on('error', err => {
      if (res.headersSent) {
        return res.destroy(err)
      }
      return next(err)
    })
    stream.pipe(res)
  })
)

// Remove o anexo (linha + arquivo do disco).
router.delete(
  '/:id',
  verifyAdmin,
  schemaValidation({ params: arquivoSchema.idParams }),
  asyncHandler(async (req, res, next) => {
    await arquivoCtrl.deletar(req.params.id)

    const msg = 'Arquivo excluido com sucesso'

    return res.sendJsonAndLog(true, msg, httpCode.OK)
  })
)

module.exports = router
