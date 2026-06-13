'use strict'

// Bateria de casos NEGATIVOS de validacao das rotas (supertest), focada nos
// ramos que a suite happy-path nao cobre. Para cada feature exercita a
// validacao Joi pelo schemaValidation (corpo sem campo obrigatorio -> 400,
// tipo errado em campo strict -> 400, enum/valor invalido -> 400) e o 404
// dos controllers (GET/PUT/DELETE de id inexistente, mockando o oneOrNone
// que checa a existencia para devolver null). Em todos os casos confere o
// envelope success=false.
//
// Banco e autenticacao mockados (passthrough admin), como nos demais testes
// de rota. Importante: o body validation usa stripUnknown, entao campo
// desconhecido NAO gera 400; o que gera 400 e campo obrigatorio faltando,
// tipo errado em campo .strict() e valor fora do .valid()/.positive().

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
const { notaCreditoRoute } = require('../../nota_credito')
const { notaEmpenhoRoute } = require('../../nota_empenho')
const { licitacaoRoute } = require('../../licitacao')
const { pdrRoute } = require('../../pdr')

const app = buildTestApp([
  { path: '/exercicios', router: exercicioRoute },
  { path: '/notas_credito', router: notaCreditoRoute },
  { path: '/notas_empenho', router: notaEmpenhoRoute },
  { path: '/licitacoes', router: licitacaoRoute },
  { path: '/pdr', router: pdrRoute }
])

beforeEach(() => mockDb.reset())

// Helper: garante que a resposta e um 400 de validacao com envelope de erro
// e que o banco nao foi tocado (a validacao barra antes do controller).
const esperaValidacao400 = res => {
  expect(res.status).toBe(400)
  expect(res.body.success).toBe(false)
  expect(mockDb.conn.one).not.toHaveBeenCalled()
  expect(mockDb.conn.none).not.toHaveBeenCalled()
}

