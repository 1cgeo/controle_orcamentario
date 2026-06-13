// Path: arquivo\arquivo_storage.js
'use strict'

// Resolucao do diretorio de armazenamento dos anexos e utilitarios de disco.
// Os bytes ficam no filesystem (STORAGE_PATH), organizados em subpastas por tipo
// de vinculo (nota_credito / dfd / pdr); o banco guarda so os metadados.

const path = require('path')
const fs = require('fs')

const { STORAGE_PATH } = require('../config')

// Raiz do servidor (pasta server/), onde tambem vive o config.env. STORAGE_PATH
// relativo e resolvido a partir daqui (igual ao create_config.js), para nao
// depender do cwd do processo.
const SERVER_ROOT = path.join(__dirname, '..', '..')

const STORAGE_ROOT = path.isAbsolute(STORAGE_PATH)
  ? STORAGE_PATH
  : path.join(SERVER_ROOT, STORAGE_PATH)

// Subpasta de cada tipo de vinculo.
const tipoDoArquivo = row => {
  if (row.nota_credito_id != null) return 'nota_credito'
  if (row.dfd_id != null) return 'dfd'
  return 'pdr'
}

const caminhoDoArquivo = (tipo, nomeArmazenado) =>
  path.join(STORAGE_ROOT, tipo, nomeArmazenado)

// Garante a subpasta do tipo e devolve seu caminho.
const ensureDir = tipo => {
  const dir = path.join(STORAGE_ROOT, tipo)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

// Remove o arquivo do disco; ignora "nao existe" (idempotente).
const unlinkQuieto = async (tipo, nomeArmazenado) => {
  try {
    await fs.promises.unlink(caminhoDoArquivo(tipo, nomeArmazenado))
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }
}

module.exports = {
  STORAGE_ROOT,
  tipoDoArquivo,
  caminhoDoArquivo,
  ensureDir,
  unlinkQuieto
}
