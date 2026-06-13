'use strict'

// Teste unitario do controller de anexos. Mocka o banco (mockDb) e o modulo de
// storage (sem tocar o disco). Cobre: listagem normalizada, substituicao no
// single (NC/DFD) com remocao do arquivo antigo, dono inexistente, insert no
// multi (PDR), exclusao e a limpeza por lista (apagarDoDisco).

const { createMockDb } = require('../helpers/mockDb')

const mockDb = createMockDb()
jest.mock('../../database', () => ({
  db: mockDb,
  databaseVersion: { nome: '1.0.0', load: jest.fn() }
}))

const mockUnlink = jest.fn(async () => {})
jest.mock('../../arquivo/arquivo_storage', () => ({
  tipoDoArquivo: row =>
    row.nota_credito_id != null
      ? 'nota_credito'
      : row.dfd_id != null
        ? 'dfd'
        : 'pdr',
  caminhoDoArquivo: (tipo, nome) => `/fake/${tipo}/${nome}`,
  unlinkQuieto: (...args) => mockUnlink(...args)
}))

const arquivoCtrl = require('../../arquivo/arquivo_ctrl')

const fileFake = (over = {}) => ({
  originalname: 'novo.pdf',
  filename: 'uuid-1.pdf',
  mimetype: 'application/pdf',
  size: 123,
  ...over
})

beforeEach(() => {
  mockDb.reset()
  mockUnlink.mockClear()
})

describe('listarPorVinculo', () => {
  test('normaliza o vinculo (NC) com nulls nos ausentes', async () => {
    mockDb.conn.any.mockResolvedValueOnce([{ id: 1 }])
    const dados = await arquivoCtrl.listarPorVinculo({ nota_credito_id: 5 })
    expect(dados).toHaveLength(1)
    const [, params] = mockDb.conn.any.mock.calls[0]
    expect(params).toEqual({ notaCreditoId: 5, dfdId: null, pdrAno: null })
  })
})

describe('criar (single NC) substitui o anexo anterior', () => {
  test('apaga a linha e o arquivo antigos e insere o novo', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ '?column?': 1 }) // NC existe
    mockDb.conn.any
      .mockResolvedValueOnce([
        { nome_armazenado: 'antigo.pdf', nota_credito_id: 3, dfd_id: null }
      ]) // anexos antigos na tx
      .mockResolvedValueOnce([{ id: 99, nome_original: 'novo.pdf' }]) // lista final

    const dados = await arquivoCtrl.criar(
      fileFake(),
      { nota_credito_id: 3 },
      'user-uuid'
    )

    // 2 none: DELETE do antigo + INSERT do novo
    expect(mockDb.conn.none).toHaveBeenCalledTimes(2)
    // remove o arquivo antigo do disco apos o commit
    expect(mockUnlink).toHaveBeenCalledWith('nota_credito', 'antigo.pdf')
    expect(dados).toEqual([{ id: 99, nome_original: 'novo.pdf' }])
  })

  test('dono inexistente: remove o arquivo recem-gravado e lanca 404', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // NC nao existe

    await expect(
      arquivoCtrl.criar(fileFake(), { nota_credito_id: 999 }, 'user-uuid')
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(mockUnlink).toHaveBeenCalledWith('nota_credito', 'uuid-1.pdf')
    expect(mockDb.conn.none).not.toHaveBeenCalled()
  })
})

describe('criar: nome com acento (UTF-8)', () => {
  test('refaz o originalname latin1 do multer para UTF-8', async () => {
    mockDb.conn.any.mockResolvedValueOnce([{ id: 1 }]) // lista final
    // Simula o que o multer entrega: bytes UTF-8 lidos como latin1.
    const originalLatin1 = Buffer.from('relatório.pdf', 'utf8').toString('latin1')

    await arquivoCtrl.criar(
      fileFake({ originalname: originalLatin1, filename: 'uuid-3.pdf' }),
      { pdr_ano: 2026 },
      'user-uuid'
    )

    const [, meta] = mockDb.conn.none.mock.calls[0]
    expect(meta.nomeOriginal).toBe('relatório.pdf')
    expect(meta.extensao).toBe('pdf')
  })
})

describe('criar (multi PDR)', () => {
  test('nao checa dono e apenas insere', async () => {
    mockDb.conn.any.mockResolvedValueOnce([{ id: 1 }]) // lista final

    await arquivoCtrl.criar(
      fileFake({ originalname: 'pdr.xlsx', filename: 'uuid-2.xlsx' }),
      { pdr_ano: 2026 },
      'user-uuid'
    )

    expect(mockDb.conn.oneOrNone).not.toHaveBeenCalled() // PDR nao tem dono
    expect(mockDb.conn.none).toHaveBeenCalledTimes(1) // so o INSERT
    const [, meta] = mockDb.conn.none.mock.calls[0]
    expect(meta).toMatchObject({
      pdrAno: 2026,
      notaCreditoId: null,
      dfdId: null,
      nomeOriginal: 'pdr.xlsx',
      nomeArmazenado: 'uuid-2.xlsx',
      extensao: 'xlsx'
    })
  })
})

describe('deletar', () => {
  test('remove a linha e o arquivo do disco', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({
      id: 9,
      nota_credito_id: 3,
      dfd_id: null,
      nome_armazenado: 'x.pdf'
    })

    await arquivoCtrl.deletar(9)

    expect(mockDb.conn.none).toHaveBeenCalledTimes(1)
    expect(mockUnlink).toHaveBeenCalledWith('nota_credito', 'x.pdf')
  })

  test('inexistente vira 404', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null)
    await expect(arquivoCtrl.deletar(123)).rejects.toMatchObject({
      statusCode: 404
    })
    expect(mockDb.conn.none).not.toHaveBeenCalled()
  })
})

describe('apagarDoDisco', () => {
  test('remove cada arquivo da lista com o tipo correto', async () => {
    await arquivoCtrl.apagarDoDisco([
      { nome_armazenado: 'a.pdf', nota_credito_id: 3 },
      { nome_armazenado: 'b.xlsx', pdr_ano: 2026 }
    ])
    expect(mockUnlink).toHaveBeenCalledWith('nota_credito', 'a.pdf')
    expect(mockUnlink).toHaveBeenCalledWith('pdr', 'b.xlsx')
  })

  test('lista vazia ou nula nao quebra', async () => {
    await expect(arquivoCtrl.apagarDoDisco(null)).resolves.toBeUndefined()
    expect(mockUnlink).not.toHaveBeenCalled()
  })
})
