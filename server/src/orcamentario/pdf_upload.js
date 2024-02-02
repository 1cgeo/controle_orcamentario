'use strict'

const multer = require('multer')
const { AppError, httpCode } = require('../utils')

const { PATH_PDF } = require('../config')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PATH_PDF + '/credito')
  },
  filename: (req, file, cb) => {
    const nome = file.originalname.split('.')
    const extensao = nome.pop()
    const nomeCorrigido = req.body.numero + '.' + extensao
    cb(null, nomeCorrigido)
  }
})

const fileFilter = function (req, file, cb) {
  if (!file.originalname.match(/\.(pdf|PDF)$/)) {
    return cb(new AppError('O arquivo deve ter extensão .pdf', httpCode.BadRequest), false)
  }
  cb(null, true)
}

const upload = multer({ storage: storage, fileFilter: fileFilter }).single('credito_pdf')

module.exports = upload
