'use strict'

// Teste de rota do login: exercita o fluxo REAL (assina JWT local), mockando
// o banco (usuario local) e o servico de autenticacao (validacao da senha).

const { createMockDb } = require('../helpers/mockDb')

const mockDb = createMockDb()
jest.mock('../../database', () => ({ db: mockDb }))
jest.mock('../../authentication', () => ({ authenticateUser: jest.fn() }))

const { authenticateUser } = require('../../authentication')
const request = require('supertest')
const { buildTestApp } = require('../helpers/testApp')
const { loginRoute } = require('../../login')

const app = buildTestApp([{ path: '/login', router: loginRoute }])

beforeEach(() => mockDb.reset())

describe('POST /login', () => {
  test('credencial valida devolve token, uuid e administrador', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ id: 1, uuid: 'u-1', administrador: true })
    authenticateUser.mockResolvedValueOnce(true)

    const res = await request(app)
      .post('/login')
      .send({ usuario: 'fulano', senha: 'segredo', cliente: 'orcamento_web' })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.dados.token).toEqual(expect.any(String))
    expect(res.body.dados.uuid).toBe('u-1')
    expect(res.body.dados.administrador).toBe(true)
    expect(authenticateUser).toHaveBeenCalledWith('fulano', 'segredo', 'orcamento_web')
  })

  test('cliente diferente de orcamento_web vira 400 (validacao)', async () => {
    const res = await request(app)
      .post('/login')
      .send({ usuario: 'fulano', senha: 'segredo', cliente: 'sca_web' })
    expect(res.status).toBe(400)
  })

  test('usuario nao cadastrado localmente vira 400', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null)
    const res = await request(app)
      .post('/login')
      .send({ usuario: 'ninguem', senha: 'x', cliente: 'orcamento_web' })
    expect(res.status).toBe(400)
    expect(authenticateUser).not.toHaveBeenCalled()
  })

  test('senha invalida no auth vira 400', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ id: 1, uuid: 'u-1', administrador: false })
    authenticateUser.mockResolvedValueOnce(false)
    const res = await request(app)
      .post('/login')
      .send({ usuario: 'fulano', senha: 'errada', cliente: 'orcamento_web' })
    expect(res.status).toBe(400)
  })
})
