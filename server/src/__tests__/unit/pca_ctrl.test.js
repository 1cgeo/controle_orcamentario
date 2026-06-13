'use strict'

// Teste unitario do controller de PCA (banco mockado).
// Cobre: criar (UNIQUE ano+uasg -> 409 dentro da tx) e deletar (409 se ha DFD vinculado).

const { createMockDb } = require('../helpers/mockDb')

const mockDb = createMockDb()
jest.mock('../../database', () => ({
  db: mockDb,
  databaseVersion: { nome: '1.0.0', load: jest.fn() }
}))

const ctrl = require('../../pca/pca_ctrl')
const httpCode = require('../../utils/http_code')

describe('pca_ctrl', () => {
  beforeEach(() => mockDb.reset())

  test('criar insere o PCA e devolve o id (sem conflito)', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // nao existe ano+uasg
    mockDb.conn.one.mockResolvedValueOnce({ id: 7 }) // RETURNING id

    const r = await ctrl.criar(
      { ano: 2026, uasg: '160382', valor_total_estimado: 1000, observacao: null },
      'uuid-1'
    )

    expect(r).toEqual({ id: 7 })
    expect(mockDb.conn.tx).toHaveBeenCalledTimes(1)
    expect(mockDb.conn.one).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO orcamento.pca'),
      expect.objectContaining({ ano: 2026, uasg: '160382', usuarioUuid: 'uuid-1' })
    )
  })

  test('criar bloqueia UNIQUE(ano, uasg) com 409', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ id: 3 }) // ja existe
    await expect(
      ctrl.criar({ ano: 2026, uasg: '160382', valor_total_estimado: null, observacao: null }, 'uuid')
    ).rejects.toMatchObject({ statusCode: httpCode.Conflict })
    expect(mockDb.conn.one).not.toHaveBeenCalled()
  })

  test('deletar bloqueia com 409 quando ha DFD vinculado', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ id: 1 }) // PCA existe
    mockDb.conn.one.mockResolvedValueOnce({ n: 2 }) // ha 2 DFDs
    await expect(ctrl.deletar(1)).rejects.toMatchObject({
      statusCode: httpCode.Conflict
    })
    expect(mockDb.conn.none).not.toHaveBeenCalled()
  })

  test('deletar remove quando nao ha DFD vinculado', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ id: 1 }) // PCA existe
    mockDb.conn.one.mockResolvedValueOnce({ n: 0 }) // sem dependentes
    mockDb.conn.none.mockResolvedValueOnce(undefined)
    await ctrl.deletar(1)
    expect(mockDb.conn.none).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM orcamento.pca'),
      { id: 1 }
    )
  })

  test('deletar com PCA inexistente vira 404', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // nao existe
    await expect(ctrl.deletar(99)).rejects.toMatchObject({
      statusCode: httpCode.NotFound
    })
  })
})
