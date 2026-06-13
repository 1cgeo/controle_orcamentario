'use strict'

// Teste de rota (supertest) do PDR. Mocka banco e autenticacao.
// Cobre: GET, criar com itens (201), UNIQUE de ano (409), validacao Joi,
// DELETE com 409 por NC vinculada, e os endpoints de item avulso
// (POST /:id/itens, PUT /item/:itemId, DELETE /item/:itemId) com caminho
// feliz e um 404.

const { createMockDb } = require('../helpers/mockDb')

const mockDb = createMockDb()
jest.mock('../../database', () => ({
  db: mockDb,
  databaseVersion: { nome: '1.0.0', load: jest.fn() }
}))
jest.mock('../../login', () => require('../helpers/mockLogin'))

const request = require('supertest')
const { buildTestApp } = require('../helpers/testApp')
const { pdrRoute } = require('../../pdr')

const app = buildTestApp([{ path: '/pdr', router: pdrRoute }])

beforeEach(() => mockDb.reset())

describe('GET /pdr', () => {
  test('devolve o envelope padrao com os dados', async () => {
    mockDb.conn.any.mockResolvedValueOnce([{ id: 1, ano: 2026 }])
    const res = await request(app).get('/pdr')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.dados).toHaveLength(1)
  })
})

describe('POST /pdr', () => {
  test('cria PDR com itens e responde 201', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // ano livre
    mockDb.conn.one.mockResolvedValueOnce({ id: 12 }) // INSERT pdr
    mockDb.conn.none.mockResolvedValueOnce(undefined) // insert itens

    const res = await request(app)
      .post('/pdr')
      .send({
        ano: 2026,
        valor_solicitado: 100,
        itens: [{ cod_nd: '339030', valor_autorizado: 80 }]
      })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.dados).toEqual({ id: 12 })
  })

  test('UNIQUE de ano -> 409', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ id: 9 }) // ja existe
    const res = await request(app).post('/pdr').send({ ano: 2026, itens: [] })
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
  })

  test('ano ausente vira 400 (validacao Joi)', async () => {
    const res = await request(app).post('/pdr').send({ itens: [] })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })
})

describe('DELETE /pdr/:id', () => {
  test('409 quando ha NC vinculada a um item do PDR', async () => {
    mockDb.conn.oneOrNone
      .mockResolvedValueOnce({ id: 1 }) // existe
      .mockResolvedValueOnce({ '?column?': 1 }) // referenciado
    const res = await request(app).delete('/pdr/1')
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
  })

  test('remove com 200 quando nao ha referencias', async () => {
    mockDb.conn.oneOrNone
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce(null)
    mockDb.conn.none
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
    const res = await request(app).delete('/pdr/1')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('POST /pdr/:id/itens', () => {
  test('caminho feliz: cria item e responde 201', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ id: 1 }) // PDR existe
    mockDb.conn.one.mockResolvedValueOnce({ id: 55 }) // INSERT item
    const res = await request(app)
      .post('/pdr/1/itens')
      .send({ cod_nd: '339030' })
    expect(res.status).toBe(201)
    expect(res.body.dados).toEqual({ id: 55 })
  })

  test('404 quando o PDR nao existe', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null)
    const res = await request(app)
      .post('/pdr/999/itens')
      .send({ cod_nd: '339030' })
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })
})

describe('PUT /pdr/item/:itemId', () => {
  test('caminho feliz: atualiza item (rowCount 1) e responde 200', async () => {
    mockDb.conn.result.mockResolvedValueOnce({ rowCount: 1 })
    const res = await request(app)
      .put('/pdr/item/10')
      .send({ cod_nd: '339030' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  test('404 quando o item nao existe (rowCount 0)', async () => {
    mockDb.conn.result.mockResolvedValueOnce({ rowCount: 0 })
    const res = await request(app)
      .put('/pdr/item/999')
      .send({ cod_nd: '339030' })
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })
})

describe('DELETE /pdr/item/:itemId', () => {
  test('caminho feliz: remove item sem NC vinculada', async () => {
    mockDb.conn.oneOrNone
      .mockResolvedValueOnce({ id: 1 }) // item existe
      .mockResolvedValueOnce(null) // sem NC
    mockDb.conn.none.mockResolvedValueOnce(undefined)
    const res = await request(app).delete('/pdr/item/1')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  test('409 quando ha NC vinculada ao item', async () => {
    mockDb.conn.oneOrNone
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ '?column?': 1 })
    const res = await request(app).delete('/pdr/item/1')
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
  })
})
