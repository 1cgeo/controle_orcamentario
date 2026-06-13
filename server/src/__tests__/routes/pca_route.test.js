'use strict'

// Teste de rota (supertest) do PCA. Mocka banco + autenticacao (admin).

const { createMockDb } = require('../helpers/mockDb')

const mockDb = createMockDb()
jest.mock('../../database', () => ({
  db: mockDb,
  databaseVersion: { nome: '1.0.0', load: jest.fn() }
}))
jest.mock('../../login', () => require('../helpers/mockLogin'))

const request = require('supertest')
const { buildTestApp } = require('../helpers/testApp')
const { pcaRoute } = require('../../pca')

const app = buildTestApp([{ path: '/pca', router: pcaRoute }])

beforeEach(() => mockDb.reset())

describe('GET /pca', () => {
  test('devolve o envelope padrao com os dados', async () => {
    mockDb.conn.any.mockResolvedValueOnce([{ id: 1, ano: 2026 }])
    const res = await request(app).get('/pca')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ version: expect.any(String), success: true })
    expect(res.body.dados).toHaveLength(1)
  })
})

describe('POST /pca', () => {
  test('rejeita body sem ano com 400 (validacao Joi)', async () => {
    const res = await request(app).post('/pca').send({ uasg: '160382' })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  test('cria PCA e responde com sucesso', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // nao existe
    mockDb.conn.one.mockResolvedValueOnce({ id: 7 })
    const res = await request(app)
      .post('/pca')
      .send({ ano: 2026, uasg: '160382', valor_total_estimado: 100 })
    expect([200, 201]).toContain(res.status)
    expect(res.body.success).toBe(true)
    expect(res.body.dados).toEqual({ id: 7 })
  })

  test('UNIQUE(ano, uasg) vira 409', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ id: 3 }) // ja existe
    const res = await request(app)
      .post('/pca')
      .send({ ano: 2026, uasg: '160382' })
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
  })
})

describe('DELETE /pca/:id', () => {
  test('409 quando ha DFD vinculado', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ id: 1 }) // existe
    mockDb.conn.one.mockResolvedValueOnce({ n: 1 }) // ha DFD
    const res = await request(app).delete('/pca/1')
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
  })

  test('exclui quando nao ha dependentes', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ id: 1 })
    mockDb.conn.one.mockResolvedValueOnce({ n: 0 })
    mockDb.conn.none.mockResolvedValueOnce(undefined)
    const res = await request(app).delete('/pca/1')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  test('404 quando o PCA nao existe', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null)
    const res = await request(app).delete('/pca/99')
    expect(res.status).toBe(404)
  })
})
