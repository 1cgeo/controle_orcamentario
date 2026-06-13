'use strict'

// Teste unitario do controller de PDR (banco mockado).
// Cobre: criar com itens (transacao), UNIQUE de ano -> 409, bloqueio de
// exclusao por nota_credito vinculada a um item, e os endpoints de item
// avulso (criar OK / 404, atualizar via result.rowCount, deletar 409).

const { createMockDb } = require('../helpers/mockDb')

const mockDb = createMockDb()
jest.mock('../../database', () => ({
  db: mockDb,
  databaseVersion: { nome: '1.0.0', load: jest.fn() }
}))

const ctrl = require('../../pdr/pdr_ctrl')
const httpCode = require('../../utils/http_code')

beforeEach(() => mockDb.reset())

describe('pdr_ctrl.criaPdr', () => {
  test('caminho feliz: cria o PDR e insere os itens, devolve o id', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // ano nao existe
    mockDb.conn.one.mockResolvedValueOnce({ id: 30 }) // INSERT pdr RETURNING
    mockDb.conn.none.mockResolvedValueOnce(undefined) // insert itens (helpers)

    const r = await ctrl.criaPdr(
      {
        ano: 2026,
        valor_solicitado: 100,
        valor_autorizado: 80,
        gnd3_autorizado: null,
        gnd4_autorizado: null,
        acao_orcamentaria: null,
        plano_orcamentario: null,
        data_assinatura: null,
        revisao: null,
        itens: [{ cod_nd: '339030', valor_autorizado: 80 }]
      },
      'uuid'
    )

    expect(r).toEqual({ id: 30 })
    expect(mockDb.conn.tx).toHaveBeenCalledTimes(1)
    // os itens foram inseridos (t.none com a query do helpers.insert)
    expect(mockDb.conn.none).toHaveBeenCalledTimes(1)
  })

  test('sem itens nao chama o insert de itens', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null)
    mockDb.conn.one.mockResolvedValueOnce({ id: 31 })

    await ctrl.criaPdr({ ano: 2027, itens: [] }, 'uuid')
    expect(mockDb.conn.none).not.toHaveBeenCalled()
  })

  test('UNIQUE de ano -> 409 quando ja existe PDR para o ano', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ id: 9 }) // ja existe

    await expect(
      ctrl.criaPdr({ ano: 2026, itens: [] }, 'uuid')
    ).rejects.toMatchObject({ statusCode: httpCode.Conflict })
    expect(mockDb.conn.one).not.toHaveBeenCalled()
  })
})

describe('pdr_ctrl.getPdr', () => {
  test('404 quando o PDR nao existe', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null)
    await expect(ctrl.getPdr(1)).rejects.toMatchObject({
      statusCode: httpCode.NotFound
    })
  })

  test('devolve o PDR com seus itens', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ id: 1, ano: 2026 })
    mockDb.conn.any.mockResolvedValueOnce([{ id: 10 }, { id: 11 }])
    const pdr = await ctrl.getPdr(1)
    expect(pdr.itens).toHaveLength(2)
  })
})

describe('pdr_ctrl.deletaPdr', () => {
  test('404 quando o PDR nao existe', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null)
    await expect(ctrl.deletaPdr(1)).rejects.toMatchObject({
      statusCode: httpCode.NotFound
    })
  })

  test('409 quando ha nota_credito apontando um item do PDR', async () => {
    mockDb.conn.oneOrNone
      .mockResolvedValueOnce({ id: 1 }) // existe
      .mockResolvedValueOnce({ '?column?': 1 }) // item referenciado por NC

    await expect(ctrl.deletaPdr(1)).rejects.toMatchObject({
      statusCode: httpCode.Conflict
    })
    expect(mockDb.conn.none).not.toHaveBeenCalled()
  })

  test('remove itens e PDR quando nao ha referencias', async () => {
    mockDb.conn.oneOrNone
      .mockResolvedValueOnce({ id: 1 }) // existe
      .mockResolvedValueOnce(null) // sem referencia
    mockDb.conn.none
      .mockResolvedValueOnce(undefined) // DELETE itens
      .mockResolvedValueOnce(undefined) // DELETE pdr

    await ctrl.deletaPdr(1)
    expect(mockDb.conn.none).toHaveBeenCalledTimes(2)
  })
})

describe('pdr_ctrl.criaItem', () => {
  test('caminho feliz: insere o item no PDR existente', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ id: 1 }) // PDR existe
    mockDb.conn.one.mockResolvedValueOnce({ id: 77 }) // INSERT RETURNING

    const r = await ctrl.criaItem(1, { cod_nd: '339030' }, 'uuid')
    expect(r).toEqual({ id: 77 })
  })

  test('404 quando o PDR nao existe', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null)
    await expect(
      ctrl.criaItem(999, { cod_nd: '339030' }, 'uuid')
    ).rejects.toMatchObject({ statusCode: httpCode.NotFound })
    expect(mockDb.conn.one).not.toHaveBeenCalled()
  })
})

describe('pdr_ctrl.atualizaItem', () => {
  test('caminho feliz: rowCount === 1 resolve sem erro', async () => {
    mockDb.conn.result.mockResolvedValueOnce({ rowCount: 1 })
    await expect(
      ctrl.atualizaItem(10, { cod_nd: '339030' }, 'uuid')
    ).resolves.toBeUndefined()
  })

  test('404 quando o item nao existe (rowCount 0)', async () => {
    mockDb.conn.result.mockResolvedValueOnce({ rowCount: 0 })
    await expect(
      ctrl.atualizaItem(999, { cod_nd: '339030' }, 'uuid')
    ).rejects.toMatchObject({ statusCode: httpCode.NotFound })
  })
})

describe('pdr_ctrl.deletaItem', () => {
  test('404 quando o item nao existe', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null)
    await expect(ctrl.deletaItem(1)).rejects.toMatchObject({
      statusCode: httpCode.NotFound
    })
  })

  test('409 quando ha nota_credito vinculada ao item', async () => {
    mockDb.conn.oneOrNone
      .mockResolvedValueOnce({ id: 1 }) // item existe
      .mockResolvedValueOnce({ '?column?': 1 }) // NC vinculada

    await expect(ctrl.deletaItem(1)).rejects.toMatchObject({
      statusCode: httpCode.Conflict
    })
    expect(mockDb.conn.none).not.toHaveBeenCalled()
  })

  test('remove o item quando nao ha NC vinculada', async () => {
    mockDb.conn.oneOrNone
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce(null)
    mockDb.conn.none.mockResolvedValueOnce(undefined)
    await ctrl.deletaItem(1)
    expect(mockDb.conn.none).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM orcamento.pdr_item'),
      { itemId: 1 }
    )
  })
})
