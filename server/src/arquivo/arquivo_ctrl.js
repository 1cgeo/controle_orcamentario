// Path: arquivo\arquivo_ctrl.js
'use strict'

const fs = require('fs')
const path = require('path')

const { db } = require('../database')
const { AppError, httpCode } = require('../utils')
const {
  tipoDoArquivo,
  caminhoDoArquivo,
  unlinkQuieto
} = require('./arquivo_storage')

const controller = {}

// O multer/busboy entrega file.originalname decodificado como latin1; refaz
// para UTF-8 para nao corromper nomes com acento (ex.: "relatório.pdf"). Para
// nomes ASCII e um no-op.
const decodeNome = nome => Buffer.from(nome, 'latin1').toString('utf8')

// Colunas devolvidas ao client (sem caminho fisico em disco).
const COLUNAS =
  `id, nota_credito_id, dfd_id, pdr_ano, nome_original, nome_armazenado,
   extensao, mimetype, tamanho_bytes, data_cadastramento, usuario_cadastramento_uuid`

const INSERT_SQL = `INSERT INTO orcamento.arquivo
    (nota_credito_id, dfd_id, pdr_ano, nome_original, nome_armazenado,
     extensao, mimetype, tamanho_bytes, usuario_cadastramento_uuid)
  VALUES
    ($<notaCreditoId>, $<dfdId>, $<pdrAno>, $<nomeOriginal>, $<nomeArmazenado>,
     $<extensao>, $<mimetype>, $<tamanhoBytes>, $<usuarioUuid>)`

// Normaliza o vinculo (NC | DFD | PDR-ano) num trio com null nos ausentes.
const normalizarVinculo = vinculo => ({
  notaCreditoId: vinculo.nota_credito_id != null ? vinculo.nota_credito_id : null,
  dfdId: vinculo.dfd_id != null ? vinculo.dfd_id : null,
  pdrAno: vinculo.pdr_ano != null ? vinculo.pdr_ano : null
})

controller.listarPorVinculo = async vinculo => {
  const { notaCreditoId, dfdId, pdrAno } = normalizarVinculo(vinculo)
  // Exatamente um dos tres e nao-nulo (garantido pelo schema); o branch ativo
  // filtra pela coluna correspondente.
  return db.conn.any(
    `SELECT ${COLUNAS}
       FROM orcamento.arquivo
      WHERE ($<notaCreditoId>::bigint IS NOT NULL AND nota_credito_id = $<notaCreditoId>)
         OR ($<dfdId>::bigint IS NOT NULL AND dfd_id = $<dfdId>)
         OR ($<pdrAno>::smallint IS NOT NULL AND pdr_ano = $<pdrAno>)
      ORDER BY data_cadastramento, id`,
    { notaCreditoId, dfdId, pdrAno }
  )
}

// Cria o registro do anexo a partir do arquivo ja gravado pelo multer (file).
// Para NC/DFD (single) substitui o anexo anterior em transacao e remove o
// arquivo antigo do disco apos o commit. Devolve a lista atualizada do vinculo.
controller.criar = async (file, vinculo, usuarioUuid) => {
  const { notaCreditoId, dfdId, pdrAno } = normalizarVinculo(vinculo)

  // Valida o dono (NC/DFD). PDR e nivel ano: nao ha linha pai para checar.
  if (notaCreditoId != null) {
    const nc = await db.conn.oneOrNone(
      'SELECT 1 FROM orcamento.nota_credito WHERE id = $1',
      [notaCreditoId]
    )
    if (!nc) {
      await unlinkQuieto('nota_credito', file.filename)
      throw new AppError('Nota de credito nao encontrada', httpCode.NotFound)
    }
  } else if (dfdId != null) {
    const dfd = await db.conn.oneOrNone(
      'SELECT 1 FROM orcamento.dfd WHERE id = $1',
      [dfdId]
    )
    if (!dfd) {
      await unlinkQuieto('dfd', file.filename)
      throw new AppError('DFD nao encontrado', httpCode.NotFound)
    }
  }

  const nomeOriginal = decodeNome(file.originalname)
  const meta = {
    notaCreditoId,
    dfdId,
    pdrAno,
    nomeOriginal,
    nomeArmazenado: file.filename,
    extensao: path.extname(nomeOriginal).replace('.', '').toLowerCase(),
    mimetype: file.mimetype || null,
    tamanhoBytes: file.size != null ? file.size : null,
    usuarioUuid
  }

  const single = notaCreditoId != null || dfdId != null

  if (single) {
    // coluna e um identificador interno controlado (nunca entrada do usuario).
    const coluna = notaCreditoId != null ? 'nota_credito_id' : 'dfd_id'
    const valorDono = notaCreditoId != null ? notaCreditoId : dfdId

    const antigos = await db.conn.tx(async t => {
      const old = await t.any(
        `SELECT nome_armazenado, nota_credito_id, dfd_id
           FROM orcamento.arquivo WHERE ${coluna} = $1`,
        [valorDono]
      )
      if (old.length) {
        await t.none(`DELETE FROM orcamento.arquivo WHERE ${coluna} = $1`, [
          valorDono
        ])
      }
      await t.none(INSERT_SQL, meta)
      return old
    })

    // Apos o commit, remove do disco os arquivos substituidos.
    for (const a of antigos) {
      await unlinkQuieto(tipoDoArquivo(a), a.nome_armazenado)
    }
  } else {
    await db.conn.none(INSERT_SQL, meta)
  }

  return controller.listarPorVinculo(vinculo)
}

// Metadados + caminho fisico de um anexo, para download. Valida existencia no
// banco e no disco (404 amigavel se o arquivo sumiu do armazenamento).
controller.getParaDownload = async id => {
  const arquivo = await db.conn.oneOrNone(
    `SELECT id, nota_credito_id, dfd_id, pdr_ano, nome_original,
            nome_armazenado, mimetype
       FROM orcamento.arquivo WHERE id = $1`,
    [id]
  )
  if (!arquivo) {
    throw new AppError('Arquivo nao encontrado', httpCode.NotFound)
  }

  const caminho = caminhoDoArquivo(tipoDoArquivo(arquivo), arquivo.nome_armazenado)
  try {
    await fs.promises.access(caminho, fs.constants.R_OK)
  } catch {
    throw new AppError(
      'Arquivo nao encontrado no armazenamento',
      httpCode.NotFound
    )
  }

  return { ...arquivo, caminho }
}

controller.deletar = async id => {
  const arquivo = await db.conn.oneOrNone(
    'SELECT id, nota_credito_id, dfd_id, nome_armazenado FROM orcamento.arquivo WHERE id = $1',
    [id]
  )
  if (!arquivo) {
    throw new AppError('Arquivo nao encontrado', httpCode.NotFound)
  }

  await db.conn.none('DELETE FROM orcamento.arquivo WHERE id = $1', [id])
  await unlinkQuieto(tipoDoArquivo(arquivo), arquivo.nome_armazenado)
}

// Remove do disco os arquivos de uma lista (linhas ja saem por ON DELETE CASCADE
// quando o dono e excluido). Usado pelos deletes de NC e DFD: leia a lista ANTES
// de excluir o pai e chame isto DEPOIS.
controller.apagarDoDisco = async arquivos => {
  for (const a of arquivos || []) {
    await unlinkQuieto(tipoDoArquivo(a), a.nome_armazenado)
  }
}

module.exports = controller
