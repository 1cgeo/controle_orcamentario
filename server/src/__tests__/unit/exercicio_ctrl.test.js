'use strict'

// Teste unitario do controller de exercicio (banco mockado).
// Exemplar do padrao: mocka ../../database, exercita as regras de negocio.

const { createMockDb } = require('../helpers/mockDb')

const mockDb = createMockDb()
jest.mock('../../database', () => ({
  db: mockDb,
  databaseVersion: { nome: '1.0.0', load: jest.fn() }
}))

const ctrl = require('../../exercicio/exercicio_ctrl')
const httpCode = require('../../utils/http_code')

describe('exercicio_ctrl', () => {
  beforeEach(() => mockDb.reset())

  test('listar retorna a lista vinda do banco', async () => {
    mockDb.conn.any.mockResolvedValueOnce([{ ano: 2026 }, { ano: 2025 }])
    const r = await ctrl.listar()
    expect(r).toHaveLength(2)
    expect(mockDb.conn.any).toHaveBeenCalledTimes(1)
  })

  test('getAtivo usa WHERE ativo IS TRUE', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ ano: 2026, ativo: true })
    const r = await ctrl.getAtivo()
    expect(r.ano).toBe(2026)
    expect(mockDb.conn.oneOrNone).toHaveBeenCalledWith(
      expect.stringContaining('ativo IS TRUE')
    )
  })

  test('criar bloqueia ano duplicado com 409', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ ano: 2026 }) // ja existe
    await expect(
      ctrl.criar({ ano: 2026, uasg: '160382', codom: null, ativo: false }, 'uuid')
    ).rejects.toMatchObject({ statusCode: httpCode.Conflict })
  })

  test('criar com ativo=true zera os demais ativos e insere', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // nao existe
    mockDb.conn.none.mockResolvedValueOnce(undefined) // zera ativos
    mockDb.conn.one.mockResolvedValueOnce({ ano: 2026 })

    const r = await ctrl.criar(
      { ano: 2026, uasg: '160382', codom: null, ativo: true },
      'uuid'
    )

    expect(mockDb.conn.none).toHaveBeenCalledWith(
      expect.stringContaining('SET ativo = FALSE')
    )
    expect(r).toEqual({ ano: 2026 })
  })

  test('deletar bloqueia com 409 quando ha metas vinculadas', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ ano: 2026 }) // existe
    mockDb.conn.one.mockResolvedValueOnce({ n: 3 }) // tem 3 metas
    await expect(ctrl.deletar(2026)).rejects.toMatchObject({
      statusCode: httpCode.Conflict
    })
    expect(mockDb.conn.none).not.toHaveBeenCalled()
  })

  test('deletar remove quando nao ha dependentes', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ ano: 2026 })
    mockDb.conn.one.mockResolvedValueOnce({ n: 0 })
    mockDb.conn.none.mockResolvedValueOnce(undefined)
    await ctrl.deletar(2026)
    expect(mockDb.conn.none).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM orcamento.exercicio'),
      { ano: 2026 }
    )
  })
})
