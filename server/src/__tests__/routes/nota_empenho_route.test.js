'use strict'

// Teste de rota (supertest) da nota de empenho. Mocka banco e autenticacao.
// Cobre: GET, caminho feliz do POST, validacao Joi (valor_empenhado > 0 e
// valor_anulado <= valor_empenhado) e o 409 do DELETE.

const { createMockDb } = require('../helpers/mockDb')

const mockDb = createMockDb()
jest.mock('../../database', () => ({
  db: mockDb,
  databaseVersion: { nome: '1.0.0', load: jest.fn() }
}))
jest.mock('../../login', () => require('../helpers/mockLogin'))

const request = require('supertest')
const { buildTestApp } = require('../helpers/testApp')
const { notaEmpenhoRoute } = require('../../nota_empenho')

const app = buildTestApp([{ path: '/notas_empenho', router: notaEmpenhoRoute }])

beforeEach(() => mockDb.reset())

const bodyValido = { numero: 'NE-001', ano: 2026, valor_empenhado: 2000 }

describe('GET /notas_empenho', () => {
  test('devolve o envelope padrao com os dados', async () => {
    mockDb.conn.any.mockResolvedValueOnce([{ id: 1 }])
    const res = await request(app).get('/notas_empenho')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ version: expect.any(String), success: true })
    expect(res.body.dados).toHaveLength(1)
  })
})

describe('POST /notas_empenho', () => {
  test('cria NE e responde com sucesso', async () => {
    mockDb.conn.one.mockResolvedValueOnce({ id: 7 })
    const res = await request(app).post('/notas_empenho').send(bodyValido)
    expect([200, 201]).toContain(res.status)
    expect(res.body.success).toBe(true)
    expect(res.body.dados).toEqual({ id: 7 })
  })

  test('valor_empenhado = 0 vira 400 (deve ser positivo)', async () => {
    const res = await request(app)
      .post('/notas_empenho')
      .send({ ...bodyValido, valor_empenhado: 0 })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(mockDb.conn.one).not.toHaveBeenCalled()
  })

  test('valor_empenhado ausente vira 400', async () => {
    const { valor_empenhado, ...sem } = bodyValido
    const res = await request(app).post('/notas_empenho').send(sem)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  test('valor_anulado > valor_empenhado vira 400', async () => {
    const res = await request(app)
      .post('/notas_empenho')
      .send({ ...bodyValido, valor_empenhado: 1000, valor_anulado: 1500 })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(mockDb.conn.one).not.toHaveBeenCalled()
  })
})

describe('GET /notas_empenho/:id', () => {
  test('traz saldo_a_liquidar', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({
      id: 1,
      valor_empenhado: '1000',
      valor_anulado: '0'
    })
    mockDb.conn.any.mockResolvedValueOnce([{ id: 1, valor_liquidado: '250' }])

    const res = await request(app).get('/notas_empenho/1')
    expect(res.status).toBe(200)
    expect(res.body.dados.saldo_a_liquidar).toBe(750)
  })

  test('404 quando nao existe', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null)
    const res = await request(app).get('/notas_empenho/999')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })
})

describe('DELETE /notas_empenho/:id', () => {
  test('409 quando ha liquidacao vinculada', async () => {
    mockDb.conn.oneOrNone
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ '?column?': 1 })
    const res = await request(app).delete('/notas_empenho/1')
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
  })
})