// ----------------------------------------------------------------------------
// EXERCICIO
// ----------------------------------------------------------------------------
describe('Validacao negativa: exercicio', () => {
  test('POST sem ano (obrigatorio) vira 400', async () => {
    const res = await request(app)
      .post('/exercicios')
      .send({ uasg: '160382', ativo: false })
    esperaValidacao400(res)
  })

  test('POST com ano string (strict, espera numero) vira 400', async () => {
    const res = await request(app)
      .post('/exercicios')
      .send({ ano: '2026', uasg: '160382', ativo: false })
    esperaValidacao400(res)
  })

  test('POST com ativo string (strict boolean) vira 400', async () => {
    const res = await request(app)
      .post('/exercicios')
      .send({ ano: 2026, ativo: 'sim' })
    esperaValidacao400(res)
  })

  test('PUT sem ativo (obrigatorio no atualizar) vira 400', async () => {
    const res = await request(app)
      .put('/exercicios/2026')
      .send({ uasg: '160382' })
    esperaValidacao400(res)
  })

  test('GET /:ano com ano nao numerico vira 400 (params)', async () => {
    const res = await request(app).get('/exercicios/abc')
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  test('GET /:ano inexistente vira 404 com envelope de erro', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // getPorAno -> null
    const res = await request(app).get('/exercicios/1999')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })
})

// ----------------------------------------------------------------------------
// NOTA DE CREDITO
// ----------------------------------------------------------------------------
const ncValida = {
  numero: 'NC-001',
  ano: 2026,
  cod_nd: '339030',
  valor_nc: 1000,
  classificacao_id: 1,
  pdr_item_id: 7
}

describe('Validacao negativa: nota_credito', () => {
  test('POST sem numero (obrigatorio) vira 400', async () => {
    const { numero, ...semNumero } = ncValida
    const res = await request(app).post('/notas_credito').send(semNumero)
    esperaValidacao400(res)
  })

  test('POST sem cod_nd (obrigatorio) vira 400', async () => {
    const { cod_nd, ...semCodNd } = ncValida
    const res = await request(app).post('/notas_credito').send(semCodNd)
    esperaValidacao400(res)
  })

  test('POST com ano string (strict) vira 400', async () => {
    const res = await request(app)
      .post('/notas_credito')
      .send({ ...ncValida, ano: '2026' })
    esperaValidacao400(res)
  })

  test('POST com valor_nc string (strict, espera numero) vira 400', async () => {
    const res = await request(app)
      .post('/notas_credito')
      .send({ ...ncValida, valor_nc: '1000' })
    esperaValidacao400(res)
  })

  test('POST com valor_nc negativo (deve ser positivo) vira 400', async () => {
    const res = await request(app)
      .post('/notas_credito')
      .send({ ...ncValida, valor_nc: -5 })
    esperaValidacao400(res)
  })

  test('POST com classificacao_id = 3 (fora de valid 1,2) vira 400', async () => {
    const res = await request(app)
      .post('/notas_credito')
      .send({ ...ncValida, classificacao_id: 3 })
    esperaValidacao400(res)
  })

  test('GET ?classificacao_id=3 (enum invalido na query) vira 400', async () => {
    const res = await request(app)
      .get('/notas_credito')
      .query({ classificacao_id: 3 })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  test('GET /:id inexistente vira 404 com envelope de erro', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // getPorId -> null
    const res = await request(app).get('/notas_credito/999')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  test('PUT /:id inexistente vira 404 com envelope de erro', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // existente -> null
    const res = await request(app).put('/notas_credito/999').send(ncValida)
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  test('DELETE /:id inexistente vira 404 com envelope de erro', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // existente -> null
    const res = await request(app).delete('/notas_credito/999')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })
})

// ----------------------------------------------------------------------------
// NOTA DE EMPENHO
// ----------------------------------------------------------------------------
const neValida = {
  numero: 'NE-001',
  ano: 2026,
  valor_empenhado: 1000
}

describe('Validacao negativa: nota_empenho', () => {
  test('POST sem numero (obrigatorio) vira 400', async () => {
    const { numero, ...semNumero } = neValida
    const res = await request(app).post('/notas_empenho').send(semNumero)
    esperaValidacao400(res)
  })

  test('POST sem valor_empenhado (obrigatorio) vira 400', async () => {
    const { valor_empenhado, ...semValor } = neValida
    const res = await request(app).post('/notas_empenho').send(semValor)
    esperaValidacao400(res)
  })

  test('POST com valor_empenhado string (strict) vira 400', async () => {
    const res = await request(app)
      .post('/notas_empenho')
      .send({ ...neValida, valor_empenhado: '1000' })
    esperaValidacao400(res)
  })

  test('POST com valor_empenhado = 0 (deve ser positivo) vira 400', async () => {
    const res = await request(app)
      .post('/notas_empenho')
      .send({ ...neValida, valor_empenhado: 0 })
    esperaValidacao400(res)
  })

  test('POST com valor_anulado > valor_empenhado (max ref) vira 400', async () => {
    const res = await request(app)
      .post('/notas_empenho')
      .send({ ...neValida, valor_empenhado: 100, valor_anulado: 200 })
    esperaValidacao400(res)
  })

  test('POST com nota_credito_id string (strict) vira 400', async () => {
    const res = await request(app)
      .post('/notas_empenho')
      .send({ ...neValida, nota_credito_id: '5' })
    esperaValidacao400(res)
  })

  test('GET /:id inexistente vira 404 com envelope de erro', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // getPorId -> null
    const res = await request(app).get('/notas_empenho/999')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  test('DELETE /:id inexistente vira 404 com envelope de erro', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // existente -> null
    const res = await request(app).delete('/notas_empenho/999')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })
})

// ----------------------------------------------------------------------------
// LICITACAO
// ----------------------------------------------------------------------------
const licitacaoValida = {
  ano: 2026,
  tipo_id: 1,
  objeto: 'Aquisicao de equipamentos'
}

describe('Validacao negativa: licitacao', () => {
  test('POST sem objeto (obrigatorio) vira 400', async () => {
    const { objeto, ...semObjeto } = licitacaoValida
    const res = await request(app).post('/licitacoes').send(semObjeto)
    esperaValidacao400(res)
  })

  test('POST sem ano (obrigatorio) vira 400', async () => {
    const { ano, ...semAno } = licitacaoValida
    const res = await request(app).post('/licitacoes').send(semAno)
    esperaValidacao400(res)
  })

  test('POST com tipo_id = 9 (fora de valid 1,2) vira 400', async () => {
    const res = await request(app)
      .post('/licitacoes')
      .send({ ...licitacaoValida, tipo_id: 9 })
    esperaValidacao400(res)
  })

  test('POST com tipo_id string (strict) vira 400', async () => {
    const res = await request(app)
      .post('/licitacoes')
      .send({ ...licitacaoValida, tipo_id: '1' })
    esperaValidacao400(res)
  })

  test('POST com valor_total_estimado negativo (positive) vira 400', async () => {
    const res = await request(app)
      .post('/licitacoes')
      .send({ ...licitacaoValida, valor_total_estimado: -1 })
    esperaValidacao400(res)
  })

  test('GET ?tipo_id=9 (enum invalido na query) vira 400', async () => {
    const res = await request(app).get('/licitacoes').query({ tipo_id: 9 })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  test('GET /:id inexistente vira 404 com envelope de erro', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // getPorId -> null
    const res = await request(app).get('/licitacoes/999')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  test('DELETE /:id inexistente vira 404 com envelope de erro', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // existente -> null
    const res = await request(app).delete('/licitacoes/999')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })
})

// ----------------------------------------------------------------------------
// PDR
// ----------------------------------------------------------------------------
const pdrValido = {
  ano: 2026,
  itens: []
}

describe('Validacao negativa: pdr', () => {
  test('POST sem ano (obrigatorio) vira 400', async () => {
    const res = await request(app).post('/pdr').send({ itens: [] })
    esperaValidacao400(res)
  })

  test('POST com ano string (strict) vira 400', async () => {
    const res = await request(app)
      .post('/pdr')
      .send({ ...pdrValido, ano: '2026' })
    esperaValidacao400(res)
  })

  test('POST com item sem cod_nd (obrigatorio no item) vira 400', async () => {
    const res = await request(app)
      .post('/pdr')
      .send({ ano: 2026, itens: [{ descricao: 'item sem cod_nd' }] })
    esperaValidacao400(res)
  })

  test('POST com gnd string (strict) num item vira 400', async () => {
    const res = await request(app)
      .post('/pdr')
      .send({ ano: 2026, itens: [{ cod_nd: '339030', gnd: 'tres' }] })
    esperaValidacao400(res)
  })

  test('GET /:id inexistente vira 404 com envelope de erro', async () => {
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null) // getPdr -> null
    const res = await request(app).get('/pdr/999')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  test('DELETE /:id inexistente vira 404 com envelope de erro', async () => {
    // deletaPdr roda em tx: o oneOrNone de existencia dentro da tx -> null
    mockDb.conn.oneOrNone.mockResolvedValueOnce(null)
    const res = await request(app).delete('/pdr/999')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  test('PUT /item/:itemId inexistente vira 404 (rowCount 0)', async () => {
    mockDb.conn.result.mockResolvedValueOnce({ rowCount: 0 })
    const res = await request(app)
      .put('/pdr/item/999')
      .send({ cod_nd: '339030' })
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })
})
