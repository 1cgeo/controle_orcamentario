'use strict'

// Teste de rota (supertest) do exercicio. Mocka o banco e a autenticacao
// (passthrough admin), exercitando router + schemaValidation + envelope + ctrl.

const { createMockDb } = require('../helpers/mockDb')

const mockDb = createMockDb()
jest.mock('../../database', () => ({
  db: mockDb,
  databaseVersion: { nome: '1.0.0', load: jest.fn() }
}))
jest.mock('../../login', () => require('../helpers/mockLogin'))

const request = require('supertest')
const { buildTestApp } = require('../helpers/testApp')
const { exercicioRoute } = require('../../exercicio')

const app = buildTestApp([{ path: '/exercicios', router: exercicioRoute }])

beforeEach(() => mockDb.reset())

describe('GET /exercicios', () => {
  test('devolve o envelope padrao com os dados', async () => {
    mockDb.conn.any.mockResolvedValueOnce([{ ano: 2026 }, { ano: 2025 }])
    const res = await request(app).get('/exercicios')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ version: expect.any(String), success: true })
    expect(res.body.dados).toHaveLength(2)
  })
})

describe('POST /exercicios', () => {
  test('rejeita body sem ano com 400 (validacao Joi)', async () => {
    const res = await request(app).post('/exercicios').send({ uasg: '160382' })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  test('cria exercicio e responde com sucesso', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // nao existe
    mockDb.conn.one.mockResolvedValueOnce({ ano: 2026 })
    const res = await request(app)
      .post('/exercicios')
      .send({ ano: 2026, uasg: '160382', codom: '048215', ativo: false })
    expect([200, 201]).toContain(res.status)
    expect(res.body.success).toBe(true)
  })

  test('conflito de ano duplicado vira 409', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ ano: 2026 }) // ja existe
    const res = await request(app)
      .post('/exercicios')
      .send({ ano: 2026, uasg: '160382', codom: null, ativo: false })
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
  })
})
