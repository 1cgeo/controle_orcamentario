'use strict'

// E2E real (PostgreSQL + auth stub): planejamento de contratacoes (DFD).
// Nao ha mais PCA nem exercicio: o DFD se amarra direto no ANO e nao tem mais
// coluna pca_id.
//   * DFD: criar com itens, GET /:id traz itens[], atualizar substitui itens.
//   * DELETE do DFD remove os itens e o proprio DFD (a licitacao nao referencia
//     mais o DFD, entao nao ha bloqueio por licitacao).
//   * Robustez: corpo minimo (so obrigatorios) cria com sucesso (sem 500 de opcional omitido).

const e2e = require('./helpers/e2e')

let token

beforeAll(async () => {
  await e2e.setup()
  token = await e2e.login()
})

afterAll(async () => {
  await e2e.teardown()
})

beforeEach(async () => {
  await e2e.truncate()
})

const auth = () => e2e.authHeader(token)

// Helpers que falham alto se a chamada nao for sucesso (facilita achar bug).
async function post (url, body) {
  const res = await e2e.agent().post(url).set(auth()).send(body)
  if (res.status >= 400) {
    throw new Error(`POST ${url} -> ${res.status}: ${JSON.stringify(res.body)}`)
  }
  return res.body.dados
}
async function get (url) {
  const res = await e2e.agent().get(url).set(auth())
  if (res.status >= 400) {
    throw new Error(`GET ${url} -> ${res.status}: ${JSON.stringify(res.body)}`)
  }
  return res.body.dados
}

describe('DFD (E2E real)', () => {
  test('cria DFD com itens e GET /:id traz itens[]', async () => {
    const { id } = await post('/api/dfd', {
      numero: 'DFD-010',
      ano: 2026,
      objeto: 'Aquisicao de equipamentos',
      grau_prioridade_id: 1,
      itens: [
        { tipo_item_id: 1, descricao: 'Notebook', quantidade: 2, valor_unitario: 5000, valor_total: 10000 },
        { tipo_item_id: 2, descricao: 'Manutencao', quantidade: 1, valor_unitario: 3000, valor_total: 3000 }
      ]
    })

    const dfd = await get(`/api/dfd/${id}`)
    expect(dfd.numero).toBe('DFD-010')
    expect(Array.isArray(dfd.itens)).toBe(true)
    expect(dfd.itens).toHaveLength(2)
    expect(dfd.itens[0].descricao).toBe('Notebook')
    expect(dfd.itens[0].tipo_item).toBe('Material')
    expect(dfd.itens[1].tipo_item).toBe('Serviço')
    // valor_estimado resolvido pela soma dos itens (10000 + 3000)
    expect(Number(dfd.valor_estimado)).toBe(13000)
  })

  test('corpo minimo (numero, ano) cria DFD sem itens, sem 500 de opcional omitido', async () => {
    const { id } = await post('/api/dfd', { numero: 'DFD-MIN', ano: 2026, objeto: 'Obj' })
    const dfd = await get(`/api/dfd/${id}`)
    expect(dfd.itens).toHaveLength(0)
    expect(dfd.valor_estimado).toBeNull()
  })

  test('atualizar DFD substitui os itens', async () => {
    const { id } = await post('/api/dfd', {
      numero: 'DFD-020',
      ano: 2026,
      objeto: 'Obj',
      itens: [
        { tipo_item_id: 1, descricao: 'Item antigo', valor_total: 100 }
      ]
    })

    await e2e.agent().put(`/api/dfd/${id}`).set(auth()).send({
      numero: 'DFD-020',
      ano: 2026,
      objeto: 'Obj atualizado',
      itens: [
        { tipo_item_id: 2, descricao: 'Item novo A', valor_total: 200 },
        { tipo_item_id: 2, descricao: 'Item novo B', valor_total: 300 }
      ]
    }).expect(200)

    const dfd = await get(`/api/dfd/${id}`)
    expect(dfd.objeto).toBe('Obj atualizado')
    expect(dfd.itens).toHaveLength(2)
    expect(dfd.itens.map(i => i.descricao).sort()).toEqual(['Item novo A', 'Item novo B'])
    // valor_estimado recalculado (200 + 300)
    expect(Number(dfd.valor_estimado)).toBe(500)
  })

  test('DELETE do DFD sem dependentes remove itens e o proprio DFD', async () => {
    const dfd = await post('/api/dfd', {
      numero: 'DFD-040',
      ano: 2026,
      objeto: 'Obj',
      itens: [{ tipo_item_id: 1, descricao: 'Item', valor_total: 50 }]
    })

    await e2e.agent().delete(`/api/dfd/${dfd.id}`).set(auth()).expect(200)

    const res = await e2e.agent().get(`/api/dfd/${dfd.id}`).set(auth())
    expect(res.status).toBe(404)
  })
})
